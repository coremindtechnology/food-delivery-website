"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Plus,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  FileText,
  Utensils,
  ChevronRight,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { formatCurrency } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    restaurant,
    totalItems,
    subtotal,
    deliveryFee,
    taxAmount,
    discountAmount,
    totalAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    isApplyingCoupon,
    couponError,
    clearCart,
  } = useCart();

  const {
    customer,
    isAuthenticated,
    isLoading: isAuthLoading,
    openAuthModal,
    addresses,
    addAddress,
  } = useAuth();

  // Checkout Form State
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "takeaway">("delivery");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Address Modal State
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    street: "",
    city: "Metro City",
    state: "Maharashtra",
    pincode: "400001",
    landmark: "",
    isDefault: true,
  });

  // Coupon input
  const [couponCodeInput, setCouponCodeInput] = useState("");

  // Select default address if available
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def._id);
    }
  }, [addresses, selectedAddressId]);

  // If cart is empty, show empty state
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center text-charcoal-400 mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-display font-extrabold text-2xl text-charcoal-900 mb-2">
          Your cart is empty
        </h1>
        <p className="text-sm text-charcoal-500 max-w-sm mb-6">
          You haven&apos;t added any items to your order yet. Explore our restaurant menus to pick your favourite dishes!
        </p>
        <div className="flex gap-4">
          <Link href="/restaurants/veg">
            <Button variant="veg" size="md">
              Browse Veg Menu
            </Button>
          </Link>
          <Link href="/restaurants/non-veg">
            <Button variant="nonveg" size="md">
              Browse Non-Veg Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const minOrder = restaurant?.minOrder || 199;
  const isMinOrderMet = subtotal >= minOrder;

  async function handleAddAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.street || !newAddress.pincode) return;

    const created = await addAddress(newAddress);
    if (created) {
      setSelectedAddressId(created._id);
      setIsAddAddressOpen(false);
      setNewAddress({
        label: "Home",
        street: "",
        city: "Metro City",
        state: "Maharashtra",
        pincode: "400001",
        landmark: "",
        isDefault: true,
      });
    }
  }

  async function handlePlaceOrder() {
    setErrorMessage(null);

    // 1. Auth check
    if (!isAuthenticated || !customer) {
      openAuthModal();
      return;
    }

    // 2. Minimum order check
    if (!isMinOrderMet) {
      setErrorMessage(`Minimum order for ${restaurant?.name} is ${formatCurrency(minOrder)}.`);
      return;
    }

    // 3. Address check for delivery
    let chosenAddress = null;
    if (fulfillmentType === "delivery") {
      const found = addresses.find((a) => a._id === selectedAddressId);
      if (!found) {
        setErrorMessage("Please select or add a delivery address.");
        return;
      }
      chosenAddress = {
        label: found.label,
        street: found.street,
        city: found.city,
        state: found.state,
        pincode: found.pincode,
        landmark: found.landmark,
      };
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        restaurantId: restaurant?.id,
        restaurantSlug: restaurant?.slug,
        fulfillmentType,
        customerName: customer.name || "Customer",
        customerPhone: customer.phone,
        customerEmail: customer.email || undefined,
        deliveryAddress: chosenAddress,
        deliveryNotes: deliveryNotes.trim() || undefined,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          variantId: i.variant?.id,
          addonIds: (i.addons || []).map((a) => a.id),
          specialInstructions: i.specialInstructions,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to place order. Please check item availability.");
        return;
      }

      const createdOrder = data.data;
      clearCart();
      router.push(`/orders/${createdOrder.orderNumber}`);
    } catch {
      setErrorMessage("Network error while submitting order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-cream-100/50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation back */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-charcoal-600 hover:text-charcoal-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </button>

          {restaurant && (
            <div className="flex items-center gap-2">
              <RestaurantBadge type={restaurant.slug} size="sm" />
              <span className="text-xs font-bold text-charcoal-800 hidden sm:inline">
                {restaurant.name}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 font-display mb-6">
          Checkout & Order Confirmation
        </h1>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Authentication Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-cream-200 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="font-bold text-charcoal-900 text-base">
                      Account & Contact
                    </h2>
                    <p className="text-xs text-charcoal-500">
                      We will send live SMS order updates to this mobile number
                    </p>
                  </div>
                </div>

                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>

              {isAuthenticated && customer ? (
                <div className="p-3.5 rounded-2xl bg-cream-50 border border-cream-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-charcoal-900">
                      {customer.name || "Valued Customer"}
                    </p>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      +91 {customer.phone} {customer.email && `• ${customer.email}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-amber-900">
                      Sign in with Mobile Number
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Receive instant SMS OTP to verify and proceed
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openAuthModal()}
                    className="font-bold"
                  >
                    Login with OTP
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Fulfillment & Address */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-cream-200 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h2 className="font-bold text-charcoal-900 text-base">
                    Fulfillment Method
                  </h2>
                  <p className="text-xs text-charcoal-500">
                    Choose between doorstep delivery or restaurant counter pickup
                  </p>
                </div>
              </div>

              {/* Delivery vs Takeaway switch */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("delivery")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    fulfillmentType === "delivery"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-cream-300 hover:border-charcoal-400 bg-white"
                  }`}
                >
                  <span className="font-bold text-sm text-charcoal-900 block">
                    🚀 Home Delivery
                  </span>
                  <span className="text-[11px] text-charcoal-500 block mt-0.5">
                    Delivered in 25-35 minutes
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType("takeaway")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    fulfillmentType === "takeaway"
                      ? "border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20"
                      : "border-cream-300 hover:border-charcoal-400 bg-white"
                  }`}
                >
                  <span className="font-bold text-sm text-charcoal-900 block">
                    🛍️ Takeaway / Pickup
                  </span>
                  <span className="text-[11px] text-charcoal-500 block mt-0.5">
                    Ready in 15-20 min • Zero delivery fee
                  </span>
                </button>
              </div>

              {/* Address selector for Delivery */}
              {fulfillmentType === "delivery" && (
                <div className="space-y-3 pt-2 border-t border-cream-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                      Delivery Address
                    </label>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setIsAddAddressOpen(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New
                      </button>
                    )}
                  </div>

                  {!isAuthenticated ? (
                    <p className="text-xs text-charcoal-500 italic">
                      Please log in above to select or add your delivery address.
                    </p>
                  ) : addresses.length === 0 ? (
                    <div className="text-center p-4 border border-dashed border-cream-300 rounded-2xl">
                      <p className="text-xs text-charcoal-500 mb-2">
                        No delivery address saved yet.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddAddressOpen(true)}
                        className="gap-1 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {addresses.map((addr) => (
                        <label
                          key={addr._id}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            selectedAddressId === addr._id
                              ? "border-primary-500 bg-primary-50/40 ring-1 ring-primary-500"
                              : "border-cream-300 hover:border-charcoal-400 bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="addressSelection"
                            checked={selectedAddressId === addr._id}
                            onChange={() => setSelectedAddressId(addr._id)}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 text-xs">
                            <span className="font-bold text-charcoal-900 uppercase tracking-wide">
                              {addr.label} {addr.isDefault && "(Default)"}
                            </span>
                            <p className="text-charcoal-700 mt-0.5 leading-relaxed">
                              {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                              {addr.landmark && ` (Near ${addr.landmark})`}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Delivery Notes */}
                  <div className="pt-3">
                    <label className="block text-xs font-bold text-charcoal-700 mb-1">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ring bell twice, leave with security, call when outside"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-charcoal-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-cream-200 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h2 className="font-bold text-charcoal-900 text-base">
                    Payment Method
                  </h2>
                  <p className="text-xs text-charcoal-500">
                    Safe & verified payment on delivery or via Razorpay
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-primary-500 bg-primary-50/50 ring-1 ring-primary-500"
                      : "border-cream-300 hover:border-charcoal-400 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <div className="text-xs">
                    <span className="font-bold text-charcoal-900 block">
                      Cash on Delivery / UPI
                    </span>
                    <span className="text-charcoal-500 text-[11px]">
                      Pay cash or scan QR upon arrival
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "razorpay"
                      ? "border-primary-500 bg-primary-50/50 ring-1 ring-primary-500"
                      : "border-cream-300 hover:border-charcoal-400 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  <div className="text-xs">
                    <span className="font-bold text-charcoal-900 block">
                      Razorpay Online Payment
                    </span>
                    <span className="text-charcoal-500 text-[11px]">
                      UPI, Cards, NetBanking, Wallets
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Bill */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-cream-200 shadow-soft sticky top-24">
              <h2 className="font-bold text-charcoal-900 text-base mb-4 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-semibold text-charcoal-500">
                  {totalItems} item{totalItems > 1 ? "s" : ""}
                </span>
              </h2>

              {/* Items List */}
              <div className="divide-y divide-cream-100 max-h-60 overflow-y-auto mb-4 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <RestaurantBadge type={item.isVeg ? "veg" : "non-veg"} size="sm" showLabel={false} />
                        <span className="font-bold text-charcoal-900 truncate">{item.name}</span>
                        <span className="text-charcoal-500 font-semibold">×{item.quantity}</span>
                      </div>
                      {item.variant && (
                        <p className="text-[11px] text-charcoal-500 ml-4">
                          Size: {item.variant.name}
                        </p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-[11px] text-charcoal-400 ml-4 truncate">
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

              {/* Coupon Section */}
              <div className="pt-3 border-t border-cream-200 mb-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold tracking-wider">{appliedCoupon.code}</span>
                        <span className="text-[11px] text-emerald-700 block">
                          Savings: {formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-emerald-700 font-bold underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-3 text-charcoal-400" />
                      <input
                        type="text"
                        placeholder="Coupon code (e.g. WELCOME50)"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="w-full pl-8 pr-3 py-2 text-xs uppercase font-semibold rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:normal-case placeholder:font-normal"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isApplyingCoupon}
                      disabled={!couponCodeInput.trim()}
                      onClick={async () => {
                        const ok = await applyCoupon(couponCodeInput.trim().toUpperCase());
                        if (ok) setCouponCodeInput("");
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{couponError}</p>
                )}
              </div>

              {/* Bill Details */}
              <div className="space-y-2 text-xs text-charcoal-600 pt-3 border-t border-cream-200">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-charcoal-900">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-charcoal-900">
                    {fulfillmentType === "takeaway" ? (
                      <span className="text-emerald-600 font-bold">FREE (Pickup)</span>
                    ) : deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE (Orders &gt; ₹500)</span>
                    ) : (
                      formatCurrency(deliveryFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Taxes (5% Restaurant GST)</span>
                  <span className="font-semibold text-charcoal-900">{formatCurrency(taxAmount)}</span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-charcoal-900 pt-3 border-t border-cream-200">
                  <span>Grand Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Minimum order check */}
              {!isMinOrderMet && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  Minimum order amount for <strong>{restaurant?.name}</strong> is {formatCurrency(minOrder)}.
                  Please add {formatCurrency(minOrder - subtotal)} more to checkout.
                </div>
              )}

              {/* Place Order Button */}
              <div className="mt-6">
                {!isAuthenticated ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => openAuthModal()}
                    className="font-bold shadow-soft"
                  >
                    Login to Place Order
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={!isMinOrderMet || isSubmitting}
                    isLoading={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="font-bold shadow-soft"
                  >
                    Place Order ({formatCurrency(totalAmount)})
                  </Button>
                )}
              </div>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-charcoal-500 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  100% Hygienic & Contactless Delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Address Modal */}
      {isAddAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-cream-200 overflow-hidden p-6">
            <h3 className="text-lg font-bold text-charcoal-900 font-display mb-4">
              Add New Delivery Address
            </h3>

            <form onSubmit={handleAddAddressSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">
                  Address Label
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Home", "Work", "Other"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewAddress((a) => ({ ...a, label: lbl }))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        newAddress.label === lbl
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-cream-300 text-charcoal-700"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">
                  House / Flat / Street Details *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sunshine Heights, Main Road"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    Pincode (6 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="400001"
                    value={newAddress.pincode}
                    onChange={(e) =>
                      setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "") }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station / Opposite City Mall"
                  value={newAddress.landmark}
                  onChange={(e) => setNewAddress((a) => ({ ...a, landmark: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddAddressOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Save Address
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

