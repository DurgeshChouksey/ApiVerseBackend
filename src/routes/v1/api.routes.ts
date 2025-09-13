import { Hono } from "hono"
import * as apiController from "../../controllers/api/api.controller";
import { authHandler } from "../../middlewares/auth.middleware";
const apiRouter = new Hono();

// API CURD
apiRouter.post("/", authHandler, apiController.createAPI);
apiRouter.get("/", apiController.getPublicAPI);
apiRouter.get("/my", authHandler, apiController.getMyAPI);
apiRouter.get("/:apiId",authHandler, apiController.getAPIById);

export default apiRouter;
