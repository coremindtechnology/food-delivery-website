"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Search,
  Check,
  Bike,
  Truck,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  AlertCircle,
  Copy,
  CheckCheck,
  ArrowRight,
  ShoppingBag,
  ChefHat,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  isVeg?: boolean;
}

interface TrackedOrder {
  orderId: string;
  placedAt: string;
  kitchen: string;
  kitchenSlug: "veg" | "non-veg" | string;
  orderType: string;
  status: string;
  statusLabel: string;
  currentStepIndex: number; // 0 to 4
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  totalPaid: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress?: {
    street?: string;
    city?: string;
    pincode?: string;
    landmark?: string;
  };
  restaurantPhone?: string;
}

export default function TrackOrderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#0b512a] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TrackOrderContent />
    </React.Suspense>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("orderId") || searchParams.get("id") || "";

  const { customer, isAuthenticated, openAuthModal } = useAuth();

  const [searchQuery, setSearchQuery] = useState(initialId);
  const [activeOrder, setActiveOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);

  // If user is authenticated and has no active search, fetch their recent orders to easily pick one
  useEffect(() => {
    if (isAuthenticated && !initialId) {
      fetchCustomerRecentOrders();
    }
  }, [isAuthenticated, initialId]);

  // If initial order ID in query param, track it immediately
  useEffect(() => {
    if (initialId) {
      trackOrderById(initialId);
    }
  }, [initialId]);

  const fetchCustomerRecentOrders = async () => {
    setIsRecentLoading(true);
    try {
      const res = await fetch("/api/orders?limit=5");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setRecentOrders(data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsRecentLoading(false);
    }
  };

  const trackOrderById = async (orderIdToSearch: string) => {
    const id = orderIdToSearch.trim().toUpperCase();
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.data?.order) {
        setError(data.error || `No order found with reference ID "${id}". Please verify and try again.`);
        setActiveOrder(null);
        return;
      }

      const order = data.data.order;
      const restaurant = data.data.restaurant;

      // Status mapping to steps (0: Placed, 1: Confirmed, 2: Preparing, 3: Out for Delivery, 4: Delivered)
      const statusMap: Record<string, { step: number; label: string }> = {
        pending_payment: { step: 0, label: "Payment Pending" },
        new: { step: 0, label: "Order Placed" },
        placed: { step: 0, label: "Order Placed" },
        accepted: { step: 1, label: "Confirmed" },
        confirmed: { step: 1, label: "Confirmed" },
        preparing: { step: 2, label: "Preparing" },
        ready: { step: 2, label: "Ready" },
        dispatched: { step: 3, label: "On the Way" },
        out_for_delivery: { step: 3, label: "On the Way" },
        delivered: { step: 4, label: "Delivered" },
        cancelled: { step: -1, label: "Cancelled" },
        rejected: { step: -1, label: "Declined" },
      };

      const mapped = statusMap[order.orderStatus] || { step: 0, label: order.orderStatus || "Processing" };

      const formattedPlacedAt = new Date(order.placedAt || order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setActiveOrder({
        orderId: order.orderNumber,
        placedAt: formattedPlacedAt,
        kitchen: restaurant?.name || (order.restaurantSlug === "veg" ? "Pure Veg Kitchen" : "Non-Veg Grill & Curries"),
        kitchenSlug: order.restaurantSlug || "non-veg",
        orderType: order.fulfillmentType === "takeaway" ? "Takeaway" : "Delivery",
        status: order.orderStatus,
        statusLabel: mapped.label,
        currentStepIndex: mapped.step,
        items: (order.items || []).map((it: any) => ({
          name: it.name,
          quantity: it.quantity || 1,
          price: it.price || 0,
          isVeg: it.isVeg,
        })),
        subtotal: order.subtotal || order.totalAmount,
        deliveryCharge: order.deliveryFee || 0,
        discountAmount: order.discountAmount || 0,
        totalPaid: order.totalAmount,
        paymentMethod: order.paymentMethod?.toUpperCase() || "COD",
        paymentStatus: order.paymentStatus || "pending",
        deliveryAddress: order.deliveryAddress,
        restaurantPhone: restaurant?.phone || restaurant?.contactPhone || "+919876543210",
      });
    } catch {
      setError("Failed to connect to order tracking service. Please try again in a few moments.");
      setActiveOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    trackOrderById(searchQuery);
  };

  const handleCopyOrderId = () => {
    if (!activeOrder?.orderId) return;
    navigator.clipboard.writeText(activeOrder.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TIMELINE_STEPS = [
    { id: "placed", title: "Order Placed", desc: "Order received" },
    { id: "confirmed", title: "Confirmed", desc: "Kitchen verified" },
    { id: "preparing", title: "Preparing", desc: "Freshly cooking" },
    { id: "out_for_delivery", title: "Out for Delivery", desc: "Rider on the way" },
    { id: "delivered", title: "Delivered", desc: "Enjoy your food" },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1f1d1a] pb-16">
      {/* ========================================================
          HERO BANNER (Deep Forest Green)
      ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#062414] via-[#0a351f] to-[#072515] py-8 sm:py-12 md:py-14 text-white">
        {/* Subtle radial ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />

        {/* Floating Mint Leaves decoration */}
        <div className="absolute top-4 left-[22%] w-7 h-7 opacity-80 pointer-events-none hidden md:block">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full rotate-45 drop-shadow-md">
            <path d="M 12 88 C 12 88 15 50 48 24 C 68 8 86 10 92 12 C 94 20 94 40 76 65 C 54 94 12 88 12 88 Z" fill="#4ade80" />
            <path d="M 12 88 C 30 70 52 48 88 14" stroke="#166534" strokeWidth="4" />
          </svg>
        </div>
        <div className="absolute bottom-5 right-[24%] w-6 h-6 opacity-75 pointer-events-none hidden md:block">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full -rotate-12 drop-shadow-md">
            <path d="M 12 88 C 12 88 15 50 48 24 C 68 8 86 10 92 12 C 94 20 94 40 76 65 C 54 94 12 88 12 88 Z" fill="#34d399" />
          </svg>
        </div>

        {/* Left Food Dish: Paneer Curry Bowl */}
        <div className="absolute -left-10 sm:-left-4 md:left-0 top-1/2 -translate-y-1/2 w-40 sm:w-52 md:w-64 lg:w-72 aspect-[4/3] pointer-events-none select-none z-0">
          <Image
            src="/tracking/hero-paneer.png"
            alt="Delicious Shahi Paneer Gravy"
            fill
            className="object-contain object-left drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
            priority
          />
        </div>

        {/* Right Food Dish: Tandoori Chicken Grill Pan */}
        <div className="absolute -right-10 sm:-right-4 md:right-0 top-1/2 -translate-y-1/2 w-40 sm:w-52 md:w-64 lg:w-72 aspect-[4/3] pointer-events-none select-none z-0">
          <Image
            src="/tracking/hero-chicken.png"
            alt="Tandoori Grilled Chicken with Onions and Lemon"
            fill
            className="object-contain object-right drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
            priority
          />
        </div>

        {/* Center Content: Title, Subtitle, Search Capsule */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-[42px] font-bold tracking-tight text-white">
            Track Your Order
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100/90 font-normal max-w-md mx-auto">
            Get real-time updates on your food order from Dual Kitchens.
          </p>

          {/* Search Box Pill */}
          <form onSubmit={handleSearchSubmit} className="mt-6 sm:mt-7 max-w-[540px] mx-auto">
            <div className="relative flex items-center bg-white rounded-full p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-emerald-900/30">
              <div className="pl-4 pr-2 text-neutral-400 flex items-center justify-center">
                <Package className="w-5 h-5 text-neutral-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Order ID (e.g. ORD-20250126-ABC123)"
                className="w-full bg-transparent text-sm sm:text-base font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none px-2"
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="flex items-center gap-2 bg-[#0b512a] hover:bg-[#084020] disabled:opacity-60 text-white px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{isLoading ? "Tracking..." : "Track Order"}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 inline-flex items-center gap-2 bg-red-950/80 border border-red-500/50 text-red-200 text-xs sm:text-sm px-4 py-2 rounded-full shadow-lg max-w-lg mx-auto text-left">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          MAIN BODY
      ======================================================== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-3 md:-mt-4 relative z-20 space-y-6">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-sm p-12 text-center">
            <div className="w-10 h-10 border-4 border-[#0b512a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-800">Fetching live order status...</p>
            <p className="text-xs text-neutral-500 mt-1">Checking kitchen preparation & delivery updates</p>
          </div>
        )}

        {/* ========================================================
            CASE A: ACTIVE ORDER FOUND & LOADED (REAL DATA)
        ======================================================== */}
        {!isLoading && activeOrder && (
          <>
            {/* Top Card: Order Info & Status Stepper */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 md:p-8 animate-fade-in">
              {/* Top Metadata Row with Dividers */}
              <div className="flex flex-wrap items-center justify-between gap-y-4 pb-6 border-b border-[#f1ede8]">
                {/* Left: Order ID & Placed time */}
                <div className="flex items-center gap-3 pr-4 sm:border-r border-[#ece7e1]">
                  <div className="w-9 h-9 rounded-xl border border-neutral-200 bg-[#fbfaf8] flex items-center justify-center text-neutral-700">
                    <Package className="w-5 h-5 text-neutral-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        Order ID: <span className="font-extrabold">{activeOrder.orderId}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyOrderId}
                        title="Copy Order ID"
                        className="text-neutral-400 hover:text-neutral-700 transition-colors"
                      >
                        {copied ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-500 mt-0.5">
                      Placed on: {activeOrder.placedAt}
                    </p>
                  </div>
                </div>

                {/* Middle Left: Kitchen */}
                <div className="flex items-center gap-2.5 px-0 sm:px-4 sm:border-r border-[#ece7e1]">
                  <span className="text-lg">
                    {activeOrder.kitchenSlug === "veg" ? "🥬" : "🍗"}
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-700 font-medium">
                    Kitchen: <span className="font-bold text-neutral-900">{activeOrder.kitchen}</span>
                  </p>
                </div>

                {/* Middle Right: Order Type */}
                <div className="flex items-center gap-2.5 px-0 sm:px-4 sm:border-r border-[#ece7e1]">
                  <Truck className="w-4 h-4 text-neutral-600" />
                  <p className="text-xs sm:text-sm text-neutral-700 font-medium">
                    Order Type: <span className="font-bold text-neutral-900">{activeOrder.orderType}</span>
                  </p>
                </div>

                {/* Far Right: Status Badge */}
                <div className="flex items-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full shadow-2xs border",
                      activeOrder.currentStepIndex === 4
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : activeOrder.currentStepIndex === 3
                        ? "bg-[#eaf7ee] text-[#15803d] border-[#c6edd0]"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    )}
                  >
                    <Bike className="w-4 h-4" />
                    <span>{activeOrder.statusLabel}</span>
                  </span>
                </div>
              </div>

              {/* Stepper / Timeline: 5 Milestones */}
              <div className="pt-8 pb-3 px-2 sm:px-6">
                <div className="relative">
                  {/* Connecting Background Line */}
                  <div className="absolute top-5 left-[5%] right-[5%] h-[3px] bg-[#e5e7eb] -z-0" />
                  {/* Dynamic Active Green Connecting Line */}
                  <div
                    className="absolute top-5 left-[5%] h-[3px] bg-[#168a48] -z-0 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(90, (activeOrder.currentStepIndex / (TIMELINE_STEPS.length - 1)) * 90)
                      )}%`,
                    }}
                  />

                  {/* 5 Step Icons and Labels */}
                  <div className="grid grid-cols-5 gap-2 relative z-10">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const isCompleted = idx < activeOrder.currentStepIndex;
                      const isCurrent = idx === activeOrder.currentStepIndex;

                      return (
                        <div key={step.id} className="flex flex-col items-center text-center">
                          {/* Step Circle */}
                          <div className="relative flex items-center justify-center">
                            {isCurrent ? (
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-[#168a48] border-[3px] border-white shadow-[0_0_0_4px_rgba(22,138,72,0.25)] flex items-center justify-center text-white transition-all scale-105">
                                  {idx === 3 ? (
                                    <Bike className="w-5 h-5 text-white" />
                                  ) : (
                                    <Check className="w-5 h-5 stroke-[2.5]" />
                                  )}
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                              </div>
                            ) : isCompleted ? (
                              <div className="w-10 h-10 rounded-full bg-[#168a48] border-2 border-white shadow-sm flex items-center justify-center text-white">
                                <Check className="w-5 h-5 stroke-[2.5]" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white border-2 border-[#d1d5db] flex items-center justify-center text-[#9ca3af]">
                                <Check className="w-4 h-4 stroke-[2]" />
                              </div>
                            )}
                          </div>

                          {/* Milestone Title */}
                          <div className="mt-3">
                            <p
                              className={cn(
                                "text-xs sm:text-sm font-bold tracking-tight",
                                isCurrent
                                  ? "text-neutral-900 font-extrabold"
                                  : isCompleted
                                  ? "text-neutral-900"
                                  : "text-neutral-500"
                              )}
                            >
                              {step.title}
                            </p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 whitespace-nowrap">
                              {isCurrent ? "Current" : isCompleted ? "Completed" : step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Map & Support */}
              <div className="lg:col-span-7 bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-4 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Live Delivery Route</span>
                    </h3>
                    <span className="text-xs text-neutral-500">
                      Destination: {activeOrder.deliveryAddress?.city || "Bhopal"}
                    </span>
                  </div>

                  {/* Stylized Map View */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-[#eef3ea] border border-[#e2e8de] shadow-inner">
                    <div className="relative w-full aspect-[16/7] min-h-[190px] sm:min-h-[220px]">
                      <Image
                        src="/tracking/tracking-map.png"
                        alt="Live Delivery Route Map"
                        fill
                        className="object-cover object-center select-none"
                        priority
                      />
                    </div>
                  </div>
                </div>

                {/* Restaurant Contact & Support Row */}
                <div className="mt-5 pt-4 border-t border-[#f1ede8] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-neutral-500 font-medium">Prepared & Dispatched By</p>
                      <p className="text-sm font-bold text-neutral-900">{activeOrder.kitchen}</p>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex items-center gap-2.5">
                    <a
                      href={`tel:${activeOrder.restaurantPhone}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5 text-neutral-700" />
                      <span>Call Support</span>
                    </a>
                    <a
                      href={`https://wa.me/${(activeOrder.restaurantPhone || "919876543210").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chat</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column: Real Order Summary */}
              <div className="lg:col-span-5 bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-neutral-900">Order Summary</h2>

                  {/* Kitchen Subhead */}
                  <div className="flex items-center justify-between mt-3 pb-3 border-b border-[#f1ede8] text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span>{activeOrder.kitchenSlug === "veg" ? "🥬" : "🍗"}</span>
                      <span className="font-bold text-neutral-900">{activeOrder.kitchen}</span>
                    </div>
                    <span className="text-neutral-500 font-medium">
                      {activeOrder.items.length} Items • ₹{activeOrder.totalPaid}
                    </span>
                  </div>

                  {/* Real Items List */}
                  <div className="divide-y divide-[#f7f5f2] py-2 max-h-[220px] overflow-y-auto">
                    {activeOrder.items.map((item, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              item.isVeg ? "bg-emerald-500" : "bg-red-500"
                            )}
                          />
                          <span className="font-medium text-neutral-800">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-neutral-700">
                          <span className="text-neutral-500 font-medium">x{item.quantity}</span>
                          <span className="font-semibold text-neutral-900 w-14 text-right">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="border-t border-[#f1ede8] pt-3 mt-1 space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-neutral-900">₹{activeOrder.subtotal}</span>
                    </div>
                    {Boolean(activeOrder.discountAmount && activeOrder.discountAmount > 0) && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span>Discount Applied</span>
                        <span className="font-semibold">-₹{activeOrder.discountAmount}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Delivery Charge</span>
                      <span className="font-semibold text-neutral-900">
                        {activeOrder.deliveryCharge === 0 ? "₹0 (Free)" : `₹${activeOrder.deliveryCharge}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Highlight */}
                <div className="mt-5 bg-[#eaf7ee] border border-[#d1edd7] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 block">Total Amount</span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Paid via {activeOrder.paymentMethod}
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-neutral-900">
                    ₹{activeOrder.totalPaid}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================
            CASE B: NO ACTIVE SEARCH (EMPTY STATE / PROMPT)
        ======================================================== */}
        {!isLoading && !activeOrder && (
          <div className="space-y-6">
            {/* If user has recent orders, list them so they can click and track */}
            {recentOrders.length > 0 && (
              <div className="bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">Your Recent Orders</h3>
                    <p className="text-xs text-neutral-500">Click on any order to view live tracking</p>
                  </div>
                  <Clock className="w-5 h-5 text-neutral-400" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentOrders.map((ord) => (
                    <button
                      key={ord._id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(ord.orderNumber);
                        trackOrderById(ord.orderNumber);
                      }}
                      className="text-left p-4 rounded-xl border border-neutral-200 bg-[#faf8f5] hover:bg-white hover:border-emerald-600 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-900 group-hover:text-emerald-700">
                          {ord.orderNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {ord.orderStatus}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {ord.items?.length || 1} items • ₹{ord.totalAmount}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-2">
                        <span>Track this order</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* General Empty Search State Prompt */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#ede9e3] shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
                <Package className="w-8 h-8 text-[#0b512a]" />
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-neutral-900 mb-2">
                Ready to Track Your Meal?
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto mb-6">
                Enter your Order Reference ID in the search box above to get live updates on kitchen preparation, dispatch status, and delivery.
              </p>

              {!isAuthenticated && (
                <div className="inline-flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="px-5 py-2.5 rounded-full bg-[#0b512a] hover:bg-[#084020] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
                  >
                    Sign In with Phone Number
                  </button>
                  <span className="text-xs text-neutral-400">to automatically view your active orders</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
