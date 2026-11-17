import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuImage } from "@/models/MenuImage";
import { ObjectIdSchema } from "@/lib/validations/common";
import { errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!ObjectIdSchema.safeParse(id).success) {
      return errorResponse("Invalid image ID.", 400);
    }
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const image = await MenuImage.findById(id).select("contentType data").lean();
    if (!image) {
      return errorResponse("Image not found.", 404);
    }

    const body = new Uint8Array(image.data.byteLength);
    body.set(image.data);
    return new NextResponse(body.buffer, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
