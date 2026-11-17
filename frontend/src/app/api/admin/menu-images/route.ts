import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { MenuImage } from "@/models/MenuImage";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const formData = await req.formData();
    const restaurantId = formData.get("restaurantId");
    const file = formData.get("image");
    const parsedRestaurantId = ObjectIdSchema.safeParse(restaurantId);
    if (!parsedRestaurantId.success) {
      return errorResponse("A valid restaurantId is required.", 400);
    }
    if (!(file instanceof File)) {
      return errorResponse("Select an image file to upload.", 400);
    }
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return errorResponse("Upload a JPEG, PNG, WebP, or GIF image.", 415);
    }
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      return errorResponse("Image must be larger than 0 bytes and no larger than 2 MB.", 413);
    }

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      parsedRestaurantId.data
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const image = await MenuImage.create({
      restaurantId: parsedRestaurantId.data,
      contentType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
    });

    return successResponse({ imageUrl: `/api/menu-images/${image._id}` }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
