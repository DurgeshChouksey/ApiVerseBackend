import { Context } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { getPrisma } from "../prisma.setup/client";
import { generateTokenAndSetCookies } from "../utils/generateTokenAndSetCookies";
import { BadRequestError } from "../utils/errors";

// Step 1: redirect user to Google

//@DESC redirecting to google auth url
//@route /api/v1/auth/google GET
// pubic

export const redirectToGoogle = async (c: Context) => {

    const clientId = c.env.GOOGLE_CLIENT_ID;
    const redirectUri = "http://localhost:8787/api/v1/auth/google/callback";
    const scope = "openid profile email";
    const responseType = "code";
    const state = crypto.randomUUID();
    // set state in HttpOnly cookie
    setCookie(c, "oauth_state", state, {httpOnly: true, secure: true});
    const codeChallengeMethod = "S256";


    // create a code verifier and code challenge (for PKCE)
    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    //set codeVerifier in HttpOnly cookie
    setCookie(c, "code_verifier", codeVerifier, {httpOnly: true, secure: true, sameSite: "lax"});

    const encoder = new TextEncoder();
    const codeChallengeBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
    const codeChallenge = btoa(
        String.fromCharCode(...new Uint8Array(codeChallengeBuffer))
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");


    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", responseType);
    googleAuthUrl.searchParams.set("scope", scope);
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("code_challenge", codeChallenge);
    googleAuthUrl.searchParams.set("code_challenge_method", codeChallengeMethod);

    return c.redirect(googleAuthUrl.toString());
};


//@DESC Getting auth code from google, verifying state, fetching access token, fetching userInfo using access token
//@route /api/v1/auth/callback GET
// pubic

export const googleCallback = async (c: Context) => {
    try {
        const prisma = getPrisma(c);

        const url = new URL(c.req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        const cookieState = getCookie(c, "oauth_state");
        const codeVerifier = getCookie(c, "code_verifier");


        if (!code || !state || state !== cookieState || !codeVerifier) {
            throw new BadRequestError("Invalid OAuth callback");
        }

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            // whenever the content-type is x-www-xform-urlencoded
            // we have to send queryParameters but in body
            // using URLSearchParams -> key1=value1&key2=value2&key3=value3
            body: new URLSearchParams({
                client_id: c.env.GOOGLE_CLIENT_ID,
                client_secret: c.env.GOOGLE_CLIENT_SECRET,
                code,
                code_verifier: codeVerifier,
                grant_type: "authorization_code",
                redirect_uri: "http://localhost:8787/api/v1/auth/google/callback",
            }),
        });

        interface TokenResponse {
            access_token?: string;
            expires_in?: number;
            refresh_token?: string;
            scope?: string;
            token_type?: string;
            id_token?: string;
        }

        const tokenData = (await tokenRes.json()) as TokenResponse;


        if (!tokenData.access_token) {
            throw new BadRequestError("Failed to get access token");
        }

        // Fetch user info
        const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userRes.json() as {
            sub: string;
            name: string;
            given_name: string;
            family_name: string;
            picture: string;
            email: string;
            email_verified: boolean;
        };

        // 1. Try to find existing user by email first
        let user = await prisma.user.findUnique({
            where: { email: userInfo.email }
        });

        if (user) {
            // 2a. If user exists, link OAuth provider info
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    providerId: userInfo.sub,
                    provider: "google",
                    lastLogin: new Date(),
                    profileImage: userInfo.picture
                }
            });
        } else {
            // 2b. If user does not exist, create new user
            user = await prisma.user.create({
                data: {
                    providerId: userInfo.sub,
                    provider: "google",
                    firstName: userInfo.given_name,
                    lastName: userInfo.family_name,
                    email: userInfo.email,
                    username: `user_${Math.random().toString(36).substring(2, 10)}`,
                    needsUsernameUpdate: true,
                    profileImage: userInfo.picture,
                    lastLogin: new Date(),
                    isVerified: true
                }
            });
        }

        const token = await generateTokenAndSetCookies(c, { id: user.id, username: user.username, email: user.email });

        return c.json({ message: "OAuth login success", user: userInfo });
    } catch (err: any) {
        return c.json({ message: "OAuth callback failed", error: err.message }, 500);
    }
};
