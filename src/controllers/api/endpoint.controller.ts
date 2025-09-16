import { Context } from "hono";
import { getPrisma } from "../../prisma.setup/client";
import { BadRequestError, ForbiddenError } from "../../utils/errors";
import { Prisma } from "@prisma/client";
import { decrypt } from "../../utils/crypto";


// @DESC get all endpionts for an api
// @route api/v1/apis/:apiId/endpoints POST
// @private

export const getAllEndpoints = async (c: Context) => {
    const prisma = getPrisma(c);
    const apiId = c.req.param("apiId");

    const where: any = {
        apiId
    };

    // search filter (the value people put in search bar)
    const filter = c.req.query("filter");

    if (filter) {
        // if filter string is present in either name OR descriptoin
        where.OR = [
            { name: { contains: filter, mode: "insensitive" } },
            { description: { contains: filter, mode: "insensitive" } }
        ];
    }


    if(!apiId) {
        throw new BadRequestError("Missing apiId");
    }

    const endpoints = await prisma.endpoint.findMany({
        where,
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
        },
        include:{
            endpointLogs: true,
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
        name: body.name,
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

    const allowedField = ["name", "path", "description", "method", "queryParameters", "bodyParameters", "bodyContentType", "headers", "authRequired"];

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

    if (!apiId || !endpointId) throw new BadRequestError("Missing apiId or endpointId");

    const endpoint = await prisma.endpoint.findUnique({ where: { apiId, id: endpointId }, include: { api: true } });
    if (!endpoint) throw new BadRequestError("Endpoint not found");

    const loggedInUserId = c.get("userId");

    await authorizeEndpointTest(c, endpoint, loggedInUserId);

    const body = await c.req.json();
    const { url, fetchOptions } = await buildEndpointRequest(endpoint, body);

    const { responseData, responseHeaders, status, success } = await performFetchAndLog(c, endpoint.id, loggedInUserId || null, url, fetchOptions);

    return c.json({ success, status, data: responseData, headers: responseHeaders });
};


// HELPER FUNCTOINS FOR TEST ENDPOINT

// authorizeEndpointTest – handles requiresApiKey check:
export async function authorizeEndpointTest(c: Context, endpoint: any, loggedInUserId: string | undefined) {
    const prisma = getPrisma(c);
    if (!endpoint.api.requiresApiKey) return;

    let validKey = false;
    if (endpoint.api.ownerId === loggedInUserId) validKey = true;

    if (!validKey && loggedInUserId) {
        const providedKey = c.req.header("x-api-key");
        if (!providedKey) throw new ForbiddenError("API key required");

        const userApiKey = await prisma.apiKey.findUnique({
            where: { apiId_userId: { apiId: endpoint.apiId, userId: loggedInUserId } }
        });

        if (!userApiKey || !userApiKey.active || userApiKey.key !== providedKey) {
            throw new ForbiddenError("Invalid API key");
        }
        validKey = true;
    }

    if (!validKey) throw new ForbiddenError("API key validation failed");
}

// buildEndpointRequest – build URL, inject provider key, headers, query/body params:
export async function buildEndpointRequest(endpoint: any, body: any) {
    // Build the base URL
    let url = `${endpoint.api.baseUrl.replace(/\/+$/, "")}/${endpoint.path.replace(/^\/+/, "")}`;

    // Replace path parameters
    const pathMatches = url.match(/:\w+/g);
    if (pathMatches) {
        for (const match of pathMatches) {
            const key = match.substring(1);
            const value = body.queryParams?.[key] ?? body.bodyParams?.[key];
            if (value === undefined) throw new BadRequestError(`Missing path parameter: ${key}`);
            url = url.replace(match, encodeURIComponent(value));
        }
    }

    // Create URL object safely
    let urlObj: URL;
    try {
        urlObj = new URL(url);
    } catch {
        urlObj = new URL(url, "http://localhost");
    }

    // Create fetchOptions
    const fetchOptions: RequestInit = {
        method: endpoint.method.toUpperCase(),
        headers: {
            ...headersArrayToObject(endpoint.headers as any || []),
            ...headersArrayToObject(body.headers || [])
        }
    };

    // Inject provider API key
    const { providerAuthType, providerAuthLocation, providerAuthField, providerAuthKey } = endpoint.api;
    if (providerAuthType === "apiKey" && providerAuthKey && providerAuthField && providerAuthLocation) {
        const decryptedKey: string = await decrypt(providerAuthKey);
        if (providerAuthLocation === "header") {
            (fetchOptions.headers as Record<string, string>)[providerAuthField] = decryptedKey;
        } else if (providerAuthLocation === "query") {
            urlObj.searchParams.set(providerAuthField, decryptedKey);
        }
    }

    // Append user query params
    Object.entries(body.queryParams || {}).forEach(([key, val]) =>
        urlObj.searchParams.set(key, String(val))
    );

    // Handle request body
    if (fetchOptions.method !== "GET") {
        if (endpoint.bodyContentType === "form-data") {
            const formData = new FormData();
            Object.entries(body.bodyParams || {}).forEach(([k, v]) => formData.append(k, v as any));
            fetchOptions.body = formData;
        } else {
            fetchOptions.body = JSON.stringify(body.bodyParams || {});
            fetchOptions.headers = { "Content-Type": "application/json", ...fetchOptions.headers };
        }
    }

    console.log(urlObj.toString());
    return { url: urlObj.toString(), fetchOptions };
}

// performFetchAndLog – perform fetch, calculate latency, log endpoint call:
export async function performFetchAndLog(c: Context, endpointId: string, loggedInUserId: string | null, url: string, fetchOptions: RequestInit) {
    let response, responseData: any, responseHeaders: Record<string,string> = {}, isError = false;
    const startTime = Date.now();

    try {
        response = await fetch(url, fetchOptions);
        const contentType = response.headers.get("content-type") || "";
        responseData = contentType.includes("application/json") ? await response.json() : await response.text();
        response.headers.forEach((val, key) => responseHeaders[key] = val);
        if (!response.ok) isError = true;
    } catch (err) {
        isError = true;
        responseData = { error: "Failed to fetch endpoint", details: err instanceof Error ? err.message : String(err) };
    }

    const latency = Date.now() - startTime;
    await logEndpointCall(c, endpointId, loggedInUserId, !isError, latency, isError ? responseData.error || null : null);

    return { responseData, responseHeaders, status: response?.status || 500, success: !isError };
}

// updagint logs for both endpoint and api
export async function logEndpointCall(
    c: Context,
    endpointId: string,
    userId: string | null,
    success: boolean,
    latency: number,
    errorMessage: string | null = null
) {

    const prisma = getPrisma(c);

    // 1️⃣ Log the endpoint call
    await prisma.endpointLog.create({
        data: {
            endpointId,
            userId,
            success,
            latency,
            errorMessage
        }
    });

    // 2️⃣ Fetch the API ID for this endpoint
    const endpoint = await prisma.endpoint.findUnique({
        where: { id: endpointId },
        select: { apiId: true }
    });
    if (!endpoint) return;

    const apiId = endpoint.apiId;

    // 3️⃣ Update or create aggregated API log
    const existingApiLog = await prisma.apiLog.findFirst({
        where: { apiId }
    });

    if (existingApiLog) {
        // Calculate new average latency
        const newTotalCalls = existingApiLog.totalCalls + 1;
        const newTotalErrors = existingApiLog.totalErrors + (success ? 0 : 1);
        const newAvgLatency = (existingApiLog.averageLatency! * existingApiLog.totalCalls + latency) / newTotalCalls;

        await prisma.apiLog.update({
            where: { id: existingApiLog.id },
            data: {
                totalCalls: newTotalCalls,
                totalErrors: newTotalErrors,
                averageLatency: newAvgLatency
            }
        });
    } else {
        // No API log exists yet, create one
        await prisma.apiLog.create({
            data: {
                apiId,
                totalCalls: 1,
                totalErrors: success ? 0 : 1,
                averageLatency: latency
            }
        });
    }
}


function headersArrayToObject(headersArray: Array<{name: string, value: string}>) {
    const obj: Record<string, string> = {};
    headersArray.forEach(h => { obj[h.name] = h.value; });
    return obj;
}
