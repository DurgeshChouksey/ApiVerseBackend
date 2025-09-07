import { transporter } from "./config";
export const sendSignupEmail = async (to, verificationCode) => {
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    try {
        const info = await transporter.sendMail({
            from: `"ApiVerse" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Verify your acount",
            html: `<p>Welcome to ApiVerse! Your OTP is: <b>${verificationCode}</b></p>`
        });
        console.log(info);
    }
    catch (error) {
        console.log(`Error sending signup email: ${error}`);
    }
};
