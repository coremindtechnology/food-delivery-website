"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // unique item key
  menuItemId: string;
  name: string;
  image: string;
  isVeg: boolean;
  price: number;
  quantity: number;
  variant?: CartItemVariant;
  addons?: CartItemAddon[];
  specialInstructions?: string;
  itemTotalPrice: number;
}

export interface RestaurantMeta {
  id: string;
  slug: "veg" | "non-veg";
  name: string;
  minOrder?: number;
}

export interface AppliedCoupon {
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  discountAmount: number;
  description?: string;
}

interface CartContextType {
  items: CartItem[];
  restaurant: RestaurantMeta | null;
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  appliedCoupon: AppliedCoupon | null;
  couponError: string | null;
  isApplyingCoupon: boolean;
  restaurantConflict: {
    pendingItem: Omit<CartItem, "id" | "itemTotalPrice">;
    pendingRestaurant: RestaurantMeta;
  } | null;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addItem: (
    item: Omit<CartItem, "id" | "itemTotalPrice">,
    restaurant: RestaurantMeta
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  resolveRestaurantConflict: (confirmSwitch: boolean) => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "dual_kitchens_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantMeta | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [restaurantConflict, setRestaurantConflict] = useState<{
    pendingItem: Omit<CartItem, "id" | "itemTotalPrice">;
    pendingRestaurant: RestaurantMeta;
  } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items);
          setRestaurant(parsed.restaurant || null);
          setAppliedCoupon(parsed.appliedCoupon || null);
        }
      }
    } catch {
      // Ignore corrupted local storage
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({
            items,
            restaurant,
            appliedCoupon,
          })
        );
      }
    } catch {
      // Ignore local storage write errors
    }
  }, [items, restaurant, appliedCoupon]);

  function calculateItemTotal(item: Omit<CartItem, "id" | "itemTotalPrice">): number {
    const unitPrice = item.variant?.price ?? item.price;
    const addonsTotal = (item.addons || []).reduce((acc, a) => acc + a.price, 0);
    return (unitPrice + addonsTotal) * item.quantity;
  }

  function generateItemKey(item: Omit<CartItem, "id" | "itemTotalPrice">): string {
    const variantKey = item.variant?.id || "base";
    const addonsKey = (item.addons || [])
      .map((a) => a.id)
      .sort()
      .join("-");
    const notesKey = (item.specialInstructions || "").trim().toLowerCase();
    return `${item.menuItemId}__${variantKey}__${addonsKey}__${notesKey}`;
  }

  function addItem(
    newItem: Omit<CartItem, "id" | "itemTotalPrice">,
    targetRestaurant: RestaurantMeta
  ) {
    // Check for restaurant separation conflict
    if (items.length > 0 && restaurant && restaurant.id !== targetRestaurant.id) {
      setRestaurantConflict({
        pendingItem: newItem,
        pendingRestaurant: targetRestaurant,
      });
      return;
    }

    const itemKey = generateItemKey(newItem);
    const itemTotal = calculateItemTotal(newItem);

    setRestaurant(targetRestaurant);
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === itemKey);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + newItem.quantity;
        const recalculated = calculateItemTotal({ ...existing, quantity: newQty });
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          itemTotalPrice: recalculated,
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          ...newItem,
          id: itemKey,
          itemTotalPrice: itemTotal,
        },
      ];
    });

    setIsCartDrawerOpen(true);
  }

  function resolveRestaurantConflict(confirmSwitch: boolean) {
    if (!confirmSwitch || !restaurantConflict) {
      setRestaurantConflict(null);
      return;
    }

    const { pendingItem, pendingRestaurant } = restaurantConflict;
    const itemKey = generateItemKey(pendingItem);
    const itemTotal = calculateItemTotal(pendingItem);

    setRestaurant(pendingRestaurant);
    setAppliedCoupon(null);
    setItems([
      {
        ...pendingItem,
        id: itemKey,
        itemTotalPrice: itemTotal,
      },
    ]);
    setRestaurantConflict(null);
    setIsCartDrawerOpen(true);
  }

  function updateQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const recalculated = calculateItemTotal({ ...item, quantity });
          return {
            ...item,
            quantity,
            itemTotalPrice: recalculated,
          };
        }
        return item;
      })
    );
  }

  function removeItem(cartItemId: string) {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== cartItemId);
      if (filtered.length === 0) {
        setRestaurant(null);
        setAppliedCoupon(null);
      }
      return filtered;
    });
  }

  function clearCart() {
    setItems([]);
    setRestaurant(null);
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function applyCoupon(code: string): Promise<boolean> {
    if (!restaurant) {
      setCouponError("Cart is empty");
      return false;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          restaurantId: restaurant.id,
          subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setCouponError(data.error || "Invalid coupon code");
        return false;
      }

      setAppliedCoupon({
        code: data.data.code,
        discountType: data.data.discountType,
        discountValue: data.data.discountValue,
        discountAmount: data.data.discountAmount,
        description: data.data.description,
      });

      return true;
    } catch {
      setCouponError("Failed to validate coupon");
      return false;
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
  }

  // Calculated totals
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.itemTotalPrice, 0);

  // Delivery fee: ₹40 standard, free delivery if subtotal >= 500
  const deliveryFee = items.length === 0 ? 0 : subtotal >= 500 ? 0 : 40;

  // Taxes: 5% GST
  const taxAmount = items.length === 0 ? 0 : Math.round(subtotal * 0.05);

  // Coupon discount
  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discountType === "percentage") {
      discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const totalAmount = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

  return (
    <CartContext.Provider
      value={{
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
        restaurantConflict,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        resolveRestaurantConflict,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

