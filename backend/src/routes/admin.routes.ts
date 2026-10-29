import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AdminModel } from "../models/Admin.js";
import { OrderModel } from "../models/Order.js";
import {
  generateTOTPSecret,
  generateTOTPQRCodeDataURL,
  verifyTOTPToken,
} from "../services/totp.service.js";
import { requireAdminAuth, CustomRequest } from "../middleware/auth.middleware.js";

const router = Router();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "default_admin_jwt_secret";

// 1. Initial Admin Login (Generates or prompts for TOTP)
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: "Admin email is required" });
      return;
    }

    let admin = await AdminModel.findOne({ email });
    if (!admin) {
      // Auto-provision default super admin for development setup
      admin = await AdminModel.create({
        email,
        passwordHash: "managed_via_mfa",
        name: "Client Administrator",
        role: "super_admin",
        totpEnabled: false,
      });
    }

    // If TOTP is not yet set up, generate secret and QR code for Authenticator app
    if (!admin.totpEnabled || !admin.totpSecret) {
      const { secret, otpauth } = generateTOTPSecret(admin.email);
      admin.totpSecret = secret;
      await admin.save();

      const qrCodeDataUrl = await generateTOTPQRCodeDataURL(otpauth);
      res.json({
        success: true,
        requiresMfaSetup: true,
        message: "Scan this QR code with Google Authenticator or Authy",
        qrCode: qrCodeDataUrl,
        secret,
      });
      return;
    }

    res.json({
      success: true,
      requiresMfaSetup: false,
      message: "Please enter the 6-digit code from your Authenticator App",
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, error: "Admin authentication error" });
  }
});

// 2. Verify TOTP 6-digit code to complete Admin Login
router.post("/verify-totp", async (req: Request, res: Response) => {
  try {
    const { email, totpCode } = req.body;
    if (!email || !totpCode) {
      res.status(400).json({ success: false, error: "Email and TOTP code are required" });
      return;
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin || !admin.totpSecret) {
      res.status(400).json({ success: false, error: "Admin not found or MFA not initiated" });
      return;
    }

    const isValid = verifyTOTPToken(totpCode, admin.totpSecret);
    if (!isValid) {
      res.status(400).json({ success: false, error: "Invalid Authenticator TOTP code" });
      return;
    }

    if (!admin.totpEnabled) {
      admin.totpEnabled = true;
      await admin.save();
    }

    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        assignedRestaurantSlug: admin.assignedRestaurantSlug,
      },
      ADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Admin MFA verified successfully",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        assignedRestaurantSlug: admin.assignedRestaurantSlug,
      },
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    res.status(500).json({ success: false, error: "MFA verification failed" });
  }
});

// 3. Separated Financial & Order Reports for Veg vs Non-Veg Restaurants
router.get("/reports", requireAdminAuth, async (req: CustomRequest, res: Response) => {
  try {
    const { restaurant } = req.query;
    const filter: Record<string, unknown> = {};

    if (restaurant && (restaurant === "veg" || restaurant === "non-veg")) {
      filter.restaurantSlug = restaurant;
    }

    const vegOrders = await OrderModel.find({ restaurantSlug: "veg" }).lean();
    const nonVegOrders = await OrderModel.find({ restaurantSlug: "non-veg" }).lean();

    const calcMetrics = (orders: typeof vegOrders) => {
      const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const paidOrders = orders.filter((o) => o.paymentStatus === "paid").length;
      return {
        totalOrders: orders.length,
        paidOrders,
        totalRevenue,
        avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      };
    };

    res.json({
      success: true,
      data: {
        vegRestaurant: calcMetrics(vegOrders),
        nonVegRestaurant: calcMetrics(nonVegOrders),
      },
    });
  } catch (error) {
    console.error("Reports error:", error);
    res.status(500).json({ success: false, error: "Failed to generate reports" });
  }
});

export default router;

