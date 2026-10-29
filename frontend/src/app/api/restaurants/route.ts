import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { CreateRestaurantSchema } from "@/lib/validations/restaurant";
import { PaginationQuerySchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = PaginationQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "createdAt",
      sortOrder: searchParams.get("sortOrder") ?? "desc",
      includeArchived: searchParams.get("includeArchived") ?? undefined,
    });

    const filter: Record<string, unknown> = {};
    if (!parsedQuery.includeArchived) {
      filter.isArchived = false;
    }

    const typeParam = searchParams.get("type");
    if (typeParam && (typeParam === "veg" || typeParam === "non-veg")) {
      filter.type = typeParam;
    }

    if (parsedQuery.search) {
      const q = parsedQuery.search;
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { subtitle: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { "address.city": { $regex: q, $options: "i" } },
      ];
    }

    const skip = (parsedQuery.page - 1) * parsedQuery.limit;
    const sortDirection = parsedQuery.sortOrder === "asc" ? 1 : -1;

    const [restaurants, totalCount] = await Promise.all([
      Restaurant.find(filter)
        .sort({ [parsedQuery.sortBy]: sortDirection })
        .skip(skip)
        .limit(parsedQuery.limit)
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parsedQuery.limit);

    return successResponse(restaurants, 200, {
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

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = CreateRestaurantSchema.parse(body);

    // Check if slug is already used
    const existing = await Restaurant.findOne({ slug: validatedData.slug });
    if (existing) {
      return errorResponse(`Restaurant with slug '${validatedData.slug}' already exists`, 409);
    }

    const created = await Restaurant.create(validatedData);
    return successResponse(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

