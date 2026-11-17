import crypto from "crypto";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { getServerSecret } from "@/lib/server-secrets";

// ── 1. Secure Password Hashing (scrypt + 32-byte salt) ──────────────────────────

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString("hex");
    crypto.scrypt(
      password,
      salt,
      KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derivedKey.toString("hex")}`);
      }
    );
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = storedHash.split("$");
      if (parts.length !== 6 || parts[0] !== "scrypt") {
        return resolve(false);
      }

      const N = parseInt(parts[1], 10);
      const r = parseInt(parts[2], 10);
      const p = parseInt(parts[3], 10);
      const salt = parts[4];
      const originalKey = Buffer.from(parts[5], "hex");

      crypto.scrypt(password, salt, originalKey.length, { N, r, p }, (err, derivedKey) => {
        if (err) return resolve(false);
        const match = crypto.timingSafeEqual(originalKey, derivedKey);
        resolve(match);
      });
    } catch {
      resolve(false);
    }
  });
}

// ── 2. Encrypted TOTP Secrets at Rest (AES-256-GCM) ──────────────────────────────

function getMasterEncryptionKey(): Buffer {
  const secret = getServerSecret("ADMIN_JWT_SECRET", "default_super_admin_vault_master_key_32");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

export function decryptSecret(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getMasterEncryptionKey(),
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── 3. Base32 & RFC 6238 Standard TOTP (Google/Microsoft Authenticator) ─────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  const randomBytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < randomBytes.length; i++) {
    result += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return result;
}

function base32Decode(base32: string): Buffer {
  const clean = base32.replace(/[\s-]/g, "").toUpperCase();
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secretBase32: string, timeStepWindow = 0): string {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepWindow;

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, "0");
  return otp;
}

export function verifyTotpCode(inputOtp: string, secretBase32: string): boolean {
  const cleanOtp = inputOtp.trim();
  if (cleanOtp.length !== 6) return false;

  // Allow ±1 time step (30s grace window)
  for (let window = -1; window <= 1; window++) {
    const calculated = generateTotpCode(secretBase32, window);
    if (crypto.timingSafeEqual(Buffer.from(cleanOtp), Buffer.from(calculated))) {
      return true;
    }
  }
  return false;
}

export function getTotpAuthUri(email: string, secret: string, issuer = "DualKitchensAdmin"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// ── 4. Emergency Backup Recovery Codes ──────────────────────────────────────────

export function generateRecoveryCodes(count = 8): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX (8 alphanumeric)
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const code = `${part1}-${part2}`;
    plainCodes.push(code);

    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    hashedCodes.push(hashed);
  }

  return { plainCodes, hashedCodes };
}

export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  storedHashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  const cleanCode = inputCode.trim().toUpperCase();
  const inputHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

  const matchIndex = storedHashedCodes.findIndex((h) => h === inputHash);
  if (matchIndex === -1) {
    return { valid: false, remainingHashedCodes: storedHashedCodes };
  }

  const remaining = [...storedHashedCodes];
  remaining.splice(matchIndex, 1);
  return { valid: true, remainingHashedCodes: remaining };
}

// ── 5. System Audit Logger ─────────────────────────────────────────────────────

export interface RecordAuditParams {
  restaurantId?: Types.ObjectId | string;
  actorType?: "admin" | "customer" | "system";
  actorId?: Types.ObjectId | string;
  action: string;
  entity:
    | "Expense"
    | "Restaurant"
    | "MenuCategory"
    | "MenuItem"
    | "Order"
    | "Payment"
    | "Refund"
    | "Inventory"
    | "Admin"
    | "Customer";
  entityId?: Types.ObjectId | string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditEvent(params: RecordAuditParams): Promise<void> {
  try {
    await connectToDatabase();
    await AuditLog.create({
      restaurantId: params.restaurantId,
      actorType: params.actorType || "admin",
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      previousState: params.previousState,
      newState: params.newState,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
