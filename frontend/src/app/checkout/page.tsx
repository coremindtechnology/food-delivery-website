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
  Smartphone,
  Truck,
  Store,
  LockKeyhole,
  Leaf,
  Home,
  BriefcaseBusiness,
  CircleEllipsis,
  UserRound,
  Building2,
  Check,
  X,
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
import { launchRazorpayCheckout } from "@/lib/razorpay-client";
import {
  getDeliveryDistanceKm,
  MAX_DELIVERY_DISTANCE_KM,
  type Coordinates,
} from "@/lib/delivery";

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
    updateQuantity,
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
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Address Modal State
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    street: "",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462038",
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
  const deliveryDistanceKm =
    deliveryCoordinates && restaurant
      ? getDeliveryDistanceKm(restaurant.slug, deliveryCoordinates)
      : null;
  const isDeliveryInRange =
    deliveryDistanceKm !== null && deliveryDistanceKm <= MAX_DELIVERY_DISTANCE_KM;

  function handleUseCurrentLocation() {
    setLocationError(null);
    setDeliveryCoordinates(null);

    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Allow location access to check delivery availability."
            : error.code === error.TIMEOUT
              ? "Could not get your location in time. Please try again."
              : "Could not determine your location. Please try again.";
        setLocationError(message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function handleAddAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddressError(null);
    if (newAddress.street.trim().length < 5) {
      setAddressError("Please enter at least 5 characters for the street address.");
      return;
    }
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      setAddressError("Please enter a valid 6-digit pincode.");
      return;
    }

    setIsSavingAddress(true);
    try {
      const created = await addAddress({
        ...newAddress,
        street: newAddress.street.trim(),
        landmark: newAddress.landmark.trim() || undefined,
      });
      if (!created) {
        setAddressError("Unable to save this address. Please try again.");
        return;
      }

      setSelectedAddressId(created._id);
      setDeliveryCoordinates(null);
      setLocationError(null);
      setIsAddAddressOpen(false);
      setAddressError(null);
      setNewAddress({
        label: "Home",
        street: "",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462038",
        landmark: "",
        isDefault: true,
      });
    } finally {
      setIsSavingAddress(false);
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
      if (!deliveryCoordinates) {
        setErrorMessage("Check your location to confirm it is within the 5 km delivery range.");
        return;
      }
      if (!restaurant) {
        setErrorMessage("The selected kitchen could not be found. Please refresh and try again.");
        return;
      }

      const distanceKm = getDeliveryDistanceKm(restaurant.slug, deliveryCoordinates);
      if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
        setErrorMessage(
          `This address is ${distanceKm.toFixed(1)} km away. Orders can only be delivered within 5 km.`
        );
        return;
      }

      chosenAddress = {
        label: found.label,
        street: found.street,
        city: found.city,
        state: found.state,
        pincode: found.pincode,
        landmark: found.landmark,
        coordinates: deliveryCoordinates,
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
      if (paymentMethod === "cod") {
        router.push(`/orders/${createdOrder.orderNumber}`);
        return;
      }

      try {
        const attemptKey = crypto.randomUUID();
        const paymentOrderResponse = await fetch("/api/payments/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: createdOrder.orderNumber, attemptKey }),
        });
        const paymentOrderData = await paymentOrderResponse.json();
        if (!paymentOrderResponse.ok || !paymentOrderData.success) {
          throw new Error(paymentOrderData.error || "Unable to initialize online payment.");
        }

        const paymentOrder = paymentOrderData.data;
        const result = await launchRazorpayCheckout({
          key: paymentOrder.keyId,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          name: restaurant?.name || "Food Delivery",
          description: `Order ${createdOrder.orderNumber}`,
          order_id: paymentOrder.razorpayOrderId,
          prefill: {
            name: customer.name || undefined,
            email: customer.email || undefined,
            contact: customer.phone,
          },
          theme: { color: "#FC8019" },
        });
        const verifyResponse = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: createdOrder.orderNumber, ...result }),
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Payment verification is still pending.");
        }
        router.push(`/orders/${createdOrder.orderNumber}`);
      } catch (paymentError) {
        router.push(`/orders/${createdOrder.orderNumber}`);
        if (paymentError instanceof Error && paymentError.message !== "Payment window was closed.") {
          setErrorMessage(`${paymentError.message} Your order is saved; check its status before trying again.`);
        }
      }
    } catch {
      setErrorMessage("Network error while submitting order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fffaf4] px-4 py-5 sm:px-6 lg:px-8">
      <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-4 -left-3 h-16 w-16 rotate-[-25deg] fill-[#a6d64d] text-[#a6d64d] opacity-60" />
      <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-5 left-10 h-12 w-12 rotate-[25deg] fill-[#a6d64d] text-[#a6d64d] opacity-50" />
      <div className="relative mx-auto max-w-5xl">
        {/* Navigation back */}
        <div className="mb-2 flex items-center justify-between">
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

        <div className="mb-4 flex items-center gap-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-charcoal-950 sm:text-[27px]">
            <span className="text-success-800">Checkout</span> &amp; Order Confirmation
          </h1>
          <Leaf aria-hidden="true" className="h-6 w-6 rotate-[25deg] fill-[#83bd32] text-[#83bd32]" />
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          {/* Left Column: Delivery & Customer Info */}
          <div className="space-y-3 lg:col-span-7">
            {/* Step 1: Authentication Card */}
            <div className="rounded-2xl border border-[#f1e9de] bg-white p-3 shadow-[0_5px_18px_rgba(80,60,35,0.07)] sm:p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffcf9c] text-sm font-extrabold text-[#b63d00]">
                    1
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-extrabold text-charcoal-950">
                      Account & Contact
                    </h2>
                    <p className="text-[10px] text-charcoal-600">
                      We will send live SMS order updates to this mobile number
                    </p>
                  </div>
                </div>

                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-success-600 font-bold text-xs bg-success-50 px-2.5 py-1 rounded-full border border-success-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>

              {isAuthenticated && customer ? (
                <div className="flex items-center justify-between rounded-xl border border-success-100 bg-[#f7fbf2] p-3">
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
                <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-[#ffe3a5] bg-[#fff9e8] p-2.5 sm:flex-row">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-8 w-8 shrink-0 text-success-800" />
                    <div>
                      <p className="text-xs font-extrabold text-charcoal-950">
                        Sign in with Mobile Number
                      </p>
                      <p className="mt-0.5 text-[10px] text-charcoal-600">
                        Receive instant SMS OTP to verify and proceed
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="veg"
                    size="sm"
                    onClick={() => openAuthModal()}
                    className="h-8 rounded-lg px-3 text-[11px] font-bold"
                  >
                    Login with OTP <ArrowLeft className="ml-1 h-3.5 w-3.5 rotate-180" />
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Fulfillment & Address */}
            <div className="rounded-2xl border border-[#f1e9de] bg-white p-3 shadow-[0_5px_18px_rgba(80,60,35,0.07)] sm:p-3.5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffcf9c] text-sm font-extrabold text-[#b63d00]">
                  2
                </div>
                <div>
                  <h2 className="font-display text-sm font-extrabold text-charcoal-950">
                    Fulfillment Method
                  </h2>
                  <p className="text-[10px] text-charcoal-600">
                    Choose between doorstep delivery or restaurant counter pickup
                  </p>
                </div>
              </div>

              {/* Delivery vs Takeaway switch */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("delivery")}
                  className={`relative flex min-h-[50px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                    fulfillmentType === "delivery"
                      ? "border-success-500 bg-[#f3faed] ring-1 ring-success-200"
                      : "border-cream-300 bg-white hover:border-success-300"
                  }`}
                >
                  <Truck className="h-6 w-6 shrink-0 text-[#ee7900]" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-charcoal-950">Home Delivery</span>
                    <span className="mt-0.5 block text-[9px] text-charcoal-600">Delivered in 25–35 minutes</span>
                  </span>
                  {fulfillmentType === "delivery" && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 fill-success-600 text-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType("takeaway")}
                  className={`flex min-h-[50px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                    fulfillmentType === "takeaway"
                      ? "border-success-500 bg-[#f3faed] ring-1 ring-success-200"
                      : "border-cream-300 bg-white hover:border-success-300"
                  }`}
                >
                  <Store className="h-6 w-6 shrink-0 text-[#ee7900]" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-extrabold text-charcoal-950">Takeaway / Pickup</span>
                    <span className="mt-0.5 block text-[9px] text-charcoal-600">Ready in 15–20 min · Zero delivery fee</span>
                  </span>
                  {fulfillmentType === "takeaway" && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 fill-success-600 text-white" />}
                </button>
              </div>

              {/* Address selector for Delivery */}
              {fulfillmentType === "delivery" && (
                <div className="space-y-2 border-t border-cream-200 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs font-extrabold text-charcoal-900">
                      <MapPin className="h-4 w-4 text-success-700" />
                      Delivery Address
                    </label>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => setIsAddAddressOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-success-600 px-2.5 py-1 text-[10px] font-bold text-success-800 hover:bg-success-50"
                      >
                        <Plus className="h-3 w-3" /> Add New Address
                      </button>
                    )}
                  </div>

                  {!isAuthenticated ? (
                    <p className="text-xs text-charcoal-500 italic">
                      Please log in above to select or add your delivery address.
                    </p>
                  ) : addresses.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-cream-300 p-3 text-center">
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
                          className={`flex items-start gap-3 rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                            selectedAddressId === addr._id
                              ? "border-success-500 bg-[#f3faed]"
                              : "border-cream-300 bg-white hover:border-success-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="addressSelection"
                            checked={selectedAddressId === addr._id}
                            onChange={() => {
                              setSelectedAddressId(addr._id);
                              setDeliveryCoordinates(null);
                              setLocationError(null);
                            }}
                            className="mt-1 accent-success-600"
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

                  {isAuthenticated && addresses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseCurrentLocation}
                        isLoading={isGettingLocation}
                        className="h-8 gap-1.5 rounded-full px-3 text-[10px]"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {deliveryCoordinates ? "Refresh delivery location" : "Check delivery location"}
                      </Button>
                      <p className="text-[10px] text-charcoal-500">
                        Confirm location to check the 5 km delivery range.
                      </p>
                      {locationError && (
                        <p className="text-xs text-red-600" role="alert">
                          {locationError}
                        </p>
                      )}
                      {deliveryDistanceKm !== null && (
                        <p
                          className={`text-xs font-semibold ${
                            isDeliveryInRange ? "text-success-700" : "text-red-600"
                          }`}
                          role="status"
                        >
                          {isDeliveryInRange
                            ? `Delivery available — ${deliveryDistanceKm.toFixed(2)} km from the kitchen.`
                            : `Outside delivery area — ${deliveryDistanceKm.toFixed(2)} km away. Maximum is 5 km.`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivery Notes */}
                  <div className="pt-3">
                    <label className="mb-1 block text-[11px] font-bold text-charcoal-800">
                      Delivery Instructions (Optional)
                    </label>
                    <textarea
                    rows={1}
                      placeholder="e.g. Ring bell twice, leave with security, call when outside"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full resize-y rounded-xl border border-cream-300 px-3 py-2 text-[10px] placeholder:text-charcoal-400 focus:outline-none focus:ring-2 focus:ring-success-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="rounded-2xl border border-[#f1e9de] bg-white p-3 shadow-[0_5px_18px_rgba(80,60,35,0.07)] sm:p-3.5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffcf9c] text-sm font-extrabold text-[#b63d00]">
                  3
                </div>
                <div>
                  <h2 className="font-display text-sm font-extrabold text-charcoal-950">
                    Payment Method
                  </h2>
                  <p className="text-[10px] text-charcoal-600">
                    Safe & verified payment on delivery or via Razorpay
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label
                  className={`flex min-h-[56px] items-center gap-2 rounded-xl border p-2.5 cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "border-success-500 bg-[#f3faed]"
                      : "border-cream-300 bg-white hover:border-success-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="accent-success-600"
                  />
                  <Banknote className="h-5 w-5 shrink-0 text-success-700" />
                  <div className="text-xs">
                    <span className="block text-[10px] font-extrabold text-charcoal-950">
                      Cash on Delivery
                    </span>
                    <span className="text-[9px] leading-tight text-charcoal-600">
                      Pay your outstanding cash amount to the delivery personnel
                    </span>
                  </div>
                </label>

                <label
                  className={`flex min-h-[56px] items-center gap-2 rounded-xl border p-2.5 cursor-pointer transition-all ${
                    paymentMethod === "razorpay"
                      ? "border-success-500 bg-[#f3faed]"
                      : "border-cream-300 bg-white hover:border-success-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="accent-success-600"
                  />
                  <CreditCard className="h-5 w-5 shrink-0 text-[#f28a00]" />
                  <div className="text-xs">
                    <span className="block text-[10px] font-extrabold text-charcoal-950">
                      Razorpay Online Payment
                    </span>
                    <span className="text-[9px] text-charcoal-600">
                      UPI, Cards, NetBanking, Wallets
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Bill */}
          <div className="lg:col-span-5">
            <div className="sticky top-5 overflow-hidden rounded-2xl border border-[#e4ecdd] bg-white shadow-[0_8px_24px_rgba(41,81,48,0.12)]">
              <h2 className="flex items-center justify-between bg-gradient-to-r from-[#126238] to-[#07522d] px-4 py-3 text-white">
                <span className="flex items-center gap-2 font-display text-base font-extrabold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                  Order Summary
                </span>
                <span className="text-[10px] font-semibold text-white/90">
                  {totalItems} item{totalItems > 1 ? "s" : ""}
                </span>
              </h2>

              {/* Items List */}
              <div className="max-h-52 divide-y divide-cream-100 overflow-y-auto px-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 py-2.5 text-xs">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                      <Image
                        src={item.image}
                        unoptimized={item.image.startsWith("data:image/")}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <RestaurantBadge type={item.isVeg ? "veg" : "non-veg"} size="sm" showLabel={false} />
                        <span className="truncate font-bold text-charcoal-950">{item.name}</span>
                      </div>
                      {item.variant && (
                        <p className="ml-4 text-[10px] text-charcoal-600">
                          Size: {item.variant.name}
                        </p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="ml-4 truncate text-[10px] text-charcoal-500">
                          + {item.addons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-1 rounded-full border border-cream-200 px-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-charcoal-700 hover:text-success-700"
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          <span className="sr-only">Decrease quantity</span>
                          <span aria-hidden="true">−</span>
                        </button>
                        <span className="min-w-3 text-center text-[10px] font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-charcoal-700 hover:text-success-700"
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-bold text-charcoal-950">{formatCurrency(item.itemTotalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="mx-3 mb-3 border-t border-cream-200 pt-2.5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-success-50 border border-success-200 rounded-xl text-xs text-success-800">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-success-600" />
                      <div>
                        <span className="font-bold tracking-wider">{appliedCoupon.code}</span>
                        <span className="text-[11px] text-success-700 block">
                          Savings: {formatCurrency(discountAmount)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-success-700 font-bold underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-success-700" />
                      <input
                        type="text"
                        placeholder="Coupon code (e.g. WELCOME50)"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="w-full rounded-full border border-cream-300 py-2 pl-8 pr-3 text-[10px] uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-success-500 placeholder:normal-case placeholder:font-normal"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="veg"
                      size="sm"
                      className="h-8 rounded-full border border-success-600 bg-white px-3 text-[10px] text-success-800 shadow-none hover:bg-success-50"
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
              <div className="mx-3 space-y-1.5 border-t border-cream-200 pt-2.5 text-[10px] text-charcoal-700">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-charcoal-950">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-success-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-charcoal-950">
                    {fulfillmentType === "takeaway" ? (
                      <span className="text-success-600 font-bold">FREE (Pickup)</span>
                    ) : deliveryFee === 0 ? (
                      <span className="font-bold text-success-700">FREE (Orders &gt; ₹500)</span>
                    ) : (
                      formatCurrency(deliveryFee)
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Taxes (5% Restaurant GST)</span>
                  <span className="font-bold text-charcoal-950">{formatCurrency(taxAmount)}</span>
                </div>

                <div className="flex justify-between rounded-xl border-t border-success-100 bg-[#f1f8e6] px-2 py-1.5 text-base font-extrabold text-success-800">
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
              <div className="mx-3 mb-2 mt-3">
                {!isAuthenticated ? (
                  <Button
                    variant="veg"
                    size="md"
                    fullWidth
                    onClick={() => openAuthModal()}
                    className="h-9 justify-between rounded-full bg-gradient-to-r from-[#13813f] to-[#006b35] px-4 text-xs font-extrabold shadow-[0_5px_12px_rgba(13,111,55,0.22)]"
                  >
                    <span className="flex flex-1 items-center justify-center gap-2">
                      <LockKeyhole className="h-4 w-4" />
                      Login to Place Order
                    </span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    variant="veg"
                    size="md"
                    fullWidth
                    disabled={
                      !isMinOrderMet ||
                      isSubmitting ||
                      (fulfillmentType === "delivery" &&
                        (!deliveryCoordinates || !isDeliveryInRange))
                    }
                    isLoading={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="h-9 justify-between rounded-full bg-gradient-to-r from-[#13813f] to-[#006b35] px-4 text-xs font-extrabold shadow-[0_5px_12px_rgba(13,111,55,0.22)]"
                  >
                    <span className="flex flex-1 items-center justify-center gap-2">
                      <LockKeyhole className="h-4 w-4" />
                      Place Order ({formatCurrency(totalAmount)})
                    </span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Button>
                )}
              </div>

              <div className="relative mt-2 overflow-hidden bg-gradient-to-b from-white to-[#e9f4d7] px-3 pb-3 pt-1 text-center">
                <p className="relative z-10 inline-flex items-center gap-1 text-[9px] text-charcoal-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-success-600" />
                  100% Hygienic & Contactless Delivery
                </p>
                <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-3 left-2 h-7 w-10 rotate-[28deg] fill-[#a6d64d] text-[#a6d64d] opacity-60" />
                <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-4 right-2 h-10 w-12 rotate-[-35deg] fill-[#a6d64d] text-[#a6d64d] opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Address Modal */}
      {isAddAddressOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal-900/60 p-3 backdrop-blur-sm animate-fade-in sm:p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-address-title"
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[600px] overflow-y-auto rounded-[24px] border border-white bg-gradient-to-br from-white via-white to-[#f7faf4] p-4 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="add-address-title" className="font-display text-lg font-extrabold leading-tight text-success-900">
                    Add New Delivery Address
                  </h3>
                  <p className="mt-0.5 text-[11px] text-charcoal-600">
                    Provide your full address for a faster, smoother delivery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddAddressOpen(false);
                  setAddressError(null);
                }}
                aria-label="Close address form"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cream-200 bg-white text-charcoal-600 hover:bg-cream-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddAddressSubmit} className="space-y-3">
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold text-success-900">
                  <Tag className="h-4 w-4 text-success-700" />
                  Address Label <span className="text-red-600">*</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Home", Icon: Home },
                    { label: "Work", Icon: BriefcaseBusiness },
                    { label: "Other", Icon: CircleEllipsis },
                  ].map(({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setNewAddress((address) => ({ ...address, label }))}
                      aria-pressed={newAddress.label === label}
                      className={`flex h-9 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold transition-all ${
                        newAddress.label === label
                          ? "border-primary-500 bg-[#fff5eb] text-[#c54a00] shadow-sm"
                          : "border-cream-200 bg-white text-charcoal-700 hover:border-success-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {newAddress.label === label && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold text-success-900">
                  <UserRound className="h-4 w-4 text-success-700" />
                  Recipient Details
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                      Full Name
                    </label>
                    <div className="flex h-9 items-center rounded-lg border border-cream-200 bg-[#f9faf8] px-3 text-xs text-charcoal-800">
                      <UserRound className="mr-2 h-3.5 w-3.5 text-success-700" />
                      <span className="truncate">{customer?.name || "Name not added to profile"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                      Mobile Number
                    </label>
                    <div className="flex h-9 items-center rounded-lg border border-cream-200 bg-[#f9faf8] px-3 text-xs text-charcoal-800">
                      <span className="mr-2 text-success-700">+91</span>
                      <span>{customer?.phone || "Verified mobile number"}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold text-success-900">
                  <MapPin className="h-4 w-4 text-success-700" />
                  Address Details
                </h4>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="address-street" className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                      House / Flat / Street Details <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success-700" />
                      <input
                        id="address-street"
                        type="text"
                        required
                        minLength={5}
                        maxLength={200}
                        placeholder="e.g. Flat 402, Sunshine Heights, Main Road"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress((address) => ({ ...address, street: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-cream-200 bg-white pl-9 pr-3 text-xs focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/15"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="address-city" className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                        City <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="address-city"
                        type="text"
                        required
                        maxLength={100}
                        value={newAddress.city}
                        onChange={(e) => setNewAddress((address) => ({ ...address, city: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-cream-200 bg-white px-3 text-xs focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/15"
                      />
                    </div>
                    <div>
                      <label htmlFor="address-pincode" className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                        Pincode (6 digits) <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="address-pincode"
                        type="text"
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="462038"
                        value={newAddress.pincode}
                        onChange={(e) => setNewAddress((address) => ({ ...address, pincode: e.target.value.replace(/\D/g, "") }))}
                        className="h-9 w-full rounded-lg border border-cream-200 bg-white px-3 font-mono text-xs focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/15"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="address-state" className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                        State <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="address-state"
                        type="text"
                        required
                        maxLength={100}
                        value={newAddress.state}
                        onChange={(e) => setNewAddress((address) => ({ ...address, state: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-cream-200 bg-white px-3 text-xs focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/15"
                      />
                    </div>
                    <div>
                      <label htmlFor="address-landmark" className="mb-1 block text-[10px] font-semibold text-charcoal-700">
                        Landmark <span className="font-normal text-charcoal-500">(Optional)</span>
                      </label>
                      <input
                        id="address-landmark"
                        type="text"
                        maxLength={150}
                        placeholder="Near Metro Station"
                        value={newAddress.landmark}
                        onChange={(e) => setNewAddress((address) => ({ ...address, landmark: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-cream-200 bg-white px-3 text-xs focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-500/15"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <label className="flex cursor-pointer items-center gap-2 border-t border-cream-200 pt-3 text-[11px] font-medium text-charcoal-700">
                <input
                  type="checkbox"
                  checked={newAddress.isDefault}
                  onChange={(e) => setNewAddress((address) => ({ ...address, isDefault: e.target.checked }))}
                  className="h-4 w-4 accent-success-600"
                />
                Save as my default address
              </label>

              {addressError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                  {addressError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-cream-200 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingAddress}
                  onClick={() => {
                    setIsAddAddressOpen(false);
                    setAddressError(null);
                  }}
                  className="rounded-full px-5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="veg"
                  size="sm"
                  isLoading={isSavingAddress}
                  className="rounded-full px-5 font-bold"
                >
                  <MapPin className="h-4 w-4" />
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
