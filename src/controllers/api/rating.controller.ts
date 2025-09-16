import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { BadRequestError, NotFoundError } from "../../utils/errors";

/**
 * @DESC Add a new rating to an API
 * @route POST /api/v1/apis/:apiId/rate
 * @private
 */
export const addRating = async (c: Context) => {
    const prisma = getPrisma(c);
    const userId = c.get("userId");
    const apiId = c.req.param("apiId");
    const body = await c.req.json();

    if (!userId) throw new BadRequestError("User not authenticated");
    if (!apiId) throw new BadRequestError("Missing API ID");
    if (!body.value || body.value < 1 || body.value > 5)
        throw new BadRequestError("Rating value must be between 1 and 5");

    const existingRating = await prisma.rating.findFirst({
        where: { apiId, userId }
    });

    if (existingRating)
        throw new BadRequestError("You have already rated this API");

    const rating = await prisma.rating.create({
        data: {
            value: body.value,
            comment: body.comment || null,
            apiId,
            userId
        }
    });

    return c.json({ message: "Rating added successfully", rating });
};

/**
 * @DESC Update a user's rating
 * @route PATCH /api/v1/apis/:apiId/rate/:ratingId
 * @private
 */
export const updateRating = async (c: Context) => {
    const prisma = getPrisma(c);
    const userId = c.get("userId");
    const apiId = c.req.param("apiId");
    const ratingId = c.req.param("ratingId");
    const body = await c.req.json();

    if (!userId) throw new BadRequestError("User not authenticated");
    if (!apiId || !ratingId) throw new BadRequestError("Missing API or rating ID");
    if (body.value && (body.value < 1 || body.value > 5))
        throw new BadRequestError("Rating value must be between 1 and 5");

    const rating = await prisma.rating.findUnique({
        where: { id: ratingId }
    });

    if (!rating) throw new NotFoundError("Rating not found");
    if (rating.userId !== userId)
        throw new BadRequestError("You can only update your own rating");

    const updatedRating = await prisma.rating.update({
        where: { id: ratingId },
        data: {
            value: body.value ?? rating.value,
            comment: body.comment ?? rating.comment
        }
    });

    return c.json({ message: "Rating updated successfully", rating: updatedRating });
};

/**
 * @DESC Delete a user's rating
 * @route DELETE /api/v1/apis/:apiId/rate/:ratingId
 * @private
 */
export const deleteRating = async (c: Context) => {
    const prisma = getPrisma(c);
    const userId = c.get("userId");
    const apiId = c.req.param("apiId");
    const ratingId = c.req.param("ratingId");

    if (!userId) throw new BadRequestError("User not authenticated");
    if (!apiId || !ratingId) throw new BadRequestError("Missing API or rating ID");

    const rating = await prisma.rating.findUnique({ where: { id: ratingId } });
    if (!rating) throw new NotFoundError("Rating not found");
    if (rating.userId !== userId)
        throw new BadRequestError("You can only delete your own rating");

    await prisma.rating.delete({ where: { id: ratingId } });

    return c.json({ message: "Rating deleted successfully" });
};

/**
 * @DESC Get all ratings for an API
 * @route GET /api/v1/apis/:apiId/ratings
 * @public
 */
export const getRatings = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");

    if (!apiId) throw new BadRequestError("Missing API ID");

    const ratings = await prisma.rating.findMany({
        where: { apiId },
        include: { user: { select: { id: true, username: true, profileImage: true } } },
        orderBy: { createdAt: "desc" }
    });

    return c.json({ ratings });
};
