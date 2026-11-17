export const FINANCE_TIME_ZONE = "Asia/Kolkata";
const INDIA_OFFSET_MINUTES = 330;
const MAX_REPORT_DAYS = 3660;

export type FinanceRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "currentMonth"
  | "previousMonth"
  | "custom";
export type FinanceGroupBy = "day" | "month" | "year";

export interface FinanceDateRange {
  preset: FinanceRangePreset;
  startDate: string;
  endDate: string;
  startAt: Date;
  endAt: Date;
}

export interface FinanceOrder {
  _id: unknown;
  orderNumber: string;
  restaurantId: unknown;
  restaurantSlug: string;
  orderStatus: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  cashCollectedAmount?: number;
  cashOutstandingAmount?: number;
  placedAt: Date | string;
  deliveredAt?: Date | string;
}

export interface FinancePayment {
  _id: unknown;
  orderId: unknown;
  restaurantId: unknown;
  amount: number;
  paymentMethod: string;
  status: string;
  amountRefunded?: number;
  codCollectedAmount?: number;
  codOutstandingAmount?: number;
  capturedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  codCollections?: { amount: number; collectedAt: Date | string }[];
  order?: { orderNumber: string };
}

export interface FinanceRefund {
  _id: unknown;
  orderId: unknown;
  restaurantId: unknown;
  amount: number;
  status: string;
  processedAt?: Date | string;
  updatedAt?: Date | string;
  createdAt: Date | string;
  order?: { orderNumber: string };
}

export interface FinanceExpense {
  _id: unknown;
  restaurantId: unknown;
  title: string;
  category: string;
  amount: number;
  expenseDate: Date | string;
  notes?: string;
  recordedByAdminId?: unknown;
}

export interface FinanceRestaurant {
  _id: unknown;
  name: string;
  slug?: string;
}

export function indiaDateKey(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FINANCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function monthStart(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function indiaLocalDateStart(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Dates must use YYYY-MM-DD.");
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("The requested date is invalid.");
  }
  return new Date(date.getTime() - INDIA_OFFSET_MINUTES * 60_000);
}

export function resolveFinanceDateRange(
  preset: FinanceRangePreset,
  input: { startDate?: string | null; endDate?: string | null } = {},
  now = new Date()
): FinanceDateRange {
  const today = indiaDateKey(now);
  let startDate: string;
  let lastIncludedDate: string;

  switch (preset) {
    case "today":
      startDate = today;
      lastIncludedDate = today;
      break;
    case "yesterday":
      startDate = shiftDate(today, -1);
      lastIncludedDate = startDate;
      break;
    case "last7":
      startDate = shiftDate(today, -6);
      lastIncludedDate = today;
      break;
    case "last30":
      startDate = shiftDate(today, -29);
      lastIncludedDate = today;
      break;
    case "currentMonth":
      startDate = monthStart(today);
      lastIncludedDate = today;
      break;
    case "previousMonth":
      lastIncludedDate = shiftDate(monthStart(today), -1);
      startDate = monthStart(lastIncludedDate);
      break;
    case "custom":
      startDate = input.startDate || "";
      lastIncludedDate = input.endDate || "";
      if (!startDate || !lastIncludedDate) {
        throw new Error("Choose both a start and end date.");
      }
      break;
    default: {
      const exhaustive: never = preset;
      throw new Error(`Unsupported date range: ${exhaustive}`);
    }
  }

  const startAt = indiaLocalDateStart(startDate);
  const endAt = indiaLocalDateStart(shiftDate(lastIncludedDate, 1));
  const dayCount = Math.round((endAt.getTime() - startAt.getTime()) / 86_400_000);
  if (dayCount < 1 || dayCount > MAX_REPORT_DAYS) {
    throw new Error(`Report date ranges must be between 1 and ${MAX_REPORT_DAYS} days.`);
  }
  return { preset, startDate, endDate: lastIncludedDate, startAt, endAt };
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sum(values: number[]): number {
  return money(values.reduce((total, value) => total + Math.round((value || 0) * 100), 0) / 100);
}

function sameDateRange(value: Date | string | undefined, range: FinanceDateRange): boolean {
  if (!value) return false;
  const date = new Date(value);
  return date >= range.startAt && date < range.endAt;
}

function groupKey(date: Date | string, groupBy: FinanceGroupBy): string {
  const key = indiaDateKey(date);
  if (groupBy === "year") return key.slice(0, 4);
  if (groupBy === "month") return key.slice(0, 7);
  return key;
}

function expenseBucket(category: string): string {
  if (category === "raw_materials" || category === "food_cost") return "foodCosts";
  if (category === "packaging") return "packagingCosts";
  if (category === "delivery") return "deliveryExpenses";
  if (category === "staff") return "staffExpenses";
  if (category === "rent" || category === "utilities") return "rentAndUtilities";
  if (category === "gateway_fees") return "gatewayFees";
  return "otherOperatingExpenses";
}

export function buildFinanceReport(input: {
  range: FinanceDateRange;
  groupBy: FinanceGroupBy;
  orders: FinanceOrder[];
  payments: FinancePayment[];
  refunds: FinanceRefund[];
  expenses: FinanceExpense[];
  restaurants: FinanceRestaurant[];
}) {
  const { range, groupBy, orders, payments, refunds, expenses, restaurants } = input;
  const completedOrders = orders.filter((order) => order.orderStatus === "delivered");
  const rejectedOrders = orders.filter((order) => order.orderStatus === "rejected");
  const cancelledOrders = orders.filter((order) => order.orderStatus === "cancelled");
  const processedRefunds = refunds.filter(
    (refund) =>
      refund.status === "processed" &&
      sameDateRange(refund.processedAt || refund.updatedAt || refund.createdAt, range)
  );
  const eligibleRazorpayPayments = payments.filter(
    (payment) =>
      payment.paymentMethod === "razorpay" &&
      ["captured", "partially_refunded", "refunded"].includes(payment.status)
  );
  const codCollectionEntries = payments.flatMap((payment) => {
    if (payment.paymentMethod !== "cod") return [];
    if (payment.codCollections?.length) {
      return payment.codCollections
        .filter((entry) => sameDateRange(entry.collectedAt, range))
        .map((entry) => ({ payment, amount: entry.amount, collectedAt: entry.collectedAt }));
    }
    const order = orders.find((entry) => String(entry._id) === String(payment.orderId));
    if (order?.deliveredAt && sameDateRange(order.deliveredAt, range) && (payment.codCollectedAmount || 0) > 0) {
      return [{ payment, amount: payment.codCollectedAmount || 0, collectedAt: order.deliveredAt }];
    }
    return [];
  });

  const grossOrderValue = sum(completedOrders.map((order) => order.subtotal));
  const discounts = sum(completedOrders.map((order) => order.discountAmount));
  const refundsTotal = sum(processedRefunds.map((refund) => refund.amount));
  const netSales = money(grossOrderValue - discounts - refundsTotal);
  const expensesByCategory = expenses.reduce<Record<string, number>>((totals, expense) => {
    const bucket = expenseBucket(expense.category);
    totals[bucket] = money((totals[bucket] || 0) + expense.amount);
    return totals;
  }, {});
  const foodCosts = expensesByCategory.foodCosts || 0;
  const packagingCosts = expensesByCategory.packagingCosts || 0;
  const deliveryExpenses = expensesByCategory.deliveryExpenses || 0;
  const staffExpenses = expensesByCategory.staffExpenses || 0;
  const rentAndUtilities = expensesByCategory.rentAndUtilities || 0;
  const gatewayFees = expensesByCategory.gatewayFees || 0;
  const otherOperatingExpenses = expensesByCategory.otherOperatingExpenses || 0;
  const operatingExpenses = sum([
    foodCosts,
    packagingCosts,
    deliveryExpenses,
    staffExpenses,
    rentAndUtilities,
    gatewayFees,
    otherOperatingExpenses,
  ]);
  const deliveryCharges = sum(completedOrders.map((order) => order.deliveryFee));
  const estimatedOperatingProfit = money(netSales + deliveryCharges - operatingExpenses);
  const codOutstanding = sum(
    orders
      .filter((order) => order.paymentMethod === "cod" && !["cancelled", "rejected"].includes(order.orderStatus))
      .map((order) => order.cashOutstandingAmount || 0)
  );
  const summary = {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    rejectedOrders: rejectedOrders.length,
    cancelledOrders: cancelledOrders.length,
    grossOrderValue,
    discounts,
    refunds: refundsTotal,
    netSales,
    deliveryCharges,
    applicableTaxes: sum(completedOrders.map((order) => order.taxAmount)),
    onlinePayments: sum(
      eligibleRazorpayPayments
        .filter((payment) =>
          sameDateRange(payment.capturedAt || payment.createdAt, range)
        )
        .map((payment) => payment.amount)
    ),
    codCollected: sum(codCollectionEntries.map((entry) => entry.amount)),
    codOutstanding,
    gatewayFees,
    foodCosts,
    packagingCosts,
    deliveryExpenses,
    staffExpenses,
    rentAndUtilities,
    otherOperatingExpenses,
    operatingExpenses,
    estimatedOperatingProfit,
    estimatedProfitMargin: netSales + deliveryCharges > 0
      ? money((estimatedOperatingProfit / (netSales + deliveryCharges)) * 100)
      : null,
    profitStatus: foodCosts > 0 ? "estimated" : "incomplete",
  };

  const restaurantSummary = restaurants.map((restaurant) => {
    const id = String(restaurant._id);
    const restaurantOrders = orders.filter((order) => String(order.restaurantId) === id);
    const restaurantCompleted = restaurantOrders.filter((order) => order.orderStatus === "delivered");
    const restaurantRefunds = processedRefunds.filter((refund) => String(refund.restaurantId) === id);
    const revenue = sum(restaurantCompleted.map((order) => order.subtotal));
    const discount = sum(restaurantCompleted.map((order) => order.discountAmount));
    const refundValue = sum(restaurantRefunds.map((refund) => refund.amount));
    return {
      restaurantId: id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug || "",
      totalOrders: restaurantOrders.length,
      completedOrders: restaurantCompleted.length,
      rejectedOrders: restaurantOrders.filter((order) => order.orderStatus === "rejected").length,
      cancelledOrders: restaurantOrders.filter((order) => order.orderStatus === "cancelled").length,
      grossOrderValue: revenue,
      discounts: discount,
      refunds: refundValue,
      netSales: money(revenue - discount - refundValue),
      deliveryCharges: sum(restaurantCompleted.map((order) => order.deliveryFee)),
      applicableTaxes: sum(restaurantCompleted.map((order) => order.taxAmount)),
    };
  });

  const trendMap = new Map<string, { period: string; grossOrderValue: number; discounts: number; refunds: number; netSales: number; orders: number }>();
  const getTrend = (key: string) => {
    let row = trendMap.get(key);
    if (!row) {
      row = { period: key, grossOrderValue: 0, discounts: 0, refunds: 0, netSales: 0, orders: 0 };
      trendMap.set(key, row);
    }
    return row;
  };
  for (let cursor = range.startAt.getTime(); cursor < range.endAt.getTime(); cursor += 86_400_000) {
    getTrend(groupKey(new Date(cursor), groupBy));
  }
  for (const order of completedOrders) {
    const row = getTrend(groupKey(order.placedAt, groupBy));
    row.grossOrderValue += order.subtotal;
    row.discounts += order.discountAmount;
    row.orders += 1;
  }
  for (const refund of processedRefunds) {
    const refundDate = refund.processedAt || refund.updatedAt || refund.createdAt;
    if (sameDateRange(refundDate, range)) {
      getTrend(groupKey(refundDate, groupBy)).refunds += refund.amount;
    }
  }
  const trend = [...trendMap.values()]
    .map((row) => ({
      ...row,
      grossOrderValue: money(row.grossOrderValue),
      discounts: money(row.discounts),
      refunds: money(row.refunds),
      netSales: money(row.grossOrderValue - row.discounts - row.refunds),
    }))
    .sort((left, right) => left.period.localeCompare(right.period));

  const orderMap = new Map(orders.map((order) => [String(order._id), order]));
  const paymentRows = payments.map((payment) => ({
    id: String(payment._id),
    orderNumber: payment.order?.orderNumber || orderMap.get(String(payment.orderId))?.orderNumber || "—",
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    amount: payment.amount,
    amountRefunded: payment.amountRefunded || 0,
    codCollectedAmount: payment.codCollectedAmount || 0,
    codOutstandingAmount: payment.codOutstandingAmount || 0,
    capturedAt: payment.capturedAt || null,
    createdAt: payment.createdAt,
  }));
  const refundRows = refunds.map((refund) => ({
    id: String(refund._id),
    orderNumber: refund.order?.orderNumber || orderMap.get(String(refund.orderId))?.orderNumber || "—",
    amount: refund.amount,
    status: refund.status,
    processedAt: refund.processedAt || (refund.status === "processed" ? refund.updatedAt || null : null),
  }));
  const expenseRows = expenses.map((expense) => ({
    id: String(expense._id),
    restaurantName: restaurants.find((restaurant) => String(restaurant._id) === String(expense.restaurantId))?.name || "—",
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    notes: expense.notes || "",
  }));

  return {
    timeZone: FINANCE_TIME_ZONE,
    range: {
      startDate: range.startDate,
      endDate: range.endDate,
      startAt: range.startAt.toISOString(),
      endAtExclusive: range.endAt.toISOString(),
    },
    groupBy,
    summary,
    restaurantSummary,
    trend,
    expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
    rejectedAndCancelledOrders: [...rejectedOrders, ...cancelledOrders].map((order) => ({
      orderNumber: order.orderNumber,
      restaurantSlug: order.restaurantSlug,
      status: order.orderStatus,
      totalAmount: order.totalAmount,
      placedAt: order.placedAt,
    })),
    paymentReconciliation: paymentRows,
    codCollections: codCollectionEntries.map((entry) => ({
      orderNumber: orderMap.get(String(entry.payment.orderId))?.orderNumber || "—",
      amount: entry.amount,
      collectedAt: entry.collectedAt,
    })),
    refunds: refundRows,
    expenses: expenseRows,
  };
}
