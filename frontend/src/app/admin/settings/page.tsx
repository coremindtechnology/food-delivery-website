"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";
import {
  Bell,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Store,
  Truck,
  UserPlus,
} from "lucide-react";
import {
  getAdminOrderNotificationsEnabled,
  setAdminOrderNotificationsEnabled,
} from "@/lib/admin-notifications";
import { CreateRestaurantForm, type AdminRestaurant } from "@/components/admin/CreateRestaurantForm";

const STAFF_ROLES = [
  { value: "restaurant_manager", label: "Restaurant manager" },
  { value: "order_manager", label: "Order manager" },
  { value: "menu_manager", label: "Menu manager" },
  { value: "delivery_manager", label: "Delivery manager" },
  { value: "delivery_personnel", label: "Delivery personnel" },
  { value: "finance_viewer", label: "Finance viewer" },
  { value: "veg_manager", label: "Veg manager" },
  { value: "nonveg_manager", label: "Non-veg manager" },
] as const;

type StaffRole = (typeof STAFF_ROLES)[number]["value"];
type StaffMember = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  assignedRestaurantId?: string | { _id: string; name: string; slug: string } | null;
};
type StaffDraft = { role: StaffRole; assignedRestaurantId: string; isActive: boolean };
type StaffForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: StaffRole;
  assignedRestaurantId: string;
};

const EMPTY_STAFF_FORM: StaffForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "order_manager",
  assignedRestaurantId: "",
};

type Restaurant = AdminRestaurant;

type SettingsForm = Pick<
  Restaurant,
  "isOpen" | "openingHours" | "deliveryTime" | "minOrderAmount" | "bannerText" | "contactPhone"
>;

function getSettings(restaurant: Restaurant): SettingsForm {
  return {
    isOpen: restaurant.isOpen,
    openingHours: restaurant.openingHours || "",
    deliveryTime: restaurant.deliveryTime || "",
    minOrderAmount: restaurant.minOrderAmount ?? 0,
    bannerText: restaurant.bannerText || "",
    contactPhone: restaurant.contactPhone || "",
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Something went wrong. Please try again.");
  }
  return result.data as T;
}

export default function AdminSettingsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [adminId, setAdminId] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [notificationError, setNotificationError] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffDrafts, setStaffDrafts] = useState<Record<string, StaffDraft>>({});
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [staffForm, setStaffForm] = useState<StaffForm>(EMPTY_STAFF_FORM);

  const loadRestaurants = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const [restaurantsResponse, adminResponse] = await Promise.all([
        fetch("/api/admin/restaurants", { cache: "no-store" }),
        fetch("/api/admin/auth/me", { cache: "no-store" }),
      ]);
      const [data, profile] = await Promise.all([
        readResponse<Restaurant[]>(restaurantsResponse),
        readResponse<{ admin: { id: string; role: string } }>(adminResponse),
      ]);
      setRestaurants((current) => data.map((restaurant) => {
        const existing = current.find((item) => item._id === restaurant._id);
        return existing && JSON.stringify(existing) === JSON.stringify(restaurant) ? existing : restaurant;
      }));
      setAdminId(profile.admin.id);
      setAdminRole(profile.admin.role);
      setSelectedId((current) => data.some((restaurant) => restaurant._id === current) ? current : data[0]?._id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load kitchen settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRestaurants();
  }, [loadRestaurants]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant._id === selectedId);

  useEffect(() => {
    setForm(selectedRestaurant ? getSettings(selectedRestaurant) : null);
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    setStaffForm((current) => current.assignedRestaurantId
      ? current
      : { ...current, assignedRestaurantId: selectedRestaurant._id });
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
    if (adminId) setNotificationsEnabled(getAdminOrderNotificationsEnabled(adminId));
  }, [adminId]);

  const loadStaff = useCallback(async (background = false) => {
    if (!background) setStaffLoading(true);
    setStaffError("");
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      const data = await readResponse<StaffMember[]>(response);
      setStaff(data);
      setStaffDrafts(Object.fromEntries(data.map((member) => [
        member._id,
        {
          role: STAFF_ROLES.find((role) => role.value === member.role)?.value || "order_manager",
          assignedRestaurantId: typeof member.assignedRestaurantId === "string"
            ? member.assignedRestaurantId
            : member.assignedRestaurantId?._id || "",
          isActive: member.isActive,
        },
      ])));
    } catch (loadError) {
      setStaffError(loadError instanceof Error ? loadError.message : "Unable to load sub-admins.");
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminRole === "super_admin") void loadStaff();
  }, [adminRole, loadStaff]);

  useAdminAutoRefresh(async () => {
    const hasUnsavedSettings = Boolean(
      form &&
      selectedRestaurant &&
      JSON.stringify(form) !== JSON.stringify(getSettings(selectedRestaurant))
    );
    const hasUnsavedStaffDrafts = staff.some((member) => {
      const draft = staffDrafts[member._id];
      const assignedRestaurantId = typeof member.assignedRestaurantId === "string"
        ? member.assignedRestaurantId
        : member.assignedRestaurantId?._id || "";
      const role = STAFF_ROLES.find((entry) => entry.value === member.role)?.value || "order_manager";
      return !draft || draft.role !== role ||
        draft.assignedRestaurantId !== assignedRestaurantId ||
        draft.isActive !== member.isActive;
    });
    const initialStaffForm = {
      ...EMPTY_STAFF_FORM,
      assignedRestaurantId: selectedRestaurant?._id || "",
    };
    const hasUnsavedNewStaff = JSON.stringify(staffForm) !== JSON.stringify(initialStaffForm);

    if (saving || staffSaving || hasUnsavedSettings || hasUnsavedStaffDrafts || hasUnsavedNewStaff) return;
    await loadRestaurants(true);
    if (adminRole === "super_admin") await loadStaff(true);
  });

  function selectRestaurant(id: string) {
    const restaurant = restaurants.find((entry) => entry._id === id);
    setSelectedId(id);
    setForm(restaurant ? getSettings(restaurant) : null);
    setSaved(false);
    setError("");
  }

  function updateForm<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRestaurant || !form) return;

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/admin/restaurants/${selectedRestaurant._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updatedRestaurant = await readResponse<Restaurant>(response);
      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant._id === updatedRestaurant._id ? updatedRestaurant : restaurant,
        ),
      );
      setForm(getSettings(updatedRestaurant));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save kitchen settings.");
    } finally {
      setSaving(false);
    }
  }

  async function enableOrderNotifications() {
    setNotificationError("");
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setNotificationError("This browser does not support desktop notifications.");
      return;
    }
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setAdminOrderNotificationsEnabled(adminId, false);
        setNotificationsEnabled(false);
        setNotificationError(permission === "denied"
          ? "Notifications are blocked in your browser. Enable them in browser site settings."
          : "Browser notification permission was not granted.");
        return;
      }
      setAdminOrderNotificationsEnabled(adminId, true);
      setNotificationsEnabled(true);
      new Notification("Order notifications enabled", {
        body: "You will be notified when a new order arrives while the admin panel is open.",
      });
    } catch (notificationSetupError) {
      setNotificationError(notificationSetupError instanceof Error
        ? notificationSetupError.message
        : "Unable to enable browser notifications.");
    }
  }

  async function saveStaff(memberId: string) {
    const draft = staffDrafts[memberId];
    if (!draft) return;
    setStaffSaving(true);
    setStaffError("");
    setStaffMessage("");
    try {
      const response = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: memberId,
          role: draft.role,
          assignedRestaurantId: draft.assignedRestaurantId || null,
          isActive: draft.isActive,
        }),
      });
      await readResponse<StaffMember>(response);
      setStaffMessage("Sub-admin access updated.");
      await loadStaff();
    } catch (saveError) {
      setStaffError(saveError instanceof Error ? saveError.message : "Unable to update sub-admin.");
    } finally {
      setStaffSaving(false);
    }
  }

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffSaving(true);
    setStaffError("");
    setStaffMessage("");
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      await readResponse<StaffMember>(response);
      setStaffForm({ ...EMPTY_STAFF_FORM, assignedRestaurantId: selectedRestaurant?._id || "" });
      setStaffMessage("Sub-admin created and can now sign in.");
      await loadStaff();
    } catch (createError) {
      setStaffError(createError instanceof Error ? createError.message : "Unable to create sub-admin.");
    } finally {
      setStaffSaving(false);
    }
  }

  return (
    <main className="min-h-full px-3 py-5 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-success-700">Admin controls</p>
            <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-[#122033]">Settings</h1>
            <p className="mt-1 text-sm text-charcoal-600">Manage kitchen availability and customer-facing details.</p>
          </div>
          {restaurants.length > 1 && (
            <label className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm">
              <Store className="h-4 w-4 text-success-700" />
              <span className="sr-only">Select kitchen</span>
              <select
                aria-label="Select kitchen"
                value={selectedId}
                onChange={(event) => selectRestaurant(event.target.value)}
                className="max-w-48 bg-transparent outline-none"
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
                ))}
              </select>
            </label>
          )}
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            {!restaurants.length && (
              <button type="button" onClick={() => void loadRestaurants()} className="font-bold underline">
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && adminRole === "super_admin" && (
          <CreateRestaurantForm
            existingSlugs={restaurants.map((restaurant) => restaurant.slug)}
            onCreated={(restaurant) => {
              setRestaurants((current) => [...current, restaurant].sort((a, b) => a.name.localeCompare(b.name)));
              setSelectedId(restaurant._id);
              setForm(getSettings(restaurant));
              setSaved(false);
            }}
          />
        )}

        <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f4e4] text-success-700">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-extrabold text-[#152033]">New order notifications</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-charcoal-600">
                  Get a browser alert when a new order arrives. Notifications work while you are signed in with the admin panel open.
                </p>
                <p className="mt-1 text-[11px] font-semibold text-charcoal-500">
                  {notificationPermission === "granted" ? "Browser permission granted" :
                    notificationPermission === "denied" ? "Blocked by browser settings" :
                      notificationPermission === "unsupported" ? "Browser notifications unavailable" :
                        "Permission not enabled"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (notificationsEnabled) {
                  setAdminOrderNotificationsEnabled(adminId, false);
                  setNotificationsEnabled(false);
                  setNotificationError("");
                } else {
                  void enableOrderNotifications();
                }
              }}
              disabled={!adminId || notificationPermission === "unsupported"}
              className={`min-h-10 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${notificationsEnabled ? "border border-cream-300 bg-white text-charcoal-700 hover:bg-cream-50" : "bg-success-700 text-white hover:bg-success-800"}`}
            >
              {notificationsEnabled ? "Turn off" : "Enable notifications"}
            </button>
          </div>
          {notificationError && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{notificationError}</p>}
        </section>

        {loading ? (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-cream-200 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-charcoal-600">
              <LoaderCircle className="h-4 w-4 animate-spin text-success-700" /> Loading settings…
            </div>
          </div>
        ) : !restaurants.length ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-8 text-center">
            <Store className="mx-auto h-8 w-8 text-charcoal-400" />
            <h2 className="mt-3 font-bold text-charcoal-900">No kitchens available</h2>
            <p className="mt-1 text-sm text-charcoal-600">
              {adminRole === "super_admin"
                ? "Create a restaurant above, then add its categories and menu items in Menu Management."
                : "There are no kitchens assigned to this admin account."}
            </p>
          </div>
        ) : form && selectedRestaurant ? (
          <form onSubmit={saveSettings} className="space-y-4">
            <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-100 pb-4">
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#152033]">Kitchen availability</h2>
                  <p className="mt-1 text-xs text-charcoal-600">Control whether customers can place orders.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream-50 px-3 py-2">
                  <span className={`text-xs font-extrabold ${form.isOpen ? "text-success-700" : "text-charcoal-600"}`}>
                    {form.isOpen ? "Accepting orders" : "Not accepting orders"}
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isOpen}
                    onChange={(event) => updateForm("isOpen", event.target.checked)}
                    className="peer sr-only"
                  />
                  <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-charcoal-300 transition peer-checked:bg-success-700 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-charcoal-800">
                  <span className="mb-1.5 flex items-center gap-2"><Clock3 className="h-4 w-4 text-success-700" /> Opening hours</span>
                  <input
                    required
                    maxLength={100}
                    value={form.openingHours}
                    onChange={(event) => updateForm("openingHours", event.target.value)}
                    placeholder="10:00 AM - 11:30 PM"
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-success-600 focus:ring-2 focus:ring-success-100"
                  />
                </label>
                <label className="block text-sm font-semibold text-charcoal-800">
                  <span className="mb-1.5 flex items-center gap-2"><Truck className="h-4 w-4 text-success-700" /> Estimated delivery time</span>
                  <input
                    required
                    maxLength={50}
                    value={form.deliveryTime}
                    onChange={(event) => updateForm("deliveryTime", event.target.value)}
                    placeholder="25-35 min"
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-success-600 focus:ring-2 focus:ring-success-100"
                  />
                </label>
                <label className="block text-sm font-semibold text-charcoal-800">
                  <span className="mb-1.5 block">Minimum order amount (₹)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.minOrderAmount}
                    onChange={(event) => updateForm("minOrderAmount", Number(event.target.value))}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-success-600 focus:ring-2 focus:ring-success-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="border-b border-cream-100 pb-4">
                <h2 className="font-display text-base font-extrabold text-[#152033]">Customer-facing details</h2>
                <p className="mt-1 text-xs text-charcoal-600">Keep your contact information and active promotion up to date.</p>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-charcoal-800">
                  <span className="mb-1.5 flex items-center gap-2"><Phone className="h-4 w-4 text-success-700" /> Contact phone</span>
                  <input
                    required
                    type="tel"
                    minLength={10}
                    maxLength={15}
                    value={form.contactPhone}
                    onChange={(event) => updateForm("contactPhone", event.target.value)}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-success-600 focus:ring-2 focus:ring-success-100 sm:max-w-md"
                  />
                </label>
                <label className="block text-sm font-semibold text-charcoal-800">
                  <span className="mb-1.5 block">Homepage banner message <span className="font-normal text-charcoal-500">(optional)</span></span>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={form.bannerText || ""}
                    onChange={(event) => updateForm("bannerText", event.target.value)}
                    placeholder="Share a short update or promotion with customers"
                    className="w-full resize-y rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-success-600 focus:ring-2 focus:ring-success-100"
                  />
                  <span className="mt-1 block text-right text-[11px] font-normal text-charcoal-500">{(form.bannerText || "").length}/200</span>
                </label>
              </div>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:px-6">
              <div className="flex min-w-0 items-start gap-2 text-xs text-charcoal-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-success-700" />
                <span className="truncate">
                  {[selectedRestaurant.address?.street, selectedRestaurant.address?.city, selectedRestaurant.address?.state, selectedRestaurant.address?.pincode]
                    .filter(Boolean)
                    .join(", ") || selectedRestaurant.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {saved && <span role="status" className="flex items-center gap-1 text-xs font-bold text-success-700"><Check className="h-4 w-4" /> Saved</span>}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-success-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-success-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </div>
            </section>
          </form>
        ) : null}

        {!loading && adminRole === "super_admin" && (
          <section className="space-y-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 border-b border-cream-100 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f4e4] text-success-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-extrabold text-[#152033]">Sub-admin management</h2>
                <p className="mt-1 text-xs text-charcoal-600">Create team access, assign a kitchen and manage roles.</p>
              </div>
            </div>

            {staffError && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>{staffError}</span>
                <button type="button" onClick={() => void loadStaff()} className="shrink-0 font-bold underline">Retry</button>
              </div>
            )}
            {staffMessage && <p role="status" className="text-xs font-bold text-success-700">{staffMessage}</p>}

            <form onSubmit={createStaff} className="grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-charcoal-700">
                Full name
                <input required minLength={2} maxLength={60} value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600" />
              </label>
              <label className="text-xs font-semibold text-charcoal-700">
                Email
                <input required type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600" />
              </label>
              <label className="text-xs font-semibold text-charcoal-700">
                Mobile number
                <input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600" />
              </label>
              <label className="text-xs font-semibold text-charcoal-700">
                Initial password
                <input required type="password" minLength={8} autoComplete="new-password" value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600" />
              </label>
              <label className="text-xs font-semibold text-charcoal-700">
                Role
                <select required value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value as StaffRole })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600">
                  {STAFF_ROLES.filter((role) => role.value !== "delivery_personnel").map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-charcoal-700">
                Assigned kitchen
                <select required value={staffForm.assignedRestaurantId} onChange={(event) => setStaffForm({ ...staffForm, assignedRestaurantId: event.target.value })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-success-600">
                  <option value="" disabled>Select a kitchen</option>
                  {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                </select>
              </label>
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={staffSaving || !restaurants.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-success-700 px-4 text-sm font-bold text-white hover:bg-success-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {staffSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create sub-admin
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-charcoal-900">Team access</h3>
              {staffLoading ? (
                <p className="flex items-center gap-2 py-4 text-xs text-charcoal-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading team…</p>
              ) : staff.filter((member) => member.role !== "super_admin").length ? (
                staff.filter((member) => member.role !== "super_admin").map((member) => {
                  const draft = staffDrafts[member._id];
                  if (!draft) return null;
                  return (
                    <article key={member._id} className="grid gap-3 rounded-xl border border-cream-200 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-charcoal-900">{member.name}</p>
                        <p className="truncate text-xs text-charcoal-600">{member.email} · {member.phone}</p>
                      </div>
                      <label className="text-[11px] font-semibold text-charcoal-600">
                        Role
                        <select value={draft.role} onChange={(event) => setStaffDrafts({ ...staffDrafts, [member._id]: { ...draft, role: event.target.value as StaffRole } })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-2 py-2 text-xs text-charcoal-800">
                          {STAFF_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-charcoal-600">
                        Kitchen
                        <select value={draft.assignedRestaurantId} onChange={(event) => setStaffDrafts({ ...staffDrafts, [member._id]: { ...draft, assignedRestaurantId: event.target.value } })} className="mt-1 block w-full rounded-lg border border-cream-300 bg-white px-2 py-2 text-xs text-charcoal-800">
                          <option value="">Unassigned</option>
                          {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                        </select>
                      </label>
                      <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-700">
                          <input type="checkbox" checked={draft.isActive} onChange={(event) => setStaffDrafts({ ...staffDrafts, [member._id]: { ...draft, isActive: event.target.checked } })} className="h-4 w-4 accent-[#168344]" />
                          {draft.isActive ? "Active" : "Inactive"}
                        </label>
                        <button type="button" onClick={() => void saveStaff(member._id)} disabled={staffSaving} className="min-h-9 rounded-lg border border-cream-300 px-3 text-xs font-bold text-charcoal-800 hover:bg-cream-50 disabled:opacity-60">
                          Save
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-xl bg-cream-50 px-3 py-4 text-center text-xs text-charcoal-600">No sub-admins yet. Create one above to delegate admin access.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
