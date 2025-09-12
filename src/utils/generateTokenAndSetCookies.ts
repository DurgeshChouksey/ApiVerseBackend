import { Context } from "hono";
import { SignJWT } from 'jose';
import { setCookie } from 'hono/cookie';

export const generateTokenAndSetCookies = async (
  c: Context,
  user: { id: number; username: string; email?: string | null }
) => {
  const payload: { id: number; username: string; email?: string | null } = {
    id: user.id,
    username: user.username,
  };

  if (user.email) {
    payload.email = user.email;
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(c.env.JWT_SECRET));


    setCookie(c, 'token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax', // optional, recommended
        maxAge: 60 * 60, // 1 hour
    });

    return token;
};
