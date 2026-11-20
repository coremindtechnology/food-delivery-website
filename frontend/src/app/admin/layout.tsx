"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu as MenuIcon,
  Settings,
  ShoppingBasket,
  Tag,
  UsersRound,
  X,
  ChartNoAxesColumnIncreasing,
  CreditCard,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { AdminOrderNotifications } from "@/components/admin/AdminOrderNotifications";

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AdminNotificationOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  totalAmount: number;
  placedAt: string;
  restaurantId?: string | { name: string };
};

const ADMIN_SECTIONS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", Icon: ClipboardList },
  { href: "/admin/bulk-orders", label: "Bulk Orders", Icon: ClipboardList },
  { href: "/admin/menu", label: "Menu Management", Icon: ShoppingBasket, expandable: true },
  { href: "/admin/customers", label: "Customers", Icon: UsersRound },
  { href: "/admin/offers", label: "Offers & Coupons", Icon: Tag },
  { href: "/admin/finance", label: "Reports & Analytics", Icon: ChartNoAxesColumnIncreasing, expandable: true },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

const ADMIN_TOOLS = [
  { href: "/admin/payments", label: "Payments", Icon: CreditCard },
  { href: "/admin/delivery", label: "Delivery", Icon: Truck },
];

function KitchenIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 100" fill="none" className="h-auto w-full">
      <path d="M5 88h170" stroke="#61a736" strokeWidth="2" />
      <path d="M30 48h78v40H30z" fill="#064832" stroke="#74bd45" strokeWidth="2" />
      <path d="m23 49 14-22h64l14 22H23Z" fill="#0b6841" stroke="#8acb4b" strokeWidth="2" />
      <path d="M28 48c0 9 13 9 13 0 0 9 13 9 13 0 0 9 13 9 13 0 0 9 13 9 13 0 0 9 13 9 13 0 0 9 13 9 13 0" fill="#a5d752" stroke="#d4f09c" strokeWidth="1.5" />
      <path d="M42 60h22v28H42zM75 59h23v29H75z" fill="#0d5037" stroke="#75b644" strokeWidth="1.5" />
      <path d="M48 66h10m-10 7h10m23-8h14m-14 7h14" stroke="#8bc84c" strokeWidth="1.5" />
      <path d="M128 69c5-14 15-17 20-7 6-14 17-11 20 2" stroke="#72bd43" strokeWidth="2" strokeLinecap="round" />
      <path d="M137 71v17m13-20v20m14-13v13" stroke="#72bd43" strokeWidth="2" strokeLinecap="round" />
      <circle cx="135" cy="61" r="8" fill="#83c74b" />
      <circle cx="151" cy="56" r="9" fill="#60ad3d" />
      <circle cx="167" cy="65" r="8" fill="#9ad354" />
      <path d="M13 85c3-10 7-10 10 0m-6-4v7" stroke="#82c84a" strokeWidth="2" strokeLinecap="round" />
      <path d="m145 26 3-5m6 8 5-4m-2 12 6 1" stroke="#8bc84c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(!isLoginPage);
  const [authError, setAuthError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationOrders, setNotificationOrders] = useState<AdminNotificationOrder[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const checkSession = useCallback(async () => {
    if (isLoginPage) {
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/auth/me");
      const result = await response.json();
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok || !result.success || !result.data?.admin) {
        throw new Error(result.error || "Unable to verify your admin session.");
      }
      setAdmin(result.data.admin);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to verify your admin session.");
    } finally {
      setAuthLoading(false);
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    setMobileNavOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await fetch("/api/admin/orders?status=new&limit=5", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || "Unable to load new order notifications.");
      }
      setNotificationOrders(result.data as AdminNotificationOrder[]);
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : "Unable to load new order notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to log out. Please try again.");
      }
      router.replace("/admin/login");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to log out.");
      setLoggingOut(false);
    }
  }

  if (isLoginPage) return <>{children}</>;

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f3]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-success-200 border-t-success-700" />
          <span className="text-sm font-semibold text-charcoal-700">Checking admin session…</span>
        </div>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#faf8f3] px-4 text-center">
        <p role="alert" className="max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {authError || "Admin session could not be verified."}
        </p>
        <button type="button" onClick={() => void checkSession()} className="rounded-lg bg-success-700 px-4 py-2 text-sm font-bold text-white hover:bg-success-800">
          Try again
        </button>
        <Link href="/admin/login" className="text-sm font-semibold text-success-800 underline">
          Go to admin login
        </Link>
      </main>
    );
  }

  const currentDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <div className="flex min-h-screen bg-[#faf8f3] text-charcoal-900">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col overflow-hidden bg-gradient-to-b from-[#063b2d] to-[#002c24] text-white shadow-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[66px] shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff7900] font-display text-sm font-black text-white">DK</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 font-display text-sm font-extrabold leading-tight">
              Dual Kitchens <Leaf className="h-3.5 w-3.5 fill-[#a6d64d] text-[#a6d64d]" />
            </span>
            <span className="block text-[9px] text-white/75">Admin Panel</span>
          </span>
          <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="rounded-md p-1 text-white/75 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {ADMIN_SECTIONS.map(({ href, label, Icon, expandable }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              const classes = `group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-semibold transition-colors ${active ? "bg-[#dff0d2] text-[#073d2c] shadow-sm" : "text-white/90 hover:bg-white/10"}`;
              const content = (
                <>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {expandable && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                </>
              );

              return (
                <Link key={label} href={href} aria-current={active ? "page" : undefined} className={classes}>
                  {content}
                </Link>
              );
            })}
          </div>
          <div className="my-4 border-t border-white/10" />
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Operations</p>
          <div className="space-y-1">
            {ADMIN_TOOLS.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-[12px] font-semibold transition-colors ${pathname.startsWith(href) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"}`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="relative shrink-0 px-3 pb-3 pt-1">
          <div className="mb-1 opacity-90"><KitchenIllustration /></div>
          <p className="text-center text-[9px] font-medium text-white/65">Fresh food · Happy customers</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-[#eee9e2] bg-white/95 px-3 shadow-[0_1px_5px_rgba(25,35,20,0.04)] backdrop-blur sm:px-5 lg:px-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open admin navigation" className="rounded-lg p-2 text-charcoal-700 hover:bg-cream-100 lg:hidden">
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-charcoal-500 sm:flex">
              <CookingPot className="h-4 w-4 text-success-700" />
              <span>Admin Portal</span>
              <span>/</span>
              <span className="font-bold capitalize text-charcoal-900">{pathname === "/admin" ? "Dashboard" : pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-cream-200 bg-white px-3 py-2 text-[10px] font-semibold text-charcoal-700 sm:flex">
              <span className="h-2 w-2 rounded-full bg-success-600" />
              {currentDate}
              <ChevronDown className="h-3 w-3 text-charcoal-400" />
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                aria-controls="admin-notifications-panel"
                title="Notifications"
                onClick={() => {
                  const open = !notificationsOpen;
                  setNotificationsOpen(open);
                  if (open) void loadNotifications();
                }}
                className="relative rounded-lg p-2 text-charcoal-600 hover:bg-cream-100"
              >
                <Bell className="h-[18px] w-[18px]" />
                {notificationOrders.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-red-500" />
                )}
              </button>
              {notificationsOpen && (
                <section
                  id="admin-notifications-panel"
                  aria-label="New order notifications"
                  className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-cream-200 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-cream-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-charcoal-900">Notifications</h2>
                      <p className="text-[10px] text-charcoal-500">New orders</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-charcoal-600 hover:bg-cream-100"
                    >
                      Close
                    </button>
                  </div>
                  {notificationsLoading ? (
                    <p className="px-4 py-6 text-center text-xs text-charcoal-500">Loading notifications…</p>
                  ) : notificationsError ? (
                    <div role="alert" className="space-y-2 px-4 py-4 text-xs text-red-700">
                      <p>{notificationsError}</p>
                      <button type="button" onClick={() => void loadNotifications()} className="font-bold underline">Retry</button>
                    </div>
                  ) : notificationOrders.length ? (
                    <ul className="max-h-80 divide-y divide-cream-100 overflow-y-auto">
                      {notificationOrders.map((order) => (
                        <li key={order._id}>
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              router.push("/admin/orders");
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-cream-50"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-charcoal-900">New order #{order.orderNumber}</span>
                              <span className="shrink-0 text-[10px] font-bold text-success-700">₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</span>
                            </span>
                            <span className="mt-1 block truncate text-[10px] text-charcoal-600">{order.customerName || "Customer"}</span>
                            <span className="mt-1 block text-[9px] text-charcoal-500">
                              {new Intl.DateTimeFormat("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Asia/Kolkata",
                              }).format(new Date(order.placedAt))}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-charcoal-500">No new orders.</p>
                  )}
                  <Link
                    href="/admin/orders"
                    onClick={() => setNotificationsOpen(false)}
                    className="block border-t border-cream-100 px-4 py-3 text-center text-xs font-bold text-success-700 hover:bg-cream-50"
                  >
                    View all orders
                  </Link>
                </section>
              )}
            </div>
            <div className="hidden h-7 border-l border-cream-200 sm:block" />
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7900] text-[10px] font-black text-white">
                {admin.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-[140px] truncate text-[11px] font-extrabold leading-tight text-charcoal-900">{admin.name}</span>
                <span className="block text-[9px] capitalize text-charcoal-500">{admin.role.replaceAll("_", " ")}</span>
              </span>
            </div>
            <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-charcoal-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        {authError && (
          <p role="alert" className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 sm:mx-6">
            {authError}
          </p>
        )}
        <div className="min-w-0 flex-1">
          <AdminOrderNotifications role={admin.role} adminId={admin.id} />
          {children}
        </div>
      </div>
    </div>
  );
}
