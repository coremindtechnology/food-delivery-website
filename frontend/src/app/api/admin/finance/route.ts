import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import {
  buildFinanceReport,
  indiaLocalDateStart,
  resolveFinanceDateRange,
  type FinanceGroupBy,
  type FinanceRangePreset,
} from "@/lib/finance-report";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { Expense } from "@/models/Expense";
import { FinancialLedgerEntry } from "@/models/FinancialLedgerEntry";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Refund } from "@/models/Refund";
import { Restaurant } from "@/models/Restaurant";
import { AuditLog } from "@/models/AuditLog";
import { ObjectIdSchema } from "@/lib/validations/common";

const ExpenseCategorySchema = z.enum([
  "food_cost",
  "raw_materials",
  "packaging",
  "delivery",
  "staff",
  "rent",
  "utilities",
  "gateway_fees",
  "maintenance",
  "other",
]);

const RecordExpenseSchema = z.object({
  restaurantId: ObjectIdSchema,
  title: z.string().trim().min(2).max(100),
  category: ExpenseCategorySchema,
  amount: z.number().finite().min(0.01),
  expenseDate: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
});

function getRestaurantFilter(admin: { role: string; assignedRestaurantId?: unknown }, requestedId?: string) {
  if (admin.role !== "super_admin") {
    if (!admin.assignedRestaurantId) {
      throw new Error("This admin account has no restaurant assignment.");
    }
    return { restaurantId: admin.assignedRestaurantId };
  }
  return requestedId ? { restaurantId: new mongoose.Types.ObjectId(requestedId) } : {};
}

function parseExpenseDate(dateValue?: string): Date {
  if (!dateValue) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return indiaLocalDateStart(dateValue);
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) throw new Error("Expense date is invalid.");
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);

    const { searchParams } = new URL(req.url);
    const requestedRestaurantId = searchParams.get("restaurantId") || undefined;
    if (requestedRestaurantId) ObjectIdSchema.parse(requestedRestaurantId);
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "finance_viewer", "restaurant_manager"],
      requestedRestaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }
    if (authCheck.admin?.role !== "super_admin" && !authCheck.admin?.assignedRestaurantId) {
      return errorResponse("This admin account has no restaurant assignment.", 403);
    }

    const preset = z.enum([
      "today", "yesterday", "last7", "last30", "currentMonth", "previousMonth", "custom",
    ]).parse(searchParams.get("range") || "last30") as FinanceRangePreset;
    const groupBy = z.enum(["day", "month", "year"]).parse(searchParams.get("groupBy") || "day") as FinanceGroupBy;
    const range = resolveFinanceDateRange(
      preset,
      {
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
      }
    );
    const restaurantFilter = getRestaurantFilter(authCheck.admin!, requestedRestaurantId);
    const dateWindow = { $gte: range.startAt, $lt: range.endAt };

    const [orders, deliveredInWindow, refunds, expenses, restaurants] = await Promise.all([
      Order.find({ ...restaurantFilter, placedAt: dateWindow })
        .select("_id orderNumber restaurantId restaurantSlug orderStatus paymentMethod subtotal deliveryFee taxAmount discountAmount totalAmount cashCollectedAmount cashOutstandingAmount placedAt deliveredAt")
        .lean(),
      Order.find({
        ...restaurantFilter,
        orderStatus: "delivered",
        deliveredAt: dateWindow,
        cashCollectedAmount: { $gt: 0 },
      }).select("_id orderNumber cashCollectedAmount deliveredAt").lean(),
      Refund.find({
        ...restaurantFilter,
        $or: [
          { createdAt: dateWindow },
          { processedAt: dateWindow },
          { status: "processed", processedAt: { $exists: false }, updatedAt: dateWindow },
        ],
      }).select("_id orderId restaurantId amount status processedAt updatedAt createdAt")
        .populate("orderId", "orderNumber").lean(),
      Expense.find({ ...restaurantFilter, expenseDate: dateWindow })
        .select("_id restaurantId title category amount expenseDate notes recordedByAdminId")
        .sort({ expenseDate: -1 })
        .lean(),
      Restaurant.find(restaurantFilter).select("_id name slug").sort({ name: 1 }).lean(),
    ]);

    const legacyCodPayments = deliveredInWindow.length
      ? await Payment.find({
          ...restaurantFilter,
          paymentMethod: "cod",
          orderId: { $in: deliveredInWindow.map((order) => order._id) },
          "codCollections.0": { $exists: false },
        }).select("_id").lean()
      : [];
    const payments = await Payment.find({
      ...restaurantFilter,
      $or: [
        { createdAt: dateWindow },
        { capturedAt: dateWindow },
        { paymentMethod: "cod", codCollections: { $elemMatch: { collectedAt: dateWindow } } },
        { _id: { $in: legacyCodPayments.map((payment) => payment._id) } },
      ],
    }).select("_id orderId restaurantId amount paymentMethod status amountRefunded codCollectedAmount codOutstandingAmount capturedAt createdAt updatedAt codCollections")
      .populate("orderId", "orderNumber")
      .lean();

    const normalizedPayments = payments.map((payment) => {
      const orderReference = payment.orderId;
      if (orderReference && typeof orderReference === "object" && "_id" in orderReference) {
        const populatedOrder = orderReference as { _id: unknown; orderNumber?: string };
        const legacyDelivery = deliveredInWindow.find(
          (order) => String(order._id) === String(populatedOrder._id)
        );
        return {
          ...payment,
          orderId: populatedOrder._id,
          order: { orderNumber: populatedOrder.orderNumber || "—" },
          ...(payment.paymentMethod === "cod" &&
          (!payment.codCollections || payment.codCollections.length === 0) &&
          legacyDelivery?.deliveredAt &&
          legacyDelivery.cashCollectedAmount
            ? {
                codCollections: [{
                  amount: legacyDelivery.cashCollectedAmount,
                  collectedAt: legacyDelivery.deliveredAt,
                }],
              }
            : {}),
        };
      }
      return payment;
    });
    const normalizedRefunds = refunds.map((refund) => {
      const orderReference = refund.orderId;
      if (orderReference && typeof orderReference === "object" && "_id" in orderReference) {
        const populatedOrder = orderReference as { _id: unknown; orderNumber?: string };
        return {
          ...refund,
          orderId: populatedOrder._id,
          order: { orderNumber: populatedOrder.orderNumber || "—" },
        };
      }
      return refund;
    });

    const report = buildFinanceReport({
      range,
      groupBy,
      orders,
      payments: normalizedPayments,
      refunds: normalizedRefunds,
      expenses,
      restaurants,
    });
    return successResponse({
      report,
      restaurants,
      canRecordExpenses: ["super_admin", "restaurant_manager"].includes(authCheck.admin!.role),
    });
  } catch (err) {
    if (err instanceof Error && /date|Choose both|Report date ranges/i.test(err.message)) {
      return errorResponse(err.message, 400);
    }
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  let session: mongoose.ClientSession | undefined;
  try {
    const conn = await connectToDatabase();
    if (!conn) return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);

    const transactionSession = await mongoose.startSession();
    session = transactionSession;
    const validatedData = RecordExpenseSchema.parse(await req.json());
    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager"],
      validatedData.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }
    const expenseDate = parseExpenseDate(validatedData.expenseDate);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    let createdExpense: Awaited<ReturnType<typeof Expense.create>>[number] | undefined;

    await transactionSession.withTransaction(async () => {
      const [expense] = await Expense.create(
        [{
          restaurantId: validatedData.restaurantId,
          title: validatedData.title,
          category: validatedData.category,
          amount: validatedData.amount,
          expenseDate,
          notes: validatedData.notes,
          recordedByAdminId: authCheck.admin!._id,
        }],
        { session: transactionSession }
      );
      createdExpense = expense;

      const lastEntry = await FinancialLedgerEntry.findOne({ restaurantId: validatedData.restaurantId })
        .sort({ createdAt: -1 })
        .session(transactionSession);
      const balanceAfter = (lastEntry?.balanceAfter || 0) - validatedData.amount;
      await FinancialLedgerEntry.create(
        [{
          restaurantId: validatedData.restaurantId,
          entryType: "debit",
          category: "expense",
          amount: validatedData.amount,
          balanceAfter,
          referenceModel: "Expense",
          referenceId: expense._id,
          description: `Expense: ${validatedData.title} (${validatedData.category})`,
        }],
        { session: transactionSession }
      );
      await AuditLog.create(
        [{
          restaurantId: validatedData.restaurantId,
          actorType: "admin",
          actorId: authCheck.admin!._id,
          action: "FINANCE_EXPENSE_RECORDED",
          entity: "Expense",
          entityId: expense._id,
          newState: {
            title: validatedData.title,
            category: validatedData.category,
            amount: validatedData.amount,
            expenseDate,
            notes: validatedData.notes,
          },
          ipAddress,
        }],
        { session: transactionSession }
      );
    });

    return successResponse(createdExpense, 201);
  } catch (err) {
    return handleApiError(err);
  } finally {
    await session?.endSession();
  }
}
