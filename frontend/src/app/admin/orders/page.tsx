"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";
import {
  ArrowDownToLine,
  CheckCircle2,
  CalendarDays,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CircleX,
  Clock3,
  Eye,
  MapPin,
  MoreVertical,
  Phone,
  Printer,
  Search,
  ShoppingCart,
  Store,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AdminOrder {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  fulfillmentType: "delivery" | "takeaway";
  paymentMethod: "razorpay" | "cod";
  paymentStatus: string;
  refundStatus: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  items: {
    name: string;
    quantity: number;
    price?: number;
    itemTotalPrice?: number;
    variant?: { name: string; price: number };
    addons?: { name: string; price: number }[];
    specialInstructions?: string;
  }[];
  subtotal?: number;
  deliveryFee?: number;
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  totalAmount: number;
  currentDeliveryPersonnelId?: string;
  placedAt: string;
  deliveredAt?: string;
  restaurantId: string | { _id: string; name: string; slug: string };
};

interface Restaurant {
  _id: string;
  name: string;
}

interface Rider {
  _id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  status: "available" | "on_delivery" | "off_duty";
}

interface OrderSummary {
  totalOrders: number;
  totalRevenue: number;
  customers: number;
  activeOrders: number;
  statusCounts: Record<string, number>;
}

interface OrdersMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  summary: OrderSummary;
}

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { value: "all", label: "All Orders" },
  { value: "new", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const NEXT_STATUSES: Record<string, string[]> = {
  new: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "rejected", "cancelled"],
  preparing: ["ready", "rejected", "cancelled"],
  ready: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  dispatched: ["cancelled"],
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  ready_for_pickup: "Ready for Pickup",
  dispatched: "Out for Delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
  pending_payment: "Payment Pending",
};

function getStatusClasses(status: string) {
  if (status === "delivered") return "bg-[#dcf5dc] text-[#188343]";
  if (status === "dispatched" || status === "ready_for_pickup") return "bg-[#e2efff] text-[#1874d1]";
  if (["new", "accepted", "preparing", "ready"].includes(status)) return "bg-[#fff0d6] text-[#bc7600]";
  if (status === "cancelled" || status === "rejected") return "bg-[#ffe1e1] text-[#c33d3d]";
  return "bg-[#eff1ed] text-[#59615b]";
}

function getTabCount(summary: OrderSummary | null, tab: (typeof STATUS_TABS)[number]["value"]) {
  const counts = summary?.statusCounts;
  if (!counts) return 0;
  if (tab === "all") return summary.totalOrders;
  if (tab === "preparing") return (counts.accepted || 0) + (counts.preparing || 0) + (counts.ready || 0);
  if (tab === "out_for_delivery") return (counts.dispatched || 0) + (counts.ready_for_pickup || 0);
  if (tab === "cancelled") return (counts.cancelled || 0) + (counts.rejected || 0);
  return counts[tab] || 0;
}

function toRestaurantName(order: AdminOrder) {
  return typeof order.restaurantId === "string" ? "—" : order.restaurantId?.name || "—";
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function MetricCard({
  title,
  value,
  note,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone: "green" | "orange";
}) {
  const green = tone === "green";
  return (
    <article
      className={`flex min-h-[86px] items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-[0_3px_12px_rgba(35,40,30,0.05)] ${
        green
          ? "border-[#e5efdf] bg-gradient-to-br from-[#eef8e9] to-white"
          : "border-[#f2e7d8] bg-gradient-to-br from-[#fff4e3] to-white"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
          green ? "bg-[#ddf0d7] text-[#087a37]" : "bg-[#fff0d8] text-[#f28a00]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-[#313a34]">{title}</span>
        <span className="mt-0.5 block truncate font-display text-xl font-black leading-none text-[#162032]">{value}</span>
        <span className="mt-1 block truncate text-[9px] text-charcoal-500">{note}</span>
      </span>
    </article>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [meta, setMeta] = useState<OrdersMeta | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]["value"]>("all");
  const [detailStatus, setDetailStatus] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [riderSelections, setRiderSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [openActionsId, setOpenActionsId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  const [auxiliaryError, setAuxiliaryError] = useState("");

  function selectOrder(order: AdminOrder) {
    setSelectedOrder(order);
    setDetailStatus(NEXT_STATUSES[order.orderStatus]?.[0] || "");
    setOpenActionsId("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const buildQuery = useCallback(
    (requestedPage: number, limit = PAGE_SIZE) => {
      const params = new URLSearchParams({
        page: String(requestedPage),
        limit: String(limit),
        status: statusFilter,
        fulfillmentType: fulfillmentFilter,
        paymentMethod: paymentFilter,
      });
      if (restaurantFilter) params.set("restaurantId", restaurantFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      return params;
    },
    [debouncedSearch, fulfillmentFilter, fromDate, paymentFilter, restaurantFilter, statusFilter, toDate]
  );

  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const [ordersResponse, deliveryResponse, restaurantsResponse] = await Promise.all([
        fetch(`/api/admin/orders?${buildQuery(page)}`, { cache: "no-store" }),
        fetch("/api/admin/delivery", { cache: "no-store" }),
        fetch("/api/admin/restaurants", { cache: "no-store" }),
      ]);
      const [ordersData, deliveryData, restaurantsData] = await Promise.all([
        ordersResponse.json(),
        deliveryResponse.json(),
        restaurantsResponse.json(),
      ]);
      if (!ordersResponse.ok || !ordersData.success) {
        throw new Error(ordersData.error || "Unable to load orders.");
      }

      setOrders(ordersData.data as AdminOrder[]);
      setSelectedOrder((current) =>
        current ? (ordersData.data as AdminOrder[]).find((order) => order._id === current._id) || current : null
      );
      setMeta(ordersData.meta as OrdersMeta);
      setSummary(ordersData.meta?.summary as OrderSummary);
      setAuxiliaryError("");
      if (deliveryResponse.ok && deliveryData.success) {
        setRiders(deliveryData.data.riders || []);
      } else {
        setAuxiliaryError(deliveryData.error || "Delivery staff could not be loaded.");
      }
      if (restaurantsResponse.ok && restaurantsData.success) {
        setRestaurants(restaurantsData.data as Restaurant[]);
      } else {
        setAuxiliaryError((current) =>
          [current, restaurantsData.error || "Kitchen list could not be loaded."].filter(Boolean).join(" ")
        );
      }
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAdminAutoRefresh(() => loadData(true));

  function resetPage() {
    setPage(1);
  }

  async function changeStatus(order: AdminOrder, orderStatus: string) {
    setWorkingId(order._id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update order.");
      setOpenActionsId("");
      if (selectedOrder?._id === order._id) {
        setSelectedOrder({ ...order, ...data.data, restaurantId: order.restaurantId });
        setDetailStatus(NEXT_STATUSES[orderStatus]?.[0] || "");
      }
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update order.");
    } finally {
      setWorkingId("");
    }
  }

  async function assignRider(order: AdminOrder) {
    const deliveryPersonnelId = riderSelections[order._id];
    if (!deliveryPersonnelId) return;
    setWorkingId(order._id);
    setError("");
    try {
      const response = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, deliveryPersonnelId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to assign delivery personnel.");
      setOpenActionsId("");
      await loadData();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign delivery personnel.");
    } finally {
      setWorkingId("");
    }
  }

  async function exportOrders() {
    setExporting(true);
    setError("");
    try {
      const firstResponse = await fetch(`/api/admin/orders?${buildQuery(1, 100)}`, { cache: "no-store" });
      const firstData = await firstResponse.json();
      if (!firstResponse.ok || !firstData.success) {
        throw new Error(firstData.error || "Unable to export orders.");
      }

      const exportRows = [...(firstData.data as AdminOrder[])];
      const totalPages = Number(firstData.meta?.totalPages || 1);
      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const response = await fetch(`/api/admin/orders?${buildQuery(currentPage, 100)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Unable to export page ${currentPage}.`);
        }
        exportRows.push(...(data.data as AdminOrder[]));
      }

      const columns = [
        "Order ID",
        "Customer",
        "Phone",
        "Kitchen",
        "Items",
        "Amount",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Order Time",
      ];
      const rows = exportRows.map((order) => [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        toRestaurantName(order),
        order.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
        order.totalAmount,
        order.paymentMethod,
        order.paymentStatus,
        order.orderStatus,
        new Date(order.placedAt).toISOString(),
      ]);
      const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export orders.");
    } finally {
      setExporting(false);
    }
  }

  const displayedStart = meta && meta.totalCount > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const displayedEnd = Math.min(meta ? meta.page * meta.limit : 0, meta?.totalCount || 0);

  return (
    <main className="min-h-full bg-[#fffaf4] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-3.5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShoppingCart className="mt-0.5 h-7 w-7 text-success-800" strokeWidth={2.8} />
            <div>
              <h1 className="font-display text-xl font-black tracking-tight text-[#122033] sm:text-[22px]">
                Orders Management
              </h1>
              <p className="text-[10px] text-charcoal-600">View, track and manage all customer orders.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e9e4dc] bg-white px-2.5 text-[10px] font-semibold text-charcoal-700 shadow-sm">
              <Store className="h-4 w-4 shrink-0 text-success-700" />
              <span className="sr-only">Kitchen selection</span>
              <select
                aria-label="Kitchen selection"
                value={restaurantFilter}
                onChange={(event) => {
                  setRestaurantFilter(event.target.value);
                  resetPage();
                }}
                className="max-w-[170px] bg-transparent outline-none"
              >
                <option value="">All Kitchens</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e9e4dc] bg-white px-2.5 text-[10px] font-semibold text-charcoal-700 shadow-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-charcoal-700" />
              <span className="sr-only">From date</span>
              <input
                aria-label="From date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  resetPage();
                }}
                className="w-[116px] bg-transparent outline-none"
              />
              <span className="text-charcoal-400">–</span>
              <span className="sr-only">To date</span>
              <input
                aria-label="To date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => {
                  setToDate(event.target.value);
                  resetPage();
                }}
                className="w-[116px] bg-transparent outline-none"
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  resetPage();
                }}
                className="rounded-lg px-2 py-1 text-[10px] font-bold text-success-800 hover:bg-[#eaf4e4]"
              >
                Clear dates
              </button>
            )}
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadData()} className="font-bold underline">Retry</button>
          </div>
        )}
        {auxiliaryError && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {auxiliaryError} Order list remains available.
          </p>
        )}

        <section aria-label="Order metrics" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-5">
          <MetricCard
            title="Total Orders"
            value={summary ? new Intl.NumberFormat("en-IN").format(summary.totalOrders) : "—"}
            note={restaurantFilter ? "Selected kitchen" : "All kitchens"}
            icon={<ShoppingCart className="h-7 w-7" />}
            tone="green"
          />
          <MetricCard
            title="Preparing"
            value={summary ? new Intl.NumberFormat("en-IN").format(getTabCount(summary, "preparing")) : "—"}
            note="In the kitchen"
            icon={<ChefHat className="h-7 w-7" />}
            tone="orange"
          />
          <MetricCard
            title="Out for Delivery"
            value={summary ? new Intl.NumberFormat("en-IN").format(getTabCount(summary, "out_for_delivery")) : "—"}
            note="On the way"
            icon={<Truck className="h-7 w-7" />}
            tone="orange"
          />
          <MetricCard
            title="Delivered"
            value={summary ? new Intl.NumberFormat("en-IN").format(getTabCount(summary, "delivered")) : "—"}
            note="Completed orders"
            icon={<CheckCircle2 className="h-7 w-7" />}
            tone="green"
          />
          <MetricCard
            title="Cancelled"
            value={summary ? new Intl.NumberFormat("en-IN").format(getTabCount(summary, "cancelled")) : "—"}
            note="Cancelled or rejected"
            icon={<CircleX className="h-7 w-7" />}
            tone="orange"
          />
        </section>

        <nav aria-label="Filter orders by status" className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatusFilter(tab.value);
                  resetPage();
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[10px] font-bold transition ${
                  active
                    ? "bg-gradient-to-r from-[#087b36] to-[#00652e] text-white shadow-sm"
                    : "border border-[#f0ece5] bg-white text-charcoal-700 hover:bg-[#f1f7ed]"
                }`}
              >
                {tab.label}
                <span className={active ? "text-white/80" : "text-charcoal-500"}>
                  ({summary ? getTabCount(summary, tab.value) : "—"})
                </span>
              </button>
            );
          })}
        </nav>

        <section aria-label="Search and filter orders" className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto_auto_auto_auto]">
          <label className="flex h-9 min-w-0 items-center gap-2 rounded-xl border border-[#e5e3de] bg-white px-3 shadow-sm focus-within:border-success-600">
            <Search className="h-4 w-4 shrink-0 text-charcoal-500" />
            <span className="sr-only">Search orders</span>
            <input
              type="search"
              aria-label="Search orders"
              placeholder="Search by Order ID, Customer Name or Phone..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-charcoal-500"
            />
          </label>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e5e3de] bg-white px-3 text-[10px] font-semibold shadow-sm">
            <span className="sr-only">Filter by order type</span>
            <select
              aria-label="Filter by order type"
              value={fulfillmentFilter}
              onChange={(event) => {
                setFulfillmentFilter(event.target.value);
                resetPage();
              }}
              className="bg-transparent outline-none"
            >
              <option value="all">All Order Types</option>
              <option value="delivery">Delivery</option>
              <option value="takeaway">Pickup</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
          </label>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e5e3de] bg-white px-3 text-[10px] font-semibold shadow-sm">
            <span className="sr-only">Filter by kitchen</span>
            <select
              aria-label="Filter by kitchen"
              value={restaurantFilter}
              onChange={(event) => {
                setRestaurantFilter(event.target.value);
                resetPage();
              }}
              className="max-w-[155px] bg-transparent outline-none"
            >
              <option value="">All Kitchens</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
          </label>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e5e3de] bg-white px-3 text-[10px] font-semibold shadow-sm">
            <span className="sr-only">Filter by order status</span>
            <select
              aria-label="Filter by order status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as (typeof STATUS_TABS)[number]["value"]);
                resetPage();
              }}
              className="bg-transparent outline-none"
            >
              {STATUS_TABS.map((tab) => <option key={tab.value} value={tab.value}>{tab.value === "all" ? "All Status" : tab.label}</option>)}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
          </label>

          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e5e3de] bg-white px-3 text-[10px] font-semibold shadow-sm">
            <span className="sr-only">Filter by payment method</span>
            <select
              aria-label="Filter by payment method"
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value);
                resetPage();
              }}
              className="bg-transparent outline-none"
            >
              <option value="all">All Payment Modes</option>
              <option value="razorpay">Online</option>
              <option value="cod">Cash on Delivery</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
          </label>

          <button
            type="button"
            onClick={() => void exportOrders()}
            disabled={exporting || loading || (meta?.totalCount || 0) === 0}
            className="flex h-9 items-center justify-center gap-2 rounded-xl border border-success-700 bg-white px-3 text-[10px] font-bold text-success-800 shadow-sm transition hover:bg-[#eff8eb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {exporting ? "Exporting…" : "Export"}
          </button>
        </section>

        <div className={selectedOrder ? "relative grid gap-3 2xl:grid-cols-[minmax(0,1fr)_300px] 2xl:items-start" : ""}>
        <section aria-label="Orders list" className="min-w-0 overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white shadow-[0_3px_12px_rgba(35,40,30,0.06)]">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-left ${selectedOrder ? "min-w-[850px]" : "min-w-[980px]"}`}>
              <thead className="bg-gradient-to-r from-[#075a33] to-[#06412d] text-white">
                <tr className="text-[10px] font-bold">
                  <th scope="col" className="px-3 py-2.5">#</th>
                  <th scope="col" className="px-3 py-2.5">Order ID</th>
                  <th scope="col" className="px-3 py-2.5">Customer</th>
                  <th scope="col" className="px-3 py-2.5">Kitchen</th>
                  <th scope="col" className="px-3 py-2.5">Items</th>
                  <th scope="col" className="px-3 py-2.5">Amount</th>
                  <th scope="col" className="px-3 py-2.5">Payment</th>
                  <th scope="col" className="px-3 py-2.5">Status</th>
                  <th scope="col" className="px-3 py-2.5">Order Time</th>
                  <th scope="col" className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1eee8]">
                {loading && orders.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-xs text-charcoal-500">Loading orders…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-xs text-charcoal-500">No orders found for these filters.</td></tr>
                ) : orders.map((order, index) => {
                  const transitions = NEXT_STATUSES[order.orderStatus] || [];
                  const availableRiders = riders.filter((rider) => rider.status === "available");
                  return (
                    <tr key={order._id} className="text-[10px] text-[#20251f] transition-colors hover:bg-[#fbfcf8]">
                      <td className="px-3 py-2 font-semibold">{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td className="px-3 py-2 font-bold">{order.orderNumber}</td>
                      <td className="px-3 py-2">
                        <span className="block max-w-[145px] truncate font-semibold">{order.customerName}</span>
                        <span className="block text-[9px] text-charcoal-500">{order.customerPhone}</span>
                      </td>
                      <td className="px-3 py-2">{toRestaurantName(order)}</td>
                      <td className="px-3 py-2">{order.items.reduce((total, item) => total + item.quantity, 0)} item{order.items.reduce((total, item) => total + item.quantity, 0) === 1 ? "" : "s"}</td>
                      <td className="px-3 py-2 font-semibold">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-2">
                        <span className={order.paymentMethod === "razorpay" ? "font-semibold text-[#188343]" : "text-charcoal-700"}>
                          {order.paymentMethod === "razorpay" ? "Online" : "COD"}
                        </span>
                        {order.paymentStatus !== "paid" && order.paymentMethod === "razorpay" && (
                          <span className="block text-[9px] capitalize text-charcoal-500">{order.paymentStatus.replaceAll("_", " ")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${getStatusClasses(order.orderStatus)}`}>
                          {STATUS_LABELS[order.orderStatus] || order.orderStatus.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatOrderTime(order.placedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="relative flex items-center justify-center gap-1">
                          <button
                            type="button"
                            aria-label={`View ${order.orderNumber}`}
                            title="View order details"
                            onClick={() => selectOrder(order)}
                            className="rounded-md border border-[#e8e7e2] p-1.5 text-charcoal-700 hover:bg-[#f0f7ec] hover:text-success-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`More actions for ${order.orderNumber}`}
                            aria-expanded={openActionsId === order._id}
                            onClick={() => setOpenActionsId((current) => current === order._id ? "" : order._id)}
                            className="rounded-md p-1.5 text-success-900 hover:bg-[#edf5e8]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openActionsId === order._id && (
                            <div className="absolute right-0 top-8 z-20 w-56 rounded-xl border border-[#e8e4dc] bg-white p-2 text-left shadow-xl">
                              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-charcoal-500">Update status</p>
                              {transitions.length ? transitions.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={workingId === order._id}
                                  onClick={() => void changeStatus(order, status)}
                                  className={`block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold hover:bg-[#f2f6ee] disabled:opacity-50 ${status === "cancelled" || status === "rejected" ? "text-red-700" : "text-charcoal-800"}`}
                                >
                                  Mark {STATUS_LABELS[status] || status.replaceAll("_", " ")}
                                </button>
                              )) : <p className="px-2 py-1.5 text-[10px] text-charcoal-500">No status updates available.</p>}
                              {order.fulfillmentType === "delivery" && ["ready", "dispatched"].includes(order.orderStatus) && (
                                <div className="mt-1 border-t border-[#eeeae2] pt-2">
                                  <label className="block px-2 text-[9px] font-bold text-charcoal-600">
                                    Assign delivery staff
                                    <select
                                      aria-label={`Select rider for ${order.orderNumber}`}
                                      value={riderSelections[order._id] || ""}
                                      onChange={(event) => setRiderSelections((current) => ({ ...current, [order._id]: event.target.value }))}
                                      className="mt-1 w-full rounded-lg border border-cream-300 bg-white px-2 py-1.5 text-[10px]"
                                    >
                                      <option value="">Select available rider</option>
                                      {availableRiders.map((rider) => (
                                        <option key={rider._id} value={rider._id}>{rider.name} · {rider.vehicleNumber}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <button
                                    type="button"
                                    disabled={!riderSelections[order._id] || workingId === order._id}
                                    onClick={() => void assignRider(order)}
                                    className="mt-1 w-full rounded-lg bg-success-700 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                                  >
                                    Assign / reassign
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eeeae2] px-3 py-2.5 text-[10px] text-charcoal-700 sm:px-4">
            <p>
              Showing {displayedStart} to {displayedEnd} of {meta?.totalCount || 0} orders
              {loading && <span className="ml-2 text-charcoal-500">Updating…</span>}
            </p>
            <nav aria-label="Orders pages" className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-charcoal-700 hover:bg-[#f1f6ed] disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(meta?.totalPages || 1, 3) }, (_, index) => {
                const totalPages = meta?.totalPages || 1;
                let pageNumber = index + 1;
                if (totalPages > 3 && page > 2) {
                  pageNumber = Math.min(totalPages - 2, page - 1) + index;
                }
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={pageNumber === page ? "page" : undefined}
                    onClick={() => setPage(pageNumber)}
                    disabled={loading}
                    className={`grid h-7 min-w-7 place-items-center rounded-lg border px-1.5 text-[10px] font-bold ${
                      pageNumber === page ? "border-success-800 bg-success-800 text-white" : "border-[#e7e4dd] bg-white text-charcoal-700 hover:bg-[#f1f6ed]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              {(meta?.totalPages || 1) > 3 && page < (meta?.totalPages || 1) - 1 && (
                <>
                  <span className="px-1 text-charcoal-500">…</span>
                  <button
                    type="button"
                    onClick={() => setPage(meta?.totalPages || 1)}
                    disabled={loading}
                    className="grid h-7 min-w-7 place-items-center rounded-lg border border-[#e7e4dd] bg-white px-1.5 text-[10px] font-bold text-charcoal-700 hover:bg-[#f1f6ed]"
                  >
                    {meta?.totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= (meta?.totalPages || 1) || loading}
                onClick={() => setPage((current) => Math.min(meta?.totalPages || 1, current + 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-[#e7e4dd] bg-white text-charcoal-700 hover:bg-[#f1f6ed] disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          </footer>
        </section>
        {selectedOrder && (
          <>
            <button
              type="button"
              aria-label="Close order details"
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 z-[60] bg-[#10231b]/45 2xl:hidden"
            />
            <aside
              role="complementary"
              aria-labelledby="order-details-title"
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[390px] flex-col border-l border-[#eeeae2] bg-white shadow-2xl 2xl:sticky 2xl:top-[74px] 2xl:z-10 2xl:h-[calc(100vh-90px)] 2xl:max-w-none 2xl:rounded-2xl 2xl:border 2xl:shadow-[0_3px_12px_rgba(35,40,30,0.06)]"
            >
              <header className="flex items-start justify-between gap-2 border-b border-[#eeeae2] px-4 py-3">
                <h2 id="order-details-title" className="font-display text-sm font-black text-[#122033]">
                  Order Details · {selectedOrder.orderNumber}
                </h2>
                <button type="button" aria-label="Close order details" onClick={() => setSelectedOrder(null)} className="rounded-lg p-1.5 text-charcoal-600 hover:bg-cream-100">
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                <section className="flex items-center justify-between gap-2 rounded-xl bg-[#fff4e3] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${getStatusClasses(selectedOrder.orderStatus)}`}>
                      <ChefHat className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-extrabold text-[#bc7600]">
                        {STATUS_LABELS[selectedOrder.orderStatus] || selectedOrder.orderStatus.replaceAll("_", " ")}
                      </span>
                      <span className="block text-[9px] text-charcoal-600">
                        {selectedOrder.fulfillmentType === "delivery" ? "Delivery order" : "Pickup order"}
                      </span>
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-right text-[9px] text-charcoal-600">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>
                      Placed at<br />{new Date(selectedOrder.placedAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </section>

                <section className="border-b border-[#eeeae2] pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-[#162032]">
                      <UsersRound className="h-4 w-4 text-success-700" />
                      Customer Details
                    </h3>
                    <a
                      href={`tel:${selectedOrder.customerPhone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#b8d7b4] px-2 py-1 text-[9px] font-bold text-success-800 hover:bg-[#eff8eb]"
                    >
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
                    <UsersRound className="h-3.5 w-3.5 text-charcoal-500" />
                    {selectedOrder.customerName}
                  </p>
                  <a
                    href={`tel:${selectedOrder.customerPhone.replace(/[^\d+]/g, "")}`}
                    className="mt-1 flex items-center gap-2 text-[10px] text-charcoal-700 hover:text-success-800"
                  >
                    <Phone className="h-3.5 w-3.5 text-charcoal-500" />
                    {selectedOrder.customerPhone}
                  </a>
                  {selectedOrder.deliveryAddress && (
                    <p className="mt-1 flex items-start gap-2 text-[10px] leading-relaxed text-charcoal-700">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-500" />
                      <span>
                        {[
                          selectedOrder.deliveryAddress.street,
                          selectedOrder.deliveryAddress.landmark,
                          selectedOrder.deliveryAddress.city,
                          selectedOrder.deliveryAddress.state,
                          selectedOrder.deliveryAddress.pincode,
                        ].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                  {!selectedOrder.deliveryAddress && selectedOrder.fulfillmentType === "delivery" && (
                    <p className="mt-1 text-[9px] text-charcoal-500">Delivery address is unavailable.</p>
                  )}
                </section>

                <section className="border-b border-[#eeeae2] pb-3">
                  <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-[#162032]">
                    <ShoppingCart className="h-4 w-4 text-success-700" />
                    Order Items ({selectedOrder.items.reduce((total, item) => total + item.quantity, 0)})
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <li key={`${item.name}-${index}`} className="flex items-start justify-between gap-2 text-[10px]">
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#20251f]">{item.name}</span>
                          {item.variant?.name && <span className="block text-[9px] text-charcoal-500">{item.variant.name}</span>}
                          {!!item.addons?.length && <span className="block text-[9px] text-charcoal-500">{item.addons.map((addon) => addon.name).join(", ")}</span>}
                          {item.specialInstructions && <span className="block text-[9px] text-charcoal-500">Note: {item.specialInstructions}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-charcoal-600">× {item.quantity}</span>
                          {(item.itemTotalPrice != null || item.price != null) && (
                            <span className="block font-semibold">{formatCurrency(item.itemTotalPrice ?? (item.price || 0) * item.quantity)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-1.5 text-[10px]">
                  <h3 className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-[#162032]">
                    <CircleDollarSign className="h-4 w-4 text-success-700" />
                    Bill Summary
                  </h3>
                  <div className="flex justify-between gap-2 text-charcoal-700">
                    <span>Item Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal ?? selectedOrder.items.reduce((total, item) => total + (item.itemTotalPrice ?? (item.price || 0) * item.quantity), 0))}</span>
                  </div>
                  {selectedOrder.deliveryFee != null && (
                    <div className="flex justify-between gap-2 text-charcoal-700">
                      <span>Delivery Fee</span><span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                    </div>
                  )}
                  {selectedOrder.taxAmount != null && (
                    <div className="flex justify-between gap-2 text-charcoal-700">
                      <span>Taxes</span><span>{formatCurrency(selectedOrder.taxAmount)}</span>
                    </div>
                  )}
                  {!!selectedOrder.discountAmount && (
                    <div className="flex justify-between gap-2 text-success-800">
                      <span>Discount{selectedOrder.couponCode ? ` · ${selectedOrder.couponCode}` : ""}</span>
                      <span>−{formatCurrency(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between rounded-lg bg-[#e7f8dc] px-2.5 py-2 text-[12px] font-black text-success-800">
                    <span>Total Amount</span><span>{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  <p className="pt-1 text-[9px] text-charcoal-600">
                    Payment: {selectedOrder.paymentMethod === "razorpay" ? "Online" : "Cash on Delivery"} · {selectedOrder.paymentStatus.replaceAll("_", " ")}
                  </p>
                </section>
              </div>

              <footer className="grid grid-cols-1 gap-2 border-t border-[#eeeae2] p-3 sm:grid-cols-[1fr_1.2fr] 2xl:grid-cols-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex h-9 items-center justify-center gap-2 rounded-xl border border-[#e5e3de] bg-white text-[10px] font-bold text-charcoal-800 hover:bg-[#f8f7f3]"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Invoice
                </button>
                <div className="flex min-w-0 gap-1.5">
                  <label className="sr-only" htmlFor="detail-order-status">New order status</label>
                  <select
                    id="detail-order-status"
                    aria-label="New order status"
                    value={detailStatus}
                    onChange={(event) => setDetailStatus(event.target.value)}
                    disabled={!(NEXT_STATUSES[selectedOrder.orderStatus] || []).length || workingId === selectedOrder._id}
                    className="h-9 min-w-0 flex-1 rounded-xl border border-[#e5e3de] bg-white px-2 text-[9px] font-semibold disabled:opacity-50"
                  >
                    <option value="">Update Status</option>
                    {(NEXT_STATUSES[selectedOrder.orderStatus] || []).map((status) => (
                      <option key={status} value={status}>{STATUS_LABELS[status] || status.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!detailStatus || workingId === selectedOrder._id}
                    onClick={() => void changeStatus(selectedOrder, detailStatus)}
                    className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl bg-success-800 px-2.5 text-[9px] font-bold text-white hover:bg-success-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {workingId === selectedOrder._id ? "Saving…" : "Update"}
                  </button>
                </div>
              </footer>
            </aside>
          </>
        )}
        </div>
      </div>
    </main>
  );
}
