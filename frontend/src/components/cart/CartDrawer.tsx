"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div
        className="flex-1 hidden sm:block"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-cream-200 animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-cream-200 flex items-center justify-between bg-cream-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-charcoal-900">
                Your Order ({totalItems})
              </h2>
              {restaurant && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RestaurantBadge type={restaurant.slug} size="sm" showLabel={false} />
                  <span className="text-xs font-semibold text-charcoal-700 truncate max-w-[200px]">
                    {restaurant.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-charcoal-400 hover:text-red-600 p-2 font-medium"
                title="Clear Cart"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-2 text-charcoal-500 hover:text-charcoal-900 rounded-xl hover:bg-cream-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
                className="p-3.5 rounded-2xl border border-cream-200 bg-cream-50/40 flex gap-3 items-start"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <RestaurantBadge
                      type={item.isVeg ? "veg" : "non-veg"}
                      size="sm"
                      showLabel={false}
                    />
                    <h4 className="font-bold text-sm text-charcoal-900 truncate">
                      {item.name}
                    </h4>
                  </div>

                  {item.variant && (
                    <p className="text-[11px] text-charcoal-600 font-medium mt-0.5">
                      Portion: {item.variant.name}
                    </p>
                  )}

                  {item.addons && item.addons.length > 0 && (
                    <p className="text-[11px] text-charcoal-500 truncate">
                      +{item.addons.map((a) => a.name).join(", ")}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-extrabold text-sm text-charcoal-900">
                      {formatCurrency(item.itemTotalPrice)}
                    </span>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-300 p-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-cream-100 rounded text-charcoal-600 hover:text-charcoal-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold px-1.5 min-w-[16px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-cream-100 rounded text-charcoal-600 hover:text-charcoal-900"
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
          <div className="border-t border-cream-200 p-4 sm:p-5 bg-white space-y-3.5">
            {/* Promo Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold tracking-wider">{appliedCoupon.code}</span>
                      <span className="text-[11px] text-emerald-700 block">
                        Saved {formatCurrency(discountAmount)}!
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-emerald-700 hover:text-emerald-900 font-bold underline text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 absolute left-3 top-3 text-charcoal-400" />
                    <input
                      type="text"
                      placeholder="TRY: WELCOME50"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 text-xs uppercase font-semibold rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-charcoal-400 placeholder:normal-case"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    isLoading={isApplyingCoupon}
                    disabled={!couponCodeInput.trim()}
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
            <div className="space-y-1.5 text-xs text-charcoal-600 pt-1 border-t border-cream-100">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-semibold text-charcoal-800">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold text-charcoal-800">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    formatCurrency(deliveryFee)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-semibold text-charcoal-800">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-charcoal-900 pt-2 border-t border-cream-200">
                <span>To Pay</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isMinOrderMet}
              onClick={handleProceedToCheckout}
              className="gap-2 font-bold shadow-soft"
            >
              <span>{isMinOrderMet ? "Proceed to Checkout" : `Min Order ${formatCurrency(minOrder)} Required`}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

