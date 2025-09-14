import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import { Prisma } from "@prisma/client";


// @DESC get all endpionts for an api
// @route api/v1/apis/:apiId/endpoints POST
// @private

export const getAllEndpoints = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");

    if(!apiId) {
        throw new BadRequestError("Missing apiId");
    }

    const endpoints = await prisma.endpoint.findMany({
        where: {apiId}
    })

    return c.json(endpoints)
}

// @DESC get a signle endopint
// @route api/v1/apis/:apiId/endpoints POST
// @private

export const getEndpoint = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const endpointId = c.req.param("endpointId");

    if(!apiId || !endpointId) {
        throw new BadRequestError("Missing either apiId or endpointId");
    }

    const endpoint = await prisma.endpoint.findUnique({
        where: {
            apiId,
            id: endpointId,
        }
    })

    return c.json({endpoint})
}

// @DESC create endpoint for an api
// @route api/v1/apis/:apiId/endpoints POST
// @private

export const createEndpoint = async (c:Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");

    const body = await c.req.json();

    if(!body.path && !body.method) {
        throw new BadRequestError("Missing required fields");
    }

    if (body.queryParameters && !Array.isArray(body.queryParameters)) {
        throw new BadRequestError("queryParameters must be an array");
    }

    if (body.bodyParameters && !Array.isArray(body.bodyParameters)) {
        throw new BadRequestError("bodyParameters must be an array");
    }

    if (body.headers && !Array.isArray(body.headers)) {
        throw new BadRequestError("Headers must be an array");
    }

    const queryParams: Prisma.JsonValue = body.queryParameters || [];
    const bodyParams: Prisma.JsonValue = body.bodyParameters || [];
    const headers: Prisma.JsonValue = body.headers || [];

    const endpointDetials : any = {
        apiId,
        path: body.path,
        method: body.method,
        description: body.description,
        queryParameters: queryParams,
        bodyParameters: bodyParams,
        bodyContentType: body.bodyContentType,
        headers: headers,
        authRequired: body.authRequired
    }

    const endpoint = await prisma.endpoint.create({
        data: endpointDetials
    })


    return c.json({
        message: "Endpoint created successfully",
        endpoint
    })
}


// @DESC create endpoint for an api
// @route api/v1/apis/:apiId/endpoints/:endpointId PATCH
// @private

export const updateEndpoint = async (c:Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const endpointId = c.req.param("endpointId");

    if(!apiId || !endpointId) {
        throw new BadRequestError("Missing either api or endpoint id");
    }

    const endpoint = await prisma.endpoint.findUnique({
        where: {
            apiId,
            id: endpointId
        },
        include: {api: true}
    })

    if(!endpoint) {
        throw new BadRequestError("Endpoint not found");
    }


    // Check if the logged-in user is the owner
    const loggedInUserId = c.get("userId");
    if (endpoint.api.ownerId !== loggedInUserId) {
        throw new ForbiddenError("You cannot modify this endpoint");
    }

    const body = await c.req.json();

    if (!body || Object.keys(body).length === 0) {
        throw new BadRequestError("No fields provided to update");
    }

    if (body.queryParameters && !Array.isArray(body.queryParameters)) {
        throw new BadRequestError("queryParameters must be an array");
    }

    if (body.bodyParameters && !Array.isArray(body.bodyParameters)) {
        throw new BadRequestError("bodyParameters must be an array");
    }

    if (body.headers && !Array.isArray(body.headers)) {
        throw new BadRequestError("Headers must be an array");
    }

    const updateData : any = {}

    const allowedField = ["path", "description", "method", "queryParameters", "bodyParameters", "bodyContentType", "headers", "authRequired"];

    for(const field of allowedField) {
        if(body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    const updatedEndpoint = await prisma.endpoint.update({
        where: {
            apiId,
            id: endpointId
        },
        data: updateData
    })

    return c.json({
        message: "Endpoint updated successfully!",
        updatedEndpoint
    })
}


// @DESC create endpoint for an api
// @route api/v1/apis/:apiId/endpoints/:endpointId DELETE
// @private

export const deleteEndpoint = async (c:Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const endpointId = c.req.param("endpointId");

    if(!apiId || !endpointId) {
        throw new BadRequestError("Missing either api or endpoint id");
    }

    const endpoint = await prisma.endpoint.findUnique({
        where: {
            apiId,
            id: endpointId
        },
        include: {api: true}
    })

    if(!endpoint) {
        throw new BadRequestError("Endpoint not found");
    }

    // Check if the logged-in user is the owner
    const loggedInUserId = c.get("userId");
    if (endpoint.api.ownerId !== loggedInUserId) {
        throw new ForbiddenError("You cannot modify this endpoint");
    }

    await prisma.endpoint.delete({
        where: {
            apiId,
            id: endpointId
        }
    })

    return c.json({
        message: "Deleted endpoint successfully!",
        endpoint
    })
}


// @DESC Test an endpoint (GET, POST, PATCH, etc.)
// @route POST /api/v1/endpoints/:endpointId/test
// @private

export const testEndpoint = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");
    const endpointId = c.req.param("endpointId");

    if (!apiId || !endpointId) {
        throw new BadRequestError("Missing apiId or endpointId");
    }

    // Fetch endpoint and its parent API
    const endpoint = await prisma.endpoint.findUnique({
        where: { apiId, id: endpointId },
        include: { api: true }
    });

    if (!endpoint) throw new BadRequestError("Endpoint not found");

    // Authorization: if endpoint requires auth, only owner can test
    if (endpoint.authRequired) {
        const loggedInUserId = c.get("userId");
        if (endpoint.api.ownerId !== loggedInUserId) {
            throw new ForbiddenError("You are not authorized to test this endpoint");
        }
    }

    // Read frontend request
    const body = await c.req.json();
    const queryParams = body.parameters?.queryParams || {};
    const bodyParams = body.parameters?.bodyParams || {};
    const overrideHeaders = body.headers || {};

    // Build full URL
    let url = `${endpoint.api.baseUrl.replace(/\/+$/, "")}/${endpoint.path.replace(/^\/+/, "")}`;

    // Replace path parameters like /:id
    const pathMatches = url.match(/:\w+/g);
    if (pathMatches) {
        for (const match of pathMatches) {
            const key = match.substring(1);
            const value = queryParams[key] ?? bodyParams[key];
            if (value === undefined) {
                throw new BadRequestError(`Missing path parameter: ${key}`);
            }
            url = url.replace(match, encodeURIComponent(value));
            // Remove used params so they aren't added again to query/body
            delete queryParams[key];
            delete bodyParams[key];
        }
    }

    // Initialize fetch options
    const fetchOptions: RequestInit = {
        method: endpoint.method.toUpperCase(),
        headers: {
            ...(endpoint.headers as Record<string, string> || {}),
            ...overrideHeaders
        }
    };

    // Only add base if url is relative
    let urlObj: URL;
    if (url.startsWith("http")) {
        urlObj = new URL(url);
    } else {
        urlObj = new URL(url, "http://localhost");
    }
    // Then append query params
    Object.entries(queryParams).forEach(([key, val]) => {
        // Validate enum values if needed
        const paramMeta = (endpoint.queryParameters as any)?.find((p: any) => p.name === key);
        if (paramMeta?.type === "enum" && paramMeta.enumValues) {
            if (!paramMeta.enumValues.includes(val as string)) {
                throw new BadRequestError(`Invalid value for enum parameter ${key}: ${val}`);
            }
        }
        urlObj.searchParams.set(key, String(val));
    });
    
    url = urlObj.toString(); // full absolute URL

    // Handle request body for POST/PUT/PATCH
    if (fetchOptions.method !== "GET") {
        if (endpoint.bodyContentType === "form-data") {
            const formData = new FormData();
            Object.entries(bodyParams).forEach(([key, val]) => formData.append(key, val as any));
            fetchOptions.body = formData;
        } else {
            fetchOptions.body = JSON.stringify(bodyParams);
            fetchOptions.headers = { "Content-Type": "application/json", ...fetchOptions.headers };
        }
    }

    // Perform the external API call
    let response, responseData, responseHeaders = {}, isError = false;

    try {
        response = await fetch(url, fetchOptions);
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }
        response.headers.forEach((val, key) => { responseHeaders[key] = val; });
        if (!response.ok) isError = true;
    } catch (err) {
        isError = true;
        responseData = { error: "Failed to fetch endpoint", details: err instanceof Error ? err.message : String(err) };
    }

    // Update totalCalls and errorCount
    try {
        await prisma.endpoint.update({
            where: { apiId, id: endpointId },
            data: {
                totalCalls: { increment: 1 },
                errorCount: isError ? { increment: 1 } : undefined
            }
        });
    } catch {
        // silently ignore errors
    }

    // Return result to frontend
    return c.json({
        success: !isError,
        status: response?.status || 500,
        data: responseData,
        headers: responseHeaders
    });
};
