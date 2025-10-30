import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from "../../utils/errors";

// @DESC add bookmark
// @route /api/v1/apis/:apiId/bookmark POST
// @private

export const addBookmark = async (c: Context) => {
	const prisma = getPrisma(c);
	const apiId = c.req.param("apiId");
	const userId = c.get("userId");

	if (!apiId || !userId) {
		throw new BadRequestError("Missing apiId or userId");
	}

	const isAlreadyExist = await prisma.bookmark.findUnique({
		where: {
			userId_apiId: { userId, apiId },
		},
	});

	if (isAlreadyExist) {
		throw new BadRequestError("Already added in bookmarks");
	}

	const bookmark = await prisma.bookmark.create({
		data: {
			apiId,
			userId,
		},
	});

	if (!bookmark) {
		throw new InternalServerError("Something went wrong");
	}

	return c.json({
		message: "Added in bookmarks",
		bookmark,
	});
};

// @DESC get bookmarks
// @route /api/v1/apis/bookmarks GET
// @private

export const getBookmarks = async (c: Context) => {
	const prisma = getPrisma(c);
	const userId = c.get("userId");

	const filter = c.req.query("filter")?.trim();

	const bookmarks = await prisma.bookmark.findMany({
		where: {
			userId,
			api: filter
				? {
						visibility: "public",
						OR: [
							{ name: { contains: filter, mode: "insensitive" } },
							{ description: { contains: filter, mode: "insensitive" } },
						],
				  }
				: { visibility: "public" },
		},
		include: {
			api: {
				select: {
					id: true,
					name: true,
					description: true,
					baseUrl: true,
					category: true,
					visibility: true,
					requiresApiKey: true,
					logo: true,
					totalViews: true,
					createdAt: true,
					updatedAt: true,
					apiLogs: true,
					owner: { select: { id: true, username: true, email: true } },
					_count: { select: { endpoints: true } },
				},
			},
		},
	});

	// ✅ Add isBookmarked field for each API inside the bookmarks
	const bookmarksWithIsBookmarked = bookmarks.map((bookmark) => ({
		...bookmark,
		api: {
			...bookmark.api,
			isBookmarked: true,
		},
	}));

	return c.json({
		bookmarks: bookmarksWithIsBookmarked,
	});
};

// @DESC remove bookmark
// @route /api/v1/apis/:apiId/bookmark DELETE
// @private

export const removeBookmark = async (c: Context) => {
	const prisma = getPrisma(c);
	const apiId = c.req.param("apiId");
	const userId = c.get("userId");

	if (!apiId || !userId) {
		throw new BadRequestError("Missing apiId or userId");
	}

	const isAlreadyExist = await prisma.bookmark.findUnique({
		where: {
			userId_apiId: { userId, apiId },
		},
	});

	if (!isAlreadyExist) {
		throw new BadRequestError("Bookmark not found");
	}

	await prisma.bookmark.delete({
		where: {
			userId_apiId: { userId, apiId },
		},
	});

	return c.json({
		message: "Bookmark removed",
	});
};
