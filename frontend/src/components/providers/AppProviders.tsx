"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { RestaurantConflictModal } from "@/components/cart/RestaurantConflictModal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <AuthModal />
        <CartDrawer />
        <RestaurantConflictModal />
      </CartProvider>
    </AuthProvider>
  );
}

