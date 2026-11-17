import { NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/admin-security";
import { errorResponse, handleApiError, successResponse } from "@/lib/api-response";
import { CampaignFieldsSchema } from "@/lib/validations/campaign";
import { ObjectIdSchema } from "@/lib/validations/common";
import { Coupon } from "@/models/Coupon";
import { Restaurant } from "@/models/Restaurant";

type RouteContext = { params: Promise<{ id: string }> };

const StatusSchema = z.object({ isActive: z.boolean() });

async function getCampaign(id: string) {
  const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"]);
  if (!authCheck.authorized) {
    return { error: errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401) };
  }
  if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
    return { error: errorResponse("This admin account has no restaurant assignment.", 403) };
  }

  const campaign = await Coupon.findById(id);
  if (!campaign) return { error: errorResponse("Offer or coupon was not found.", 404) };
  if (campaign.restaurantId) {
    const permission = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager"],
      campaign.restaurantId.toString()
    );
    if (!permission.authorized) {
      return { error: errorResponse(permission.error || "Unauthorized", permission.statusCode || 403) };
    }
  }
  return { admin: authCheck.admin!, campaign };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const conn = await connectToDatabase();
    if (!conn) return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);

    const { id } = await context.params;
    if (!ObjectIdSchema.safeParse(id).success) return errorResponse("Invalid offer or coupon ID.", 400);
    const body = StatusSchema.parse(await req.json());
    const result = await getCampaign(id);
    if (result.error) return result.error;

    const { admin, campaign } = result;
    const previousState = { isActive: campaign.isActive };
    campaign.isActive = body.isActive;
    await campaign.save();
    await logAuditEvent({
      actorId: admin._id,
      restaurantId: campaign.restaurantId || undefined,
      action: body.isActive ? "CAMPAIGN_ACTIVATED" : "CAMPAIGN_DEACTIVATED",
      entity: "Admin",
      entityId: campaign._id,
      previousState,
      newState: { isActive: campaign.isActive, title: campaign.title },
    });
    return successResponse(campaign);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const conn = await connectToDatabase();
    if (!conn) return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);

    const { id } = await context.params;
    if (!ObjectIdSchema.safeParse(id).success) return errorResponse("Invalid offer or coupon ID.", 400);
    const body = CampaignFieldsSchema.parse(await req.json());
    const result = await getCampaign(id);
    if (result.error) return result.error;

    const { admin, campaign } = result;
    if (body.restaurantId) {
      const permission = await verifyAdminPermissions(["super_admin", "restaurant_manager"], body.restaurantId);
      if (!permission.authorized) {
        return errorResponse(permission.error || "Unauthorized", permission.statusCode || 403);
      }
      const restaurant = await Restaurant.findOne({ _id: body.restaurantId, isArchived: false });
      if (!restaurant) return errorResponse("Selected kitchen was not found.", 404);
    }

    const code = body.campaignType === "coupon" ? body.code! : campaign.code;
    if (code !== campaign.code && await Coupon.exists({ code, _id: { $ne: campaign._id } })) {
      return errorResponse(`Code '${code}' is already in use.`, 409);
    }

    const previousState = {
      title: campaign.title,
      campaignType: campaign.campaignType,
      code: campaign.code,
      isActive: campaign.isActive,
    };
    campaign.set({
      ...body,
      code,
      restaurantId: body.restaurantId || undefined,
      maxDiscountAmount: body.maxDiscountAmount,
      usageLimit: body.usageLimit,
      validFrom: new Date(body.validFrom),
      validUntil: new Date(body.validUntil),
    });
    await campaign.save();
    await logAuditEvent({
      actorId: admin._id,
      restaurantId: campaign.restaurantId || undefined,
      action: campaign.campaignType === "offer" ? "OFFER_UPDATED" : "COUPON_UPDATED",
      entity: "Admin",
      entityId: campaign._id,
      previousState,
      newState: {
        title: campaign.title,
        campaignType: campaign.campaignType,
        code: campaign.campaignType === "coupon" ? campaign.code : undefined,
        isActive: campaign.isActive,
      },
    });
    return successResponse(campaign);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const conn = await connectToDatabase();
    if (!conn) return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);

    const { id } = await context.params;
    if (!ObjectIdSchema.safeParse(id).success) return errorResponse("Invalid offer or coupon ID.", 400);
    const result = await getCampaign(id);
    if (result.error) return result.error;

    const { admin, campaign } = result;
    await logAuditEvent({
      actorId: admin._id,
      restaurantId: campaign.restaurantId || undefined,
      action: campaign.campaignType === "offer" ? "OFFER_DELETED" : "COUPON_DELETED",
      entity: "Admin",
      entityId: campaign._id,
      previousState: { title: campaign.title, code: campaign.code, campaignType: campaign.campaignType },
    });
    await campaign.deleteOne();
    return successResponse({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
