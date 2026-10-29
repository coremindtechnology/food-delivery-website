import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Coupon } from "@/models/Coupon";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const ValidateCouponSchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  restaurantId: ObjectIdSchema,
  subtotal: z.number().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const { code, restaurantId, subtotal } = ValidateCouponSchema.parse(body);

    const coupon = await Coupon.findOne({
      code,
      isActive: true,
    });

    if (!coupon) {
      return errorResponse("Invalid or expired coupon code", 404);
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return errorResponse("This coupon has expired", 400);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return errorResponse("Coupon usage limit has been reached", 400);
    }

    // Check restaurant restriction: if restaurantId is specified on coupon, it must match
    if (coupon.restaurantId && coupon.restaurantId.toString() !== restaurantId) {
      return errorResponse("This coupon is not valid for this restaurant", 400);
    }

    // Check minimum order amount
    if (subtotal < coupon.minOrderAmount) {
      return errorResponse(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
        400,
        { minOrderAmount: coupon.minOrderAmount }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // flat discount
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    return successResponse({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      newSubtotal: Math.max(0, subtotal - discountAmount),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

