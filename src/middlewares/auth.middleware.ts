import { Context, Next } from "hono";
import { jwtVerify } from "jose"
import { getCookie } from 'hono/cookie';

export const authHandler = async (c:Context, next:Next) => {
    const token = getCookie(c, 'token');

    if (!token) {
        c.status(401)
        return c.json({ message: "Authentication token missing" });
    }

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET));
        c.set("userId", payload.id);
        await next();
    } catch (err) {
        c.status(401)
        return c.json({ message: "Invalid token" });
    }
}
