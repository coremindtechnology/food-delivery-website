import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { MenuItem } from "@/models/MenuItem";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ restaurant: string }>;
}

const MenuQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  categorySlug: z.string().trim().optional(),
  subcategorySlug: z.string().trim().optional(),
  search: z.string().trim().optional(),
  isPopular: z.coerce.boolean().optional(),
  isChefSpecial: z.coerce.boolean().optional(),
  sortBy: z.enum(["price", "name", "createdAt", "isPopular"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
});

// GET /api/restaurants/[restaurant]/menu  — Public endpoint, no auth required
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { restaurant: slug } = await params;

    // slug must be "veg" or "non-veg"
    const slugParsed = z.enum(["veg", "non-veg"]).safeParse(slug);
    if (!slugParsed.success) {
      return errorResponse("Invalid restaurant slug. Must be 'veg' or 'non-veg'.", 400);
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    // Resolve restaurantId from slug
    const restaurant = await Restaurant.findOne({
      slug: slugParsed.data,
      isArchived: false,
    })
      .select("_id name slug type accentColor deliveryTime minOrderAmount openingHours isOpen")
      .lean();

    if (!restaurant) {
      return errorResponse("Restaurant not found", 404);
    }

    const restaurantId = (restaurant._id as unknown as { toString: () => string }).toString();
    const parsedId = ObjectIdSchema.safeParse(restaurantId);
    if (!parsedId.success) {
      return errorResponse("Internal error resolving restaurant", 500);
    }

    const { searchParams } = new URL(req.url);
    const query = MenuQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      categorySlug: searchParams.get("categorySlug") ?? undefined,
      subcategorySlug: searchParams.get("subcategorySlug") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      isPopular: searchParams.get("isPopular") ?? undefined,
      isChefSpecial: searchParams.get("isChefSpecial") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      priceMin: searchParams.get("priceMin") ?? undefined,
      priceMax: searchParams.get("priceMax") ?? undefined,
    });

    const filter: Record<string, unknown> = {
      restaurantId: restaurantId,
      available: true,
      isArchived: { $ne: true },
    };

    if (query.categorySlug) filter.categorySlug = query.categorySlug;
    if (query.subcategorySlug) filter.subcategorySlug = query.subcategorySlug;
    if (query.isPopular !== undefined) filter.isPopular = query.isPopular;
    if (query.isChefSpecial !== undefined) filter.isChefSpecial = query.isChefSpecial;

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (query.priceMin !== undefined) priceFilter.$gte = query.priceMin;
      if (query.priceMax !== undefined) priceFilter.$lte = query.priceMax;
      filter.price = priceFilter;
    }

    if (query.search) {
      const q = query.search;
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      MenuItem.find(filter)
        .sort({ [query.sortBy]: sortDirection, name: 1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    return successResponse(
      { restaurant, items },
      200,
      {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
