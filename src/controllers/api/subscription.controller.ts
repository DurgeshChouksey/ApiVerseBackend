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

export const checkSubscription = async (c:Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const userId = c.get("userId");

    if(!apiId || !userId) {
        throw new BadRequestError("Missing APIId or userId");
    }

    const isSubscribed = await prisma.subscription.findUnique({
        where: { userId_apiId: { userId, apiId } }
    })

    if(!isSubscribed) {
        throw new NotFoundError("Not subscribed");
    }

    return c.json({success: true, isSubscribed})
}
