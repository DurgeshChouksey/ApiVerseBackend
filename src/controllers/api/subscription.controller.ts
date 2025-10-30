import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { BadRequestError, NotFoundError } from "../../utils/errors";

// @DSEC create a subscription for the user
// @route /api/v1/apis/:apiId/subscribe POST
// @private

export const createSubscription = async (c:Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const userId = c.get("userId");

    if(!apiId) {
        throw new BadRequestError("Missing API");
    }

    const api = await prisma.api.findUnique({
        where: {id: apiId}
    })

    if(api?.ownerId == userId) {
        throw new BadRequestError("You can't subscribe to own API'S");
    }

    const body = await c.req.json();
    console.log(body);

    if(!body.plan) {
        throw new BadRequestError("Please select a Plan");
    }

    const subscription = await prisma.subscription.upsert({
        where: { userId_apiId: { userId, apiId } },
        update: {
            plan: body.plan
        },
        create: {
            apiId,
            userId,
            plan: body.plan
        }
    })

    if(!subscription) {
        throw new BadRequestError("Something went wrong, please try again later!")
    }

    // generate APIKey
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    await prisma.apiKey.create({
        data: {
            apiId,
            userId,
            key
        }
    });

    return c.json({
        message: "You are subscribed to use this API, An Api key is generated"
    })
}

// @DSEC check for the subscriptoin
// @route /api/v1/apis/:apiId/subscribed get
// @private

export const checkSubscription = async (c: Context) => {
  const prisma = getPrisma(c);
  const apiId = c.req.param("apiId");
  const userId = c.get("userId");

  if (!apiId || !userId) {
    throw new BadRequestError("Missing API ID or user ID");
  }

  // Find API
  const api = await prisma.api.findUnique({
    where: { id: apiId },
    select: { ownerId: true },
  });

  if (!api) {
    throw new NotFoundError("API not found");
  }

  // ✅ Case 1: If user owns the API

  if (api.ownerId === userId) {
    // get api key
    const apiKey = await prisma.apiKey.findUnique({
      where: {apiId_userId: {apiId, userId}},
      select: {key: true}
    })

    return c.json({
      success: true,
      isOwner: true,
      apiKey: apiKey,
      isSubscribed: false,
      message: "You are the owner of this API",
    });
  }

  // ✅ Case 2: Check if the user is subscribed
  const subscription = await prisma.subscription.findUnique({
    where: { userId_apiId: { userId, apiId } },
  });

  // ✅ Case 3: If not subscribed
  if (!subscription) {
    return c.json({
      success: true,
      isOwner: false,
      isSubscribed: false,
      message: "User is not subscribed to this API",
    });
  }

  // get api key
    const apiKey = await prisma.apiKey.findUnique({
      where: {apiId_userId: {apiId, userId}},
      select: {key: true}
    })

  // ✅ Case 4: Subscribed user
  return c.json({
    success: true,
    isOwner: false,
    isSubscribed: true,
    apiKey: apiKey,
    plan: subscription.plan,
    message: "User is subscribed to this API",
  });
};
