import { Hono } from "hono"
import authRouter from "./auth.routes";
import userRouter from "./user.routes";
import apiRouter from "./api.routes";
import logsRouter from "./logs.routes";
import googleAuthRouter from "./google.oauth.routes";
import { authHandler } from "../../middlewares/auth.middleware";

const v1Router = new Hono()

v1Router.route('/auth', authRouter);
v1Router.route('/auth/google', googleAuthRouter);

v1Router.use('/user/*', authHandler);
v1Router.route('/user', userRouter);

v1Router.route('/apis', apiRouter);

v1Router.route('/logs', logsRouter);


export default v1Router;
