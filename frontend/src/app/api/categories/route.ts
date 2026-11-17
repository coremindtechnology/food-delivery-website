import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuCategory } from "@/models/MenuCategory";
import { Restaurant } from "@/models/Restaurant";
import { CreateCategorySchema } from "@/lib/validations/category";
import { PaginationQuerySchema, ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { verifyAdminPermissions } from "@/lib/admin-auth";

// GET /api/categories?restaurantId=&page=&limit=&search=&includeArchived=
export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);

    // restaurantId is required for category listing
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return errorResponse("restaurantId query parameter is required", 400);
    }
    const parsedId = ObjectIdSchema.safeParse(restaurantId);
    if (!parsedId.success) {
      return errorResponse("Invalid restaurantId format", 400);
    }

    const parsedQuery = PaginationQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "sortOrder",
      sortOrder: searchParams.get("sortOrder") ?? "asc",
      includeArchived: searchParams.get("includeArchived") ?? undefined,
    });

    const filter: Record<string, unknown> = {
      restaurantId,
      isArchived: { $ne: true },
      isActive: true,
    };
    if (parsedQuery.search) {
      const q = parsedQuery.search;
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (parsedQuery.page - 1) * parsedQuery.limit;
    const sortDirection = parsedQuery.sortOrder === "asc" ? 1 : -1;

    const [categories, totalCount] = await Promise.all([
      MenuCategory.find(filter)
        .sort({ [parsedQuery.sortBy]: sortDirection })
        .skip(skip)
        .limit(parsedQuery.limit)
        .lean(),
      MenuCategory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parsedQuery.limit);

    return successResponse(categories, 200, {
      page: parsedQuery.page,
      limit: parsedQuery.limit,
      totalCount,
      totalPages,
      hasNextPage: parsedQuery.page < totalPages,
      hasPrevPage: parsedQuery.page > 1,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = CreateCategorySchema.parse(body);

    // Verify the target restaurant exists
    const restaurant = await Restaurant.findOne({
      _id: validatedData.restaurantId,
      isArchived: false,
    });
    if (!restaurant) {
      return errorResponse("Restaurant not found", 404);
    }

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      validatedData.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    // Slug must be unique within a restaurant
    const existing = await MenuCategory.findOne({
      restaurantId: validatedData.restaurantId,
      slug: validatedData.slug,
    });
    if (existing) {
      return errorResponse(
        `Category with slug '${validatedData.slug}' already exists in this restaurant`,
        409
      );
    }

    const created = await MenuCategory.create(validatedData);
    return successResponse(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
