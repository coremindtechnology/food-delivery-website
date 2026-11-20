"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { FinanceRangePreset } from "@/lib/finance-report";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";

interface FinanceRestaurant {
  _id: string;
  name: string;
  slug: string;
}

interface FinanceReport {
  timeZone: string;
  range: { startDate: string; endDate: string };
  groupBy: "day" | "month" | "year";
  summary: Record<string, number | string | null>;
  restaurantSummary: {
    restaurantId: string;
    restaurantName: string;
    restaurantSlug: string;
    totalOrders: number;
    completedOrders: number;
    rejectedOrders: number;
    cancelledOrders: number;
    grossOrderValue: number;
    discounts: number;
    refunds: number;
    netSales: number;
    deliveryCharges: number;
    applicableTaxes: number;
  }[];
  trend: { period: string; grossOrderValue: number; discounts: number; refunds: number; netSales: number; orders: number }[];
  expensesByCategory: { category: string; amount: number }[];
  rejectedAndCancelledOrders: { orderNumber: string; restaurantSlug: string; status: string; totalAmount: number; placedAt: string }[];
  paymentReconciliation: {
    id: string;
    orderNumber: string;
    paymentMethod: string;
    status: string;
    amount: number;
    amountRefunded: number;
    codCollectedAmount: number;
    codOutstandingAmount: number;
    capturedAt: string | null;
    createdAt: string;
  }[];
  codCollections: { orderNumber: string; amount: number; collectedAt: string }[];
  refunds: { id: string; orderNumber: string; amount: number; status: string; processedAt: string | null }[];
  expenses: { id: string; restaurantName: string; title: string; category: string; amount: number; expenseDate: string; notes: string }[];
}

const RANGE_OPTIONS: { value: FinanceRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "currentMonth", label: "Current Month" },
  { value: "previousMonth", label: "Previous Month" },
  { value: "custom", label: "Custom Date Range" },
];

const EXPENSE_CATEGORIES = [
  ["food_cost", "Food costs / raw materials"],
  ["packaging", "Packaging costs"],
  ["delivery", "Delivery expenses"],
  ["staff", "Staff expenses"],
  ["rent", "Rent"],
  ["utilities", "Utilities"],
  ["gateway_fees", "Gateway fees"],
  ["maintenance", "Maintenance"],
  ["other", "Other operating expenses"],
] as const;

const CURRENCY_METRICS: { key: string; label: string }[] = [
  { key: "grossOrderValue", label: "Gross order value (completed)" },
  { key: "discounts", label: "Discounts" },
  { key: "refunds", label: "Processed refunds" },
  { key: "netSales", label: "Net sales" },
  { key: "deliveryCharges", label: "Delivery charges" },
  { key: "applicableTaxes", label: "Applicable taxes" },
  { key: "onlinePayments", label: "Online payments captured" },
  { key: "codCollected", label: "COD collected in period" },
  { key: "codOutstanding", label: "Current COD outstanding" },
  { key: "gatewayFees", label: "Gateway fees recorded" },
  { key: "foodCosts", label: "Food costs recorded" },
  { key: "packagingCosts", label: "Packaging costs" },
  { key: "deliveryExpenses", label: "Delivery expenses" },
  { key: "staffExpenses", label: "Staff expenses" },
  { key: "rentAndUtilities", label: "Rent and utilities" },
  { key: "otherOperatingExpenses", label: "Other operating expenses" },
  { key: "operatingExpenses", label: "Total recorded operating expenses" },
  { key: "estimatedOperatingProfit", label: "Estimated operating profit" },
];

function localToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export default function AdminFinancePage() {
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [restaurants, setRestaurants] = useState<FinanceRestaurant[]>([]);
  const [canRecordExpenses, setCanRecordExpenses] = useState(false);
  const [range, setRange] = useState<FinanceRangePreset>("last30");
  const [startDate, setStartDate] = useState(localToday);
  const [endDate, setEndDate] = useState(localToday);
  const [restaurantId, setRestaurantId] = useState("");
  const [groupBy, setGroupBy] = useState<"day" | "month" | "year">("day");
  const [loading, setLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [error, setError] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    restaurantId: "",
    title: "",
    category: "food_cost",
    amount: "",
    expenseDate: localToday(),
    notes: "",
  });

  const loadReport = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ range, groupBy });
      if (restaurantId) params.set("restaurantId", restaurantId);
      if (range === "custom") {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      const response = await fetch(`/api/admin/finance?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load financial reports.");
      setReport(data.data.report);
      setRestaurants(data.data.restaurants);
      setCanRecordExpenses(data.data.canRecordExpenses);
      setExpenseForm((current) => ({
        ...current,
        restaurantId: current.restaurantId || data.data.restaurants[0]?._id || "",
      }));
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load financial reports.");
    } finally {
      setLoading(false);
    }
  }, [range, groupBy, restaurantId, startDate, endDate]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  useAdminAutoRefresh(() => loadReport(true));

  const summary = report?.summary;
  const countMetrics = useMemo(() => [
    { key: "totalOrders", label: "Total orders" },
    { key: "completedOrders", label: "Completed orders" },
    { key: "rejectedOrders", label: "Rejected orders" },
    { key: "cancelledOrders", label: "Cancelled orders" },
  ], []);

  function metricValue(value: number | string | null | undefined): string {
    return typeof value === "number" ? formatCurrency(value) : "—";
  }

  function downloadCsv() {
    if (!report) return;
    const rows: unknown[][] = [["Record type", "Period / order", "Restaurant / method", "Category / status", "Amount", "Details"]];
    rows.push(["Report", `${report.range.startDate} to ${report.range.endDate}`, "", "", "", `Timezone ${report.timeZone}`]);
    for (const [key, value] of Object.entries(report.summary)) rows.push(["Summary", key, "", "", value, ""]);
    for (const item of report.restaurantSummary) {
      rows.push(["Restaurant", item.restaurantName, "", "net sales", item.netSales, `Orders ${item.totalOrders}; completed ${item.completedOrders}; rejected ${item.rejectedOrders}; cancelled ${item.cancelledOrders}; gross ${item.grossOrderValue}; discounts ${item.discounts}; refunds ${item.refunds}; delivery ${item.deliveryCharges}; tax ${item.applicableTaxes}`]);
    }
    for (const item of report.trend) rows.push(["Income trend", item.period, "", "", item.netSales, `Gross ${item.grossOrderValue}; discounts ${item.discounts}; refunds ${item.refunds}; orders ${item.orders}`]);
    for (const item of report.rejectedAndCancelledOrders) rows.push(["Order status", item.orderNumber, item.restaurantSlug, item.status, item.totalAmount, item.placedAt]);
    for (const item of report.paymentReconciliation) rows.push(["Payment", item.orderNumber, item.paymentMethod, item.status, item.amount, `Refunded ${item.amountRefunded}; COD collected ${item.codCollectedAmount}; COD outstanding ${item.codOutstandingAmount}; created ${item.createdAt}; captured ${item.capturedAt || ""}`]);
    for (const item of report.codCollections) rows.push(["COD collection", item.orderNumber, "COD", "collected", item.amount, item.collectedAt]);
    for (const item of report.refunds) rows.push(["Refund", item.orderNumber, "", item.status, item.amount, item.processedAt || ""]);
    for (const item of report.expenses) rows.push(["Expense", item.title, item.restaurantName, item.category, item.amount, `${item.expenseDate}; ${item.notes}`]);
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-report-${report.range.startDate}-to-${report.range.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function recordExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingExpense(true);
    setError("");
    try {
      const response = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to record expense.");
      setExpenseForm((current) => ({ ...current, title: "", amount: "", notes: "" }));
      await loadReport();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record expense.");
    } finally {
      setSavingExpense(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-8 sm:px-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Admin</p>
            <h1 className="text-3xl font-black text-charcoal-900">Finance & business reports</h1>
            <p className="mt-1 text-sm text-charcoal-500">Order sales, collected funds, refunds, and recorded operating expenses. Reporting timezone: Asia/Kolkata.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={downloadCsv} disabled={!report}>Export CSV</Button>
            <Button variant="outline" onClick={() => window.print()}>Print report</Button>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-cream-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
          <label className="space-y-1 text-sm font-semibold">Date range
            <select value={range} onChange={(event) => setRange(event.target.value as FinanceRangePreset)} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2">
              {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {range === "custom" && <>
            <label className="space-y-1 text-sm font-semibold">Start date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm font-semibold">End date
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
            </label>
          </>}
          <label className="space-y-1 text-sm font-semibold">Restaurant
            <select value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2">
              <option value="">Combined restaurants</option>
              {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold">Income report
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as "day" | "month" | "year")} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2">
              <option value="day">Daily sales</option>
              <option value="month">Monthly income</option>
              <option value="year">Yearly income</option>
            </select>
          </label>
        </section>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p role="status" className="text-sm text-charcoal-600">Loading database reports…</p>}
        {report && summary && <>
          <section aria-label="Order totals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {countMetrics.map((metric) => (
              <article key={metric.key} className="rounded-2xl border border-cream-200 bg-white p-4">
                <p className="text-sm text-charcoal-500">{metric.label}</p>
                <p className="mt-1 text-2xl font-black text-charcoal-900">{summary[metric.key]}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-cream-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Financial summary</h2>
                <p className="text-xs text-charcoal-500">{report.range.startDate} – {report.range.endDate} · {report.timeZone} · excludes pending, rejected, and cancelled orders from sales</p>
              </div>
              {summary.profitStatus === "incomplete" && (
                <p className="max-w-xl rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  Estimated profit is incomplete: no food-cost entries were recorded for this reporting period. Enter actual costs before relying on the estimate.
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CURRENCY_METRICS.map((metric) => (
                <div key={metric.key} className="flex justify-between gap-3 border-b border-cream-100 py-2 text-sm">
                  <span className="text-charcoal-600">{metric.label}</span>
                  <strong className={metric.key === "estimatedOperatingProfit" ? "text-primary-700" : "text-charcoal-900"}>
                    {metricValue(summary[metric.key])}{metric.key === "estimatedOperatingProfit" ? ` (${summary.profitStatus})` : ""}
                  </strong>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-b border-cream-100 py-2 text-sm">
                <span className="text-charcoal-600">Estimated profit margin</span>
                <strong>{summary.estimatedProfitMargin === null ? "—" : `${summary.estimatedProfitMargin}% (${summary.profitStatus})`}</strong>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-charcoal-500">
              Sales include completed orders only. Gross order value is the stored food subtotal; net sales subtract discounts and processed refunds once. Delivery charges and taxes are shown separately and excluded from sales and estimated profit revenue; tax is treated as pass-through. Payments and COD are collections, not extra sales. COD outstanding is the current balance of non-cancelled COD orders placed in the selected range. Refunds are recognized on their processing date.
            </p>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ReportTable title="Restaurant report" headers={["Restaurant", "Orders", "Completed", "Rejected", "Cancelled", "Gross", "Discounts", "Refunds", "Net sales"]}>
              {report.restaurantSummary.map((item) => <tr key={item.restaurantId}>
                <td>{item.restaurantName}</td><td>{item.totalOrders}</td><td>{item.completedOrders}</td><td>{item.rejectedOrders}</td><td>{item.cancelledOrders}</td>
                <td>{formatCurrency(item.grossOrderValue)}</td><td>{formatCurrency(item.discounts)}</td><td>{formatCurrency(item.refunds)}</td><td>{formatCurrency(item.netSales)}</td>
              </tr>)}
            </ReportTable>
            <ReportTable title={`${groupBy === "day" ? "Daily sales" : groupBy === "month" ? "Monthly income" : "Yearly income"}`} headers={["Period", "Orders", "Gross", "Discounts", "Refunds", "Net sales"]}>
              {report.trend.map((item) => <tr key={item.period}>
                <td>{item.period}</td><td>{item.orders}</td><td>{formatCurrency(item.grossOrderValue)}</td><td>{formatCurrency(item.discounts)}</td><td>{formatCurrency(item.refunds)}</td><td>{formatCurrency(item.netSales)}</td>
              </tr>)}
            </ReportTable>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ReportTable title="Expenses by category" headers={["Category", "Recorded expense"]}>
              {report.expensesByCategory.map((item) => <tr key={item.category}><td>{item.category.replaceAll("_", " ")}</td><td>{formatCurrency(item.amount)}</td></tr>)}
            </ReportTable>
            <ReportTable title="COD collection history" headers={["Order", "Collected", "Collection date"]}>
              {report.codCollections.map((item, index) => <tr key={`${item.orderNumber}-${index}`}><td>{item.orderNumber}</td><td>{formatCurrency(item.amount)}</td><td>{formatDate(item.collectedAt)}</td></tr>)}
            </ReportTable>
          </section>

          <ReportTable title="Rejected and cancelled orders" headers={["Order", "Restaurant", "Status", "Order total", "Placed"]}>
            {report.rejectedAndCancelledOrders.map((item) => <tr key={item.orderNumber}><td>{item.orderNumber}</td><td>{item.restaurantSlug}</td><td>{item.status}</td><td>{formatCurrency(item.totalAmount)}</td><td>{formatDate(item.placedAt)}</td></tr>)}
          </ReportTable>

          <ReportTable title="Payment reconciliation" headers={["Order", "Method", "Payment state", "Amount", "Refunded", "COD collected", "COD outstanding", "Captured / attempt date"]}>
            {report.paymentReconciliation.map((item) => <tr key={item.id}>
              <td>{item.orderNumber}</td><td>{item.paymentMethod}</td><td>{item.status}</td><td>{formatCurrency(item.amount)}</td><td>{formatCurrency(item.amountRefunded)}</td><td>{formatCurrency(item.codCollectedAmount)}</td><td>{formatCurrency(item.codOutstandingAmount)}</td><td>{formatDate(item.capturedAt || item.createdAt)}</td>
            </tr>)}
          </ReportTable>

          <ReportTable title="Refunds" headers={["Order", "Status", "Amount", "Processed"]}>
            {report.refunds.map((item) => <tr key={item.id}><td>{item.orderNumber}</td><td>{item.status}</td><td>{formatCurrency(item.amount)}</td><td>{formatDate(item.processedAt)}</td></tr>)}
          </ReportTable>

          <ReportTable title="Recorded expenses" headers={["Date", "Restaurant", "Description", "Category", "Amount", "Notes"]}>
            {report.expenses.map((item) => <tr key={item.id}><td>{formatDate(item.expenseDate)}</td><td>{item.restaurantName}</td><td>{item.title}</td><td>{item.category.replaceAll("_", " ")}</td><td>{formatCurrency(item.amount)}</td><td>{item.notes || "—"}</td></tr>)}
          </ReportTable>

          {canRecordExpenses && <section className="rounded-2xl border border-cream-200 bg-white p-4 sm:p-6 print:hidden">
            <h2 className="text-xl font-bold">Record operating expense</h2>
            <p className="mb-4 mt-1 text-sm text-charcoal-500">Entries are immutable in this panel and each one creates a financial audit log, preserving the original record.</p>
            <form onSubmit={recordExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-sm font-semibold">Restaurant
                <select required value={expenseForm.restaurantId} onChange={(event) => setExpenseForm({ ...expenseForm, restaurantId: event.target.value })} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2">
                  {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold">Expense category
                <select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2">
                  {EXPENSE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold">Expense date (India)
                <input required type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-semibold">Description
                <input required minLength={2} maxLength={100} value={expenseForm.title} onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-semibold">Amount (INR)
                <input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm font-semibold">Notes
                <input maxLength={300} value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2" />
              </label>
              <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" isLoading={savingExpense} disabled={!expenseForm.restaurantId}>Record expense</Button></div>
            </form>
          </section>}
        </>}
      </div>
    </main>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReportTable({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-cream-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="max-h-[28rem] overflow-auto print:max-h-none print:overflow-visible">
        <table className="w-full min-w-max text-left text-xs">
          <thead className="sticky top-0 bg-cream-50 text-charcoal-600"><tr>{headers.map((header) => <th key={header} className="px-2 py-2 font-semibold">{header}</th>)}</tr></thead>
          <tbody className="divide-y divide-cream-100">{children}</tbody>
        </table>
      </div>
    </section>
  );
}
