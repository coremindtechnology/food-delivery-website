import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { UpdateRestaurantSchema } from "@/lib/validations/restaurant";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ restaurant: string }>;
}

// GET /api/restaurants/[restaurant]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { restaurant: id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid restaurant ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const restaurant = await Restaurant.findOne({ _id: id, isArchived: false }).lean();
    if (!restaurant) {
      return errorResponse("Restaurant not found", 404);
    }

    return successResponse(restaurant);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/restaurants/[restaurant]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { restaurant: id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid restaurant ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = UpdateRestaurantSchema.parse(body);

    // If updating slug, check it's not taken by another restaurant
    if (validatedData.slug) {
      const slugConflict = await Restaurant.findOne({
        slug: validatedData.slug,
        _id: { $ne: id },
        isArchived: false,
      });
      if (slugConflict) {
        return errorResponse(`Restaurant slug '${validatedData.slug}' is already in use`, 409);
      }
    }

    const updated = await Restaurant.findOneAndUpdate(
      { _id: id, isArchived: false },
      { $set: validatedData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return errorResponse("Restaurant not found", 404);
    }

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/restaurants/[restaurant]  — soft archive only, never hard delete
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { restaurant: id } = await params;

    const parsed = ObjectIdSchema.safeParse(id);
    if (!parsed.success) {
      return errorResponse("Invalid restaurant ID format", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const archived = await Restaurant.findOneAndUpdate(
      { _id: id, isArchived: false },
      { $set: { isArchived: true } },
      { new: true }
    ).lean();

    if (!archived) {
      return errorResponse("Restaurant not found or already archived", 404);
    }

    return successResponse({ message: "Restaurant archived successfully", id });
  } catch (err) {
    return handleApiError(err);
  }
}
