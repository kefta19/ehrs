import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const unauthorized = (m = "Please sign in to continue") =>
  new HttpError(401, m);
export const forbidden = (m = "You do not have permission to do this") =>
  new HttpError(403, m);
export const notFound = (m = "Not found") => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
  );
}

/** Wrap a route handler body so every error becomes a clean JSON response. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: err.message, details: err.details },
        { status: err.status },
      );
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: err.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Please sign in to continue" },
        { status: 401 },
      );
    }
    if (err instanceof Error && err.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "You do not have permission to do this" },
        { status: 403 },
      );
    }
      console.error("API error:", err);
      const detail =
        process.env.NODE_ENV !== "production" && err instanceof Error
          ? err.message
          : undefined;
      return NextResponse.json(
        {
          success: false,
          error: detail
            ? `Server error: ${detail.slice(0, 300)}`
            : "Something went wrong. Please try again.",
        },
        { status: 500 },
      );
  }
}
