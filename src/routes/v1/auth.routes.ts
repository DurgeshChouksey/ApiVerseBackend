import { Hono } from "hono"
import { authHandler } from '../../middlewares/auth.middleware'

import { signup, verifyEmail, login, addEmail, resendVerificationEmail, logout, checkAuth, changePassword, resetPassword, forgotPassword} from "../../controllers/auth.controller";
const authRouter = new Hono();

authRouter.post('/signup', signup);
authRouter.post('/verify-email', verifyEmail); // change the dashboard url
authRouter.post('/login', login);
authRouter.post('/add-email', authHandler ,addEmail);
authRouter.post('/resend-verification-token', authHandler, resendVerificationEmail);
authRouter.post('/logout', logout);
authRouter.post('/check-auth', authHandler, checkAuth);
authRouter.post('/change-password', authHandler, changePassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/forgot-password', forgotPassword);

export default authRouter;
