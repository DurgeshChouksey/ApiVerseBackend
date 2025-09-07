import { Hono } from "hono"
import { signup } from "../../controllers/auth.controller";
const authRouter = new Hono();

authRouter.post('/signup', signup);

export default authRouter;
