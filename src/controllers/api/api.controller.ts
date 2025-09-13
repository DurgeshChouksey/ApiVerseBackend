import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { describe } from "node:test";
import { BadRequestError } from "../../utils/errors";
import { isValidBase64URL } from "zod/v4/core";
import { promise } from "zod";


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

    const apiDetails : any = {
        ownerId,
        name: body.name,
        baseUrl: body.baseUrl,
        category: body.category,
        description: body.description,
        visibility: body.visibility || "public"
    }

    if (body.logo) {
        apiDetails.logo = body.logo;
    }

    const newApi = await prisma.api.create({
        data: apiDetails
    })



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
        visibility: "public"
    };

    if (category) {
        where.category = category;
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
            take: limit
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
            take: limit
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
        where: {
            id: apiId
        }
    })

    if(!api) {
        throw new BadRequestError("Invalid api Id");
    }


    return c.json(api);
}

