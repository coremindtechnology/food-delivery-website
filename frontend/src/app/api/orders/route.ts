import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentCustomer } from "@/lib/auth";
import { Restaurant } from "@/models/Restaurant";
import { MenuItem } from "@/models/MenuItem";
import { MenuCategory } from "@/models/MenuCategory";
import { Order, IOrder, IOrderItemSnapshot } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Payment } from "@/models/Payment";
import { CreateOrderSchema } from "@/lib/validations/order";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import {
  getDeliveryDistanceKm,
  MAX_DELIVERY_DISTANCE_KM,
} from "@/lib/delivery";
import crypto from "crypto";

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
}

// GET /api/orders — retrieve orders for logged-in customer
export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Not authenticated", 401);
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      Order.find({
        $or: [{ customerId: customer._id }, { customerPhone: customer.phone }],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({
        $or: [{ customerId: customer._id }, { customerPhone: customer.phone }],
      }),
    ]);

    return successResponse(orders, 200, {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/orders — Place new order with strict server-side price recalculation
export async function POST(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const body = await req.json();
    const validatedData = CreateOrderSchema.parse(body);

    const customer = await getCurrentCustomer();
    if (!customer) {
      return errorResponse("Sign in with a verified phone number before placing an order.", 401);
    }
    if (customer.phone !== validatedData.customerPhone) {
      return errorResponse("The order phone number must match your verified account.", 403);
    }
    const customerId = customer?._id;

    // 1. Restaurant validation: exists, not archived, is OPEN
    const restaurant = await Restaurant.findOne({
      _id: validatedData.restaurantId,
      isArchived: false,
    });

    if (!restaurant) {
      return errorResponse("Selected restaurant does not exist or is inactive.", 404);
    }

    if (!restaurant.isOpen) {
      return errorResponse(
        `${restaurant.name} is currently closed for online orders. Please check back later.`,
        400
      );
    }

    // 2. Delivery address validation for delivery fulfillment
    if (validatedData.fulfillmentType === "delivery" && !validatedData.deliveryAddress) {
      return errorResponse("Delivery address is required for home delivery orders.", 400);
    }

    if (validatedData.fulfillmentType === "delivery") {
      const coordinates = validatedData.deliveryAddress?.coordinates;
      if (!coordinates) {
        return errorResponse(
          "Share your delivery location to check whether it is within the 5 km delivery range.",
          400
        );
      }

      const distanceKm = getDeliveryDistanceKm(restaurant.slug, coordinates);
      if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
        return errorResponse(
          `This address is ${distanceKm.toFixed(1)} km from ${restaurant.name}. Delivery is available only within 5 km.`,
          400,
          { distanceKm, maxDeliveryDistanceKm: MAX_DELIVERY_DISTANCE_KM }
        );
      }
    }

    // 3. Prevent duplicate submission: check if identical order was placed in last 15 seconds
    const duplicateWindow = new Date(Date.now() - 15 * 1000);
    const existingRecentOrder = await Order.findOne({
      restaurantId: validatedData.restaurantId,
      customerPhone: validatedData.customerPhone,
      createdAt: { $gt: duplicateWindow },
    });

    if (existingRecentOrder) {
      return errorResponse(
        "A duplicate order was recently submitted. Please wait a moment before trying again.",
        429
      );
    }

    // 4. Fetch all menu items from database to strictly verify prices and stock
    const menuItemIds = validatedData.items.map((i) => i.menuItemId);
    const activeCategoryIds = await MenuCategory.find({
      restaurantId: validatedData.restaurantId,
      isArchived: { $ne: true },
      isActive: true,
    }).distinct("_id");
    const dbMenuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      isArchived: { $ne: true },
      available: true,
      inStock: true,
      inventoryCount: { $gt: 0 },
      categoryId: { $in: activeCategoryIds },
    });

    const itemMap = new Map<string, (typeof dbMenuItems)[0]>();
    for (const item of dbMenuItems) {
      itemMap.set(item._id.toString(), item);
    }

    // Recalculate each item on the server
    const processedItems: IOrderItemSnapshot[] = [];
    let serverSubtotal = 0;

    for (const orderItem of validatedData.items) {
      const dbItem = itemMap.get(orderItem.menuItemId);

      if (!dbItem) {
        return errorResponse(`Menu item ${orderItem.menuItemId} is no longer available.`, 404);
      }

      // Ensure item belongs to the same restaurant
      if (dbItem.restaurantId.toString() !== validatedData.restaurantId) {
        return errorResponse(
          `Item '${dbItem.name}' does not belong to ${restaurant.name}. Combining multiple restaurants in one order is not permitted.`,
          400
        );
      }

      // Check item availability
      if (!dbItem.available || !dbItem.inStock) {
        return errorResponse(`Item '${dbItem.name}' is currently unavailable.`, 400);
      }

      // Check inventory stock count
      if (dbItem.inventoryCount < orderItem.quantity) {
        return errorResponse(
          `Insufficient stock for '${dbItem.name}'. Only ${dbItem.inventoryCount} portion(s) available.`,
          400
        );
      }

      // Calculate unit price based on variant or base price
      let unitPrice = dbItem.price;
      let selectedVariantSnapshot: { id: string; name: string; price: number } | undefined;

      if (orderItem.variantId) {
        const matchingVariant = dbItem.variants?.find((v) => v.id === orderItem.variantId);
        if (!matchingVariant) {
          return errorResponse(
            `Selected variant not found for item '${dbItem.name}'.`,
            400
          );
        }
        unitPrice = matchingVariant.price;
        selectedVariantSnapshot = {
          id: matchingVariant.id,
          name: matchingVariant.name,
          price: matchingVariant.price,
        };
      }

      // Calculate add-on prices from DB
      const selectedAddonsSnapshot: { id: string; name: string; price: number }[] = [];
      let addonsTotalPrice = 0;

      if (orderItem.addonIds && orderItem.addonIds.length > 0) {
        for (const addonId of orderItem.addonIds) {
          const matchingAddon = dbItem.addons?.find((a) => a.id === addonId);
          if (matchingAddon) {
            addonsTotalPrice += matchingAddon.price;
            selectedAddonsSnapshot.push({
              id: matchingAddon.id,
              name: matchingAddon.name,
              price: matchingAddon.price,
            });
          }
        }
      }

      const itemTotalPrice = (unitPrice + addonsTotalPrice) * orderItem.quantity;
      serverSubtotal += itemTotalPrice;

      processedItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        image: dbItem.image,
        isVeg: dbItem.isVeg,
        price: unitPrice,
        quantity: orderItem.quantity,
        variant: selectedVariantSnapshot,
        addons: selectedAddonsSnapshot,
        specialInstructions: orderItem.specialInstructions,
        itemTotalPrice,
      });
    }

    // 5. Minimum order amount validation
    if (serverSubtotal < (restaurant.minOrderAmount || 0)) {
      return errorResponse(
        `Minimum order amount for ${restaurant.name} is ₹${restaurant.minOrderAmount}. Current subtotal is ₹${serverSubtotal}.`,
        400,
        { minOrderAmount: restaurant.minOrderAmount, currentSubtotal: serverSubtotal }
      );
    }

    // 6. Delivery Fee calculation
    let deliveryFee = 0;
    if (validatedData.fulfillmentType === "delivery") {
      // Free delivery on orders ₹500 or above, otherwise standard ₹40
      deliveryFee = serverSubtotal >= 500 ? 0 : 40;
    }

    // 7. Taxes: 5% GST on Restaurant Food
    const taxAmount = Math.round(serverSubtotal * 0.05);

    // 8. Coupon discount validation
    let discountAmount = 0;
    let appliedCouponCode: string | undefined;
    let usedCouponId: string | undefined;

    if (validatedData.couponCode) {
      const coupon = await Coupon.findOne({
        code: validatedData.couponCode,
        isActive: true,
      });

      const now = new Date();
      if (
        coupon &&
        now >= coupon.validFrom &&
        now <= coupon.validUntil &&
        (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
        (!coupon.restaurantId || coupon.restaurantId.toString() === validatedData.restaurantId) &&
        serverSubtotal >= coupon.minOrderAmount
      ) {
        if (coupon.discountType === "percentage") {
          discountAmount = Math.round((serverSubtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
          }
        } else {
          discountAmount = Math.min(coupon.discountValue, serverSubtotal);
        }

        appliedCouponCode = coupon.code;
        // Increment usage count
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
        usedCouponId = coupon._id.toString();
      }
    }

    // 9. Grand Total
    const totalAmount = Math.max(0, serverSubtotal + deliveryFee + taxAmount - discountAmount);

    // 10. Atomically claim stock before creating the order.
    const stockByItem = new Map<string, { menuItemId: (typeof processedItems)[number]["menuItemId"]; quantity: number }>();
    for (const item of processedItems) {
      const id = item.menuItemId.toString();
      const current = stockByItem.get(id);
      stockByItem.set(id, {
        menuItemId: item.menuItemId,
        quantity: (current?.quantity || 0) + item.quantity,
      });
    }

    const decrementedStock: {
      menuItemId: (typeof processedItems)[number]["menuItemId"];
      quantity: number;
      previousCount: number;
      newCount: number;
    }[] = [];
    const restoreDecrementedStock = async () => {
      for (const stock of decrementedStock) {
        await MenuItem.updateOne(
          { _id: stock.menuItemId },
          [
            {
              $set: {
                inventoryCount: { $add: ["$inventoryCount", stock.quantity] },
                inStock: { $gt: [{ $add: ["$inventoryCount", stock.quantity] }, 0] },
              },
            },
          ]
        );
      }
    };

    const rollbackStockAndCoupon = async () => {
      await restoreDecrementedStock();
      if (usedCouponId) {
        await Coupon.updateOne(
          { _id: usedCouponId, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
        usedCouponId = undefined;
      }
    };

    let stockUnavailable = false;
    try {
      for (const stock of stockByItem.values()) {
        const updatedItem = await MenuItem.findOneAndUpdate(
          {
            _id: stock.menuItemId,
            isArchived: { $ne: true },
            available: true,
            inStock: true,
            inventoryCount: { $gte: stock.quantity },
          },
          [
            {
              $set: {
                inventoryCount: { $subtract: ["$inventoryCount", stock.quantity] },
                inStock: {
                  $gt: [{ $subtract: ["$inventoryCount", stock.quantity] }, 0],
                },
              },
            },
          ],
          { new: true }
        );

        if (!updatedItem) {
          stockUnavailable = true;
          break;
        }

        decrementedStock.push({
          menuItemId: stock.menuItemId,
          quantity: stock.quantity,
          previousCount: updatedItem.inventoryCount + stock.quantity,
          newCount: updatedItem.inventoryCount,
        });
      }
    } catch (err) {
      await rollbackStockAndCoupon();
      throw err;
    }
    if (stockUnavailable) {
      await rollbackStockAndCoupon();
      return errorResponse(
        "One or more items just sold out. Refresh your cart and try again.",
        409
      );
    }

    // 11. Create the order snapshot and stock history. Roll stock back on failure.
    const orderNumber = generateOrderNumber();

    let createdOrder: IOrder | undefined;
    try {
      createdOrder = await Order.create({
        orderNumber,
        restaurantId: restaurant._id,
        restaurantSlug: restaurant.slug,
        customerId,
        customerName: validatedData.customerName,
        customerPhone: validatedData.customerPhone,
        customerEmail: validatedData.customerEmail || undefined,
        deliveryAddress:
          validatedData.fulfillmentType === "delivery" && validatedData.deliveryAddress
            ? validatedData.deliveryAddress
            : {
                street: "Takeaway Counter Pickup",
                city: restaurant.address.city || "Metro City",
                state: restaurant.address.state || "State",
                pincode: restaurant.address.pincode || "400001",
              },
        items: processedItems,
        subtotal: serverSubtotal,
        deliveryFee,
        taxAmount,
        discountAmount,
        couponCode: appliedCouponCode,
        totalAmount,
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: "pending",
        orderStatus: validatedData.paymentMethod === "cod" ? "new" : "pending_payment",
        refundStatus: "none",
        cashCollectedAmount: 0,
        cashOutstandingAmount: validatedData.paymentMethod === "cod" ? totalAmount : 0,
        paymentAttemptCount: 0,
        ...(validatedData.paymentMethod === "razorpay"
          ? { pendingPaymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000) }
          : {}),
        statusHistory: [
          {
            status: validatedData.paymentMethod === "cod" ? "new" : "pending_payment",
            reason: "Order placed",
          },
        ],
        deliveryNotes: validatedData.deliveryNotes,
        placedAt: new Date(),
      });

      if (validatedData.paymentMethod === "cod") {
        await Payment.create({
          orderId: createdOrder._id,
          restaurantId: restaurant._id,
          amount: totalAmount,
          currency: "INR",
          paymentMethod: "cod",
          status: "created",
          attemptNumber: 1,
          codOutstandingAmount: totalAmount,
        });
      }

      await InventoryMovement.insertMany(
        decrementedStock.map((stock) => ({
          restaurantId: restaurant._id,
          menuItemId: stock.menuItemId,
          movementType: "order_deduction",
          quantity: -stock.quantity,
          previousCount: stock.previousCount,
          newCount: stock.newCount,
          orderId: createdOrder!._id,
          reason: `Order ${orderNumber}`,
        }))
      );

      return successResponse(createdOrder, 201);
    } catch (err) {
      if (createdOrder) {
        await Payment.deleteMany({ orderId: createdOrder._id });
        await InventoryMovement.deleteMany({ orderId: createdOrder._id });
        await Order.deleteOne({ _id: createdOrder._id });
      }
      await rollbackStockAndCoupon();
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
