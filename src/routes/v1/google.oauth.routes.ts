import { Hono } from "hono";
import { googleCallback, redirectToGoogle } from "../../controllers/googe.oauth.controller";

const googleAuthRouter = new Hono();

googleAuthRouter.get("/", redirectToGoogle); // change the redirect url
googleAuthRouter.get("/callback", googleCallback);

export default googleAuthRouter;
