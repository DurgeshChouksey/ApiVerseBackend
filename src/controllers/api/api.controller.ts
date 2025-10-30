import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import {
	BadRequestError,
	InternalServerError,
	UnauthorizedError,
} from "../../utils/errors";
import { encrypt } from "../../utils/crypto";

// @DESC create a new api
// @route /api/v1/apis/ POST
// @private
export const createAPI = async (c: Context) => {
	const prisma = getPrisma(c);

	const body = await c.req.json();
	const ownerId = c.get("userId");

	if (!body.name || !body.baseUrl || !body.category) {
		throw new BadRequestError("Missing required fields");
	}

	// Define allowed auth types for provider api
	const allowedAuthTypes = ["apiKey", "oauth2", "none"]; // extend as needed

	// Validate providerAuthType
	if (
		body.providerAuthType &&
		!allowedAuthTypes.includes(body.providerAuthType)
	) {
		throw new BadRequestError(
			`Invalid providerAuthType. Allowed values: ${allowedAuthTypes.join(", ")}`
		);
	}

	const apiDetails: any = {
		ownerId,
		name: body.name,
		baseUrl: body.baseUrl,
		category: body.category,
		description: body.description,
		visibility: body.visibility || "public",
		requiresApiKey: body.requiresApiKey || false,
		providerAuthType: body.providerAuthType || null,
		providerAuthLocation: body.providerAuthLocation || null,
		providerAuthField: body.providerAuthField || null,
		providerAuthKey: body.providerAuthKey
			? await encrypt(body.providerAuthKey)
			: null,
	};

	if (body.logo) {
		apiDetails.logo = body.logo;
	}

	const newApi = await prisma.api.create({
		data: apiDetails,
	});

	if (!newApi) {
		throw new BadRequestError("Something went wrong");
	}

	// generate key for owner if it is required
	if (body.requiresApiKey) {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		const key = Array.from(array)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		await prisma.apiKey.create({
			data: {
				apiId: newApi.id,
				userId: ownerId,
				key,
			},
		});
	}

	return c.json({ message: "API created successfully", api: newApi });
};

// @DSEC get all public api's for discovery page
// @route /api/v1/apis GET
// @public
export const getPublicAPI = async (c: Context) => {
	const prisma = getPrisma(c);

	const userId = c.get("userId") || null; // Optional: may be undefined if not logged in
	const category = c.req.query("category");
	const sort = c.req.query("sort");
	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = parseInt(c.req.query("limit") || "12", 10);
	console.log(c.req.query('limit'))
	const skip = (page - 1) * limit;

	const where: any = { visibility: "public" };
	if (category) where.category = category;

	const filter = c.req.query("filter")?.trim();
	if (filter) {
		where.OR = [
			{ name: { contains: filter, mode: "insensitive" } },
			{ description: { contains: filter, mode: "insensitive" } },
		];
	}

	// Sorting logic
	let orderBy: any = { createdAt: "desc" };
	const sortFieldMap: Record<string, string> = {
		views: "totalViews",
		rating: "averageRating",
		createdAt: "createdAt",
	};
	if (sort && sortFieldMap[sort]) {
		orderBy = { [sortFieldMap[sort]]: "desc" };
	}

	// Fetch APIs with bookmarks (only the current user's bookmark info)
	const [apis, total] = await Promise.all([
		prisma.api.findMany({
			where,
			orderBy,
			skip,
			take: limit,
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
				owner: {
					select: {
						id: true,
						username: true,
						email: true,
					},
				},
				apiLogs: true,
				_count: { select: { endpoints: true } },
				// ✅ Add bookmark info here
				bookmarks: userId
					? {
							where: { userId },
							select: { id: true },
					  }
					: false, // skip bookmarks if user not logged in
			},
		}),
		prisma.api.count({ where }),
	]);

	// Transform data → add `isBookmarked` field, each array of bookmarks will contain only one id
	const apisWithBookmark = apis.map((api) => ({
		...api,
		isBookmarked: userId ? api.bookmarks?.length > 0 : false,
	}));

	return c.json({
		apis: apisWithBookmark,
		total,
		page,
		limit,
	});
};

// @DESC get subscribed api's for subscribed section
// @route /api/v1/apis/subscribed GET
// @private
export const getSubscribedAPI = async (c: Context) => {
	const prisma = getPrisma(c);
	const userId = c.get("userId");

	if (!userId) {
		throw new UnauthorizedError("User not authenticated");
	}

	const category = c.req.query("category");
	const sort = c.req.query("sort");
	const filter = c.req.query("filter"); // search filter
	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = parseInt(c.req.query("limit") || "6", 10);
	const skip = (page - 1) * limit;

	// Build where clause
	const where: any = { userId };

	if (category) {
		where.api = { category };
	}

	if (filter) {
		where.api = {
			...where.api,
			OR: [
				{ name: { contains: filter, mode: "insensitive" } },
				{ description: { contains: filter, mode: "insensitive" } },
			],
		};
	}

	// Sorting
	let orderBy: any = { createdAt: "desc" };
	const sortFieldMap: Record<string, string> = {
		views: "totalViews",
		rating: "averageRating",
		createdAt: "createdAt",
	};
	if (sort && sortFieldMap[sort]) {
		orderBy = { api: { [sortFieldMap[sort]]: "desc" } };
	}

	const [subscriptions, total] = await Promise.all([
		prisma.subscription.findMany({
			where,
			skip,
			take: limit,
			orderBy,
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
						owner: {
							select: {
								id: true,
								username: true,
								email: true,
							},
						},
						apiLogs: true,
						bookmarks: userId
							? {
									where: { userId },
									select: { id: true },
							  }
							: false, // skip bookmarks if user not logged in
					},
				},
			},
		}),
		prisma.subscription.count({ where }),
	]);

	const apis = subscriptions.map((sub) => sub.api);

	const apisWithBookmark = apis.map((api) => ({
		...api,
		isBookmarked: userId ? api.bookmarks?.length > 0 : false,
	}));

	return c.json({
		apis: apisWithBookmark,
		total,
		page,
		limit,
	});
};

// @DSEC get personal api's for workspace
// @route /api/v1/apis GET
// @private
export const getMyAPI = async (c: Context) => {
	const prisma = getPrisma(c);
	const userId = c.get("userId");

	const category = c.req.query("category");
	const sort = c.req.query("sort");
	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = parseInt(c.req.query("limit") || "6", 10);
	const skip = (page - 1) * limit; // offset

	// Build where clause
	const where: any = {
		ownerId: userId,
	};

	if (category) {
		where.category = category;
	}

	// search filter (the value people put in search bar)
	const filter = c.req.query("filter");

	if (filter) {
		// if filter string is present in either name OR descriptoin
		where.OR = [
			{ name: { contains: filter, mode: "insensitive" } },
			{ description: { contains: filter, mode: "insensitive" } },
		];
	}

	// Determin order by
	let orderBy: any = { createdAt: "desc" };

	const sortFieldMap: Record<string, string> = {
		views: "totalViews",
		rating: "averageRating",
		createdAt: "createdAt",
	};
	if (sort && sortFieldMap[sort]) {
		orderBy = { [sortFieldMap[sort]]: "desc" };
	}

	const [apis, total] = await Promise.all([
		prisma.api.findMany({
			where,
			orderBy,
			skip,
			take: limit,
			include: {
				owner: {
					select: {
						id: true,
						username: true,
						email: true,
					},
				},
				apiLogs: true,
				bookmarks: userId
					? {
							where: { userId },
							select: { id: true },
					  }
					: false, // skip bookmarks if user not logged in
			},
		}),
		prisma.api.count({
			where,
		}),
	]);

	if (!apis) {
		throw new BadRequestError("No api present");
	}

	const apisWithBookmark = apis.map((api) => ({
		...api,
		isBookmarked: userId ? api.bookmarks?.length > 0 : false,
	}));

	return c.json({
		apis: apisWithBookmark,
		total,
		page,
		limit,
	});
};

// @DSEC get api by id, to view an api
// @route /api/v1/apis/:apiId GET
// @public
export const getAPIById = async (c: Context) => {
	const prisma = getPrisma(c);

	const apiId = c.req.param("apiId");

	if (!apiId) {
		throw new BadRequestError("Missing API ID");
	}

	const api = await prisma.api.findUnique({
		where: { id: apiId },
		select: {
			id: true,
			name: true,
			description: true,
			baseUrl: true,
			category: true,
			visibility: true,
			requiresApiKey: true,
			providerAuthType: true,
			providerAuthLocation: true,
			providerAuthField: true,
			providerAuthKey: true,
			logo: true,
			totalViews: true,
			createdAt: true,
			updatedAt: true,
			owner: {
				select: {
					id: true,
					username: true,
					email: true,
				},
			},
			endpoints: {
				include: {
					endpointLogs: true,
				},
			},
			apiLogs: true,
		},
	});

	if (!api) {
		throw new BadRequestError("Invalid API ID");
	}

	// Increment views safely
	await prisma.api.update({
		where: { id: apiId },
		data: { totalViews: { increment: 1 } },
	});

	return c.json(api);
};

// @DSEC updating api details
// @route /api/v1/apis/:apiId PATCH
// @private
export const updateAPI = async (c: Context) => {
	const prisma = getPrisma(c);

	const apiId = c.req.param("apiId");
	if (!apiId) {
		throw new BadRequestError("Missing API ID");
	}

	const userId = c.get("userId");

	const isUserAuthorized = await prisma.api.findUnique({
		where: {
			ownerId: userId,
			id: apiId,
		},
	});

	if (!isUserAuthorized) {
		throw new UnauthorizedError("You are not authorized to update API");
	}

	const body = await c.req.json();

	if (!body || Object.keys(body).length === 0) {
		throw new BadRequestError("No fields provided to update");
	}

	const updateData: any = {};

	const allowedField = [
		"name",
		"description",
		"category",
		"baseUrl",
		"visibility",
		"logo",
		"requiresApiKey",
		"providerAuthType",
		"providerAuthLocation",
		"providerAuthField",
	];

	// encrypt providers key
	if (body.providerAuthKey) {
		updateData.providerAuthKey = await encrypt(body.providerAuthKey);
	}

	for (const field of allowedField) {
		if (body[field] !== undefined) {
			updateData[field] = body[field];
		}
	}

	const updatedAPI = await prisma.api.update({
		where: { id: apiId },
		data: updateData,
	});

	if (!updatedAPI) {
		throw new InternalServerError("Something went wrong");
	}

	if (body.requiresApiKey) {
		const existingKey = await prisma.apiKey.findUnique({
			where: { apiId_userId: { apiId, userId } },
		});

		if (!existingKey) {
			// create new
			const array = new Uint8Array(32);
			crypto.getRandomValues(array);
			const key = Array.from(array)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");

			await prisma.apiKey.create({
				data: {
					apiId,
					userId,
					key,
				},
			});
		}
	}

	return c.json({ message: "API updatd successfully", updatedAPI });
};

// @DESC delete api
// @route api/v1/apis/:apidId DELETE
// @private
export const deleteAPI = async (c: Context) => {
	const prisma = getPrisma(c);
	const apiId = c.req.param("apiId");
	const userId = c.get("userId");

	if (!apiId) throw new BadRequestError("Missing apiId");

	const isUserAuthorized = await prisma.api.findUnique({
		where: { id: apiId, ownerId: userId },
	});

	if (!isUserAuthorized) {
		throw new UnauthorizedError("You are not authorized to delete this API");
	}

	// 🧹 Delete all related data first
	await prisma.$transaction([
		prisma.bookmark.deleteMany({ where: { apiId } }),
		prisma.subscription.deleteMany({ where: { apiId } }),
		prisma.endpoint.deleteMany({ where: { apiId } }),
		prisma.apiDocs.deleteMany({ where: { apiId } }),
		prisma.apiKey.deleteMany({ where: { apiId } }),
		prisma.apiLog.deleteMany({ where: { apiId } }),
	]);

	// Now safely delete the API
	const deletedAPI = await prisma.api.delete({ where: { id: apiId } });

	return c.json({
		message: "API and all related data deleted successfully",
		deletedAPI,
	});
};

// @DESC create or update API docs
// @route POST /api/v1/apis/:apiId/docs
// @private
export const createDocs = async (c: Context) => {
	const prisma = getPrisma(c);
	const apiId = c.req.param("apiId");
	const userId = c.get("userId"); // only owner can update

	if (!apiId) throw new BadRequestError("Missing API ID");

	const body = await c.req.json();
	const { content } = body;

	if (content === undefined) throw new BadRequestError("Missing content");

	// Verify user owns the API
	const api = await prisma.api.findUnique({
		where: { id: apiId },
		select: { ownerId: true },
	});

	if (!api) throw new BadRequestError("API not found");
	if (api.ownerId !== userId) throw new UnauthorizedError("Not authorized");

	// Check if docs already exist
	const existingDocs = await prisma.apiDocs.findFirst({
		where: { apiId },
	});

	let docs;
	if (existingDocs) {
		// Update existing
		docs = await prisma.apiDocs.update({
			where: { id: existingDocs.id },
			data: { content },
		});
	} else {
		// Create new
		docs = await prisma.apiDocs.create({
			data: { apiId, content },
		});
	}

	return c.json({ message: "Docs saved successfully", docs });
};

// @DESC get API docs by API ID
// @route GET /api/v1/apis/:apiId/docs
// @public
export const getDocs = async (c: Context) => {
	const prisma = getPrisma(c);
	const apiId = c.req.param("apiId");

	if (!apiId) throw new BadRequestError("Missing API ID");

	const docs = await prisma.apiDocs.findFirst({
		where: { apiId },
	});

	if (!docs) {
		return c.json({ content: "" }); // return empty string if no docs
	}

	return c.json({ content: docs.content });
};
