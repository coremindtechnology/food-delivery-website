import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const BlockCustomerSchema = z.object({
  customerId: ObjectIdSchema,
  isBlocked: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const authCheck = await verifyAdminPermissions([
      "super_admin",
      "restaurant_manager",
      "order_manager",
    ]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    // Attach order counts & total spend
    const customerPhones = customers.map((c) => c.phone);
    const orderAggregates = await Order.aggregate([
      { $match: { customerPhone: { $in: customerPhones } } },
      {
        $group: {
          _id: "$customerPhone",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
        },
      },
    ]);

    const aggregateMap = new Map<string, { orderCount: number; totalSpent: number }>();
    for (const agg of orderAggregates) {
      aggregateMap.set(agg._id, { orderCount: agg.orderCount, totalSpent: agg.totalSpent });
    }

    const enrichedCustomers = customers.map((c) => ({
      ...c,
      orderCount: aggregateMap.get(c.phone)?.orderCount || 0,
      totalSpent: aggregateMap.get(c.phone)?.totalSpent || 0,
    }));

    return successResponse(enrichedCustomers);
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

    const authCheck = await verifyAdminPermissions(["super_admin", "restaurant_manager"]);
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const body = await req.json();
    const { customerId, isBlocked, reason } = BlockCustomerSchema.parse(body);

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return errorResponse("Customer not found", 404);
    }

    customer.isBlocked = isBlocked;
    await customer.save();

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: authCheck.admin!._id,
      action: isBlocked ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED",
      entity: "Admin",
      entityId: customer._id,
      newState: { isBlocked, reason },
      ipAddress: clientIp,
    });

    return successResponse(customer);
  } catch (err) {
    return handleApiError(err);
  }
}

