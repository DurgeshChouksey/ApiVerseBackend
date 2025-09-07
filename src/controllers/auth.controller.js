import { sendSignupEmail } from "../nodemailer/emails";
//@DESC signup route controller
//@route /api/v1/auth/signup POST
//@public
export const signup = async (c) => {
    sendSignupEmail('durgesh65178@gmail.com', '298382');
    return c.json({ "Message": "Verification email sent successfully!" });
};
