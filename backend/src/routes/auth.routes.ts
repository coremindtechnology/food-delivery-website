import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User.js";
import { generateNumericOTP, sendSMSOTP } from "../services/otp.service.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// 1. Request SMS OTP for Customer Login / Register
router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      res.status(400).json({ success: false, error: "Valid 10-digit phone number is required" });
      return;
    }

    const otp = generateNumericOTP(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    let user = await UserModel.findOne({ phone });
    if (!user) {
      user = await UserModel.create({
        phone,
        otpCode: otp,
        otpExpiresAt: expiresAt,
        isVerified: false,
      });
    } else {
      user.otpCode = otp;
      user.otpExpiresAt = expiresAt;
      await user.save();
    }

    await sendSMSOTP(phone, otp);

    res.json({
      success: true,
      message: `OTP sent successfully to +91 ${phone}`,
      // For development ease, include debug OTP preview if in non-production
      devOtpHint: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
});

// 2. Verify SMS OTP and return JWT token
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ success: false, error: "Phone and OTP are required" });
      return;
    }

    const user = await UserModel.findOne({ phone });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      res.status(400).json({ success: false, error: "No active OTP request found for this phone" });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
      return;
    }

    if (user.otpCode !== otp) {
      res.status(400).json({ success: false, error: "Invalid OTP code entered" });
      return;
    }

    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
      { userId: user._id.toString(), phone: user.phone },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Phone verified successfully",
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

export default router;

