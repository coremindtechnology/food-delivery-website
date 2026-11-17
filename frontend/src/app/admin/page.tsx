"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  CircleDollarSign,
  CookingPot,
  CreditCard,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBasket,
  ShoppingCart,
  Store,
  UsersRound,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type DashboardData = {
  kpi: {
    totalOrders: number;
    todayOrders: number;
    activeOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    vegRevenue: number;
    nonVegRevenue: number;
    lowStockCount: number;
    totalCustomers: number;
  };
  restaurants: { _id: string; name: string; slug: string; type: string; isOpen: boolean }[];
  activeKitchens: number;
  recentOrders: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    items: { name: string; quantity: number }[];
    totalAmount: number;
    orderStatus: string;
    placedAt: string;
    restaurantSlug: string;
  }[];
  revenueByDay: { date: string; label: string; orders: number; revenue: number }[];
  todayOrderStatuses: { status: string; count: number }[];
  todayFulfillmentTypes: { type: string; count: number }[];
  topSellingItems: { _id: string; quantity: number; revenue: number; image?: string }[];
  todayDate: string;
};

type ChartMetric = "revenue" | "orders";

const statusColors: Record<string, string> = {
  delivered: "#159447",
  preparing: "#f59e0b",
  outForDelivery: "#1687f8",
  cancelled: "#a78bfa",
  other: "#cbd5e1",
};

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatCompactCurrency(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

function getStatusTone(status: string) {
  if (status === "delivered") return "bg-[#dff4e3] text-[#188343]";
  if (["dispatched", "ready_for_pickup"].includes(status)) return "bg-[#e2efff] text-[#1874d1]";
  if (status === "preparing" || status === "accepted" || status === "new") return "bg-[#fff0d6] text-[#bc7600]";
  if (status === "cancelled" || status === "rejected") return "bg-[#ffe1e1] text-[#c33d3d]";
  return "bg-cream-100 text-charcoal-700";
}

function SalesChart({
  data,
  metric,
  onMetricChange,
}: {
  data: DashboardData["revenueByDay"];
  metric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
}) {
  const values = data.map((day) => (metric === "revenue" ? day.revenue : day.orders));
  const maxValue = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 26 + (index * 488) / Math.max(values.length - 1, 1);
    const y = 154 - (value / maxValue) * 112;
    return { x, y, value };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L 514 164 L 26 164 Z`;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
            <BarChart3 className="h-4 w-4 text-success-700" />
            Sales Overview
          </h2>
          <p className="mt-0.5 text-[10px] text-charcoal-500">Last 7 days</p>
        </div>
        <div className="flex rounded-full bg-[#f2f4ef] p-0.5">
          {(["revenue", "orders"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={metric === value}
              className={`rounded-full px-3 py-1 text-[9px] font-bold capitalize transition ${metric === value ? "bg-success-700 text-white shadow-sm" : "text-charcoal-600 hover:text-charcoal-900"}`}
              onClick={() => onMetricChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <svg viewBox="0 0 540 190" role="img" aria-label={`Last 7 days ${metric} chart`} className="h-[190px] w-full overflow-visible">
          <defs>
            <linearGradient id="sales-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5dc75b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#5dc75b" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((lineIndex) => {
            const y = 42 + lineIndex * 38;
            const value = (maxValue * (3 - lineIndex)) / 3;
            return (
              <g key={lineIndex}>
                <line x1="25" x2="520" y1={y} y2={y} stroke="#edf0eb" strokeDasharray="3 4" />
                <text x="0" y={y + 3} fill="#858b87" fontSize="8">
                  {metric === "revenue" ? formatCompactCurrency(value) : numberFormatter.format(Math.round(value))}
                </text>
              </g>
            );
          })}
          <path d={area} fill="url(#sales-area-fill)" />
          <path d={line} fill="none" stroke="#159447" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={data[index]?.date || index}>
              <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#159447" strokeWidth="2" />
              <text x={point.x} y="182" textAnchor="middle" fill="#6e7470" fontSize="9">
                {data[index]?.label || ""}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("revenue");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (restaurantId: string, initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const query = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : "";
      const response = await fetch(`/api/admin/dashboard${query}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to load dashboard.");
      }
      setDashboard(result.data as DashboardData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(selectedRestaurantId, true);
  }, [loadDashboard, selectedRestaurantId]);

  const orderGroups = useMemo(() => {
    const statuses = dashboard?.todayOrderStatuses || [];
    const sum = (matches: string[]) =>
      statuses.filter((status) => matches.includes(status.status)).reduce((total, status) => total + status.count, 0);
    const groups = [
      { label: "Delivered", count: sum(["delivered"]), color: statusColors.delivered },
      { label: "Preparing", count: sum(["new", "accepted", "preparing", "ready"]), color: statusColors.preparing },
      { label: "Out for Delivery", count: sum(["dispatched", "ready_for_pickup"]), color: statusColors.outForDelivery },
      { label: "Cancelled", count: sum(["cancelled", "rejected"]), color: statusColors.cancelled },
    ];
    const other = sum(["pending_payment"]);
    if (other > 0) groups.push({ label: "Payment Pending", count: other, color: statusColors.other });
    const total = groups.reduce((count, group) => count + group.count, 0);
    let start = 0;
    const segments = groups.map((group) => {
      const end = total > 0 ? start + (group.count / total) * 100 : start;
      const segment = `${group.color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return { groups, total, background: `conic-gradient(${segments.join(", ")})` };
  }, [dashboard?.todayOrderStatuses]);

  const fulfillmentCounts = useMemo(() => {
    const fulfillment = dashboard?.todayFulfillmentTypes || [];
    return {
      delivery: fulfillment.find((entry) => entry.type === "delivery")?.count || 0,
      takeaway: fulfillment.find((entry) => entry.type === "takeaway")?.count || 0,
    };
  }, [dashboard?.todayFulfillmentTypes]);

  const kpi = dashboard?.kpi;
  const averageOrder = kpi && kpi.todayOrders > 0 ? kpi.todayRevenue / kpi.todayOrders : 0;
  const maxOrders = Math.max(...(dashboard?.revenueByDay.map((day) => day.orders) || [0]), 1);

  return (
    <main className="min-h-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-3.5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-black tracking-tight text-[#122033] sm:text-[22px]">
              Good Morning, Admin <span aria-hidden="true">👋</span>
            </h1>
            <p className="text-[10px] text-charcoal-600">Here&apos;s what&apos;s happening at Dual Kitchens today.</p>
          </div>
          <div className="flex items-center gap-2">
            {dashboard && dashboard.restaurants.length > 1 && (
              <label className="flex h-8 items-center gap-2 rounded-lg border border-cream-200 bg-white px-2.5 text-[10px] font-semibold text-charcoal-800 shadow-sm">
                <Store className="h-3.5 w-3.5 text-red-500" />
                <select
                  aria-label="Filter dashboard by kitchen"
                  value={selectedRestaurantId}
                  onChange={(event) => setSelectedRestaurantId(event.target.value)}
                  className="max-w-36 bg-transparent outline-none"
                >
                  <option value="">All Kitchens</option>
                  {dashboard.restaurants.map((restaurant) => (
                    <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 text-charcoal-400" />
              </label>
            )}
            <div className="flex h-8 items-center gap-2 rounded-lg border border-cream-200 bg-white px-2.5 text-[10px] font-semibold text-charcoal-800 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5 text-charcoal-700" />
              {dashboard?.todayDate ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${dashboard.todayDate}T12:00:00`)) : "Today"}
            </div>
            <button type="button" onClick={() => void loadDashboard(selectedRestaurantId)} disabled={refreshing} aria-label="Refresh dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg border border-cream-200 bg-white text-charcoal-600 shadow-sm hover:bg-cream-50 disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadDashboard(selectedRestaurantId)} className="font-bold underline">Retry</button>
          </div>
        )}

        {loading && !dashboard ? (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-cream-200 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-charcoal-600">
              <RefreshCw className="h-4 w-4 animate-spin text-success-700" /> Loading dashboard…
            </div>
          </div>
        ) : dashboard && (
          <>
            <section aria-label="Key metrics" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Total Orders" value={numberFormatter.format(kpi?.todayOrders || 0)} note="Today" trendIcon={<ArrowUpRight />} icon={<ShoppingCart />} tone="green" />
              <MetricCard title="Total Revenue" value={formatCurrency(kpi?.todayRevenue || 0)} note="Today" trendIcon={<ArrowUpRight />} icon={<CircleDollarSign />} tone="orange" />
              <MetricCard title="Total Customers" value={numberFormatter.format(kpi?.totalCustomers || 0)} note="Registered customers" trendIcon={<UsersRound />} icon={<UsersRound />} tone="green" />
              <MetricCard title="Active Kitchens" value={`${dashboard.activeKitchens} / ${dashboard.restaurants.length}`} note={dashboard.activeKitchens === dashboard.restaurants.length ? "All Operational" : "Some kitchens are closed"} trendIcon={<Store />} icon={<Store />} tone="orange" />
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)] xl:col-span-6">
                <SalesChart data={dashboard.revenueByDay} metric={chartMetric} onMetricChange={setChartMetric} />
              </article>

              <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)] xl:col-span-3">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                  <PackageCheck className="h-4 w-4 text-success-700" />
                  Order Status (Today)
                </h2>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                  <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: orderGroups.background }}>
                    <div className="grid h-[76px] w-[76px] place-content-center rounded-full bg-white text-center">
                      <span className="text-xl font-black text-[#122033]">{numberFormatter.format(orderGroups.total)}</span>
                      <span className="text-[9px] text-charcoal-600">Orders</span>
                    </div>
                  </div>
                  <div className="min-w-[130px] flex-1 space-y-2">
                    {orderGroups.groups.map((group) => {
                      const percent = orderGroups.total ? Math.round((group.count / orderGroups.total) * 100) : 0;
                      return (
                        <div key={group.label} className="flex items-center gap-1.5 text-[9px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                          <span className="min-w-0 flex-1 truncate text-charcoal-700">{group.label}</span>
                          <span className="font-bold text-charcoal-900">{group.count}</span>
                          <span className="w-8 text-right text-charcoal-500">{percent}%</span>
                        </div>
                      );
                    })}
                    {orderGroups.total === 0 && <p className="text-[10px] text-charcoal-500">No orders today yet.</p>}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)] xl:col-span-3">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                  <Zap className="h-4 w-4 text-[#ed9a16]" />
                  Quick Actions
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <QuickAction href="/admin/menu" label="Add New Item" Icon={Plus} />
                  <QuickAction href="/admin/orders" label="Manage Orders" Icon={ClipboardList} />
                  <QuickAction href="/admin/finance" label="View Reports" Icon={BarChart3} />
                  <QuickAction href="/admin/payments" label="Payments" Icon={CreditCard} />
                </div>
              </article>
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)] xl:col-span-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                    <ShoppingBasket className="h-4 w-4 text-success-700" />
                    Recent Orders
                  </h2>
                  <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[9px] font-bold text-success-700 hover:underline">
                    View All Orders <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {dashboard.recentOrders.length === 0 ? (
                  <EmptyMessage message="No orders have been placed yet." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[510px] text-left text-[9px]">
                      <thead>
                        <tr className="border-y border-cream-100 text-[8px] font-bold text-charcoal-500">
                          <th className="py-2 pr-2">Order ID</th>
                          <th className="px-2 py-2">Customer</th>
                          <th className="px-2 py-2">Items</th>
                          <th className="px-2 py-2">Amount</th>
                          <th className="py-2 pl-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.recentOrders.map((order) => (
                          <tr key={order.orderNumber} className="border-b border-cream-100 last:border-0">
                            <td className="whitespace-nowrap py-2.5 pr-2 font-extrabold text-charcoal-900">#{order.orderNumber}</td>
                            <td className="max-w-24 truncate px-2 py-2.5 text-charcoal-700">{order.customerName || order.customerPhone}</td>
                            <td className="max-w-40 truncate px-2 py-2.5 text-charcoal-700">
                              {order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5 font-bold text-charcoal-900">{formatCurrency(order.totalAmount)}</td>
                            <td className="py-2.5 pl-2 text-right">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-bold capitalize ${getStatusTone(order.orderStatus)}`}>
                                {order.orderStatus.replaceAll("_", " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)] xl:col-span-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                    <CookingPot className="h-4 w-4 text-success-700" />
                    Top Selling Items
                  </h2>
                  <Link href="/admin/menu" className="text-[9px] font-bold text-success-700 hover:underline">View All</Link>
                </div>
                {dashboard.topSellingItems.length === 0 ? (
                  <EmptyMessage message="Sales data will appear here." />
                ) : (
                  <div className="divide-y divide-cream-100">
                    {dashboard.topSellingItems.map((item) => (
                      <div key={item._id} className="flex items-center gap-2 py-2">
                        <div className="relative h-9 w-10 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                          {item.image && (
                            <Image src={item.image} alt="" fill sizes="40px" unoptimized={item.image.startsWith("data:image/")} className="object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-extrabold text-charcoal-900">{item._id}</p>
                          <p className="text-[9px] text-charcoal-600">{item.quantity} orders · {formatCurrency(item.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <div className="space-y-3 xl:col-span-3">
                <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)]">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                      <Store className="h-4 w-4 text-success-700" />
                      Kitchens Status
                    </h2>
                    <Link href="/admin/menu" aria-label="Manage kitchens" className="text-[9px] font-bold text-success-700 hover:underline">Manage</Link>
                  </div>
                  <div className="space-y-1.5">
                    {dashboard.restaurants.length === 0 ? (
                      <EmptyMessage message="No kitchens found." />
                    ) : dashboard.restaurants.map((restaurant) => (
                      <div key={restaurant._id} className="flex items-center gap-2 rounded-lg bg-[#f8faf6] px-2 py-1.5">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${restaurant.type === "veg" ? "bg-[#e1f3df] text-success-700" : "bg-[#ffe7e7] text-red-600"}`}>
                          <CookingPot className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[9px] font-bold text-charcoal-800">{restaurant.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${restaurant.isOpen ? "bg-[#dff4e3] text-[#168044]" : "bg-cream-200 text-charcoal-600"}`}>
                          {restaurant.isOpen ? "Operational" : "Closed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#eeeae2] bg-white p-3.5 shadow-[0_3px_12px_rgba(35,40,30,0.06)]">
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#152033]">
                    <CalendarDays className="h-4 w-4 text-success-700" />
                    Today&apos;s Summary
                  </h2>
                  <SummaryRow label="Total Orders" value={numberFormatter.format(kpi?.todayOrders || 0)} />
                  <SummaryRow label="Revenue" value={formatCurrency(kpi?.todayRevenue || 0)} />
                  <SummaryRow label="Avg. Order Value" value={formatCurrency(averageOrder)} />
                  <SummaryRow label="Delivery Orders" value={`${fulfillmentCounts.delivery} (${orderGroups.total ? Math.round((fulfillmentCounts.delivery / orderGroups.total) * 100) : 0}%)`} />
                  <SummaryRow label="Pickup Orders" value={`${fulfillmentCounts.takeaway} (${orderGroups.total ? Math.round((fulfillmentCounts.takeaway / orderGroups.total) * 100) : 0}%)`} />
                </article>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  note,
  trendIcon,
  icon,
  tone,
}: {
  title: string;
  value: string;
  note: string;
  trendIcon: ReactNode;
  icon: ReactNode;
  tone: "green" | "orange";
}) {
  const green = tone === "green";
  return (
    <article className={`flex min-h-[78px] items-center gap-3 rounded-2xl border p-3 shadow-[0_3px_12px_rgba(35,40,30,0.05)] ${green ? "border-[#e8f0e2] bg-gradient-to-br from-[#f0f8eb] to-white" : "border-[#f3eadd] bg-gradient-to-br from-[#fff5e8] to-white"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${green ? "bg-success-600" : "bg-[#ff9d13]"}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-semibold text-charcoal-700">{title}</p>
        <p className="mt-0.5 truncate font-display text-xl font-black leading-none text-[#162032]">{value}</p>
        <p className={`mt-1 flex items-center gap-0.5 text-[8px] font-bold ${green ? "text-success-700" : "text-[#bc7600]"}`}>
          {trendIcon} <span>{note}</span>
        </p>
      </div>
      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center opacity-30 sm:flex ${green ? "text-success-600" : "text-[#f49a1b]"}`}>{icon}</span>
    </article>
  );
}

function QuickAction({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) {
  return (
    <Link href={href} className="flex min-h-[50px] flex-col items-center justify-center gap-1 rounded-xl border border-cream-100 bg-white text-center shadow-[0_2px_8px_rgba(30,40,25,0.06)] transition hover:-translate-y-0.5 hover:border-success-200 hover:bg-[#f8fcf5]">
      <Icon className="h-4 w-4 text-success-700" />
      <span className="text-[9px] font-bold text-charcoal-800">{label}</span>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-cream-100 py-1.5 text-[9px] last:border-0">
      <span className="text-charcoal-600">{label}</span>
      <span className="text-right font-extrabold text-charcoal-900">{value}</span>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return <p className="py-5 text-center text-[10px] text-charcoal-500">{message}</p>;
}
