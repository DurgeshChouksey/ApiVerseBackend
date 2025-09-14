import { Hono } from "hono"
import * as apiController from "../../controllers/api/api.controller";
import * as endpointController from "../../controllers/api/endpoint.controller"
import { authHandler } from "../../middlewares/auth.middleware";
const apiRouter = new Hono();

// API CURD
apiRouter.post("/", authHandler, apiController.createAPI);
apiRouter.get("/", apiController.getPublicAPI);
apiRouter.get("/my", authHandler, apiController.getMyAPI);
apiRouter.get("/:apiId", apiController.getAPIById);
apiRouter.patch("/:apiId", authHandler, apiController.updateAPI);
apiRouter.delete("/:apiId", authHandler, apiController.deleteAPI);


// ENDPOINT ROUTES
apiRouter.get("/:apiId/endpoints", authHandler, endpointController.getAllEndpoints);
apiRouter.get("/:apiId/endpoints/:endpointId", authHandler, endpointController.getEndpoint);
apiRouter.post("/:apiId/endpoints", authHandler, endpointController.createEndpoint);
apiRouter.patch("/:apiId/endpoints/:endpointId", authHandler, endpointController.updateEndpoint);
apiRouter.delete("/:apiId/endpoints/:endpointId", authHandler, endpointController.deleteEndpoint);
apiRouter.post("/:apiId/endpoints/test/:endpointId", authHandler, endpointController.testEndpoint);


export default apiRouter;
