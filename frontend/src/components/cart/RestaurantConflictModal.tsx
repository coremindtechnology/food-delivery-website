"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RestaurantConflictModal() {
  const { restaurantConflict, resolveRestaurantConflict, restaurant } = useCart();

  if (!restaurantConflict) return null;

  const currentName = restaurant?.name || "Current Restaurant";
  const newName = restaurantConflict.pendingRestaurant.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-cream-200 overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-charcoal-900 font-display">
              Replace cart items?
            </h3>
            <p className="text-xs text-charcoal-500">
              Kitchens operate with strict separation
            </p>
          </div>
        </div>

        <p className="text-sm text-charcoal-700 leading-relaxed mb-6">
          Your cart currently contains dishes from <strong>{currentName}</strong>.
          Because our Pure Veg and Gourmet Non-Veg kitchens maintain independent preparation and utensils, you cannot mix items from both kitchens in one order.
          <br /><br />
          Would you like to clear your cart and start ordering from <strong>{newName}</strong>?
        </p>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => resolveRestaurantConflict(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => resolveRestaurantConflict(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Cart & Switch
          </Button>
        </div>
      </div>
    </div>
  );
}

