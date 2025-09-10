import { Context } from "hono"
import { sendResetPasswordLinkEmail, sendResetPasswordSuccessEmail, sendVerificationEmail, sendWelcomeEmail } from "../sendgrid/emails";
import z from "zod";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPrisma } from "../prisma.setup/client";
import { BadRequestError } from "../utils/errors";
import { generateTokenAndSetCookies } from "../utils/generateTokenAndSetCookies";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jwtVerify } from "jose";
import { generateRandomToken } from "../utils/generateRandomToken";

//@DESC signup route controller
//@route /api/v1/auth/signup POST
//@public

export const signup = async(c:Context) => {

    const prisma = getPrisma(c);

    const SignupSchema = z.object({
        username: z.string().min(4, {message: "username should be 4 letters long"}),
        password: z.string().min(6, {message: "Password must be 6 digit long"}),
    });

    // for developers understanding or handleing compile time errorss
    type signupInputValidator = z.infer<typeof SignupSchema>;

    const body = await c.req.json();
    const { username, password } = SignupSchema.parse(body);

    // Trim and normalize inputs
    const trimmedUsername = username.trim();

    // hash password
    const hashedPassword : string = await bcrypt.hash(password, 10);

    // these inputs should be passed while creating an user
    const signupInputs: signupInputValidator = {
        username: trimmedUsername,
        password: hashedPassword,
    }

    const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existingUser) {
        throw new BadRequestError('Username already taken');
    }

    const user = await prisma.user.create({
        data: {
            ...signupInputs,
        },
        select: {
            id: true,
            username: true,
            createdAt: true,
            updatedAt: true,
        }
    })

    await generateTokenAndSetCookies(c, {
        id: user.id,
        username: user.username,
    });

    c.status(201);
    return c.json({"message": "User created successfully", user});

}

//@DESC add email controller
//@route /api/v1/auth/add-email POST
//@private

export const addEmail = async(c:Context) => {

    const prisma = getPrisma(c);

    const emailSchema = z
        .string()
        .email()
        .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
            message: "Invalid email format",
    });

    const {email} = await c.req.json();
    const normalizedEmail = emailSchema.parse(email).toLowerCase();

    const userId = c.get("userId"); // example: set by auth middleware

    // check if email already exists for another user
    const existingEmailUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existingEmailUser) {
        throw new BadRequestError("Email is already registered with another account");
    }


    // generagte verificatoin tojen
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const updateUser = await prisma.user.update({
        where: {id: userId},
        data: {
            email: normalizedEmail,
            verificationToken,
            verificationTokenExpires: new Date(Date.now() + 1000*60*10),
        }
    })

    await sendVerificationEmail(c, email, verificationToken);

    c.status(200);
    return c.json({
        message: "Verification Email sent successfully"
    })

}

//@DESC verify email controller
//@route /api/v1/auth/verify-email POST
//@public

export const verifyEmail = async (c:Context) => {

    //prisma client
    const prisma = getPrisma(c);

    const { verificationToken } = await c.req.json();

    if(!verificationToken) {
        throw new BadRequestError("Verification token is required")
    }

    const user = await prisma.user.findFirst({
        where: {
            verificationToken,
            verificationTokenExpires: {
                gt: new Date(),
            },
        },
    });


    if(!user) {
        throw new BadRequestError("Invalid or expired verification token");
    }

    // update user: makr as verified, clear token field

    const updatedUser = await prisma.user.update({
        where: {id: user.id},
        data: {
            verificationToken: null,
            verificationTokenExpires: null,
            isVerified: true
        },
        select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
        },
    })

    // ! -> email is not null, because we have called add-email first
    await sendWelcomeEmail(c, updatedUser.email!, updatedUser.username, 'http://localhost:5673/dashboard');

    return c.json({
        message: "Email verified successfully",
        user: updatedUser,
    })
}

//@DESC resend verification email controller
//@route /api/v1/auth/resend-verification POST
//@private

export const resendVerificationEmail = async (c:Context) => {
    const prisma = getPrisma(c);

    const userId = c.get("userId");

    if(!userId) {
        throw new BadRequestError("User not Authenticated")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new BadRequestError("User not found");
    }

    if (user.isVerified) {
        return c.json({ message: "Email is already verified" });
    }

    if (!user.email) {
        throw new BadRequestError("Please add an email first");
    }

    // Generate a new verification token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    await prisma.user.update({
        where: {id: userId},
        data: {
            verificationToken,
            verificationTokenExpires,
        },
    });

    // Send verification email
    await sendVerificationEmail(c, user.email, verificationToken);

    c.status(200);
    return c.json({ message: "Verification email resent successfully" });
}

//@DESC login route controller
//@route /api/v1/auth/login POST
//@public

export const login = async (c:Context) => {

    // Check if token cookie already exists
    const token = getCookie(c, "token") // or use getCookie(c, "token")

    if (token) {
        try {
            // Verify the existing token
            const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET));
            // Token is valid → user is already logged in
            return c.json({
                message: "User is already logged in",
                user: {
                    id: payload.id,
                    username: payload.username,
                    email: payload.email || null,
                }
            });
        } catch (err) {
            // Token invalid/expired → continue with normal login
        }
    }

    const prisma = getPrisma(c);

    const {identifier, password} = await c.req.json();

    if (!identifier || !password) {
        throw new BadRequestError("Username/Email and password are required");
    }

    // check if identifier is email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = await prisma.user.findUnique({
        where: isEmail ? {email: identifier.toLowerCase() } : {username: identifier.trim()}
    });

    if(!user) {
        throw new BadRequestError("Invalid Credentials");
    };

    if (!user.password) {
        throw new BadRequestError("This account uses OAuth. Please log in with Google/GitHub.");
    };


    // verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid) {
        throw new BadRequestError("Wrong password");
    };

    await generateTokenAndSetCookies(c, {
        id: user.id,
        username: user.username,
    });

    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            lastLogin: new Date(),
        }
    })

    return c.json({
        message: "Login successful",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isVerified: user.isVerified,
        }
    });
}

//@DESC logout route controller
//@route /api/v1/auth/logout POST
//@public

export const logout = async (c:Context) => {
    deleteCookie(c, 'token');
    c.status(200);
    return c.json({message: "Logged out successfully"});
}


//@DESC check-auth route controller
//@route /api/v1/auth/check-auth POST
//@private

export const checkAuth = async (c:Context) => {
    const userId = c.get("userId");

    const prisma = getPrisma(c);

    const user = await prisma.user.findUnique({
        where: {id: userId},
        select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
        }
    });

    if(!user) {
        throw new BadRequestError("User not found");
    }

    c.status(200);
    return c.json({message: "Authenticated", user});
}

//@DESC change-password route controller
//@route /api/v1/auth/change-password POST
//@private

export const changePassword = async(c:Context) => {

    const prisma = getPrisma(c);

    const userId = c.get('userId');

    // generate reset password
    const resetPasswordToken = generateRandomToken(32);
    const resetPasswordTokenExpires = new Date(Date.now() + 10*60*1000); // 10min

    const user = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            resetPasswordToken,
            resetPasswordTokenExpires
        },
        select: {
            email: true,
        }
    })

    // send mail with reset passworld link
    const resetPasswordUrl = `http://localhost:5173/resetPassword?token=${resetPasswordToken}`;

    await sendResetPasswordLinkEmail(c, user.email!, resetPasswordUrl);

    c.status(200);
    return c.json({message: "Reset password link is sent to the verified email"})
}

//@DESC reset-password route controller
//@route /api/v1/auth/reset-password POST
//@public

export const resetPassword = async(c: Context) => {
    const prisma = getPrisma(c);

    const {resetPasswordToken, password} = await c.req.json();

    if(!resetPasswordToken) {
        throw new BadRequestError("Reset token not found")
    }

    if(!password || password.length < 6) {
        throw new BadRequestError("Password must be at least 6 characters");
    }

    // check if the reset passwordk token is correct or not
    const user = await prisma.user.findFirst({
        where: {
            resetPasswordToken,
            resetPasswordTokenExpires : {
                gt: new Date(),
            },
        },
        select: {
            id: true,
            password: true,
            email: true,
            username: true,
        }
    })

    if(!user) {
        throw new BadRequestError("Either invalid or expired request token")
    }

    // Compare with old password
    const isSameAsOld = await bcrypt.compare(password, user.password!);
    if (isSameAsOld) {
        throw new BadRequestError("New password cannot be the same as the old password");
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // update user with new password
    await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordTokenExpires: null
        }
    })

    await sendResetPasswordSuccessEmail(c, user.email!, user.username);

    c.status(200);
    return c.json({
        message: "Password reset successfully"
    })
}

//@DESC fogot-password route controller
//@route /api/v1/auth/forgot-password POST
//@public

export const forgotPassword = async(c: Context) => {
    const prisma = getPrisma(c);

    const {identifier} = await c.req.json();

    if(!identifier) {
        throw new BadRequestError("Email/Username is required");
    }

    // check if identifier is email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const user = await prisma.user.findUnique({
        where: isEmail ? {email: identifier.toLowerCase() } : {username: identifier.trim()}
    });

    if(!user) {
        throw new BadRequestError("Invalid Credentials");
    };

    // generate reset password
    const resetPasswordToken = generateRandomToken(32);
    const resetPasswordTokenExpires = new Date(Date.now() + 10*60*1000); // 10min

    await prisma.user.update({
        where: isEmail ? {email: identifier.toLowerCase() } : {username: identifier.trim()},
        data: {
            resetPasswordToken,
            resetPasswordTokenExpires
        },
        select: {
            email: true,
        }
    })

    // send mail with reset passworld link
    const resetPasswordUrl = `http://localhost:5173/resetPassword?token=${resetPasswordToken}`;
    await sendResetPasswordLinkEmail(c, user.email!, resetPasswordUrl);

    c.status(200);
    return c.json({message: "Reset password link is sent to the verified email"})
}
