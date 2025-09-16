import { Hono } from "hono"
import * as apiController from "../../controllers/api/api.controller";
import * as endpointController from "../../controllers/api/endpoint.controller";
import * as subscriptionController from "../../controllers/api/subscription.controller";
import * as apiKeyController from "../../controllers/api/apikey.controller";
import * as bookmarkController from "../../controllers/api/bookmark.controller";
import * as ratingController from "../../controllers/api/rating.controller";
import { authHandler } from "../../middlewares/auth.middleware";
const apiRouter = new Hono();

// static routes
apiRouter.get("/bookmarks", authHandler, bookmarkController.getBookmarks);

// API CURD
apiRouter.post("/", authHandler, apiController.createAPI);
apiRouter.get("/", apiController.getPublicAPI);
apiRouter.get("/subscribed", authHandler, apiController.getSubscribedAPI);
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


// SUBSCRIPTION (JUST FOR TESTING, AND BUILDING API KEY FUNCTIONALITY)
apiRouter.post("/:apiId/subscribe", authHandler, subscriptionController.createSubscription);
apiRouter.get("/:apiId/subscribed", authHandler, subscriptionController.checkSubscription);


// API KEY ROUTES
apiRouter.post("/:apiId/apikey", authHandler, apiKeyController.generateApiKey);
apiRouter.get("/:apiId/apikey", authHandler, apiKeyController.getApiKey);
apiRouter.delete("/:apiId/apikey", authHandler, apiKeyController.deleteApiKey);

// BOOKMARKS ROUTES
apiRouter.post("/:apiId/bookmark", authHandler, bookmarkController.addBookmark);
apiRouter.delete("/:apiId/bookmark", authHandler, bookmarkController.removeBookmark);

// RATING ROUTES
apiRouter.post("/:apiId/rate", authHandler, ratingController.addRating);
apiRouter.patch("/:apiId/rate/:ratingId", authHandler, ratingController.updateRating);
apiRouter.delete("/:apiId/rate/:ratingId", authHandler, ratingController.deleteRating);
apiRouter.get("/:apiId/ratings", authHandler, ratingController.getRatings);


export default apiRouter;
