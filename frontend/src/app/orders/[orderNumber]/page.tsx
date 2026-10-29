"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  MapPin,
  Phone,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { formatCurrency } from "@/lib/utils";

interface OrderData {
  _id: string;
  orderNumber: string;
  restaurantId: string;
  restaurantSlug: "veg" | "non-veg";
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  items: {
    name: string;
    price: number;
    quantity: number;
    isVeg: boolean;
    variant?: { name: string; price: number };
    addons?: { name: string; price: number }[];
    itemTotalPrice: number;
  }[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  paymentMethod: "cod" | "razorpay";
  paymentStatus: string;
  orderStatus:
    | "placed"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  deliveryNotes?: string;
  placedAt: string;
}

interface RestaurantData {
  name: string;
  slug: string;
  contactPhone: string;
  address: { street: string; city: string };
  heroImage: string;
  accentColor: string;
}

const STATUS_STEPS = [
  { key: "placed", label: "Order Placed", icon: CheckCircle2, description: "Received by restaurant" },
  { key: "confirmed", label: "Confirmed", icon: Clock, description: "Kitchen verified your order" },
  { key: "preparing", label: "Preparing", icon: ChefHat, description: "Freshly cooking your meal" },
  { key: "out_for_delivery", label: "On the Way", icon: Bike, description: "Rider dispatched" },
  { key: "delivered", label: "Delivered", icon: PackageCheck, description: "Enjoy your food!" },
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = (params?.orderNumber as string) || "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderNumber}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Order not found");
          return;
        }

        setOrder(data.data.order);
        setRestaurant(data.data.restaurant);
      } catch {
        setError("Network error loading order status");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();

    // Poll status every 15 seconds
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [orderNumber]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-charcoal-600 font-semibold">
          Fetching live order details...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display font-bold text-xl text-charcoal-900 mb-2">
          Unable to locate order
        </h1>
        <p className="text-xs text-charcoal-500 max-w-sm mb-6">
          {error || `No order found with reference ${orderNumber}. Please check your order reference.`}
        </p>
        <Link href="/">
          <Button variant="primary" size="md">
            Go to Homepage
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate current active step index
  const statusRank: Record<string, number> = {
    placed: 0,
    confirmed: 1,
    preparing: 2,
    ready_for_pickup: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: -1,
  };

  const currentRank = statusRank[order.orderStatus] ?? 0;

  return (
    <div className="bg-cream-100/50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Success Banner */}
        <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft text-center sm:text-left sm:flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400">
                Order Received
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-charcoal-900 font-display">
                {order.orderNumber}
              </h1>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Placed on {new Date(order.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="flex items-center gap-2">
              <RestaurantBadge type={order.restaurantSlug} size="sm" />
              <span className="text-xs font-bold text-charcoal-800">
                {restaurant?.name || "Dual Kitchens"}
              </span>
            </div>
            <span className="text-xs font-semibold text-charcoal-500">
              Estimated Delivery: <strong>25-35 mins</strong>
            </span>
          </div>
        </div>

        {/* Live Stepper Tracker */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft">
          <h2 className="text-base font-bold text-charcoal-900 font-display mb-6">
            Live Order Status
          </h2>

          <div className="relative">
            {/* Timeline Bar */}
            <div className="hidden sm:block absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-cream-200 -z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentRank;
                const isCurrent = index === currentRank;

                return (
                  <div
                    key={step.key}
                    className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center"
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-primary-500 text-white shadow-soft scale-110 ring-4 ring-primary-100"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-cream-100 text-charcoal-400 border border-cream-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? "text-primary-700 font-extrabold"
                            : isCompleted
                            ? "text-charcoal-900"
                            : "text-charcoal-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-charcoal-500 hidden sm:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details & Receipt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Items & Receipt */}
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
            <h3 className="text-sm font-bold text-charcoal-900 font-display mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-500" /> Items Ordered
            </h3>

            <div className="divide-y divide-cream-100 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <RestaurantBadge type={item.isVeg ? "veg" : "non-veg"} size="sm" showLabel={false} />
                      <span className="font-bold text-charcoal-900">{item.name}</span>
                      <span className="text-charcoal-500 font-semibold">×{item.quantity}</span>
                    </div>
                    {item.variant && (
                      <p className="text-[11px] text-charcoal-500 ml-4">
                        Portion: {item.variant.name}
                      </p>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <p className="text-[11px] text-charcoal-400 ml-4">
                        +{item.addons.map((a) => a.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-charcoal-900">
                    {formatCurrency(item.itemTotalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill breakdown */}
            <div className="space-y-1.5 text-xs text-charcoal-600 pt-3 border-t border-cream-200">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-semibold text-charcoal-900">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({order.couponCode})</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold text-charcoal-900">
                  {order.deliveryFee === 0 ? "FREE" : formatCurrency(order.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-semibold text-charcoal-900">{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-charcoal-900 pt-3 border-t border-cream-200">
                <span>Total Paid / Payable</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="pt-2 flex justify-between text-[11px] text-charcoal-500">
                <span>Payment Mode</span>
                <span className="uppercase font-bold text-charcoal-800">
                  {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery & Customer Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-soft">
              <h3 className="text-sm font-bold text-charcoal-900 font-display mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-500" /> Delivery Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-charcoal-400 block text-[10px] font-bold uppercase tracking-wider">
                    Recipient
                  </span>
                  <p className="font-bold text-charcoal-900 mt-0.5">
                    {order.customerName} (+91 {order.customerPhone})
                  </p>
                </div>

                <div>
                  <span className="text-charcoal-400 block text-[10px] font-bold uppercase tracking-wider">
                    Address
                  </span>
                  <p className="text-charcoal-700 mt-0.5 leading-relaxed">
                    {order.deliveryAddress.street}, {order.deliveryAddress.city},{" "}
                    {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                    {order.deliveryAddress.landmark && ` (Near ${order.deliveryAddress.landmark})`}
                  </p>
                </div>

                {order.deliveryNotes && (
                  <div>
                    <span className="text-charcoal-400 block text-[10px] font-bold uppercase tracking-wider">
                      Instructions
                    </span>
                    <p className="text-charcoal-700 italic mt-0.5">
                      &quot;{order.deliveryNotes}&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Link href={order.restaurantSlug === "veg" ? "/restaurants/veg" : "/restaurants/non-veg"}>
                <Button variant="outline" size="md" fullWidth className="font-bold">
                  Order More from {restaurant?.name || "Kitchen"}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="md" fullWidth className="text-xs text-charcoal-600">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

