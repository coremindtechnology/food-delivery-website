"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  Info,
  LaptopMinimal,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PaymentRow = {
  _id: string;
  orderId: {
    _id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    orderStatus: string;
  } | null;
  restaurantId?: string | { _id: string; name: string; slug: string };
  amount: number;
  currency: string;
  paymentMethod: "razorpay" | "cod";
  status: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  codCollectedAmount: number;
  codOutstandingAmount: number;
  amountRefunded: number;
  amountRefundReserved: number;
  duplicateCapture: boolean;
  duplicateCaptureIds: string[];
  requiresRefund: boolean;
  failureReason?: string;
  createdAt: string;
  capturedAt?: string;
};

type RefundRow = {
  _id: string;
  orderId: { orderNumber: string; customerName: string; totalAmount: number } | string;
  restaurantId?: string | { _id: string; name: string };
  amount: number;
  reason: string;
  status: string;
  razorpayRefundId?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
};

type Restaurant = { _id: string; name: string };
type PaymentTab = "all" | "online" | "cod" | "refunds" | "failed" | "reconciliation";
type Period = "7" | "30" | "90" | "all";
type PaymentSummary = {
  totalCollection: number;
  onlinePayments: number;
  codExpected: number;
  codCollected: number;
  codOutstanding: number;
  totalRefunds: number;
  refundCount: number;
  failedAmount: number;
  failedCount: number;
  reviewCount: number;
  statusCounts: Record<string, number>;
};
type PageMeta = { page: number; limit: number; totalCount: number; totalPages: number; summary: PaymentSummary };

const TABS: { id: PaymentTab; label: string; Icon: typeof CreditCard }[] = [
  { id: "all", label: "All Transactions", Icon: CreditCard },
  { id: "online", label: "Online Payments", Icon: LaptopMinimal },
  { id: "cod", label: "Cash on Delivery", Icon: Banknote },
  { id: "refunds", label: "Refund Management", Icon: RotateCcw },
  { id: "failed", label: "Failed Payments", Icon: AlertTriangle },
  { id: "reconciliation", label: "Payment Reconciliation", Icon: RefreshCw },
];

const EMPTY_SUMMARY: PaymentSummary = {
  totalCollection: 0,
  onlinePayments: 0,
  codExpected: 0,
  codCollected: 0,
  codOutstanding: 0,
  totalRefunds: 0,
  refundCount: 0,
  failedAmount: 0,
  failedCount: 0,
  reviewCount: 0,
  statusCounts: {},
};

function paymentLabel(payment: PaymentRow) {
  if (payment.paymentMethod === "cod") {
    return payment.codCollectedAmount > 0 ? "COD collected" : "Cash on Delivery";
  }
  return "Online · Razorpay";
}

function paymentStatus(payment: PaymentRow) {
  if (payment.paymentMethod === "cod") {
    return payment.codOutstandingAmount === 0 && payment.codCollectedAmount > 0
      ? "collected"
      : payment.codCollectedAmount > 0 ? "partially_paid" : "outstanding";
  }
  return payment.status;
}

function statusStyle(status: string) {
  if (["captured", "collected"].includes(status)) return "bg-green-100 text-green-800";
  if (["partially_paid", "authorized", "created", "outstanding"].includes(status)) return "bg-blue-100 text-blue-800";
  if (["refunded", "partially_refunded"].includes(status)) return "bg-violet-100 text-violet-800";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function statusText(status: string) {
  if (status === "captured") return "Paid";
  if (status === "collected") return "Collected";
  if (status === "partially_paid") return "Partially collected";
  if (status === "outstanding") return "Awaiting COD";
  return status.replaceAll("_", " ");
}

function getOrderNumber(payment: PaymentRow) {
  return payment.orderId?.orderNumber || "Order unavailable";
}

function getOrderCustomer(payment: PaymentRow) {
  return payment.orderId?.customerName || "—";
}

async function readResult<T>(response: Response): Promise<{ data: T; meta?: PageMeta }> {
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || "Request failed. Please try again.");
  return { data: result.data as T, meta: result.meta as PageMeta | undefined };
}

function getRange(period: Period) {
  if (period === "all") return {};
  const from = new Date();
  from.setDate(from.getDate() - Number(period) + 1);
  const to = new Date();
  const toLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { from: toLocalDate(from), to: toLocalDate(to) };
}

function downloadCsv(payments: PaymentRow[]) {
  const safeCell = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
  const rows = [
    ["Order ID", "Date", "Customer", "Payment Method", "Amount", "Status", "Payment ID"],
    ...payments.map((payment) => [
      getOrderNumber(payment),
      new Date(payment.createdAt).toLocaleString("en-IN"),
      getOrderCustomer(payment),
      paymentLabel(payment),
      payment.amount.toFixed(2),
      statusText(paymentStatus(payment)),
      payment.razorpayPaymentId || "",
    ]),
  ];
  const csv = rows.map((row) => row.map((field) => `"${safeCell(String(field)).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "payment-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  title,
  value,
  detail,
  Icon,
  color,
}: {
  title: string;
  value: string;
  detail: string;
  Icon: typeof CreditCard;
  color: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e9ece5] bg-white p-3 shadow-[0_2px_8px_rgba(30,40,25,0.04)]">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${color}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold text-charcoal-600">{title}</span>
        <span className="block truncate text-base font-black leading-5 text-[#17231a] sm:text-lg">{value}</span>
        <span className="block truncate text-[9px] text-charcoal-500">{detail}</span>
      </span>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [tab, setTab] = useState<PaymentTab>("all");
  const [period, setPeriod] = useState<Period>("30");
  const [restaurantId, setRestaurantId] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adminRole, setAdminRole] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/admin/restaurants", { cache: "no-store" }).then((response) => readResult<Restaurant[]>(response)),
      fetch("/api/admin/auth/me", { cache: "no-store" }).then((response) => readResult<{ admin: { role: string } }>(response)),
    ]).then(([restaurantResult, profileResult]) => {
      if (!active) return;
      setRestaurants(restaurantResult.data);
      setAdminRole(profileResult.data.admin.role);
    }).catch((contextError) => {
      if (active) setError(contextError instanceof Error ? contextError.message : "Unable to load payment account details.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const range = getRange(period);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "8");
      params.set("method", tab === "online" ? "razorpay" : tab === "cod" ? "cod" : methodFilter);
      params.set("status", tab === "failed" ? "failed" : statusFilter);
      params.set("search", search);
      if (restaurantId) params.set("restaurantId", restaurantId);
      Object.entries(range).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      if (period === "all") params.set("period", "all");
      if (tab === "refunds") {
        params.set("method", methodFilter);
      }
      const refundParams = new URLSearchParams();
      Object.entries(range).forEach(([key, value]) => {
        if (value) refundParams.set(key, value);
      });
      if (period === "all") refundParams.set("period", "all");
      if (restaurantId) refundParams.set("restaurantId", restaurantId);
      const [paymentsResponse, refundsResponse] = await Promise.all([
        fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/refunds?${refundParams.toString()}`, { cache: "no-store" }),
      ]);
      const [paymentResult, refundResult] = await Promise.all([
        readResult<PaymentRow[]>(paymentsResponse),
        readResult<RefundRow[]>(refundsResponse),
      ]);
      setPayments(paymentResult.data);
      setSelectedPayment((current) =>
        current ? paymentResult.data.find((payment) => payment._id === current._id) || current : null
      );
      setMeta(paymentResult.meta || null);
      setRefunds(refundResult.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payment records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [methodFilter, page, period, restaurantId, search, statusFilter, tab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAdminAutoRefresh(() => loadData(true));

  const summary = meta?.summary || EMPTY_SUMMARY;
  const canRequestRefund = ["super_admin", "restaurant_manager"].includes(adminRole);
  const onlineShare = summary.totalCollection > 0 ? Math.round((summary.onlinePayments / summary.totalCollection) * 100) : 0;
  const codShare = summary.totalCollection > 0 ? 100 - onlineShare : 0;
  const visibleRefunds = useMemo(() => {
    const query = search.toLowerCase();
    return refunds.filter((refund) => {
      const orderNumber = typeof refund.orderId === "object" ? refund.orderId.orderNumber : refund.orderId;
      const matchesSearch = !query || `${orderNumber} ${refund.reason} ${refund.status}`.toLowerCase().includes(query);
      const refundRestaurantId = typeof refund.restaurantId === "string" ? refund.restaurantId : refund.restaurantId?._id;
      const matchesRestaurant = !restaurantId || refundRestaurantId === restaurantId;
      return matchesSearch && matchesRestaurant;
    });
  }, [refunds, restaurantId, search]);

  async function reconcile(payment: PaymentRow) {
    setWorkingId(payment._id);
    setError("");
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment._id }),
      });
      await readResult<unknown>(response);
      await loadData(true);
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Payment reconciliation failed.");
    } finally {
      setWorkingId("");
    }
  }

  async function issueRefund(payment: PaymentRow) {
    setWorkingId(payment._id);
    setError("");
    try {
      const response = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: payment.orderId?._id,
          amount: Number(amounts[payment._id]),
          reason: reasons[payment._id],
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = await readResult<unknown>(response);
      if (!response.ok) throw new Error("Refund request failed.");
      setSelectedPayment(null);
      setAmounts({ ...amounts, [payment._id]: "" });
      setReasons({ ...reasons, [payment._id]: "" });
      await loadData(true);
      if (result.data && typeof result.data === "object" && "reconciliationRequired" in result.data) {
        setError("Refund submitted, but Razorpay needs reconciliation before its final status is confirmed.");
      }
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "Refund request failed.");
    } finally {
      setWorkingId("");
    }
  }

  async function reconcileRefund(refundId: string) {
    setWorkingId(refundId);
    setError("");
    try {
      const response = await fetch("/api/admin/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId }),
      });
      await readResult<unknown>(response);
      await loadData(true);
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Refund reconciliation failed.");
    } finally {
      setWorkingId("");
    }
  }

  function setTabAndReset(nextTab: PaymentTab) {
    setTab(nextTab);
    setPage(1);
    if (nextTab === "online") setMethodFilter("all");
    if (nextTab === "cod") setMethodFilter("all");
    if (nextTab !== "failed") setStatusFilter("all");
  }

  const pageCount = Math.max(1, meta?.totalPages || 1);
  const startRecord = meta?.totalCount ? (page - 1) * (meta.limit || 8) + 1 : 0;
  const endRecord = Math.min(page * (meta?.limit || 8), meta?.totalCount || 0);

  return (
    <main className="min-h-full bg-[#fafbf8] px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1500px] space-y-3.5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-green-800"><CreditCard className="h-6 w-6" /></span>
            <div>
              <h1 className="font-display text-xl font-black text-[#111827] sm:text-2xl">Payments</h1>
              <p className="text-xs text-charcoal-600">Manage payment collection, COD, refunds and payment verification.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {restaurants.length > 1 && (
              <label className="flex h-9 items-center gap-2 rounded-lg border border-cream-200 bg-white px-2.5 text-xs font-semibold shadow-sm">
                <Store className="h-4 w-4 text-green-700" />
                <span className="sr-only">Filter by kitchen</span>
                <select aria-label="Filter by kitchen" value={restaurantId} onChange={(event) => { setRestaurantId(event.target.value); setPage(1); }} className="max-w-36 bg-transparent outline-none">
                  <option value="">All Kitchens</option>
                  {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                </select>
                <ChevronDown className="h-3 w-3 text-charcoal-400" />
              </label>
            )}
            <button type="button" onClick={() => void loadData(true)} disabled={refreshing} aria-label="Refresh payments" className="grid h-9 w-9 place-items-center rounded-lg border border-cream-200 bg-white text-charcoal-700 hover:bg-cream-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>
          </div>
        </header>

        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[10px] leading-4 text-green-950">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p><strong>Payments module:</strong> online payments are verified with Razorpay; COD collection totals come from delivery confirmations. Bank settlement matching is not connected.</p>
        </div>

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><span>{error}</span><button type="button" onClick={() => void loadData(true)} className="font-bold underline">Retry</button></div>}

        <section aria-label="Payment summary" className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          <StatCard title="Total Collection" value={formatCurrency(summary.totalCollection)} detail={`Last ${period === "all" ? "all-time" : `${period} days`}`} Icon={CircleDollarSign} color="bg-green-100 text-green-800" />
          <StatCard title="Online Payments" value={formatCurrency(summary.onlinePayments)} detail="Razorpay verified" Icon={LaptopMinimal} color="bg-blue-100 text-blue-700" />
          <StatCard title="Cash on Delivery" value={formatCurrency(summary.codCollected)} detail={`${formatCurrency(summary.codOutstanding)} still outstanding`} Icon={Banknote} color="bg-orange-100 text-orange-700" />
          <StatCard title="Total Refunds" value={formatCurrency(summary.totalRefunds)} detail={`${summary.refundCount} processed refunds`} Icon={RotateCcw} color="bg-violet-100 text-violet-700" />
          <StatCard title="Failed Payments" value={formatCurrency(summary.failedAmount)} detail={`${summary.failedCount} failed attempts`} Icon={AlertTriangle} color="bg-rose-100 text-rose-700" />
        </section>

        <nav aria-label="Payment sections" className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setTabAndReset(id)} aria-current={tab === id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold transition sm:px-4 ${tab === id ? "border-green-800 bg-green-800 text-white shadow-sm" : "border-[#e8ebe4] bg-white text-charcoal-700 hover:border-green-200 hover:bg-green-50"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        {tab === "reconciliation" && (
          <ReconciliationPanel summary={summary} />
        )}

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e9ece5] bg-white shadow-[0_3px_12px_rgba(35,40,30,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
              <div>
                <h2 className="text-base font-black text-[#111827]">{tab === "refunds" ? "Refund Management" : tab === "failed" ? "Failed Payments" : "All Transactions"}</h2>
                <p className="mt-0.5 text-[10px] text-charcoal-600">{tab === "refunds" ? "Review and reconcile Razorpay refunds." : "Search and review customer payment attempts across kitchens."}</p>
              </div>
              {tab !== "refunds" && (
                <button type="button" onClick={() => downloadCsv(payments)} disabled={!payments.length} className="inline-flex items-center gap-2 rounded-lg border border-cream-300 px-3 py-2 text-[10px] font-bold text-charcoal-800 hover:bg-cream-50 disabled:opacity-50"><ArrowDownToLine className="h-3.5 w-3.5" />Export page<ChevronDown className="h-3 w-3" /></button>
              )}
            </div>

            {tab === "refunds" ? (
              <RefundTable refunds={visibleRefunds} workingId={workingId} onReconcile={reconcileRefund} />
            ) : (
              <>
                <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.5fr)_minmax(105px,0.8fr)_minmax(105px,0.8fr)_minmax(100px,0.7fr)_minmax(120px,0.8fr)]">
                  <label className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal-400" />
                    <input type="search" aria-label="Search payments" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Order ID, transaction ID, customer…" className="h-9 w-full rounded-lg border border-cream-300 pl-8 pr-3 text-[10px] outline-none focus:border-green-700" />
                  </label>
                  {restaurants.length > 1 && (
                    <label className="flex h-9 items-center gap-1.5 rounded-lg border border-cream-300 px-2 text-[10px]">
                      <Store className="h-3.5 w-3.5 text-charcoal-500" />
                      <span className="sr-only">Kitchen</span>
                      <select aria-label="Kitchen filter" value={restaurantId} onChange={(event) => { setRestaurantId(event.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent outline-none"><option value="">All Kitchens</option>{restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}</select>
                    </label>
                  )}
                  <select aria-label="Payment method filter" value={tab === "online" ? "razorpay" : tab === "cod" ? "cod" : methodFilter} disabled={["online", "cod", "refunds"].includes(tab)} onChange={(event) => { setMethodFilter(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-cream-300 bg-white px-2 text-[10px] disabled:bg-cream-50 disabled:text-charcoal-500"><option value="all">All Methods</option><option value="razorpay">Online / Razorpay</option><option value="cod">Cash on Delivery</option></select>
                  <select aria-label="Payment status filter" value={tab === "failed" ? "failed" : statusFilter} disabled={["failed", "refunds"].includes(tab)} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-cream-300 bg-white px-2 text-[10px] disabled:bg-cream-50 disabled:text-charcoal-500"><option value="all">All Statuses</option><option value="created">Created</option><option value="authorized">Authorized</option><option value="captured">Paid</option><option value="collected" disabled={tab === "online" || methodFilter === "razorpay"}>COD Collected</option><option value="outstanding" disabled={tab === "online" || methodFilter === "razorpay"}>COD Due</option><option value="failed">Failed</option><option value="partially_refunded">Partially Refunded</option><option value="refunded">Refunded</option></select>
                  <label className="flex h-9 items-center gap-1.5 rounded-lg border border-cream-300 px-2 text-[10px]"><CalendarDays className="h-3.5 w-3.5 text-charcoal-500" /><span className="sr-only">Date range</span><select aria-label="Date range" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }} className="min-w-0 flex-1 bg-transparent outline-none"><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="all">All Time</option></select></label>
                </div>
                <TransactionsTable
                  payments={payments}
                  loading={loading}
                  workingId={workingId}
                  onView={setSelectedPayment}
                  onReconcile={reconcile}
                  canRequestRefund={canRequestRefund}
                  onSetPage={(paymentId, amount, reason) => {
                    setAmounts({ ...amounts, [paymentId]: amount });
                    setReasons({ ...reasons, [paymentId]: reason });
                    const selected = payments.find((payment) => payment._id === paymentId);
                    if (selected) setSelectedPayment(selected);
                  }}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0ea] px-4 py-3 text-[10px] text-charcoal-600">
                  <span>Showing {startRecord}–{endRecord} of {meta?.totalCount || 0} transactions</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="rounded-lg border border-cream-300 p-1.5 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
                    <span className="min-w-8 rounded-lg bg-green-800 px-2 py-1.5 text-center font-bold text-white">{page}</span>
                    <span className="px-1">of {pageCount}</span>
                    <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading} aria-label="Next page" className="rounded-lg border border-cream-300 p-1.5 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="space-y-3">
            <PaymentMix summary={summary} onlineShare={onlineShare} codShare={codShare} />
            {tab !== "reconciliation" && <ReconciliationPanel summary={summary} compact />}
          </aside>
        </div>
      </div>

      {selectedPayment && (
        <PaymentDetails
          payment={selectedPayment}
          amount={amounts[selectedPayment._id] || ""}
          reason={reasons[selectedPayment._id] || ""}
          canRequestRefund={canRequestRefund}
          working={workingId === selectedPayment._id}
          onAmountChange={(amount) => setAmounts({ ...amounts, [selectedPayment._id]: amount })}
          onReasonChange={(reason) => setReasons({ ...reasons, [selectedPayment._id]: reason })}
          onRefund={() => void issueRefund(selectedPayment)}
          onReconcile={() => void reconcile(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </main>
  );
}

function TransactionsTable({
  payments,
  loading,
  workingId,
  onView,
  onReconcile,
  canRequestRefund,
  onSetPage,
}: {
  payments: PaymentRow[];
  loading: boolean;
  workingId: string;
  onView: (payment: PaymentRow) => void;
  onReconcile: (payment: PaymentRow) => void;
  canRequestRefund: boolean;
  onSetPage: (paymentId: string, amount: string, reason: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-[10px]">
        <thead className="bg-[#f5f7f2] text-charcoal-700"><tr>{["#", "Order ID", "Date & Time", "Customer", "Kitchen", "Payment Method", "Amount", "Status", "Actions"].map((heading) => <th key={heading} className="px-2.5 py-2 font-bold">{heading}</th>)}</tr></thead>
        {loading ? (
          <tbody><tr><td colSpan={9} className="py-12 text-center text-charcoal-500"><span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Loading payment transactions…</span></td></tr></tbody>
        ) : !payments.length ? (
          <tbody><tr><td colSpan={9} className="px-3 py-10 text-center text-charcoal-500">No payments match these filters.</td></tr></tbody>
        ) : (
          <tbody className="divide-y divide-[#f0f1ec]">
            {payments.map((payment, index) => {
              const status = paymentStatus(payment);
              const refundable = payment.paymentMethod === "razorpay" && ["captured", "partially_refunded"].includes(payment.status) && payment.amount - payment.amountRefunded - payment.amountRefundReserved > 0;
              const needsReconcile = payment.paymentMethod === "razorpay" && payment.status !== "captured" && payment.status !== "refunded";
              return (
                <tr key={payment._id} className="hover:bg-[#fbfcfa]">
                  <td className="px-2.5 py-2.5 text-charcoal-500">{index + 1}</td>
                  <td className="px-2.5 py-2.5 font-bold text-blue-800">{getOrderNumber(payment)}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5">{new Date(payment.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-2.5 py-2.5 font-semibold">{getOrderCustomer(payment)}</td>
                  <td className="px-2.5 py-2.5">{typeof payment.restaurantId === "object" ? payment.restaurantId.name : "—"}</td>
                  <td className="px-2.5 py-2.5"><span className="inline-flex items-center gap-1.5">{payment.paymentMethod === "cod" ? <Banknote className="h-3.5 w-3.5 text-orange-600" /> : <CreditCard className="h-3.5 w-3.5 text-blue-700" />}{paymentLabel(payment)}</span></td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 font-bold">{formatCurrency(payment.amount)}</td>
                  <td className="px-2.5 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold capitalize ${statusStyle(status)}`}>{["captured", "collected"].includes(status) && <Check className="h-3 w-3" />}{statusText(status)}</span></td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => onView(payment)} aria-label={`View ${getOrderNumber(payment)}`} title="View payment details" className="rounded p-1 text-charcoal-600 hover:bg-cream-100"><Eye className="h-3.5 w-3.5" /></button>
                      {needsReconcile && <button type="button" onClick={() => onReconcile(payment)} disabled={workingId === payment._id} aria-label="Reconcile with Razorpay" title="Reconcile with Razorpay" className="rounded p-1 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${workingId === payment._id ? "animate-spin" : ""}`} /></button>}
                      {refundable && canRequestRefund && <button type="button" onClick={() => onSetPage(payment._id, "", "")} aria-label="Request refund" title="Request refund" className="rounded p-1 text-violet-700 hover:bg-violet-50"><RotateCcw className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
    </div>
  );
}

function PaymentMix({ summary, onlineShare, codShare }: { summary: PaymentSummary; onlineShare: number; codShare: number }) {
  return (
    <section className="rounded-2xl border border-[#e9ece5] bg-white p-4 shadow-[0_3px_12px_rgba(35,40,30,0.05)]">
      <h2 className="text-sm font-extrabold">Payment Methods <span className="text-[10px] font-medium text-charcoal-500">(selected period)</span></h2>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#159447 0 ${onlineShare}%, #f98224 ${onlineShare}% ${onlineShare + codShare}%, #e8eee7 ${onlineShare + codShare}% 100%)` }}>
          <div className="grid h-20 w-20 place-content-center rounded-full bg-white text-center"><span className="text-xs font-black">{formatCurrency(summary.totalCollection)}</span><span className="text-[9px] text-charcoal-500">Collected</span></div>
        </div>
        <div className="min-w-[130px] flex-1 space-y-3">
          <MixLine color="bg-green-700" label="Online · Razorpay" value={summary.onlinePayments} percent={onlineShare} />
          <MixLine color="bg-orange-500" label="COD received" value={summary.codCollected} percent={codShare} />
        </div>
      </div>
      <p className="mt-3 text-[9px] leading-4 text-charcoal-500">Payment instrument breakdown (UPI/card/wallet) is not provided by current payment records.</p>
    </section>
  );
}

function MixLine({ color, label, value, percent }: { color: string; label: string; value: number; percent: number }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${color}`} />
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold">{label}</span><span className="block text-xs font-bold">{formatCurrency(value)} <span className="text-[9px] font-medium text-charcoal-500">({percent}%)</span></span></span>
    </div>
  );
}

function ReconciliationPanel({ summary, compact = false }: { summary: PaymentSummary; compact?: boolean }) {
  const hasReview = summary.reviewCount > 0;
  return (
    <section className={`rounded-2xl border border-[#e9ece5] bg-white shadow-[0_3px_12px_rgba(35,40,30,0.05)] ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold"><BadgeCheck className="h-4 w-4 text-green-700" />Collection reconciliation</h2>
        {!compact && <span className="text-[9px] text-charcoal-500">Order-level</span>}
      </div>
      <div className="mt-3 space-y-2.5 text-[10px]">
        <ReconLine label="Razorpay-verified online payments" amount={summary.onlinePayments} />
        <ReconLine label="COD collected by riders" amount={summary.codCollected} />
        <ReconLine label="COD still outstanding" amount={summary.codOutstanding} warning={summary.codOutstanding > 0} />
        <div className="border-t border-[#eef0ea] pt-2.5"><ReconLine label="Processed refunds" amount={summary.totalRefunds} /></div>
      </div>
      <p className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold ${hasReview ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-900"}`}>
        {hasReview ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        {hasReview ? `${summary.reviewCount} payment${summary.reviewCount === 1 ? "" : "s"} need review` : "No duplicate captures or refund flags"}
      </p>
      <p className="mt-2 text-[9px] leading-4 text-charcoal-500">Gateway-to-bank settlement reports are not connected, so this is not a bank settlement reconciliation.</p>
    </section>
  );
}

function ReconLine({ label, amount, warning = false }: { label: string; amount: number; warning?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-charcoal-600">{label}</span><span className={`whitespace-nowrap font-extrabold ${warning ? "text-amber-700" : "text-charcoal-900"}`}>{formatCurrency(amount)}</span></div>;
}

function RefundTable({ refunds, workingId, onReconcile }: { refunds: RefundRow[]; workingId: string; onReconcile: (id: string) => void }) {
  if (!refunds.length) return <p className="px-4 py-10 text-center text-xs text-charcoal-500">No refund requests match your search.</p>;
  return (
    <div className="divide-y divide-[#eef0ea]">
      {refunds.map((refund) => (
        <article key={refund._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">{typeof refund.orderId === "object" ? refund.orderId.orderNumber : "Order"} · {formatCurrency(refund.amount)}</p>
            <p className="mt-1 truncate text-[10px] text-charcoal-600">{refund.reason}</p>
            <p className="mt-1 text-[9px] text-charcoal-500">{new Date(refund.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{refund.razorpayRefundId ? ` · ${refund.razorpayRefundId}` : ""}</p>
            {refund.failureReason && <p className="mt-1 text-[10px] text-red-700">{refund.failureReason}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyle(refund.status)}`}>{refund.status}</span>
            {!["processed", "failed"].includes(refund.status) && <button type="button" onClick={() => onReconcile(refund._id)} disabled={workingId === refund._id} className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-50">{workingId === refund._id ? "Checking…" : "Reconcile"}</button>}
          </div>
        </article>
      ))}
    </div>
  );
}

function PaymentDetails({
  payment,
  amount,
  reason,
  canRequestRefund,
  working,
  onAmountChange,
  onReasonChange,
  onRefund,
  onReconcile,
  onClose,
}: {
  payment: PaymentRow;
  amount: string;
  reason: string;
  canRequestRefund: boolean;
  working: boolean;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onRefund: () => void;
  onReconcile: () => void;
  onClose: () => void;
}) {
  const refundableAmount = payment.amount - payment.amountRefunded - payment.amountRefundReserved;
  const canRefund = canRequestRefund && payment.paymentMethod === "razorpay" && ["captured", "partially_refunded"].includes(payment.status) && refundableAmount > 0;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="payment-detail-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-green-800">Transaction details</p><h2 id="payment-detail-title" className="mt-1 text-lg font-black">{getOrderNumber(payment)}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-1.5 hover:bg-cream-100"><X className="h-4 w-4" /></button>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f7f8f5] p-3 text-xs">
          <DetailItem label="Customer" value={getOrderCustomer(payment)} />
          <DetailItem label="Payment method" value={paymentLabel(payment)} />
          <DetailItem label="Amount" value={formatCurrency(payment.amount)} />
          <DetailItem label="Status" value={statusText(paymentStatus(payment))} />
          <DetailItem label="Payment ID" value={payment.razorpayPaymentId || "Not available"} />
          <DetailItem label="Date" value={new Date(payment.createdAt).toLocaleString("en-IN")} />
          {payment.paymentMethod === "cod" && <DetailItem label="Collected / due" value={`${formatCurrency(payment.codCollectedAmount)} / ${formatCurrency(payment.codOutstandingAmount)}`} />}
          {payment.paymentMethod === "razorpay" && <DetailItem label="Refunded / reserved" value={`${formatCurrency(payment.amountRefunded)} / ${formatCurrency(payment.amountRefundReserved)}`} />}
        </dl>
        {(payment.duplicateCapture || payment.requiresRefund || payment.failureReason) && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
            {payment.duplicateCapture && <p>Duplicate captures need review: {payment.duplicateCaptureIds.join(", ")}</p>}
            {payment.requiresRefund && <p>Payment may need a refund review due to its order state.</p>}
            {payment.failureReason && <p>Failure: {payment.failureReason}</p>}
          </div>
        )}
        {payment.paymentMethod === "razorpay" && payment.status !== "captured" && payment.status !== "refunded" && (
          <button type="button" onClick={onReconcile} disabled={working} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${working ? "animate-spin" : ""}`} />Reconcile with Razorpay</button>
        )}
        {canRefund && (
          <div className="mt-4 space-y-2 border-t border-cream-200 pt-4">
            <p className="text-xs font-extrabold">Request refund <span className="font-normal text-charcoal-500">(remaining: {formatCurrency(refundableAmount)})</span></p>
            <input aria-label="Refund amount" type="number" min="0.01" max={refundableAmount} step="0.01" value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="Refund amount" className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-xs" />
            <textarea aria-label="Refund reason" maxLength={300} rows={2} value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Refund reason (at least 3 characters)" className="w-full rounded-lg border border-cream-300 px-3 py-2.5 text-xs" />
            <button type="button" onClick={onRefund} disabled={working || Number(amount) <= 0 || Number(amount) > refundableAmount || reason.trim().length < 3} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Submit refund</button>
          </div>
        )}
        {!canRefund && payment.paymentMethod === "razorpay" && ["captured", "partially_refunded"].includes(payment.status) && <p className="mt-4 text-[10px] text-charcoal-500">Remaining refundable amount: {formatCurrency(Math.max(0, refundableAmount))}. Refund permissions depend on your admin role.</p>}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[9px] text-charcoal-500">{label}</dt><dd className="mt-0.5 break-words text-[11px] font-bold text-charcoal-900">{value}</dd></div>;
}
