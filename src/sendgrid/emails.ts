import { Context } from "hono";
import { BadRequestError, NotFoundError } from "../utils/errors";


export const sendSignupEmail = async (c: Context, to: string, verificationCode: string) => {

    const SENDGRID_API_KEY = c.env.SENDGRID_API_KEY;
    const EMAIL_FROM = c.env.EMAIL_FROM;

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
        throw new Error("SendGrid API key or sender email missing");
    }

    // here we are using SENDGRIDS REST API directly without SENDGRIDS SDK
    const payload = {
        personalizations: [
            {
                to: [{ email: to }],
                subject: "Verify your account",
            },
        ],
        from: {
            email: EMAIL_FROM,
            name: "ApiVerse",
        },
        content: [
            {
                type: "text/html",
                value: `<p>Welcome to ApiVerse! Your OTP is: <b>${verificationCode}</b></p>`,
            },
        ],
    };

    try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("SendGrid error response:", text);
            throw new Error("Failed to send email");
        }

        console.log("Email sent successfully!");
    } catch (error) {
        console.log(`Error sending signup email: ${error}`);
        throw new BadRequestError('Error sending Signup Email');
    }
}


