import { Context } from "hono"
import { sendSignupEmail } from "../sendgrid/emails";
import z from "zod";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPrisma } from "../prisma.setup/client";
import { BadRequestError } from "../utils/errors";

//@DESC signup route controller
//@route /api/v1/auth/signup POST
//@public

export const signup = async(c:Context) => {

    // prisma clinet
    const prisma = getPrisma(c);

    // zod validator
    const SignupSchema = z.object({
        username: z.string().min(4, {message: "username should be 4 letters long"}),
        email: z.email({message: "Enter a valid email address"}),
        password: z.string().min(6, {message: "Password must be 6 digit long"}),
    });

    // for developers understanding or handleing compile time errorss
    type signupInputValidator = z.infer<typeof SignupSchema>;

    // fetching data from backend
    const body = await c.req.json();
    const { username, email, password } = SignupSchema.parse(body);

    // Trim and normalize inputs
    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // hash password
    const hashedPassword : string = await bcrypt.hash(password, 10);

    // these inputs should be passed while creating an user
    const signupInputs: signupInputValidator = {
        username: trimmedUsername,
        email: normalizedEmail,
        password: hashedPassword,
    }

    try {
        // check if user exist
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new BadRequestError('Email already registered');
        }


        // generate verification token
        const verificationToken : string = Math.floor(100000 + Math.random() * 900000).toString();


        const user = await prisma.user.create({
            data: {
                ...signupInputs,
                verificationToken,
                verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 10) // 10 mins expiry
            },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        //send email with verificaiton code
        await sendSignupEmail(c, email, verificationToken);

        return c.json({"Message": "Verification email sent successfully!", user});
    } catch (error) {
        throw error;
    }

}
