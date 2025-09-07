import { HTTPException } from "hono/http-exception";
import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

// type ErrorHandler = (err:Error, c:Context) => Response | Promise<Response>

export const errorHandler : ErrorHandler = (err, c) => {
    // If a HTTPException or Custom Error
    if (err instanceof HTTPException) {
        return err.getResponse();
    }

    // zod errors
    if (err instanceof ZodError) {
        // format Zod errors nicely
        const formatted = err.issues.map(e => ({
            field: e.path.join("."),
            message: e.message,
        }));
        return c.json(
            { statusCode: 400, title: "ValidationError", errors: formatted },
            400
        );
    }


    // Catch JSON parsing errors or other runtime errors
    if(err instanceof SyntaxError) {
        return c.json({
            statusCode: 400,
            title: "Syntax Error",
            message: err instanceof SyntaxError ? err.message : "Syntax error",
        }, 400 );
    }

    // Fallback for other unhandled errors
    return c.json({
        statusCode: 500,
        title: "Interal Server Error",
        message: err.message || "Something went wrong"
    }, 500);
}
