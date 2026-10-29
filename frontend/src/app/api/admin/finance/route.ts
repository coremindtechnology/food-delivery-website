import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyAdminPermissions } from "@/lib/admin-auth";
import { Expense } from "@/models/Expense";
import { FinancialLedgerEntry } from "@/models/FinancialLedgerEntry";
import { logAuditEvent } from "@/lib/admin-security";
import { ObjectIdSchema } from "@/lib/validations/common";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const RecordExpenseSchema = z.object({
  restaurantId: ObjectIdSchema,
  title: z.string().trim().min(2).max(100),
  category: z.enum(["raw_materials", "packaging", "utilities", "staff", "maintenance", "other"]),
  amount: z.number().min(0.01),
  expenseDate: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return errorResponse("Database connection unavailable. Please set MONGODB_URI.", 503);
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId") || undefined;

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "finance_viewer", "restaurant_manager"],
      restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 401);
    }

    const admin = authCheck.admin!;
    const filter: Record<string, unknown> = {};

    if (admin.role !== "super_admin" && admin.assignedRestaurantId) {
      filter.restaurantId = admin.assignedRestaurantId;
    } else if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const [ledgerEntries, expenses, creditsAgg, debitsAgg] = await Promise.all([
      FinancialLedgerEntry.find(filter).sort({ createdAt: -1 }).limit(30).lean(),
      Expense.find(filter).sort({ expenseDate: -1 }).limit(20).lean(),
      FinancialLedgerEntry.aggregate([
        { $match: { ...filter, entryType: "credit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FinancialLedgerEntry.aggregate([
        { $match: { ...filter, entryType: "debit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalCredits = creditsAgg[0]?.total || 0;
    const totalDebits = debitsAgg[0]?.total || 0;
    const netBalance = totalCredits - totalDebits;

    return successResponse({
      summary: {
        totalCredits,
        totalDebits,
        netBalance,
      },
      ledgerEntries,
      expenses,
    });
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

    const body = await req.json();
    const validatedData = RecordExpenseSchema.parse(body);

    const authCheck = await verifyAdminPermissions(
      ["super_admin", "restaurant_manager"],
      validatedData.restaurantId
    );
    if (!authCheck.authorized) {
      return errorResponse(authCheck.error || "Unauthorized", authCheck.statusCode || 403);
    }

    const createdExpense = await Expense.create({
      restaurantId: validatedData.restaurantId,
      title: validatedData.title,
      category: validatedData.category,
      amount: validatedData.amount,
      expenseDate: validatedData.expenseDate ? new Date(validatedData.expenseDate) : new Date(),
      notes: validatedData.notes,
      recordedByAdminId: authCheck.admin!._id,
    });

    // Record corresponding debit in Financial Ledger
    const lastEntry = await FinancialLedgerEntry.findOne({ restaurantId: validatedData.restaurantId })
      .sort({ createdAt: -1 });
    const currentBalance = lastEntry ? lastEntry.balanceAfter : 0;
    const balanceAfter = currentBalance - validatedData.amount;

    await FinancialLedgerEntry.create({
      restaurantId: validatedData.restaurantId,
      entryType: "debit",
      category: "expense",
      amount: validatedData.amount,
      balanceAfter,
      referenceModel: "Expense",
      referenceId: createdExpense._id,
      description: `Expense: ${validatedData.title} (${validatedData.category})`,
    });

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await logAuditEvent({
      adminId: authCheck.admin!._id,
      restaurantId: validatedData.restaurantId,
      action: "EXPENSE_RECORDED",
      entity: "Admin",
      entityId: createdExpense._id,
      newState: { title: validatedData.title, amount: validatedData.amount },
      ipAddress: clientIp,
    });

    return successResponse(createdExpense, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

