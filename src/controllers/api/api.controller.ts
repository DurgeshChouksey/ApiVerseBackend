import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { describe } from "node:test";
import { BadRequestError, InternalServerError, UnauthorizedError } from "../../utils/errors";
import { isValidBase64URL } from "zod/v4/core";
import { promise } from "zod";
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
    if (body.providerAuthType && !allowedAuthTypes.includes(body.providerAuthType)) {
        throw new BadRequestError(`Invalid providerAuthType. Allowed values: ${allowedAuthTypes.join(", ")}`);
    }

    const apiDetails : any = {
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
        providerAuthKey: body.providerAuthKey ? await encrypt(body.providerAuthKey) : null
    }

    if (body.logo) {
        apiDetails.logo = body.logo;
    }

    const newApi = await prisma.api.create({
        data: apiDetails
    })

    if(!newApi) {
        throw new BadRequestError("Something went wrong");
    }

    // generate key for owner if it is required
    if(body.requiresApiKey) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const key = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

        await prisma.apiKey.create({
            data: {
                apiId: newApi.id,
                userId: ownerId,
                key
            }
        });
    }


    return c.json({message: "API created successfully", api: newApi })
}


// @DSEC get all public api's for discovery page
// @route /api/v1/apis GET
// @public
export const getPublicAPI = async (c: Context) => {
    const prisma = getPrisma(c);

    const category = c.req.query("category");
    const sort = c.req.query("sort");
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "10", 10);
    const skip = (page - 1) * limit; //offset

    // Build where clause
    const where: any = {
        // we only want to see public api
        visibility: "public"
    };

    if (category) {
        // to filter by categoru
        where.category = category;
    }

    // search filter (the value people put in search bar)
    const filter = c.req.query("filter");

    if (filter) {
        // if filter string is present in either name OR descriptoin
        where.OR = [
            { name: { contains: filter, mode: "insensitive" } },
            { description: { contains: filter, mode: "insensitive" } }
        ];
    }

    // Determine orderBy clause
    let orderBy: any = { createdAt: "desc" };
    const sortFieldMap: Record<string, string> = {
        views: "totalViews",
        rating: "averageRating",
        createdAt: "createdAt"
    };
    // [expression] lets you compute the object key dynamically.
    // otherwise it will be "sortFieldMap[sort]" a key
    if (sort && sortFieldMap[sort]) {
        orderBy = {[sortFieldMap[sort]]: "desc"}
    }

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
                        email: true
                    }
                },
                apiLogs: true,
                _count: { select: { endpoints: true } }
            }
        }),
        prisma.api.count({ where })
    ]);

    return c.json({
        apis,
        total,
        page,
        limit
    });
}


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
    const limit = parseInt(c.req.query("limit") || "10", 10);
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
                { description: { contains: filter, mode: "insensitive" } }
            ]
        };
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    const sortFieldMap: Record<string, string> = {
        views: "totalViews",
        rating: "averageRating",
        createdAt: "createdAt"
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
                                email: true
                            }
                        },
                        apiLogs: true,
                    }
                }
            }
        }),
        prisma.subscription.count({ where })
    ]);

    const apis = subscriptions.map(sub => sub.api);

    return c.json({
        apis,
        total,
        page,
        limit
    });
};


// @DSEC get personal api's for workspace
// @route /api/v1/apis GET
// @private
export const getMyAPI = async (c:Context) => {
    const prisma = getPrisma(c);
    const userId = c.get("userId");

    const category = c.req.query("category");
    const sort = c.req.query("sort");
    const page = parseInt(c.req.query("page") || "1", 10);
    const limit = parseInt(c.req.query("limit") || "10", 10);
    const skip = (page - 1) * limit; // offset


    // Build where clause
    const where: any = {
        ownerId: userId
    };

    if(category) {
        where.category = category;
    }

    // search filter (the value people put in search bar)
    const filter = c.req.query("filter");

    if (filter) {
        // if filter string is present in either name OR descriptoin
        where.OR = [
            { name: { contains: filter, mode: "insensitive" } },
            { description: { contains: filter, mode: "insensitive" } }
        ];
    }

    // Determin order by
    let orderBy : any = {createdAt: "desc"};

    const sortFieldMap : Record<string, string> = {
        views: "totalViews",
        rating: "averageRating",
        createdAt: "createdAt"
    }
    if(sort && sortFieldMap[sort]) {
        orderBy = {[sortFieldMap[sort]]: "desc"};
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
                        email: true
                    }
                },
                apiLogs: true,
            }
        }),
        prisma.api.count({
            where
        })
    ]);

    if(!apis) {
        throw new BadRequestError("No api present");
    }


    return c.json({
        apis,
        total,
        page,
        limit
    });

}


// @DSEC get api by id, to view an api
// @route /api/v1/apis/:apiId GET
// @public
export const getAPIById = async (c: Context) => {
    const prisma = getPrisma(c);

    const apiId = c.req.param("apiId");

    if(!apiId) {
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
            logo: true,
            totalViews: true,
            createdAt: true,
            updatedAt: true,
            owner: {
                select: {
                    id: true,
                    username: true,
                    email: true
                }
            },
            endpoints: {
                include: {
                    endpointLogs: true,
                }
            },
            apiLogs: true,
        }
    });

    if (!api) {
        throw new BadRequestError("Invalid API ID");
    }

    // Increment views safely
    await prisma.api.update({
        where: { id: apiId },
        data: { totalViews: { increment: 1 } }
    });

    return c.json(api);
}


// @DSEC updating api details
// @route /api/v1/apis/:apiId PATCH
// @private
export const updateAPI = async (c: Context) => {
    const prisma = getPrisma(c);

    const apiId = c.req.param("apiId");
    if(!apiId) {
        throw new BadRequestError("Missing API ID");
    }

    const userId = c.get("userId");

    const isUserAuthorized = await prisma.api.findUnique({
        where: {
            ownerId: userId,
            id: apiId
        }
    })

    if(!isUserAuthorized) {
        throw new UnauthorizedError("You are not authorized to update API");
    }

    const body = await c.req.json();

    if (!body || Object.keys(body).length === 0) {
        throw new BadRequestError("No fields provided to update");
    }

    const updateData : any = {}

    const allowedField = ["name", "description", "category", "baseUrl", "visibility", "logo", "requiresApiKey", "providerAuthType", "providerAuthLocation", "providerAuthField"];

    // encrypt providers key
    if(body.providerAuthKey) {
        updateData.providerAuthKey = encrypt(body.providerAuthKey);
    }

    for(const field of allowedField) {
        if(body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    const updatedAPI = await prisma.api.update({
        where: {id: apiId},
        data: updateData
    })

    if(!updatedAPI) {
        throw new InternalServerError("Something went wrong");
    }

    if(body.requiresApiKey) {
        // generate key for owner if it is required
        if(body.requiresApiKey) {
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
        }
    }

    return c.json({message: "API updatd successfully", updatedAPI});
}


// @DESC delete api
// @route api/v1/apis/:apidId DELETE
// @private
export const deleteAPI = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");

    if(!apiId) {
        throw new BadRequestError("Missing apiId");
    }

    const userId = c.get("userId");

    const isUserAuthorized = await prisma.api.findUnique({
        where: {
            ownerId: userId,
            id: apiId
        }
    })

    if(!isUserAuthorized) {
        throw new UnauthorizedError("You are not authorized to delete API");
    }

    const deletedAPI = await prisma.api.delete({
        where: {id: apiId},
    })

    return c.json({
        message: "API deleted successfully",
        deletedAPI
    })
}
