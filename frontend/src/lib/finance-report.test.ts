import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinanceReport,
  indiaLocalDateStart,
  resolveFinanceDateRange,
  type FinanceExpense,
  type FinanceOrder,
  type FinancePayment,
  type FinanceRefund,
} from "./finance-report";

const range = resolveFinanceDateRange("custom", {
  startDate: "2026-01-01",
  endDate: "2026-01-02",
});
const vegId = "restaurant-veg";
const nonVegId = "restaurant-non-veg";

function order(overrides: Partial<FinanceOrder> & Pick<FinanceOrder, "_id" | "orderNumber" | "restaurantId" | "orderStatus">): FinanceOrder {
  return {
    restaurantSlug: "veg",
    paymentMethod: "razorpay",
    subtotal: 0,
    deliveryFee: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    placedAt: "2026-01-01T04:30:00.000Z",
    ...overrides,
  };
}

test("India date boundaries and presets use inclusive local days with exclusive end", () => {
  assert.equal(indiaLocalDateStart("2026-01-01").toISOString(), "2025-12-31T18:30:00.000Z");
  const last7 = resolveFinanceDateRange("last7", {}, new Date("2026-10-31T04:51:00.000Z"));
  assert.equal(last7.startDate, "2026-10-25");
  assert.equal(last7.endDate, "2026-10-31");
  assert.equal(last7.endAt.toISOString(), "2026-10-31T18:30:00.000Z");
  const lastMonth = resolveFinanceDateRange("previousMonth", {}, new Date("2026-10-31T04:51:00.000Z"));
  assert.equal(lastMonth.startDate, "2026-09-01");
  assert.equal(lastMonth.endDate, "2026-09-30");
  assert.throws(() => indiaLocalDateStart("2026-02-30"), /invalid/);
});

test("known transactions reconcile sales, collections, refunds, and recorded expenses without double counting", () => {
  const orders: FinanceOrder[] = [
    order({
      _id: "cod-order",
      orderNumber: "COD-1",
      restaurantId: vegId,
      orderStatus: "delivered",
      paymentMethod: "cod",
      subtotal: 1000,
      discountAmount: 100,
      deliveryFee: 40,
      taxAmount: 45,
      totalAmount: 985,
      cashCollectedAmount: 500,
      cashOutstandingAmount: 485,
    }),
    order({
      _id: "online-order",
      orderNumber: "ONLINE-1",
      restaurantId: nonVegId,
      restaurantSlug: "non-veg",
      orderStatus: "delivered",
      paymentMethod: "razorpay",
      subtotal: 500,
      deliveryFee: 40,
      taxAmount: 24,
      totalAmount: 564,
      placedAt: "2026-01-01T18:45:00.000Z",
    }),
    order({
      _id: "rejected-order",
      orderNumber: "REJECTED-1",
      restaurantId: vegId,
      orderStatus: "rejected",
      subtotal: 300,
      totalAmount: 300,
    }),
    order({
      _id: "cancelled-order",
      orderNumber: "CANCELLED-1",
      restaurantId: vegId,
      orderStatus: "cancelled",
      subtotal: 200,
      totalAmount: 200,
      paymentMethod: "cod",
      cashOutstandingAmount: 200,
    }),
  ];
  const payments: FinancePayment[] = [
    {
      _id: "cod-payment",
      orderId: "cod-order",
      restaurantId: vegId,
      amount: 985,
      paymentMethod: "cod",
      status: "partially_paid",
      codCollectedAmount: 500,
      codOutstandingAmount: 485,
      createdAt: "2026-01-01T04:30:00.000Z",
      codCollections: [{ amount: 500, collectedAt: "2026-01-02T01:00:00.000Z" }],
    },
    {
      _id: "online-payment",
      orderId: "online-order",
      restaurantId: nonVegId,
      amount: 564,
      paymentMethod: "razorpay",
      status: "partially_refunded",
      amountRefunded: 100,
      capturedAt: "2026-01-02T12:00:00.000Z",
      createdAt: "2026-01-01T18:45:00.000Z",
    },
  ];
  const refunds: FinanceRefund[] = [
    {
      _id: "processed-refund",
      orderId: "online-order",
      restaurantId: nonVegId,
      amount: 100,
      status: "processed",
      processedAt: "2026-01-02T12:30:00.000Z",
      createdAt: "2026-01-02T12:00:00.000Z",
    },
    {
      _id: "pending-refund",
      orderId: "online-order",
      restaurantId: nonVegId,
      amount: 50,
      status: "pending",
      createdAt: "2026-01-02T13:00:00.000Z",
    },
  ];
  const expenseCategories = [
    ["food_cost", 200],
    ["packaging", 20],
    ["delivery", 30],
    ["staff", 50],
    ["rent", 60],
    ["utilities", 10],
    ["gateway_fees", 5],
    ["other", 15],
  ] as const;
  const expenses: FinanceExpense[] = expenseCategories.map(([category, amount], index) => ({
    _id: `expense-${index}`,
    restaurantId: index % 2 ? nonVegId : vegId,
    title: `Sample ${category}`,
    category,
    amount,
    expenseDate: "2026-01-02T03:00:00.000Z",
  }));
  const report = buildFinanceReport({
    range,
    groupBy: "day",
    orders,
    payments,
    refunds,
    expenses,
    restaurants: [
      { _id: vegId, name: "Veg Kitchen", slug: "veg" },
      { _id: nonVegId, name: "Non-Veg Kitchen", slug: "non-veg" },
    ],
  });

  assert.deepEqual(
    [
      report.summary.totalOrders,
      report.summary.completedOrders,
      report.summary.rejectedOrders,
      report.summary.cancelledOrders,
      report.summary.grossOrderValue,
      report.summary.discounts,
      report.summary.refunds,
      report.summary.netSales,
      report.summary.deliveryCharges,
      report.summary.applicableTaxes,
      report.summary.onlinePayments,
      report.summary.codCollected,
      report.summary.codOutstanding,
      report.summary.gatewayFees,
      report.summary.foodCosts,
      report.summary.packagingCosts,
      report.summary.deliveryExpenses,
      report.summary.staffExpenses,
      report.summary.rentAndUtilities,
      report.summary.otherOperatingExpenses,
      report.summary.operatingExpenses,
      report.summary.estimatedOperatingProfit,
      report.summary.estimatedProfitMargin,
      report.summary.profitStatus,
    ],
    [4, 2, 1, 1, 1500, 100, 100, 1300, 80, 69, 564, 500, 485, 5, 200, 20, 30, 50, 70, 15, 390, 990, 71.74, "estimated"]
  );
  assert.equal(report.trend.length, 2);
  assert.equal(report.trend[0].period, "2026-01-01");
  assert.equal(report.trend[1].period, "2026-01-02");
  assert.equal(report.trend[1].refunds, 100);
  assert.equal(report.rejectedAndCancelledOrders.length, 2);
  assert.equal(report.refunds.length, 2);
});

test("missing food cost explicitly marks profit incomplete", () => {
  const report = buildFinanceReport({
    range,
    groupBy: "month",
    orders: [],
    payments: [],
    refunds: [],
    expenses: [],
    restaurants: [],
  });
  assert.equal(report.summary.estimatedOperatingProfit, 0);
  assert.equal(report.summary.profitStatus, "incomplete");
});
