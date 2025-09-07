import { HTTPException } from "hono/http-exception";


export class BadRequestError extends HTTPException {
  constructor(message = "Bad Request Error") {
    super(400, {
      res: new Response(
        JSON.stringify({
          statusCode: 400,
          title: "BadRequestError",
          message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}



export class ForbiddenError extends HTTPException {
  constructor(message = "Forbidden Error") {
    super(403, {
      res: new Response(
        JSON.stringify({
          statusCode: 403,
          title: "ForbiddenError",
          message,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}


export class UnauthorizedError extends HTTPException {
  constructor(message = "Unauthorized Error") {
    super(401, {
      res: new Response(
        JSON.stringify({
          statusCode: 401,
          title: "UnauthorizedError",
          message,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}

export class NotFoundError extends HTTPException {
  constructor(message = "Not Found Error") {
    super(404, {
      res: new Response(
        JSON.stringify({
          statusCode: 404,
          title: "NotFoundError",
          message,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}

export class ConflictError extends HTTPException {
  constructor(message = "Conflict Error") {
    super(409, {
      res: new Response(
        JSON.stringify({
          statusCode: 409,
          title: "ConflictError",
          message,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}

export class TooManyRequestsError extends HTTPException {
  constructor(message = "Too Many Requests Error") {
    super(429, {
      res: new Response(
        JSON.stringify({
          statusCode: 429,
          title: "TooManyRequestsError",
          message,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}

export class InternalServerError extends HTTPException {
  constructor(message = "Internal Server Error") {
    super(500, {
      res: new Response(
        JSON.stringify({
          statusCode: 500,
          title: "InternalServerError",
          message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
    });
  }
}
