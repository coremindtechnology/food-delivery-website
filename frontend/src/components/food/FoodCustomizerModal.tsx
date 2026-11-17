"use client";

import React, { useState, useEffect, useId } from "react";
import Image from "next/image";
import {
  ChefHat,
  Clock,
  Flame,
  Heart,
  Leaf,
  Minus,
  Plus,
  ShoppingBasket,
  UsersRound,
  X,
} from "lucide-react";
import { FoodItem, ItemVariant, ItemAddon, CartItem } from "@/types";
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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !food) return null;

  // Calculate base price from selected variant or default food price
  const currentBasePrice = selectedVariant ? selectedVariant.price : food.price;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const singleItemTotal = currentBasePrice + addonsTotal;
  const grandTotal = singleItemTotal * quantity;

  const handleToggleAddon = (addon: ItemAddon) => {
    setSelectedAddons((current) =>
      current.some((item) => item.id === addon.id)
        ? current.filter((item) => item.id !== addon.id)
        : [...current, addon]
    );
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
  const metrics = [
    { label: food.preparationTime, Icon: Clock, tone: "text-[#27834b]" },
    food.calories
      ? { label: `${food.calories} kcal`, Icon: Flame, tone: "text-[#f17a2e]" }
      : null,
    food.serves
      ? { label: food.serves, Icon: UsersRound, tone: "text-[#27834b]" }
      : null,
  ].filter((metric): metric is NonNullable<typeof metric> => metric !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111711]/70 p-3 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Close food customizer"
      />
      <div className="relative z-10 flex min-h-0 w-full items-center justify-center">
        <div
          className="relative flex max-h-[92vh] w-full max-w-[500px] flex-col overflow-hidden rounded-[24px] border border-[#e5e3db] bg-[#fffdf8] text-left shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
        >
          {/* Header Image */}
          <div className="relative h-[185px] w-full flex-shrink-0 overflow-hidden bg-cream-200 sm:h-[195px]">
            <Image
              src={food.image}
              unoptimized={food.image.startsWith("data:image/")}
              alt={food.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 500px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#10190e]/75 via-[#10190e]/10 to-transparent" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-charcoal-800 shadow-md transition-colors hover:bg-cream-100"
              aria-label="Close customizer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Badges on Image */}
            <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 shadow-md">
                {isVeg ? (
                  <>
                    <Leaf className="h-3.5 w-3.5 fill-[#248747] text-[#248747]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#176b36]">Pure Veg</span>
                  </>
                ) : (
                  <>
                    <Flame className="h-3.5 w-3.5 fill-[#c34232] text-[#c34232]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9f3026]">Non-Veg</span>
                  </>
                )}
              </div>
              {food.isChefSpecial && (
                <span className="flex items-center gap-1 rounded-full bg-[#f17823] px-2.5 py-1.5 text-[10px] font-bold uppercase text-white shadow-sm">
                  <ChefHat className="h-3.5 w-3.5" /> Chef Special
                </span>
              )}
            </div>

            {/* Title on bottom of image */}
            <div className="absolute bottom-3 left-5 right-5 text-white">
              <h3
                id="modal-headline"
                className="font-display text-xl font-extrabold leading-tight drop-shadow-sm sm:text-2xl"
              >
                {food.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-white/90">
                {food.description}
              </p>
            </div>
          </div>

          {/* Modal Scrollable Content */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3.5 sm:px-5">
            {/* Quick Metrics */}
            <div className="flex rounded-2xl bg-[#f0f6e9] py-2.5 text-[11px] font-semibold text-charcoal-700">
              {metrics.map(({ label, Icon, tone }, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1 text-center",
                    index > 0 && "border-l border-[#d6e4cc]"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", tone)} />
                  <span className="truncate">{label}</span>
                </span>
              ))}
            </div>

            {/* Section 1: Choose Variant (if available) */}
            {food.variants && food.variants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#174c31]">
                    Choose Portion Size
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
                          "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 transition-all",
                          isSelected
                            ? isVeg
                              ? "border-[#27864b] bg-[#f1f7ed]"
                              : "border-[#b83d32] bg-[#fcf1ed]"
                            : "border-[#e8e7df] bg-white hover:bg-[#fafaf5]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="food-variant"
                            value={v.id}
                            checked={isSelected}
                            onChange={() => setSelectedVariant(v)}
                            className={cn("h-4 w-4", isVeg ? "accent-[#218447]" : "accent-[#b83d32]")}
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#174c31]">
                    <ShoppingBasket className="h-4 w-4 text-[#22814b]" />
                    Recommended Extras &amp; Add-ons
                  </h4>
                  <span className="rounded-full bg-[#f0f6e9] px-2.5 py-1 text-[10px] font-semibold text-[#5b7e42]">Optional</span>
                </div>

                <div className="space-y-2">
                  {food.addons.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 transition-all",
                          isChecked
                            ? "border-[#27864b] bg-[#f1f7ed]"
                            : "border-[#e8e7df] bg-white hover:bg-[#fafaf5]"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAddon(addon)}
                            className="h-4 w-4 flex-shrink-0 rounded accent-[#218447]"
                          />
                          <span className="truncate text-xs font-semibold text-charcoal-800">
                            {addon.name}
                          </span>
                        </div>
                        <span className="ml-3 flex-shrink-0 text-xs font-bold text-[#e66d20]">
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
                className="flex items-center gap-2 text-sm font-bold text-[#174c31]"
              >
                <Heart className="h-4 w-4 text-[#22814b]" />
                Special Preparation Instructions
              </label>
              <textarea
                id={instructionsId}
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Less spicy, extra crispy, do not add onions, extra green chutney..."
                className="w-full rounded-xl border border-[#d6e5d1] bg-white p-3 text-xs text-charcoal-800 placeholder:text-charcoal-400 focus:border-[#27864b] focus:outline-none focus:ring-2 focus:ring-[#27864b]/20"
              />
            </div>
          </div>

          {/* Modal Footer: Quantity & Confirm CTA */}
          <div className="flex flex-shrink-0 items-center gap-3 border-t border-[#eee9df] bg-[#fffaf2] p-4 sm:gap-5 sm:px-5">
            {/* Quantity Selector */}
            <div className="flex h-10 flex-shrink-0 items-center gap-2 rounded-full border border-[#d6e5d1] bg-white px-2 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#23834a] transition-colors hover:bg-[#f0f6e9] disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center text-sm font-bold text-charcoal-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#23834a] transition-colors hover:bg-[#f0f6e9]"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Action CTA Button */}
            <Button
              type="button"
              variant={isVeg ? "veg" : "nonveg"}
              size="lg"
              onClick={handleConfirm}
              className={cn(
                "h-11 min-w-0 flex-1 justify-between rounded-full px-4 shadow-[0_6px_14px_rgba(0,100,45,0.2)]",
                isVeg
                  ? "bg-gradient-to-r from-[#078d42] to-[#087332] hover:from-[#087a3b] hover:to-[#075d2a]"
                  : "bg-gradient-to-r from-[#c44335] to-[#a52d25] hover:from-[#b4392d] hover:to-[#8e241e]"
              )}
            >
              <span className="min-w-0 truncate">Add to Order</span>
              <span className="ml-2 flex-shrink-0 border-l border-white/25 pl-3 font-bold">{formatCurrency(grandTotal)}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
