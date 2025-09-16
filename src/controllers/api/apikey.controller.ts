import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { BadRequestError, NotFoundError } from "../../utils/errors";

// @DESC either generate or regenerates an api key
// @route /api/v1/apis/:apiId/apikey POST
// @private

export const generateApiKey = async (c:Context) => {
    const prisma = getPrisma(c);

    const { apiId } = c.req.param();
    const userId = c.get("userId");

    if (!apiId || !userId) {
        throw new BadRequestError("apiId or userId missing.");
    }

    // generate 32-byte random hex string
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    // Upsert: if exists, update; else, create
    const apiKey = await prisma.apiKey.upsert({
        where: { apiId_userId: { apiId, userId } },
        update: { key },
        create: { apiId, userId, key },
    });

    return c.json({ message: "API key generated.", apiKey: apiKey.key });
};

// @DESC to get the apiKey for the user for particular apiId
// @route /api/v1/apis/:apiId/apikey GET
// @private

export const getApiKey = async (c:Context) => {
    const prisma = getPrisma(c);

    const { apiId } = c.req.param();
    const userId = c.get("userId");

    if (!apiId || !userId) {
        throw new BadRequestError("apiId or userId missing.");
    }

    const apiKey = await prisma.apiKey.findUnique({
        where: { apiId_userId: { apiId, userId } },
    });

    if (!apiKey) {
        throw new BadRequestError("API key not found")
    }

    return c.json({ apiKey: apiKey.key });
};


// @DESC delet's the apiKey
// @route /api/v1/apis/:apiId/apikey DELETE
// @private
export const deleteApiKey = async (c:Context) => {
    const prisma = getPrisma(c);

    const { apiId } = c.req.param();
    const userId = c.get("userId");

    if (!apiId || !userId) {
        return c.json({ success: false, message: "apiId or userId missing." }, 400);
    }

    const deletedKey = await prisma.apiKey.delete({
        where: { apiId_userId: { apiId, userId } },
    });

    if(!deletedKey) {
        throw new NotFoundError("API key not found.");
    }

    return c.json({ success: true, message: "API key deleted." });
};
