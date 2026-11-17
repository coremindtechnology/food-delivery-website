import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { Restaurant } from "@/models/Restaurant";
import { MenuCategory } from "@/models/MenuCategory";
import { CreateMenuItemSchema } from "@/lib/validations/menu-item";
import { PaginationQuerySchema, ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { InventoryMovement } from "@/models/InventoryMovement";

// Extended query schema for menu items
const MenuItemQuerySchema = PaginationQuerySchema.extend({
  restaurantId: ObjectIdSchema,
  categoryId: ObjectIdSchema.optional(),
  categorySlug: z.string().trim().optional(),
  subcategorySlug: z.string().trim().optional(),
  isPopular: z.coerce.boolean().optional(),
  isChefSpecial: z.coerce.boolean().optional(),
  isVeg: z.coerce.boolean().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
});

// GET /api/menu-items?restaurantId=&categoryId=&categorySlug=&search=&isVeg=&priceMin=&priceMax=&isPopular=&sortBy=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);

    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return errorResponse("restaurantId query parameter is required", 400);
    }

    const parsedQuery = MenuItemQuerySchema.parse({
      restaurantId,
      categoryId: searchParams.get("categoryId") ?? undefined,
      categorySlug: searchParams.get("categorySlug") ?? undefined,
      subcategorySlug: searchParams.get("subcategorySlug") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "sortOrder",
      sortOrder: searchParams.get("sortOrder") ?? "desc",
      includeArchived: searchParams.get("includeArchived") ?? undefined,
      isPopular: searchParams.get("isPopular") ?? undefined,
      isChefSpecial: searchParams.get("isChefSpecial") ?? undefined,
      isVeg: searchParams.get("isVeg") ?? undefined,
      priceMin: searchParams.get("priceMin") ?? undefined,
      priceMax: searchParams.get("priceMax") ?? undefined,
    });

    const filter: Record<string, unknown> = { restaurantId: parsedQuery.restaurantId };

    const activeCategoryIds = await MenuCategory.find({
      restaurantId: parsedQuery.restaurantId,
      isArchived: { $ne: true },
      isActive: true,
    }).distinct("_id");
    filter.isArchived = { $ne: true };
    filter.available = true;
    filter.inStock = true;
    filter.inventoryCount = { $gt: 0 };
    filter.categoryId = { $in: activeCategoryIds };

    if (parsedQuery.categoryId) {
      filter.categoryId = { $in: activeCategoryIds, $eq: parsedQuery.categoryId };
    }
    if (parsedQuery.categorySlug) {
      const category = await MenuCategory.findOne({
        restaurantId: parsedQuery.restaurantId,
        slug: parsedQuery.categorySlug,
        isArchived: { $ne: true },
        isActive: true,
      }).select("_id");
      filter.categoryId = category?._id || { $in: [] };
    }
    if (parsedQuery.subcategorySlug) filter.subcategorySlug = parsedQuery.subcategorySlug;
    if (parsedQuery.isPopular !== undefined) filter.isPopular = parsedQuery.isPopular;
    if (parsedQuery.isChefSpecial !== undefined) filter.isChefSpecial = parsedQuery.isChefSpecial;
    if (parsedQuery.isVeg !== undefined) filter.isVeg = parsedQuery.isVeg;

    // Price range filter
    if (parsedQuery.priceMin !== undefined || parsedQuery.priceMax !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (parsedQuery.priceMin !== undefined) priceFilter.$gte = parsedQuery.priceMin;
      if (parsedQuery.priceMax !== undefined) priceFilter.$lte = parsedQuery.priceMax;
      filter.price = priceFilter;
    }

    // Full text search (falls back to regex if no text index available)
    if (parsedQuery.search) {
      const q = parsedQuery.search;
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (parsedQuery.page - 1) * parsedQuery.limit;
    const sortDirection = parsedQuery.sortOrder === "asc" ? 1 : -1;

    const [items, totalCount] = await Promise.all([
      MenuItem.find(filter)
        .sort({ [parsedQuery.sortBy]: sortDirection, name: 1 })
        .skip(skip)
        .limit(parsedQuery.limit)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parsedQuery.limit);

    return successResponse(items, 200, {
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

// POST /api/menu-items
export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = CreateMenuItemSchema.parse(body);

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager", "menu_manager", "veg_manager", "nonveg_manager"],
      validatedData.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findOne({
      _id: validatedData.restaurantId,
      isArchived: false,
    });
    if (!restaurant) {
      return errorResponse("Restaurant not found", 404);
    }

    // Verify category belongs to the same restaurant
    const category = await MenuCategory.findOne({
      _id: validatedData.categoryId,
      restaurantId: validatedData.restaurantId,
      isArchived: { $ne: true },
      isActive: true,
    });
    if (!category) {
      return errorResponse(
        "Category not found or does not belong to the specified restaurant",
        404
      );
    }

    // Check if isVeg matches restaurant type
    if (restaurant.type === "veg" && !validatedData.isVeg) {
      return errorResponse(
        "Cannot add non-vegetarian items to a vegetarian restaurant",
        422
      );
    }

    // Slug uniqueness within restaurant
    const existing = await MenuItem.findOne({
      restaurantId: validatedData.restaurantId,
      slug: validatedData.slug,
    });
    if (existing) {
      return errorResponse(
        `Menu item with slug '${validatedData.slug}' already exists in this restaurant`,
        409
      );
    }

    const requestedAvailability = validatedData.available;
    const created = await MenuItem.create({
      ...validatedData,
      categorySlug: category.slug,
      available: validatedData.inventoryCount > 0 ? false : requestedAvailability,
      inStock: validatedData.inventoryCount > 0,
    });
    if (validatedData.inventoryCount > 0) {
      try {
        await InventoryMovement.create({
          restaurantId: created.restaurantId,
          menuItemId: created._id,
          movementType: "restock",
          quantity: validatedData.inventoryCount,
          previousCount: 0,
          newCount: validatedData.inventoryCount,
          reason: "Initial stock",
          performedByAdminId: authCheck.admin!._id,
        });
      } catch (err) {
        await MenuItem.deleteOne({ _id: created._id, available: false });
        throw err;
      }
    }
    const item = validatedData.inventoryCount > 0
      ? await MenuItem.findByIdAndUpdate(
          created._id,
          { $set: { available: requestedAvailability } },
          { new: true }
        )
      : created;
    return successResponse(item, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
