import { Router, Request, Response } from "express";
import { OrderModel } from "../models/Order.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpay.service.js";
import {
  getDeliveryDistanceKm,
  MAX_DELIVERY_DISTANCE_KM,
} from "../utils/delivery.js";

const router = Router();

// Create a new order with optional Razorpay checkout
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      restaurantSlug,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      items,
      paymentMethod,
    } = req.body;

    if (!restaurantSlug || !items || items.length === 0 || !customerPhone || !deliveryAddress) {
      res.status(400).json({ success: false, error: "Missing required order fields" });
      return;
    }

    if (restaurantSlug !== "veg" && restaurantSlug !== "non-veg") {
      res.status(400).json({ success: false, error: "Invalid restaurant" });
      return;
    }

    const coordinates = deliveryAddress.coordinates;
    if (
      !coordinates ||
      typeof coordinates.latitude !== "number" ||
      !Number.isFinite(coordinates.latitude) ||
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      typeof coordinates.longitude !== "number" ||
      !Number.isFinite(coordinates.longitude) ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      res.status(400).json({
        success: false,
        error: "Share your delivery location to check whether it is within the 5 km delivery range.",
      });
      return;
    }

    const distanceKm = getDeliveryDistanceKm(restaurantSlug, coordinates);
    if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
      res.status(400).json({
        success: false,
        error: `This address is ${distanceKm.toFixed(1)} km from the kitchen. Delivery is available only within 5 km.`,
        data: { distanceKm, maxDeliveryDistanceKm: MAX_DELIVERY_DISTANCE_KM },
      });
      return;
    }

    // Calculate subtotal
    const subtotal = items.reduce(
      (acc: number, item: { price: number; quantity: number }) =>
        acc + item.price * item.quantity,
      0
    );
    const deliveryFee = 40;
    const totalAmount = subtotal + deliveryFee;

    const orderNumber = `DK-${restaurantSlug === "veg" ? "VEG" : "NV"}-${Date.now().toString().slice(-6)}`;

    let razorpayOrderId: string | undefined;

    if (paymentMethod === "razorpay") {
      try {
        const rzpOrder = await createRazorpayOrder({
          amount: totalAmount,
          receipt: orderNumber,
          notes: {
            restaurantSlug,
            customerPhone,
          },
        });
        razorpayOrderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn("Razorpay API bypassed or placeholder used:", rzpErr);
      }
    }

    const order = await OrderModel.create({
      orderNumber,
      restaurantSlug,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: paymentMethod || "razorpay",
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      razorpayOrderId,
    });

    res.status(201).json({
      success: true,
      data: order,
      razorpayOrderId,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, error: "Failed to place order" });
  }
});

// Verify Razorpay payment callback
router.post("/verify-payment", async (req: Request, res: Response) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      res.status(400).json({ success: false, error: "Invalid payment signature" });
      return;
    }

    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "paid",
        razorpayPaymentId,
        orderStatus: "confirmed",
      },
      { new: true }
    );

    res.json({ success: true, message: "Payment verified successfully", data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: "Payment verification failed" });
  }
});

// Get order tracking status
router.get("/:orderNumber", async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = await OrderModel.findOne({ orderNumber }).lean();
    if (!order) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch order status" });
  }
});

export default router;
