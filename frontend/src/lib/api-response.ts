import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function successResponse<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function errorResponse(error: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function handleApiError(err: unknown) {
  console.error("API Route Error:", err);

  if (err instanceof ZodError) {
    const formatted = err.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return errorResponse("Request validation failed", 400, formatted);
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  return errorResponse(message, 500);
}

