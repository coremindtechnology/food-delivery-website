import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { AdminUser } from "@/models/AdminUser";
import { Restaurant } from "@/models/Restaurant";
import { hashPassword, logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const SubAdminRoleSchema = z.enum([
  "restaurant_manager",
  "order_manager",
  "menu_manager",
  "delivery_manager",
  "delivery_personnel",
  "finance_viewer",
  "veg_manager",
  "nonveg_manager",
]);

const CreateStaffSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\d{10}$/, "Valid 10-digit mobile required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: SubAdminRoleSchema,
  assignedRestaurantId: ObjectIdSchema.optional(),
});

const UpdateStaffSchema = z.object({
  staffId: ObjectIdSchema,
  role: SubAdminRoleSchema.optional(),
  assignedRestaurantId: ObjectIdSchema.optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Super Admin access required", authCheck.statusCode || 403);
    }

    const staff = await AdminUser.find()
      .select("-passwordHash -totpSecret -totpEncryptedSecret -totpIV -totpAuthTag -totpRecoveryCodes -failedLoginAttempts -lockedUntil")
      .populate("assignedRestaurantId", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(staff);
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

    const authCheck = await verifyAdminPermissions(["super_admin"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Super Admin access required", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const validatedData = CreateStaffSchema.parse(body);
    if (validatedData.assignedRestaurantId) {
      const restaurant = await Restaurant.findOne({
        _id: validatedData.assignedRestaurantId,
        isArchived: false,
      }).select("_id").lean();
      if (!restaurant) return errorResponse("Assigned kitchen not found or archived.", 400);
    }

    const existing = await AdminUser.findOne({
      $or: [{ email: validatedData.email.toLowerCase() }, { phone: validatedData.phone }],
    });
    if (existing) {
      return errorResponse("Staff user with this email or phone already exists", 409);
    }

    const passwordHash = await hashPassword(validatedData.password);

    const created = await AdminUser.create({
      name: validatedData.name,
      email: validatedData.email.toLowerCase(),
      phone: validatedData.phone,
      passwordHash,
      role: validatedData.role,
      assignedRestaurantId: validatedData.assignedRestaurantId || undefined,
      totpEnabled: false,
      isActive: true,
      failedLoginAttempts: 0,
    });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      action: "STAFF_USER_CREATED",
      entity: "Admin",
      entityId: created._id,
      newState: { name: created.name, email: created.email, role: created.role },
      ipAddress: clientIp,
    });

    return successResponse(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions(["super_admin"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Super Admin access required", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const { staffId, role, assignedRestaurantId, isActive } = UpdateStaffSchema.parse(body);

    const staff = await AdminUser.findById(staffId);
    if (!staff) {
      return errorResponse("Staff user not found", 404);
    }
    if (staff.role === "super_admin") {
      return errorResponse("Super Admin accounts cannot be managed as sub-admins.", 400);
    }
    if (assignedRestaurantId) {
      const restaurant = await Restaurant.findOne({
        _id: assignedRestaurantId,
        isArchived: false,
      }).select("_id").lean();
      if (!restaurant) return errorResponse("Assigned kitchen not found or archived.", 400);
    }

    const previousState = {
      role: staff.role,
      assignedRestaurantId: staff.assignedRestaurantId?.toString(),
      isActive: staff.isActive,
    };
    if (role !== undefined) staff.role = role;
    if (assignedRestaurantId !== undefined) {
      staff.assignedRestaurantId = assignedRestaurantId
        ? new mongoose.Types.ObjectId(assignedRestaurantId)
        : undefined;
    }
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      actorId: authCheck.admin!._id,
      action: "STAFF_USER_UPDATED",
      entity: "Admin",
      entityId: staff._id,
      previousState,
      newState: { role, assignedRestaurantId, isActive },
      ipAddress: clientIp,
    });

    return successResponse(staff);
  } catch (err) {
    return handleApiError(err);
  }
}
