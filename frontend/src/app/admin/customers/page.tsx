"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  StickyNote,
  UsersRound,
  UserRoundPlus,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

type Restaurant = { _id: string; name: string };
type CustomerRow = {
  customerId?: string;
  phone: string;
  name?: string;
  email?: string;
  notes: string;
  isBlocked: boolean;
  firstOrder: string;
  lastOrder: string;
  totalOrderCount: number;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  restaurants: Restaurant[];
};
type CustomerStats = {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  totalSpending: number;
};
type CustomerOrder = {
  _id: string;
  orderNumber: string;
  restaurantId: string | { _id: string; name: string };
  items: { name: string; quantity: number; image?: string }[];
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  placedAt: string;
};
type CustomerDetails = {
  customer: {
    customerId: string;
    phone: string;
    name: string;
    email: string;
    notes: string;
    isBlocked: boolean;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  };
  orders: CustomerOrder[];
};
type ListMeta = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  stats: CustomerStats;
};
type View = "all" | "repeat" | "new" | "top";
type DetailTab = "history" | "profile" | "notes";
type Period = "all" | "7d" | "30d" | "90d" | "365d";
type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

const views: { id: View; label: string; Icon: typeof UsersRound }[] = [
  { id: "all", label: "All Customers", Icon: UsersRound },
  { id: "repeat", label: "Repeat Customers", Icon: RefreshCw },
  { id: "new", label: "New Customers", Icon: UserRoundPlus },
  { id: "top", label: "Top Customers", Icon: Crown },
];

function initials(name?: string) {
  return (name || "Customer")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "delivered" || status === "paid") return "bg-[#dcf5dc] text-[#188343]";
  if (["new", "accepted", "preparing", "ready", "pending"].includes(status)) return "bg-[#fff0d6] text-[#bc7600]";
  if (["cancelled", "rejected", "failed", "refunded"].includes(status)) return "bg-[#ffe1e1] text-[#c33d3d]";
  return "bg-[#edf1ea] text-[#59615b]";
}

function MetricCard({
  title,
  value,
  note,
  tone,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  tone: "green" | "orange" | "red";
  icon: ReactNode;
}) {
  const toneClasses = {
    green: "border-[#e5efdf] bg-gradient-to-br from-[#eef8e9] to-white text-[#087a37]",
    orange: "border-[#f2e7d8] bg-gradient-to-br from-[#fff4e3] to-white text-[#f28a00]",
    red: "border-[#f4dfe0] bg-gradient-to-br from-[#fff0f0] to-white text-[#e35045]",
  }[tone];
  return (
    <article className={`flex min-h-[92px] items-center gap-3 rounded-2xl border px-3 py-3 shadow-[0_3px_12px_rgba(35,40,30,0.04)] ${toneClasses}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/80">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-[#313a34]">{title}</span>
        <span className="mt-0.5 block truncate font-display text-xl font-black leading-tight text-[#162032]">{value}</span>
        <span className="mt-0.5 block truncate text-[10px] text-charcoal-500">{note}</span>
      </span>
    </article>
  );
}

async function readResponse<T>(response: Response): Promise<T> {
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result as T;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    totalSpending: 0,
  });
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [detailPagination, setDetailPagination] = useState({ totalPages: 1, totalCount: 0 });
  const [selectedPhone, setSelectedPhone] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [view, setView] = useState<View>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [detailTab, setDetailTab] = useState<DetailTab>("history");
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pageCount = meta?.totalPages || 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        period,
        view,
        status,
      });
      if (restaurantId) params.set("restaurantId", restaurantId);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await fetch(`/api/admin/customers?${params}`, { cache: "no-store" });
      const result = await readResponse<{ data: CustomerRow[]; meta: ListMeta }>(response);
      setCustomers(result.data);
      setMeta(result.meta);
      setStats(result.meta.stats);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, period, restaurantId, status, view]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/restaurants", { cache: "no-store" })
      .then(readResponse<{ data: Restaurant[] }>)
      .then((result) => {
        if (active) setRestaurants(result.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load kitchens.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!customers.length) {
      setSelectedPhone("");
      setDetails(null);
      return;
    }
    if (!customers.some((customer) => customer.phone === selectedPhone)) {
      setSelectedPhone(customers[0].phone);
      setHistoryPage(1);
    }
  }, [customers, selectedPhone]);

  const loadDetails = useCallback(async (signal?: AbortSignal) => {
    if (!selectedPhone) {
      setDetails(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({
        customerPhone: selectedPhone,
        historyPage: String(historyPage),
        historyLimit: "5",
      });
      if (restaurantId) params.set("restaurantId", restaurantId);
      const response = await fetch(`/api/admin/customers?${params}`, { cache: "no-store", signal });
      const result = await readResponse<{ data: CustomerDetails; meta: { totalPages: number; totalCount: number } }>(response);
      if (signal?.aborted) return;
      setDetails(result.data);
      setDetailPagination({ totalPages: result.meta.totalPages, totalCount: result.meta.totalCount });
      setNameDraft(result.data.customer.name || "");
      setEmailDraft(result.data.customer.email || "");
      setNotesDraft(result.data.customer.notes || "");
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Unable to load customer details.");
    } finally {
      if (!signal?.aborted) setDetailLoading(false);
    }
  }, [historyPage, restaurantId, selectedPhone]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDetails(controller.signal);
    return () => controller.abort();
  }, [loadDetails]);

  const selectedSummary = useMemo(
    () => customers.find((customer) => customer.phone === selectedPhone),
    [customers, selectedPhone]
  );
  const historyTotalPages = detailPagination.totalPages;
  const periodLabel = period === "all" ? "All time" : `Last ${period.slice(0, -1)} days`;

  function resetPage() {
    setPage(1);
    setMessage("");
  }

  async function saveCustomer(fields: { name?: string; email?: string; notes?: string; isBlocked?: boolean }) {
    if (!details?.customer) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const selectedRestaurant = restaurantId || selectedSummary?.restaurants[0]?._id || restaurants[0]?._id;
      if (!selectedRestaurant) throw new Error("Select a kitchen before editing customer details.");
      const response = await fetch("/api/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: details.customer.phone,
          restaurantId: selectedRestaurant,
          ...fields,
        }),
      });
      await readResponse(response);
      setMessage("Customer details saved.");
      await Promise.all([loadCustomers(), loadDetails()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save customer details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-success-700">Admin portal</p>
          <h1 className="font-display text-3xl font-black text-[#162032]">Customers</h1>
          <p className="mt-1 text-sm text-charcoal-600">Manage customer profiles, order history, spending, and engagement.</p>
        </div>
        <label className="text-sm font-semibold text-charcoal-700">
          Kitchen
          <select
            className="mt-1 block min-w-48 rounded-lg border border-[#e4e6df] bg-white px-3 py-2"
            value={restaurantId}
            onChange={(event) => {
              setRestaurantId(event.target.value);
              setPage(1);
              setHistoryPage(1);
              setDetails(null);
            }}
          >
            <option value="">All Kitchens</option>
            {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Customers" value={stats.totalCustomers.toLocaleString("en-IN")} note={periodLabel} tone="green" icon={<UsersRound className="h-5 w-5" />} />
        <MetricCard title="New Customers" value={stats.newCustomers.toLocaleString("en-IN")} note={period === "all" ? "First order in the last 30 days" : periodLabel} tone="green" icon={<UserRoundPlus className="h-5 w-5" />} />
        <MetricCard title="Repeat Customers" value={stats.repeatCustomers.toLocaleString("en-IN")} note="Customers with 2+ completed orders" tone="orange" icon={<RefreshCw className="h-5 w-5" />} />
        <MetricCard title="Total Customer Spending" value={formatCurrency(stats.totalSpending)} note={periodLabel} tone="red" icon={<span className="text-xl font-black">₹</span>} />
      </section>

      <nav aria-label="Customer segments" className="flex gap-2 overflow-x-auto pb-1">
        {views.map(({ id, label, Icon }) => {
          const count = id === "all"
            ? stats.totalCustomers
            : id === "repeat"
              ? stats.repeatCustomers
              : id === "new"
                ? stats.newCustomers
                : undefined;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => { setView(id); setPage(1); setMessage(""); }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${view === id ? "bg-success-800 text-white shadow-sm" : "border border-[#e7e8e2] bg-white text-charcoal-700 hover:bg-[#f4f7f1]"}`}
            >
              <Icon className="h-4 w-4" />
              {label}{count !== undefined ? ` (${count.toLocaleString("en-IN")})` : ""}
            </button>
          );
        })}
      </nav>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.8fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e7e1] bg-white shadow-[0_4px_18px_rgba(30,40,25,0.06)]">
          <div className="grid gap-2 border-b border-[#eff0eb] p-3 md:grid-cols-[minmax(180px,1fr)_150px_145px_145px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search name, phone, or email..."
                className="w-full rounded-lg border border-[#e4e6df] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-success-600"
              />
            </label>
            <label className="sr-only" htmlFor="customer-period">Order history period</label>
            <select id="customer-period" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); setHistoryPage(1); }} className="rounded-lg border border-[#e4e6df] bg-white px-3 py-2 text-sm">
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="365d">Last 365 days</option>
            </select>
            <label className="sr-only" htmlFor="customer-status">Customer status</label>
            <select id="customer-status" value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="rounded-lg border border-[#e4e6df] bg-white px-3 py-2 text-sm">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Blocked</option>
            </select>
            <button type="button" onClick={() => void loadCustomers()} disabled={loading} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e6df] px-3 py-2 text-sm font-semibold disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left text-xs">
              <thead className="bg-[#f3f6ef] text-charcoal-700">
                <tr>
                  <th className="px-3 py-3 font-bold">#</th>
                  <th className="px-3 py-3 font-bold">Customer</th>
                  <th className="px-3 py-3 font-bold">Phone</th>
                  <th className="px-3 py-3 font-bold">Orders</th>
                  <th className="px-3 py-3 font-bold">Total Spent</th>
                  <th className="px-3 py-3 font-bold">Last Order</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Details</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <tr
                    key={customer.phone}
                    onClick={() => { setSelectedPhone(customer.phone); setHistoryPage(1); setDetailTab("history"); }}
                    className={`cursor-pointer border-t border-[#f0f1ec] transition hover:bg-[#fafbf8] ${selectedPhone === customer.phone ? "bg-[#f4f8f0]" : ""}`}
                  >
                    <td className="px-3 py-3 text-charcoal-500">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff0d5] text-[10px] font-black text-[#f07800]">{initials(customer.name)}</span>
                        <span className="min-w-0">
                          <span className="block max-w-[150px] truncate font-bold text-[#202b23]">{customer.name || "Guest customer"}</span>
                          {customer.email && <span className="block max-w-[150px] truncate text-[10px] text-charcoal-500">{customer.email}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-charcoal-700">{customer.phone}</td>
                    <td className="px-3 py-3 font-semibold">{customer.orderCount.toLocaleString("en-IN")}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-bold">{formatCurrency(customer.totalSpent)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-charcoal-600">{formatDate(customer.lastOrder)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${customer.isBlocked ? "bg-[#ffe1e1] text-[#c33d3d]" : "bg-[#dcf5dc] text-[#188343]"}`}>
                        {customer.isBlocked ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" aria-label={`View ${customer.name || customer.phone}`} onClick={(event) => { event.stopPropagation(); setSelectedPhone(customer.phone); setHistoryPage(1); }} className="rounded-md p-1.5 text-charcoal-600 hover:bg-white hover:text-success-800">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && !customers.length && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-charcoal-500">No customers found for these filters.</td></tr>
                )}
                {loading && !customers.length && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-charcoal-500">Loading customers…</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eff0eb] px-4 py-3 text-xs text-charcoal-600">
            <span>
              {meta?.totalCount
                ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, meta.totalCount)} of ${meta.totalCount.toLocaleString("en-IN")} customers`
                : "Showing 0 customers"}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous customers" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-2">Page {page} of {pageCount}</span>
              <button type="button" aria-label="Next customers" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#e6e7e1] bg-white shadow-[0_4px_18px_rgba(30,40,25,0.06)]">
          {!details && !detailLoading && (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center text-charcoal-500">
              <UsersRound className="h-10 w-10 text-charcoal-300" />
              <p className="font-semibold">Select a customer to view their profile and order history.</p>
            </div>
          )}
          {detailLoading && !details && <div className="p-8 text-center text-sm text-charcoal-500">Loading customer profile…</div>}
          {details && (
            <>
              <div className="flex items-start gap-3 p-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e2f5df] text-lg font-black text-success-800">{initials(details.customer.name)}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-black text-[#172033]">{details.customer.name || "Guest customer"}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-600"><Phone className="h-3.5 w-3.5" />{details.customer.phone}</p>
                  {details.customer.email && <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-charcoal-600"><Mail className="h-3.5 w-3.5 shrink-0" />{details.customer.email}</p>}
                </div>
                <button type="button" aria-label="Clear selected customer" onClick={() => { setSelectedPhone(""); setDetails(null); }} className="rounded-md p-1.5 text-charcoal-400 hover:bg-[#f4f5f1]"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                <div className="rounded-xl border border-[#f2e4d7] bg-[#fff8f1] p-2 text-center">
                  <ShoppingBag className="mx-auto h-4 w-4 text-orange-600" />
                  <strong className="mt-1 block text-sm text-[#1d2933]">{details.customer.totalOrders}</strong>
                  <span className="block text-[9px] text-charcoal-500">Total Orders</span>
                </div>
                <div className="rounded-xl border border-[#f2e4d7] bg-[#fff8f1] p-2 text-center">
                  <span className="block text-base font-black leading-4 text-orange-600">₹</span>
                  <strong className="mt-1 block text-sm text-[#1d2933]">{formatCurrency(details.customer.totalSpent)}</strong>
                  <span className="block text-[9px] text-charcoal-500">Total Spent</span>
                </div>
                <div className="rounded-xl border border-[#f2e4d7] bg-[#fff8f1] p-2 text-center">
                  <ArrowUpDown className="mx-auto h-4 w-4 text-orange-600" />
                  <strong className="mt-1 block text-sm text-[#1d2933]">{formatCurrency(details.customer.averageOrderValue)}</strong>
                  <span className="block text-[9px] text-charcoal-500">Avg. Order</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 border-y border-[#eff0eb] px-3 py-2">
                {([
                  ["history", "Order History", ShoppingBag],
                  ["profile", "Profile", UserRound],
                  ["notes", "Notes", StickyNote],
                ] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={detailTab === id}
                    onClick={() => setDetailTab(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold ${detailTab === id ? "bg-success-800 text-white" : "text-charcoal-600 hover:bg-[#f5f6f2]"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>

              <div className="min-h-[270px] p-3">
                {detailTab === "history" && (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#202b23]">Complete Order History</h3>
                      <span className="text-[10px] text-charcoal-500">{detailPagination.totalCount} orders</span>
                    </div>
                    {details.orders.length ? (
                      <div className="space-y-2">
                        {details.orders.map((order) => {
                          const kitchen = typeof order.restaurantId === "string" ? "" : order.restaurantId.name;
                          return (
                            <article key={order._id} className="rounded-xl border border-[#eff0eb] p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-extrabold text-[#202b23]">#{order.orderNumber}</p>
                                  <p className="mt-0.5 text-[10px] text-charcoal-500">{formatDate(order.placedAt)} · {kitchen || "Kitchen"}</p>
                                </div>
                                <strong className="whitespace-nowrap text-xs">{formatCurrency(order.totalAmount)}</strong>
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-[10px] text-charcoal-600">
                                {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                              </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${statusTone(order.orderStatus)}`}>{order.orderStatus.replaceAll("_", " ")}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${statusTone(order.paymentStatus)}`}>Payment {order.paymentStatus.replaceAll("_", " ")}</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : <p className="py-8 text-center text-xs text-charcoal-500">No orders found.</p>}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-charcoal-500">
                      <span>Page {historyPage} of {historyTotalPages}</span>
                      <div className="flex gap-1">
                        <button type="button" aria-label="Previous order history page" disabled={historyPage <= 1 || detailLoading} onClick={() => setHistoryPage((current) => current - 1)} className="rounded border p-1.5 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Next order history page" disabled={historyPage >= historyTotalPages || detailLoading} onClick={() => setHistoryPage((current) => current + 1)} className="rounded border p-1.5 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </>
                )}

                {detailTab === "profile" && (
                  <form onSubmit={(event) => { event.preventDefault(); void saveCustomer({ name: nameDraft, email: emailDraft }); }} className="space-y-3">
                    <h3 className="text-sm font-extrabold text-[#202b23]">Customer Profile</h3>
                    <label className="block text-xs font-semibold text-charcoal-700">Full name
                      <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" />
                    </label>
                    <label className="block text-xs font-semibold text-charcoal-700">Email address
                      <input type="email" value={emailDraft} onChange={(event) => setEmailDraft(event.target.value)} maxLength={254} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal" />
                    </label>
                    <div className="flex items-center gap-2 rounded-lg bg-[#f7f8f5] p-2.5 text-xs">
                      {details.customer.isBlocked ? <Ban className="h-4 w-4 text-red-600" /> : <BadgeCheck className="h-4 w-4 text-green-700" />}
                      <span className="flex-1">Account status: <strong>{details.customer.isBlocked ? "Inactive / blocked" : "Active"}</strong></span>
                      <button type="button" disabled={saving} onClick={() => void saveCustomer({ isBlocked: !details.customer.isBlocked })} className={`font-bold disabled:opacity-50 ${details.customer.isBlocked ? "text-green-700" : "text-red-700"}`}>
                        {details.customer.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                    <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-success-800 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                      <Check className="h-4 w-4" />{saving ? "Saving…" : "Save profile"}
                    </button>
                  </form>
                )}

                {detailTab === "notes" && (
                  <form onSubmit={(event) => { event.preventDefault(); void saveCustomer({ notes: notesDraft }); }} className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#202b23]"><FileText className="h-4 w-4" />Customer Notes</h3>
                    <p className="text-[11px] text-charcoal-500">Internal notes for your team. Customers cannot see these notes.</p>
                    <textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} maxLength={1000} rows={7} placeholder="Add preferences, delivery instructions, or service notes…" className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm" />
                    <div className="flex items-center justify-between text-[10px] text-charcoal-500"><span>Private to admin staff</span><span>{notesDraft.length}/1000</span></div>
                    <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-success-800 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                      <Check className="h-4 w-4" />{saving ? "Saving…" : "Save notes"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
