import crypto from "crypto";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Coupon } from "@/models/Coupon";
import { Restaurant } from "@/models/Restaurant";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { CampaignFieldsSchema } from "@/lib/validations/campaign";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CampaignQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  search: z.string().trim().max(100).default(""),
  campaignType: z.enum(["all", "offer", "coupon"]).default("all"),
  status: z.enum(["all", "active", "scheduled", "expired", "inactive"]).default("all"),
  restaurantId: z.union([ObjectIdSchema, z.literal("both")]).optional(),
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getStatusMatch(status: string, now: Date) {
  if (status === "active") {
    return {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [{ usageLimit: { $exists: false } }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
    };
  }
  if (status === "scheduled") {
    return { isActive: true, validFrom: { $gt: now }, validUntil: { $gte: now } };
  }
  if (status === "expired") {
    return {
      $or: [
        { validUntil: { $lt: now } },
        { $expr: { $and: [{ $gt: ["$usageLimit", 0] }, { $gte: ["$usedCount", "$usageLimit"] }] } },
      ],
    };
  }
  if (status === "inactive") return { isActive: false };
  return {};
}

function createOfferCode() {
  return `OFFER-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

async function getCampaignScope(restaurantId?: string) {
  const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"]);
  if (!authCheck.authorized) {
    return { error: errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401) };
  }
  const admin = authCheck.admin!;
  if (admin.role !== "super_admin" && !admin.assignedRestaurantId) {
    return { error: errorResponse("This admin account has no restaurant assignment.", 403) };
  }

  const assignedId = admin.role === "super_admin" ? undefined : admin.assignedRestaurantId!.toString();
  if (restaurantId && restaurantId !== "both") {
    const targetId = restaurantId;
    const permission = await verifyAdminPermissions(["super_admin", "restaurant_manager"], targetId);
    if (!permission.authorized) {
      return { error: errorResponse(permission.error || "Unauthorized", permission.statusCode || 403) };
    }
    return { admin, filter: { $or: [{ restaurantId: targetId }, { restaurantId: { $exists: false } }] } };
  }
  if (restaurantId === "both") {
    return { admin, filter: { restaurantId: { $exists: false } } };
  }
  return {
    admin,
    filter: assignedId
      ? { $or: [{ restaurantId: assignedId }, { restaurantId: { $exists: false } }] }
      : {},
  };
}

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const query = CampaignQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      campaignType: searchParams.get("campaignType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      restaurantId: searchParams.get("restaurantId") ?? undefined,
    });
    const scope = await getCampaignScope(query.restaurantId);
    if (scope.error) return scope.error;

    const baseFilter: Record<string, unknown> = { ...scope.filter };
    if (query.campaignType !== "all") baseFilter.campaignType = query.campaignType;
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), "i");
      baseFilter.$and = [
        { $or: [{ title: search }, { code: search }, { description: search }] },
      ];
    }

    const filter = { ...baseFilter, ...getStatusMatch(query.status, new Date()) };
    const statsFilter: Record<string, unknown> = { ...scope.filter };
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), "i");
      statsFilter.$and = [
        { $or: [{ title: search }, { code: search }, { description: search }] },
      ];
    }
    const now = new Date();
    const skip = (query.page - 1) * query.limit;
    const [campaigns, totalCount, stats] = await Promise.all([
      Coupon.find(filter)
        .populate("restaurantId", "name slug type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Coupon.countDocuments(filter),
      Coupon.aggregate([
        { $match: statsFilter },
        {
          $group: {
            _id: null,
            totalOffers: { $sum: { $cond: [{ $eq: ["$campaignType", "offer"] }, 1, 0] } },
            totalCoupons: { $sum: { $cond: [{ $eq: ["$campaignType", "coupon"] }, 1, 0] } },
            activeNow: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      "$isActive",
                      { $lte: ["$validFrom", now] },
                      { $gte: ["$validUntil", now] },
                      {
                        $or: [
                          { $eq: [{ $ifNull: ["$usageLimit", null] }, null] },
                          { $lt: ["$usedCount", "$usageLimit"] },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            scheduled: { $sum: { $cond: [{ $and: ["$isActive", { $gt: ["$validFrom", now] }, { $gte: ["$validUntil", now] }] }, 1, 0] } },
            expired: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $lt: ["$validUntil", now] },
                      { $and: [{ $gt: ["$usageLimit", 0] }, { $gte: ["$usedCount", "$usageLimit"] }] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    return successResponse(campaigns, 200, {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / query.limit),
      stats: stats[0] || { totalOffers: 0, totalCoupons: 0, activeNow: 0, scheduled: 0, expired: 0 },
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
    const body = CampaignFieldsSchema.parse(await req.json());
    const scope = await getCampaignScope(body.restaurantId || undefined);
    if (scope.error) return scope.error;

    if (body.restaurantId) {
      const restaurant = await Restaurant.findOne({ _id: body.restaurantId, isArchived: false });
      if (!restaurant) return errorResponse("Selected kitchen was not found.", 404);
    }
    const code = body.campaignType === "coupon" ? body.code! : createOfferCode();
    if (await Coupon.exists({ code })) return errorResponse(`Code '${code}' is already in use.`, 409);

    const campaign = await Coupon.create({
      ...body,
      code,
      restaurantId: body.restaurantId || undefined,
      validFrom: new Date(body.validFrom),
      validUntil: new Date(body.validUntil),
    });
    await logAuditEvent({
      actorId: scope.admin!._id,
      restaurantId: body.restaurantId || undefined,
      action: body.campaignType === "offer" ? "OFFER_CREATED" : "COUPON_CREATED",
      entity: "Admin",
      entityId: campaign._id,
      newState: { title: campaign.title, code: body.campaignType === "coupon" ? campaign.code : undefined, campaignType: campaign.campaignType },
    });
    return successResponse(campaign, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
