import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";
import { AdminUser } from "../src/models/AdminUser";
import { hashPassword } from "../src/lib/admin-security";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  throw new Error("TEMP_ADMIN_PHONE must be a valid 10-digit Indian number.");
}

async function createTemporaryAdmin() {
  const mongoUri = requiredEnv("MONGODB_URI");
  const email = requiredEnv("TEMP_ADMIN_EMAIL").toLowerCase();
  const name = requiredEnv("TEMP_ADMIN_NAME");
  const phone = normalizeIndianPhone(requiredEnv("TEMP_ADMIN_PHONE"));
  const expiryDays = Number(requiredEnv("TEMP_ADMIN_EXPIRES_IN_DAYS"));
  if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) {
    throw new Error("TEMP_ADMIN_EXPIRES_IN_DAYS must be between 1 and 30.");
  }

  await mongoose.connect(mongoUri);
  if (await AdminUser.exists({ email })) {
    throw new Error("That admin email already exists; no account was changed.");
  }

  const temporaryPassword = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  await AdminUser.create({
    email,
    name,
    phone,
    passwordHash: await hashPassword(temporaryPassword),
    role: "super_admin",
    totpEnabled: false,
    failedLoginAttempts: 0,
    isActive: true,
    temporaryAccessExpiresAt: expiresAt,
  });

  console.log("Temporary super-admin account created.");
  console.log(`Email: ${email}`);
  console.log(`Temporary password (shown once): ${temporaryPassword}`);
  console.log(`Access expires: ${expiresAt.toISOString()}`);
}

createTemporaryAdmin()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Unable to create the temporary admin.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
