import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Coupon } from "@/models/Coupon";
import { logAuditEvent } from "@/lib/admin-security";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const CreateCouponSchema = z.object({
  code: z.string().trim().min(3).max(20).toUpperCase(),
  description: z.string().trim().optional(),
  restaurantId: z.string().optional().nullable(),
  discountType: z.enum(["percentage", "flat"]),
  discountValue: z.number().min(1),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscountAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager", "finance_viewer"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const coupons = await Coupon.find().populate("restaurantId", "name slug").sort({ createdAt: -1 }).lean();
    return successResponse(coupons);
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

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const validated = CreateCouponSchema.parse(body);

    const existing = await Coupon.findOne({ code: validated.code });
    if (existing) {
      return errorResponse(`Coupon code '${validated.code}' already exists`, 409);
    }

    const coupon = await Coupon.create({
      code: validated.code,
      description: validated.description,
      restaurantId: validated.restaurantId || undefined,
      discountType: validated.discountType,
      discountValue: validated.discountValue,
      minOrderAmount: validated.minOrderAmount,
      maxDiscountAmount: validated.maxDiscountAmount,
      usageLimit: validated.usageLimit,
      validFrom: validated.validFrom ? new Date(validated.validFrom) : new Date(),
      validUntil: validated.validUntil
        ? new Date(validated.validUntil)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: authCheck.admin!._id,
      action: "COUPON_CREATED",
      entity: "Admin",
      entityId: coupon._id,
      newState: { code: coupon.code, discountType: coupon.discountType, value: coupon.discountValue },
      ipAddress: clientIp,
    });

    return successResponse(coupon, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

