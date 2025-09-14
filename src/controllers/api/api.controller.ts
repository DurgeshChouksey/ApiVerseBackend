import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { describe } from "node:test";
import { BadRequestError, InternalServerError, UnauthorizedError } from "../../utils/errors";
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

    const api = await prisma.api.update({
        where: {
            id: apiId
        },
        data: { totalViews: { increment: 1 } },
        include: {
            // this will include details of connected owner and endpoints
            owner: true,
            endpoints: true
        }
    })

    if(!api) {
        throw new BadRequestError("Invalid api Id");
    }

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

    const allowedField = ["name", "description", "category", "baseUrl", "visibility", "logo"];

    for(const field of allowedField) {
        if(body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    const updatedAPI = await prisma.api.update({
        where: {id: apiId},
        data: updateData
    })

    if(!updateAPI) {
        throw new InternalServerError("Something went wrong");
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
