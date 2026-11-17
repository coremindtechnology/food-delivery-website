"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  X,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  Info,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { formatCurrency } from "@/lib/utils";

export function CartDrawer() {
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
    couponError,
    isApplyingCoupon,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponCodeInput, setCouponCodeInput] = useState("");

  if (!isCartDrawerOpen) return null;

  const minOrder = restaurant?.minOrder || 199;
  const isMinOrderMet = subtotal >= minOrder;
  const remainingForMinOrder = Math.max(0, minOrder - subtotal);

  async function handleApplyCouponSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const ok = await applyCoupon(couponCodeInput.trim().toUpperCase());
    if (ok) {
      setCouponCodeInput("");
    }
  }

  function handleProceedToCheckout() {
    setIsCartDrawerOpen(false);
    router.push("/checkout");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal-900/45 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div
        className="flex-1 hidden sm:block"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="relative my-0 flex h-full w-full max-w-[26rem] flex-col overflow-hidden border-l border-cream-200 bg-[#fffefa] shadow-2xl animate-slide-left sm:my-3 sm:mr-3 sm:h-[calc(100%-1.5rem)] sm:rounded-[1.75rem]">
        {/* Drawer Header */}
        <div className="relative flex items-center justify-between border-b border-success-100 bg-gradient-to-r from-[#fffaf4] to-[#f7fbf1] px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-[#ff6b35] p-2.5 text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold leading-tight text-success-800 underline decoration-[#cadc8a] decoration-2 underline-offset-4">
                Your Order ({totalItems})
              </h2>
              {restaurant && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RestaurantBadge type={restaurant.slug} size="sm" showLabel={false} />
                  <span className="max-w-[200px] truncate text-xs font-semibold text-charcoal-700">
                    {restaurant.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-1.5 rounded-full border border-success-100 bg-white/70 px-3 py-2 text-[11px] font-semibold text-success-800 transition-colors hover:bg-success-50"
                title="Clear Cart"
                aria-label="Clear all items from cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(false)}
              className="rounded-full bg-white p-2 text-charcoal-600 shadow-sm transition-colors hover:bg-cream-100 hover:text-charcoal-900"
              aria-label="Close cart"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Leaf aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 h-9 w-9 rotate-[-25deg] fill-[#a6d64d] text-[#a6d64d] opacity-80" />
          <Leaf aria-hidden="true" className="pointer-events-none absolute bottom-0 right-9 h-5 w-5 rotate-[50deg] fill-[#a6d64d] text-[#a6d64d] opacity-70" />
        </div>

        {/* Minimum Order Alert */}
        {items.length > 0 && !isMinOrderMet && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between">
            <span>
              Add <strong>{formatCurrency(remainingForMinOrder)}</strong> more to reach min order of {formatCurrency(minOrder)}
            </span>
          </div>
        )}

        {/* Drawer Items List */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fffefa] p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-20 h-20 bg-cream-100 rounded-full flex items-center justify-center text-charcoal-400 mb-4">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Your cart is empty
              </h3>
              <p className="text-xs text-charcoal-500 max-w-xs mt-1 mb-6">
                Explore our Pure Veg or Gourmet Non-Veg menus and add your favourite dishes.
              </p>
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                <Button
                  variant="veg"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    router.push("/restaurants/veg");
                  }}
                >
                  Explore Veg Kitchen
                </Button>
                <Button
                  variant="nonveg"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    router.push("/restaurants/non-veg");
                  }}
                >
                  Explore Non-Veg Kitchen
                </Button>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-success-100 bg-white p-2.5 shadow-[0_5px_16px_rgba(27,94,52,0.06)]"
              >
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-cream-100">
                  <Image
                    src={item.image}
                    unoptimized={item.image.startsWith("data:image/")}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <RestaurantBadge
                        type={item.isVeg ? "veg" : "non-veg"}
                        size="sm"
                        showLabel={false}
                      />
                      <h4 className="truncate text-sm font-bold text-charcoal-900">
                        {item.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-[#e77a5a] transition-colors hover:bg-[#ffe1d5] hover:text-red-700"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {item.variant && (
                    <p className="mt-0.5 text-[11px] font-medium text-charcoal-600">
                      Portion: {item.variant.name}
                    </p>
                  )}

                  {item.addons && item.addons.length > 0 && (
                    <p className="truncate text-[11px] text-charcoal-500">
                      + {item.addons.map((a) => a.name).join(", ")}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold text-success-900">
                      {formatCurrency(item.itemTotalPrice)}
                    </span>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 rounded-full border border-success-100 bg-white px-2 py-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="rounded p-0.5 text-success-800 transition-colors hover:bg-success-50"
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="min-w-[16px] px-1 text-center text-xs font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="rounded p-0.5 text-success-800 transition-colors hover:bg-success-50"
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer & Bill Summary */}
        {items.length > 0 && (
          <div className="relative space-y-3 bg-[#fffefa] px-4 pb-4 pt-3 sm:px-5">
            {/* Promo Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-success-50 border border-success-200 rounded-xl text-xs text-success-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success-600" />
                    <div>
                      <span className="font-bold tracking-wider">{appliedCoupon.code}</span>
                      <span className="text-[11px] text-success-700 block">
                        Saved {formatCurrency(discountAmount)}!
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-success-700 hover:text-success-900 font-bold underline text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success-700" />
                    <input
                      type="text"
                      placeholder="TRY: WELCOME50"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="w-full rounded-full border border-cream-300 bg-white py-2 pl-9 pr-3 text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-success-500 placeholder:normal-case placeholder:text-charcoal-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="veg"
                    size="sm"
                    isLoading={isApplyingCoupon}
                    disabled={!couponCodeInput.trim()}
                    className="rounded-full border border-success-600 bg-white text-success-800 shadow-none hover:bg-success-50"
                  >
                    Apply
                  </Button>
                </form>
              )}
              {couponError && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{couponError}</p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-1.5 rounded-2xl bg-gradient-to-r from-[#f1f7ed] to-[#f8faf2] px-3.5 py-3 text-xs text-charcoal-700">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-semibold text-charcoal-800">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-success-700 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-1.5">
                  Delivery Fee
                  <Info className="h-3 w-3 text-charcoal-400" />
                </span>
                <span className="font-semibold text-charcoal-800">
                  {deliveryFee === 0 ? (
                    <span className="rounded-full bg-success-100 px-2 py-0.5 font-bold text-success-800">FREE</span>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-semibold text-charcoal-800">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between border-t border-dashed border-success-200 pt-2 text-base font-extrabold text-success-800">
                <span>To Pay</span>
                <span className="text-[#f05a00]">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              variant="veg"
              size="lg"
              fullWidth
              disabled={!isMinOrderMet}
              onClick={handleProceedToCheckout}
              className="h-11 justify-between rounded-full bg-gradient-to-r from-[#148243] to-[#08733a] px-5 font-extrabold shadow-[0_8px_18px_rgba(13,111,55,0.24)] hover:from-[#106f39] hover:to-[#075e31]"
            >
              <span className="flex flex-1 items-center justify-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {isMinOrderMet ? "Proceed to Checkout" : `Min Order ${formatCurrency(minOrder)} Required`}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
            <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-3 left-2 h-8 w-8 rotate-[30deg] fill-[#a6d64d] text-[#a6d64d] opacity-70" />
            <Leaf aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-10 h-6 w-6 rotate-[-30deg] fill-[#a6d64d] text-[#a6d64d] opacity-60" />
          </div>
        )}
      </div>
    </div>
  );
}
