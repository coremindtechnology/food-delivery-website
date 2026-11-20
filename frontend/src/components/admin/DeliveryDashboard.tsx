"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";
import {
  Bike,
  Check,
  ChevronRight,
  Clock3,
  ClipboardList,
  Coins,
  History,
  LoaderCircle,
  Map,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Store,
  Truck,
  UsersRound,
  Zap,
} from "lucide-react";
import { KITCHEN_LOCATIONS, MAX_DELIVERY_DISTANCE_KM } from "@/lib/delivery";
import { formatCurrency } from "@/lib/utils";

type Restaurant = { _id: string; name: string; slug: "veg" | "non-veg" };
type PopulatedRestaurant = string | { _id: string; name: string; slug?: string };
type Rider = {
  _id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  status: "available" | "on_delivery" | "off_duty";
  isBlocked: boolean;
  assignedRestaurantId?: string;
  currentActiveOrderId?: { orderNumber: string };
};
type DeliveryOrder = {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  restaurantId: PopulatedRestaurant;
  restaurantSlug: "veg" | "non-veg";
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    landmark?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  totalAmount: number;
  placedAt: string;
  paymentMethod: string;
};
type Assignment = {
  _id: string;
  status: "assigned" | "picked_up" | "en_route" | "delivered" | "failed";
  assignedAt: string;
  pickedUpAt?: string;
  enRouteAt?: string;
  deliveredAt?: string;
  updatedAt: string;
  orderId: DeliveryOrder;
  deliveryPersonnelId: { _id?: string; name: string; phone: string; vehicleNumber: string };
  restaurantId: PopulatedRestaurant;
};
type DeliveryData = {
  riders: Rider[];
  activeAssignments: Assignment[];
  readyOrders: DeliveryOrder[];
  deliveryHistory: Assignment[];
  deliveredTodayCount: number;
  deliveredTodayByRestaurant: Record<string, number>;
  averageDeliveryMinutes: number;
  averageDeliveryMinutesByRestaurant: Record<string, number>;
};
type TabId = "dashboard" | "riders" | "assign" | "tracking" | "zones" | "charges" | "history";

const TABS: { id: TabId; label: string; Icon: typeof Truck }[] = [
  { id: "dashboard", label: "Delivery Dashboard", Icon: Truck },
  { id: "riders", label: "Delivery Partners", Icon: UsersRound },
  { id: "assign", label: "Assign Orders", Icon: ClipboardList },
  { id: "tracking", label: "Order Tracking", Icon: Map },
  { id: "zones", label: "Delivery Zones", Icon: MapPin },
  { id: "charges", label: "Delivery Charges", Icon: Coins },
  { id: "history", label: "Delivery History", Icon: History },
];

const EMPTY_RIDER_FORM = {
  name: "",
  phone: "",
  password: "",
  vehicleNumber: "",
  assignedRestaurantId: "",
};

function restaurantName(restaurant: PopulatedRestaurant | undefined) {
  return typeof restaurant === "string" ? "Kitchen" : restaurant?.name || "Kitchen";
}

function shortAddress(order: DeliveryOrder) {
  return [
    order.deliveryAddress?.street,
    order.deliveryAddress?.landmark,
    order.deliveryAddress?.city,
    order.deliveryAddress?.pincode,
  ].filter(Boolean).join(", ");
}

function statusLabel(status: string) {
  return ({
    assigned: "Assigned",
    picked_up: "Picked up",
    en_route: "On the way",
    delivered: "Delivered",
    failed: "Failed",
    available: "Available",
    on_delivery: "On delivery",
    off_duty: "Off duty",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}

function StatusPill({ status }: { status: string }) {
  const tone = ["delivered", "available"].includes(status)
    ? "bg-green-100 text-green-800"
    : ["en_route", "picked_up", "on_delivery"].includes(status)
      ? "bg-blue-100 text-blue-800"
      : ["failed", "off_duty"].includes(status)
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel(status)}</span>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e9ece5] bg-white shadow-[0_3px_12px_rgba(35,40,30,0.05)] ${className}`}>{children}</section>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-[#f7f8f5] px-4 py-8 text-center text-sm text-charcoal-500">{children}</p>;
}

function getErrorMessage(result: { error?: string }, fallback: string) {
  return result.error || fallback;
}

export default function DeliveryDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantFilter, setRestaurantFilter] = useState("");
  const [data, setData] = useState<DeliveryData | null>(null);
  const [tab, setTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [riderFormOpen, setRiderFormOpen] = useState(false);
  const [riderForm, setRiderForm] = useState(EMPTY_RIDER_FORM);
  const [riderSelections, setRiderSelections] = useState<Record<string, string>>({});

  const loadData = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const [deliveryResponse, restaurantResponse] = await Promise.all([
        fetch("/api/admin/delivery", { cache: "no-store" }),
        fetch("/api/admin/restaurants", { cache: "no-store" }),
      ]);
      const [deliveryResult, restaurantResult] = await Promise.all([
        deliveryResponse.json(),
        restaurantResponse.json(),
      ]);
      if (!deliveryResponse.ok || !deliveryResult.success) {
        throw new Error(getErrorMessage(deliveryResult, "Unable to load delivery operations."));
      }
      if (!restaurantResponse.ok || !restaurantResult.success) {
        throw new Error(getErrorMessage(restaurantResult, "Unable to load kitchens."));
      }
      setData(deliveryResult.data as DeliveryData);
      setRestaurants(restaurantResult.data as Restaurant[]);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load delivery operations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAdminAutoRefresh(() => loadData(true));

  const visibleRiders = useMemo(
    () => (data?.riders || []).filter((rider) =>
      !restaurantFilter || !rider.assignedRestaurantId || rider.assignedRestaurantId === restaurantFilter,
    ),
    [data?.riders, restaurantFilter],
  );
  const visibleOrders = useMemo(
    () => (data?.readyOrders || []).filter((order) =>
      !restaurantFilter ||
      (typeof order.restaurantId === "string" ? order.restaurantId : order.restaurantId?._id) === restaurantFilter,
    ),
    [data?.readyOrders, restaurantFilter],
  );
  const visibleAssignments = useMemo(
    () => (data?.activeAssignments || []).filter((assignment) =>
      !restaurantFilter ||
      (typeof assignment.restaurantId === "string" ? assignment.restaurantId : assignment.restaurantId?._id) === restaurantFilter,
    ),
    [data?.activeAssignments, restaurantFilter],
  );
  const visibleHistory = useMemo(
    () => (data?.deliveryHistory || []).filter((assignment) =>
      !restaurantFilter ||
      (typeof assignment.restaurantId === "string" ? assignment.restaurantId : assignment.restaurantId?._id) === restaurantFilter,
    ),
    [data?.deliveryHistory, restaurantFilter],
  );

  const availableRiders = visibleRiders.filter((rider) =>
    rider.status === "available" && !rider.isBlocked,
  );
  const deliveredToday = restaurantFilter
    ? data?.deliveredTodayByRestaurant[restaurantFilter] || 0
    : data?.deliveredTodayCount || 0;
  const averageDeliveryMinutes = restaurantFilter
    ? data?.averageDeliveryMinutesByRestaurant[restaurantFilter] || 0
    : data?.averageDeliveryMinutes || 0;

  async function assignOrder(order: DeliveryOrder) {
    const deliveryPersonnelId = riderSelections[order._id];
    if (!deliveryPersonnelId) {
      setError("Choose an available delivery partner before assigning this order.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, deliveryPersonnelId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(getErrorMessage(result, "Unable to assign delivery partner."));
      setSuccess(`${order.orderNumber} assigned successfully.`);
      await loadData(true);
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign delivery partner.");
    } finally {
      setSaving(false);
    }
  }

  async function createRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(riderForm),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(getErrorMessage(result, "Unable to create delivery partner."));
      setRiderForm({ ...EMPTY_RIDER_FORM, assignedRestaurantId: riderForm.assignedRestaurantId });
      setRiderFormOpen(false);
      setSuccess("Delivery partner created. Share the initial password securely.");
      await loadData(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create delivery partner.");
    } finally {
      setSaving(false);
    }
  }

  function openMaps(order: DeliveryOrder) {
    const coordinates = order.deliveryAddress?.coordinates;
    if (!coordinates) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const pageTitle = TABS.find((item) => item.id === tab)?.label || "Delivery Dashboard";

  return (
    <main className="min-h-full bg-[#fafbf8] px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-50 text-green-800"><Truck className="h-6 w-6" /></span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-black text-[#111827] sm:text-2xl">{pageTitle}</h1>
              <p className="text-xs text-charcoal-600">Manage delivery operations, assignments, partners, coverage and history.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {restaurants.length > 1 && (
              <label className="flex h-9 items-center gap-2 rounded-lg border border-cream-200 bg-white px-2.5 text-xs font-semibold shadow-sm">
                <Store className="h-4 w-4 text-green-700" />
                <span className="sr-only">Filter by kitchen</span>
                <select aria-label="Filter by kitchen" value={restaurantFilter} onChange={(event) => setRestaurantFilter(event.target.value)} className="max-w-36 bg-transparent outline-none">
                  <option value="">All Kitchens</option>
                  {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                </select>
              </label>
            )}
            <button type="button" onClick={() => void loadData(true)} disabled={refreshing} aria-label="Refresh delivery data" className="grid h-9 w-9 place-items-center rounded-lg border border-cream-200 bg-white text-charcoal-700 hover:bg-cream-50 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <nav aria-label="Delivery sections" className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => { setTab(id); setError(""); setSuccess(""); }} aria-current={tab === id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition sm:px-4 ${tab === id ? "border-green-800 bg-green-800 text-white shadow-sm" : "border-[#e8ebe4] bg-white text-charcoal-700 hover:border-green-200 hover:bg-green-50"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>

        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><span>{error}</span><button type="button" onClick={() => void loadData(true)} className="font-bold underline">Retry</button></div>}
        {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-800"><Check className="h-4 w-4" />{success}</div>}

        {loading && !data ? (
          <Card className="grid min-h-64 place-items-center"><p className="flex items-center gap-2 text-sm font-semibold text-charcoal-600"><LoaderCircle className="h-4 w-4 animate-spin text-green-700" />Loading delivery operations…</p></Card>
        ) : (
          <>
            {tab === "dashboard" && (
              <DashboardTab
                riders={visibleRiders}
                readyOrders={visibleOrders}
                assignments={visibleAssignments}
                deliveredToday={deliveredToday}
                averageDeliveryMinutes={averageDeliveryMinutes}
                availableRiders={availableRiders}
                restaurants={restaurants}
                restaurantFilter={restaurantFilter}
                onTabChange={setTab}
                onAssign={assignOrder}
                selections={riderSelections}
                onSelectRider={(orderId, riderId) => setRiderSelections((current) => ({ ...current, [orderId]: riderId }))}
                saving={saving}
                onMaps={openMaps}
              />
            )}
            {tab === "riders" && (
              <RidersTab
                riders={visibleRiders}
                restaurants={restaurants}
                form={riderForm}
                formOpen={riderFormOpen}
                saving={saving}
                onToggleForm={() => setRiderFormOpen((open) => !open)}
                onFormChange={setRiderForm}
                onSubmit={createRider}
                restaurantFilter={restaurantFilter}
              />
            )}
            {tab === "assign" && (
              <AssignTab
                orders={visibleOrders}
                riders={availableRiders}
                selections={riderSelections}
                saving={saving}
                onSelectRider={(orderId, riderId) => setRiderSelections((current) => ({ ...current, [orderId]: riderId }))}
                onAssign={assignOrder}
              />
            )}
            {tab === "tracking" && <TrackingTab assignments={visibleAssignments} onMaps={openMaps} />}
            {tab === "zones" && <ZonesTab restaurants={restaurants} restaurantFilter={restaurantFilter} />}
            {tab === "charges" && <ChargesTab />}
            {tab === "history" && <HistoryTab assignments={visibleHistory} />}
          </>
        )}
      </div>
    </main>
  );
}

function Metric({
  title,
  value,
  note,
  Icon,
  tone,
}: {
  title: string;
  value: string | number;
  note: string;
  Icon: typeof Truck;
  tone: string;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-3.5">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold text-charcoal-600">{title}</span>
        <span className="block text-xl font-black leading-tight text-[#111827]">{value}</span>
        <span className="block truncate text-[9px] text-charcoal-500">{note}</span>
      </span>
    </Card>
  );
}

function SectionTitle({ title, icon: Icon, action, onAction }: { title: string; icon: typeof Truck; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#eef0ea] px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#18231c]"><Icon className="h-4 w-4 text-green-700" />{title}</h2>
      {action && onAction && <button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-[10px] font-bold text-green-800 hover:underline">{action}<ChevronRight className="h-3 w-3" /></button>}
    </div>
  );
}

function DashboardTab({
  riders,
  readyOrders,
  assignments,
  deliveredToday,
  averageDeliveryMinutes,
  availableRiders,
  restaurants,
  restaurantFilter,
  onTabChange,
  onAssign,
  selections,
  onSelectRider,
  saving,
  onMaps,
}: {
  riders: Rider[];
  readyOrders: DeliveryOrder[];
  assignments: Assignment[];
  deliveredToday: number;
  averageDeliveryMinutes: number;
  availableRiders: Rider[];
  restaurants: Restaurant[];
  restaurantFilter: string;
  onTabChange: (tab: TabId) => void;
  onAssign: (order: DeliveryOrder) => void;
  selections: Record<string, string>;
  onSelectRider: (orderId: string, riderId: string) => void;
  saving: boolean;
  onMaps: (order: DeliveryOrder) => void;
}) {
  const onWayCount = assignments.filter((assignment) => ["picked_up", "en_route"].includes(assignment.status)).length;
  const onlineRiders = riders.filter((rider) => rider.status !== "off_duty" && !rider.isBlocked).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Metric title="Active Deliveries" value={assignments.length} note="Assigned and in progress" Icon={Truck} tone="bg-green-100 text-green-800" />
        <Metric title="Orders to Assign" value={readyOrders.length} note="Ready for delivery" Icon={ClipboardList} tone="bg-blue-100 text-blue-700" />
        <Metric title="On the Way" value={onWayCount} note="Picked up by partners" Icon={Bike} tone="bg-orange-100 text-orange-700" />
        <Metric title="Delivered Today" value={deliveredToday} note={`${onlineRiders} partners on duty`} Icon={PackageCheck} tone="bg-violet-100 text-violet-700" />
        <Metric title="Avg. Delivery Time" value={averageDeliveryMinutes ? `${averageDeliveryMinutes} min` : "—"} note="Completed today" Icon={Clock3} tone="bg-rose-100 text-rose-700" />
        <Metric title="Delivery Partners" value={riders.length} note={`${onlineRiders} on duty`} Icon={UsersRound} tone="bg-emerald-100 text-emerald-800" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.85fr_0.72fr]">
        <Card className="overflow-hidden">
          <SectionTitle title="Orders ready for delivery" icon={Truck} action="View all" onAction={() => onTabChange("assign")} />
          {readyOrders.length === 0 ? <div className="p-4"><Empty>No ready delivery orders are waiting for a rider.</Empty></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-left text-[11px]">
                <thead className="bg-[#f5f7f2] text-charcoal-600"><tr>{["Order", "Customer", "Kitchen", "Amount", "Partner", ""].map((heading) => <th key={heading} className="px-3 py-2 font-bold">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#f0f1ec]">
                  {readyOrders.slice(0, 5).map((order) => (
                    <tr key={order._id}>
                      <td className="px-3 py-2.5 font-extrabold">{order.orderNumber}</td>
                      <td className="px-3 py-2.5"><span className="block font-bold">{order.customerName}</span><span className="text-[9px] text-charcoal-500">{shortAddress(order).slice(0, 26)}</span></td>
                      <td className="px-3 py-2.5">{restaurantName(order.restaurantId)}</td>
                      <td className="px-3 py-2.5 font-bold">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-2.5">
                        <select aria-label={`Choose partner for ${order.orderNumber}`} value={selections[order._id] || ""} onChange={(event) => onSelectRider(order._id, event.target.value)} className="max-w-28 rounded-md border border-cream-200 bg-white px-2 py-1.5 text-[10px]">
                          <option value="">Choose partner</option>
                          {availableRiders.map((rider) => <option key={rider._id} value={rider._id}>{rider.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5"><button type="button" onClick={() => onAssign(order)} disabled={saving || !availableRiders.length} className="rounded-md bg-green-800 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">Assign</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <SectionTitle title="Delivery status" icon={MapPin} action="Track orders" onAction={() => onTabChange("tracking")} />
          <div className="space-y-3 p-4">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-[#f2f6ec] p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-charcoal-500">Active right now</p><p className="mt-1 text-2xl font-black text-[#14251a]">{assignments.length} <span className="text-xs font-semibold text-charcoal-500">orders</span></p></div>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-green-800 shadow-sm"><Route className="h-5 w-5" /></span>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-charcoal-600">Rider GPS is not connected yet. Track assigned order status and open customer drop-off coordinates in Maps.</p>
            </div>
            {assignments.slice(0, 3).map((assignment) => (
              <div key={assignment._id} className="flex items-center justify-between gap-2 rounded-lg border border-[#eef0ea] px-3 py-2">
                <div className="min-w-0"><p className="text-[11px] font-extrabold">{assignment.orderId?.orderNumber}</p><p className="truncate text-[10px] text-charcoal-600">{assignment.deliveryPersonnelId?.name} · {restaurantName(assignment.restaurantId)}</p></div>
                <StatusPill status={assignment.status} />
              </div>
            ))}
            {!assignments.length && <p className="text-xs text-charcoal-500">There are no active deliveries to track.</p>}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <SectionTitle title="Quick actions" icon={Zap} />
            <div className="divide-y divide-[#f0f1ec] px-3">
              {[
                { label: `Assign ready orders (${readyOrders.length})`, tab: "assign" as const, Icon: ClipboardList },
                { label: "Add / manage partners", tab: "riders" as const, Icon: UsersRound },
                { label: "View delivery zones", tab: "zones" as const, Icon: Map },
                { label: "Delivery charges", tab: "charges" as const, Icon: Coins },
                { label: "View delivery history", tab: "history" as const, Icon: Clock3 },
              ].map(({ label, tab: target, Icon }) => (
                <button key={target} type="button" onClick={() => onTabChange(target)} className="flex w-full items-center gap-2 py-3 text-left text-[11px] font-semibold text-charcoal-800 hover:text-green-800">
                  <Icon className="h-4 w-4 text-green-700" /><span className="flex-1">{label}</span><ChevronRight className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </Card>
          <Card className="overflow-hidden bg-green-50/70">
            <SectionTitle title="Today at a glance" icon={PackageCheck} />
            <div className="space-y-2.5 p-4 text-[11px]">
              <SummaryLine label="Ready to assign" value={readyOrders.length} tone="text-amber-700" />
              <SummaryLine label="Assigned / in progress" value={assignments.length} tone="text-blue-700" />
              <SummaryLine label="Delivered today" value={deliveredToday} tone="text-green-800" />
              <SummaryLine label="Available partners" value={availableRiders.length} tone="text-green-800" />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <SectionTitle title="Delivery partners" icon={UsersRound} action="Manage" onAction={() => onTabChange("riders")} />
          <div className="divide-y divide-[#f0f1ec] px-4">
            {riders.slice(0, 4).map((rider) => (
              <div key={rider._id} className="flex items-center gap-2.5 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-100 text-[11px] font-extrabold text-green-800">{rider.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold">{rider.name}</span><span className="block text-[9px] text-charcoal-500">{rider.vehicleNumber}</span></span>
                <StatusPill status={rider.isBlocked ? "off_duty" : rider.status} />
              </div>
            ))}
            {!riders.length && <div className="py-3"><Empty>No delivery partners registered.</Empty></div>}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <SectionTitle title="Delivery coverage" icon={MapPin} action="View zones" onAction={() => onTabChange("zones")} />
          <div className="space-y-2 p-4">
            {Object.entries(KITCHEN_LOCATIONS)
              .filter(([slug]) => !restaurantFilter || restaurants.some((restaurant) => restaurant._id === restaurantFilter && restaurant.slug === slug))
              .map(([slug, kitchen]) => (
                <div key={slug} className="flex items-center gap-2 rounded-lg bg-[#f6f8f3] px-3 py-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-green-700" /><span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{kitchen.name}</span><span className="text-[10px] font-extrabold text-green-800">{MAX_DELIVERY_DISTANCE_KM} km</span>
                </div>
              ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <SectionTitle title="Delivery charges" icon={Coins} action="View policy" onAction={() => onTabChange("charges")} />
          <div className="space-y-2.5 p-4">
            <SummaryLine label="Standard delivery" value={formatCurrency(40)} tone="text-charcoal-900" />
            <SummaryLine label="Free delivery from" value={formatCurrency(500)} tone="text-green-800" />
            <SummaryLine label="Coverage limit" value={`${MAX_DELIVERY_DISTANCE_KM} km`} tone="text-charcoal-900" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-charcoal-600">{label}</span><span className={`font-extrabold ${tone}`}>{value}</span></div>;
}

function RidersTab({
  riders,
  restaurants,
  form,
  formOpen,
  saving,
  onToggleForm,
  onFormChange,
  onSubmit,
  restaurantFilter,
}: {
  riders: Rider[];
  restaurants: Restaurant[];
  form: typeof EMPTY_RIDER_FORM;
  formOpen: boolean;
  saving: boolean;
  onToggleForm: () => void;
  onFormChange: (form: typeof EMPTY_RIDER_FORM) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  restaurantFilter: string;
}) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div><h2 className="text-base font-extrabold">Delivery partners</h2><p className="mt-1 text-xs text-charcoal-600">Manage rider accounts, contact details and current availability.</p></div>
          <button type="button" onClick={onToggleForm} className="inline-flex items-center gap-2 rounded-lg bg-green-800 px-3 py-2 text-xs font-bold text-white hover:bg-green-900"><Plus className="h-4 w-4" />Add partner</button>
        </div>
        {formOpen && (
          <form onSubmit={onSubmit} className="grid gap-3 border-t border-[#eef0ea] bg-[#f8faf6] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <h3 className="text-sm font-bold sm:col-span-2 lg:col-span-3">Create delivery partner login</h3>
            <input required minLength={2} maxLength={60} placeholder="Full name" value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm" />
            <input required pattern="[0-9]{10}" inputMode="numeric" maxLength={10} placeholder="10-digit phone" value={form.phone} onChange={(event) => onFormChange({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm" />
            <input required minLength={10} maxLength={128} type="password" autoComplete="new-password" placeholder="Initial password (10+ characters)" value={form.password} onChange={(event) => onFormChange({ ...form, password: event.target.value })} className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm" />
            <input required minLength={4} maxLength={20} placeholder="Vehicle number" value={form.vehicleNumber} onChange={(event) => onFormChange({ ...form, vehicleNumber: event.target.value })} className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm" />
            <select required value={form.assignedRestaurantId || restaurantFilter} onChange={(event) => onFormChange({ ...form, assignedRestaurantId: event.target.value })} disabled={Boolean(restaurantFilter)} className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm disabled:bg-cream-100">
              <option value="">Select kitchen</option>
              {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
            </select>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-800 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create login</button>
            <p className="text-[10px] text-charcoal-500 sm:col-span-2 lg:col-span-3">The password is stored as a secure hash. Share the initial password directly with the partner.</p>
          </form>
        )}
      </Card>
      {!riders.length ? <Empty>No delivery partners are assigned to this kitchen.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {riders.map((rider) => (
            <Card key={rider._id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-100 font-extrabold text-green-800">{rider.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold">{rider.name}</h3><p className="mt-0.5 text-xs text-charcoal-600">{rider.vehicleNumber}</p><StatusPill status={rider.isBlocked ? "off_duty" : rider.status} /></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ea] pt-3">
                <a href={`tel:${rider.phone}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800"><Phone className="h-3.5 w-3.5" />{rider.phone}</a>
                {rider.currentActiveOrderId && <span className="text-[10px] text-charcoal-600">Order {rider.currentActiveOrderId.orderNumber}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignTab({
  orders,
  riders,
  selections,
  saving,
  onSelectRider,
  onAssign,
}: {
  orders: DeliveryOrder[];
  riders: Rider[];
  selections: Record<string, string>;
  saving: boolean;
  onSelectRider: (orderId: string, riderId: string) => void;
  onAssign: (order: DeliveryOrder) => void;
}) {
  if (!orders.length) return <Card className="p-4"><Empty>No orders are ready for delivery assignment.</Empty></Card>;
  return (
    <Card className="overflow-hidden">
      <SectionTitle title="Assign a delivery partner" icon={ClipboardList} />
      <div className="divide-y divide-[#eef0ea]">
        {orders.map((order) => (
          <div key={order._id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{order.orderNumber} <StatusPill status={order.orderStatus} /></p>
              <p className="mt-1 truncate text-xs text-charcoal-700">{order.customerName} · {shortAddress(order)}</p>
              <p className="mt-1 text-[10px] text-charcoal-500">{restaurantName(order.restaurantId)} · {order.paymentMethod.toUpperCase()} · {formatCurrency(order.totalAmount)}</p>
            </div>
            <select aria-label={`Choose partner for ${order.orderNumber}`} value={selections[order._id] || ""} onChange={(event) => onSelectRider(order._id, event.target.value)} className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-xs">
              <option value="">Select available partner</option>
              {riders.map((rider) => <option key={rider._id} value={rider._id}>{rider.name} · {rider.vehicleNumber}</option>)}
            </select>
            <button type="button" onClick={() => onAssign(order)} disabled={saving || !riders.length} className="rounded-lg bg-green-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-green-900 disabled:opacity-50">{saving ? "Assigning…" : "Assign order"}</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TrackingTab({ assignments, onMaps }: { assignments: Assignment[]; onMaps: (order: DeliveryOrder) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="overflow-hidden">
        <SectionTitle title="Active delivery tracking" icon={Route} />
        <div className="space-y-3 p-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <strong>GPS note:</strong> Rider devices do not currently send live location to the admin panel. Status and customer drop-off location are shown below; no rider position is simulated.
          </div>
          {!assignments.length ? <Empty>No active assignments.</Empty> : assignments.map((assignment) => (
            <article key={assignment._id} className="rounded-xl border border-[#e9ece5] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold">{assignment.orderId?.orderNumber}</p><StatusPill status={assignment.status} /></div>
              <p className="mt-1 text-xs text-charcoal-600">{assignment.deliveryPersonnelId?.name} · {assignment.deliveryPersonnelId?.vehicleNumber}</p>
              <p className="mt-1 text-[11px] text-charcoal-600">{shortAddress(assignment.orderId)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${assignment.deliveryPersonnelId?.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-cream-300 px-2.5 py-1.5 text-[10px] font-bold"><Phone className="h-3 w-3" />Call partner</a>
                {assignment.orderId?.deliveryAddress?.coordinates && <button type="button" onClick={() => onMaps(assignment.orderId)} className="inline-flex items-center gap-1 rounded-lg border border-cream-300 px-2.5 py-1.5 text-[10px] font-bold"><MapPin className="h-3 w-3" />Open drop-off map</button>}
              </div>
            </article>
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <SectionTitle title="Delivery status timeline" icon={Clock3} />
        <div className="p-4">
          {!assignments.length ? <Empty>Delivery status updates will appear here when an order is assigned.</Empty> : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment._id} className="flex gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${assignment.status === "en_route" ? "bg-blue-600" : "bg-green-700"}`} />
                  <div className="min-w-0 flex-1 border-b border-[#eef0ea] pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold">{assignment.orderId?.orderNumber} · {statusLabel(assignment.status)}</p><time className="text-[10px] text-charcoal-500">{new Date(assignment.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div>
                    <p className="mt-1 text-[10px] text-charcoal-600">{assignment.deliveryPersonnelId?.name} · {restaurantName(assignment.restaurantId)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ZonesTab({ restaurants, restaurantFilter }: { restaurants: Restaurant[]; restaurantFilter: string }) {
  const kitchens = restaurants.filter((restaurant) => !restaurantFilter || restaurant._id === restaurantFilter);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        Delivery coverage is currently enforced at checkout using a 5 km radius from each kitchen. Custom named zones are not configured in the system yet.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {kitchens.map((restaurant) => {
          const location = KITCHEN_LOCATIONS[restaurant.slug];
          return (
            <Card key={restaurant._id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[#eef0ea] p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-800"><MapPin className="h-5 w-5" /></span>
                <div><h2 className="text-sm font-extrabold">{restaurant.name}</h2><p className="text-[10px] text-charcoal-600">Active delivery coverage</p></div>
                <span className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-800">Active</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f6f8f3] p-3"><p className="text-[10px] text-charcoal-500">Maximum delivery distance</p><p className="mt-1 text-lg font-black">{MAX_DELIVERY_DISTANCE_KM} km</p></div>
                <div className="rounded-xl bg-[#f6f8f3] p-3"><p className="text-[10px] text-charcoal-500">Coverage center</p><p className="mt-1 text-xs font-bold">{location.name}</p></div>
                <p className="text-[10px] leading-4 text-charcoal-500 sm:col-span-2">Coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · Addresses outside this radius are rejected during checkout.</p>
              </div>
            </Card>
          );
        })}
        {!kitchens.length && <Card className="p-4"><Empty>No kitchen is available in this filter.</Empty></Card>}
      </div>
    </div>
  );
}

function ChargesTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        These are the active checkout rules. Charges are currently application-configured and cannot be edited from this screen.
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Standard delivery charge", value: formatCurrency(40), note: "Applied to eligible delivery orders below the free-delivery threshold.", Icon: Truck },
          { label: "Free delivery threshold", value: formatCurrency(500), note: "Delivery is free when the item subtotal reaches this amount.", Icon: Coins },
          { label: "Maximum delivery distance", value: `${MAX_DELIVERY_DISTANCE_KM} km`, note: "Orders beyond the kitchen coverage radius cannot be placed.", Icon: Route },
        ].map(({ label, value, note, Icon }) => (
          <Card key={label} className="p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-800"><Icon className="h-5 w-5" /></span>
            <p className="mt-4 text-xs font-semibold text-charcoal-600">{label}</p>
            <p className="mt-1 text-2xl font-black text-[#17231a]">{value}</p>
            <p className="mt-2 text-[10px] leading-4 text-charcoal-500">{note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ assignments }: { assignments: Assignment[] }) {
  if (!assignments.length) return <Card className="p-4"><Empty>No completed or failed deliveries in the recent history.</Empty></Card>;
  return (
    <Card className="overflow-hidden">
      <SectionTitle title="Recent delivery history" icon={History} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="bg-[#f5f7f2] text-charcoal-600"><tr>{["Order", "Customer", "Partner", "Kitchen", "Completed", "Status", "Amount"].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#eef0ea]">
            {assignments.map((assignment) => (
              <tr key={assignment._id}>
                <td className="px-4 py-3 font-extrabold">{assignment.orderId?.orderNumber}</td>
                <td className="px-4 py-3"><span className="block font-semibold">{assignment.orderId?.customerName}</span><span className="text-[10px] text-charcoal-500">{assignment.orderId?.customerPhone}</span></td>
                <td className="px-4 py-3">{assignment.deliveryPersonnelId?.name}</td>
                <td className="px-4 py-3">{restaurantName(assignment.restaurantId)}</td>
                <td className="px-4 py-3">{new Date(assignment.deliveredAt || assignment.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-3"><StatusPill status={assignment.status} /></td>
                <td className="px-4 py-3 font-bold">{formatCurrency(assignment.orderId?.totalAmount || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
