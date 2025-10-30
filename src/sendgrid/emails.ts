import { Context } from "hono";
import { BadRequestError, NotFoundError } from "../utils/errors";


export const sendVerificationEmail = async (c: Context, to: string, verificationCode: string) => {

    const SENDGRID_API_KEY = c.env.SENDGRID_API_KEY;
    const EMAIL_FROM = c.env.EMAIL_FROM;

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
        throw new Error("SendGrid API key or sender email missing");
    }

    // Replace with your actual template ID from SendGrid
    const TEMPLATE_ID = "d-5feec748d18e4665ab5a5c90ec5f2129";

    // here we are using SENDGRIDS REST API directly without SENDGRIDS SDK
    const payload = {
        personalizations: [
            {
                to: [{ email: to }],
                dynamic_template_data: {
                    verificationToken: verificationCode,
                    companyName: "ApiVerse",
                }
            },
        ],
        from: {
            email: EMAIL_FROM,
            name: "ApiVerse",
        },
        template_id: TEMPLATE_ID,
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
    } catch (error: any) {
        console.log(`Error sending signup email: ${error}`);
        throw new BadRequestError(error.errors[0].message);
    }
}


export const sendWelcomeEmail = async (c: Context, to: string, userName: string, dashboardUrl: string) => {

    const SENDGRID_API_KEY = c.env.SENDGRID_API_KEY;
    const EMAIL_FROM = c.env.EMAIL_FROM;

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
        throw new Error("SendGrid API key or sender email missing");
    }

    // Replace with your actual template ID from SendGrid
    const TEMPLATE_ID = "d-0a0f9a9d3a814b77bf9bb0e2983dd83f";

    // here we are using SENDGRIDS REST API directly without SENDGRIDS SDK
    const payload = {
        personalizations: [
            {
                to: [{ email: to }],
                dynamic_template_data: {
                    userName,
                    dashboardUrl,
                    companyName: "ApiVerse",
                }
            },
        ],
        from: {
            email: EMAIL_FROM,
            name: "ApiVerse",
        },
        template_id: TEMPLATE_ID,
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

export const sendResetPasswordLinkEmail = async (c: Context, to: string, resetPasswordUrl: string) => {

    const SENDGRID_API_KEY = c.env.SENDGRID_API_KEY;
    const EMAIL_FROM = c.env.EMAIL_FROM;

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
        throw new Error("SendGrid API key or sender email missing");
    }

    // Replace with your actual template ID from SendGrid
    const TEMPLATE_ID = "d-4b6861df35e04700a9b73cd945990ed9";

    // here we are using SENDGRIDS REST API directly without SENDGRIDS SDK
    const payload = {
        personalizations: [
            {
                to: [{ email: to }],
                dynamic_template_data: {
                    resetPasswordUrl,
                    companyName: "ApiVerse",
                }
            },
        ],
        from: {
            email: EMAIL_FROM,
            name: "ApiVerse",
        },
        template_id: TEMPLATE_ID,
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


export const sendResetPasswordSuccessEmail = async (c: Context, to: string, userName: string) => {

    const SENDGRID_API_KEY = c.env.SENDGRID_API_KEY;
    const EMAIL_FROM = c.env.EMAIL_FROM;

    if (!SENDGRID_API_KEY || !EMAIL_FROM) {
        throw new Error("SendGrid API key or sender email missing");
    }

    // Replace with your actual template ID from SendGrid
    const TEMPLATE_ID = "d-49c0f1db93e3425b9bbf078ed27e1621";

    // here we are using SENDGRIDS REST API directly without SENDGRIDS SDK
    const payload = {
        personalizations: [
            {
                to: [{ email: to }],
                dynamic_template_data: {
                    userName,
                    companyName: "ApiVerse",
                }
            },
        ],
        from: {
            email: EMAIL_FROM,
            name: "ApiVerse",
        },
        template_id: TEMPLATE_ID,
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
