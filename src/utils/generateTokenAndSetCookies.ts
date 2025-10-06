import { Context } from "hono";
import { SignJWT } from 'jose';
import { setCookie } from 'hono/cookie';

export const generateTokenAndSetCookies = async ( c: Context, user: { id: string; username: string; email?: string | null }) => {
  const payload: { id: string; username: string; email?: string | null } = {
    id: user.id,
    username: user.username,
  };

  if (user.email) {
    payload.email = user.email;
  }

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(c.env.JWT_SECRET));

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(c.env.JWT_REFRESH_SECRET));



    setCookie(c, 'accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None', // optional, recommended
        maxAge: 1*60*60, // 1 hour
    });

    setCookie(c, 'refreshToken', refreshToken, {
        path: '/api/v1/auth/refresh-token',
        httpOnly: true,
        secure: true,
        sameSite: 'None', // optional, recommended
        maxAge: 7 * 24 * 60 * 60, // 7 hour
    });

};
