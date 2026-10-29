"use client";

import React, { useState, useEffect, useId } from "react";
import Image from "next/image";
import { X, Plus, Minus, Check, Flame, Clock, Info } from "lucide-react";
import { FoodItem, ItemVariant, ItemAddon, CartItem } from "@/types";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";
import { Button } from "../ui/Button";
import { formatCurrency, cn } from "@/lib/utils";

interface FoodCustomizerModalProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizedItem: CartItem) => void;
  accentColor?: "primary" | "veg" | "nonveg";
}

export function FoodCustomizerModal({
  food,
  isOpen,
  onClose,
  onAddToCart,
  accentColor = "primary",
}: FoodCustomizerModalProps) {
  const instructionsId = useId();
  // State for customization
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(
    undefined
  );
  const [selectedAddons, setSelectedAddons] = useState<ItemAddon[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // Sync state whenever selected food item changes
  useEffect(() => {
    if (food) {
      const defaultVariant =
        food.variants?.find((v) => v.isDefault) || food.variants?.[0];
      setSelectedVariant(defaultVariant);
      setSelectedAddons([]);
      setQuantity(1);
      setSpecialInstructions("");
    }
  }, [food]);

  if (!isOpen || !food) return null;

  // Calculate base price from selected variant or default food price
  const currentBasePrice = selectedVariant ? selectedVariant.price : food.price;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const singleItemTotal = currentBasePrice + addonsTotal;
  const grandTotal = singleItemTotal * quantity;

  const handleToggleAddon = (addon: ItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleConfirm = () => {
    onAddToCart({
      food,
      quantity,
      selectedVariant,
      selectedAddons,
      specialInstructions: specialInstructions.trim() || undefined,
      itemTotalPrice: grandTotal,
    });
    onClose();
  };

  const isVeg = food.isVeg;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <div
          className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-cream-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          {/* Header Image */}
          <div className="relative h-52 w-full overflow-hidden bg-cream-200">
            <Image
              src={food.image}
              alt={food.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 500px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-900/70 text-white hover:bg-charcoal-900 transition-colors shadow-soft"
              aria-label="Close customizer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badges on Image */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="rounded-xl bg-white px-2.5 py-1 shadow-md">
                <RestaurantBadge type={food.isVeg ? "veg" : "non-veg"} size="sm" />
              </div>
              {food.isChefSpecial && (
                <span className="flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm uppercase">
                  <Flame className="w-3.5 h-3.5" /> Chef Special
                </span>
              )}
            </div>

            {/* Title on bottom of image */}
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <h3
                id="modal-headline"
                className="font-display text-xl sm:text-2xl font-bold drop-shadow-sm"
              >
                {food.name}
              </h3>
              <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                {food.description}
              </p>
            </div>
          </div>

          {/* Modal Scrollable Content */}
          <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Quick Metrics */}
            <div className="flex items-center gap-4 text-xs text-charcoal-500 border-b border-cream-200 pb-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                {food.preparationTime}
              </span>
              {food.calories && (
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-primary-500" />
                  {food.calories} kcal
                </span>
              )}
              {food.serves && <span>{food.serves}</span>}
            </div>

            {/* Section 1: Choose Variant (if available) */}
            {food.variants && food.variants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    1. Choose Portion Size / Variant
                  </h4>
                  <span className="rounded-md bg-cream-100 px-2 py-0.5 text-[10px] font-bold text-charcoal-600 uppercase">
                    Required
                  </span>
                </div>

                <div className="space-y-2">
                  {food.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <label
                        key={v.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all",
                          isSelected
                            ? isVeg
                              ? "border-veg-600 bg-veg-50/70 shadow-sm"
                              : "border-nonveg-700 bg-nonveg-50/70 shadow-sm"
                            : "border-cream-300 hover:bg-cream-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="food-variant"
                            value={v.id}
                            checked={isSelected}
                            onChange={() => setSelectedVariant(v)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-charcoal-900">
                              {v.name}
                            </p>
                            {v.portionDescription && (
                              <p className="text-[11px] text-charcoal-500">
                                {v.portionDescription}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-charcoal-900">
                          {formatCurrency(v.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Choose Add-ons & Extras (if available) */}
            {food.addons && food.addons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    2. Recommended Extras & Add-ons
                  </h4>
                  <span className="text-[11px] text-charcoal-500">Optional</span>
                </div>

                <div className="space-y-2">
                  {food.addons.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all",
                          isChecked
                            ? "border-primary-500 bg-primary-50/50 shadow-sm"
                            : "border-cream-300 hover:bg-cream-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAddon(addon)}
                            className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-xs font-semibold text-charcoal-800">
                            {addon.name}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-primary-600">
                          +{formatCurrency(addon.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Preparation Instructions */}
            <div className="space-y-2">
              <label
                htmlFor={instructionsId}
                className="block text-xs font-bold uppercase tracking-wider text-charcoal-900"
              >
                3. Special Preparation Instructions
              </label>
              <textarea
                id={instructionsId}
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Less spicy, extra crispy, do not add onions, extra green chutney..."
                className="w-full rounded-2xl border border-cream-300 bg-cream-50/50 p-3 text-xs text-charcoal-800 placeholder:text-charcoal-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Modal Footer: Quantity & Confirm CTA */}
          <div className="border-t border-cream-200 bg-cream-50/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Quantity Selector */}
            <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-cream-300 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-charcoal-600 hover:bg-cream-200 disabled:opacity-40 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-charcoal-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-charcoal-600 hover:bg-cream-200 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action CTA Button */}
            <Button
              type="button"
              variant={isVeg ? "veg" : "nonveg"}
              size="lg"
              onClick={handleConfirm}
              className="w-full sm:flex-1 justify-between shadow-lift"
            >
              <span>Add to Order</span>
              <span className="font-bold">{formatCurrency(grandTotal)}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

