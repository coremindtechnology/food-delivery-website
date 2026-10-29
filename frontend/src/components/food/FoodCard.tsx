"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Plus, Check, Clock, Flame, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { FoodItem } from "@/types";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";
import { formatCurrency, cn } from "@/lib/utils";

interface FoodCardProps {
  food: FoodItem;
  onAddToCart?: (food: FoodItem) => void;
  onCustomize?: (food: FoodItem) => void;
  className?: string;
}

export function FoodCard({ food, onAddToCart, onCustomize, className }: FoodCardProps) {
  const [added, setAdded] = useState(false);
  const hasCustomizations = (food.variants && food.variants.length > 1) || (food.addons && food.addons.length > 0);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasCustomizations && onCustomize) {
      onCustomize(food);
      return;
    }

    setAdded(true);
    if (onAddToCart) {
      onAddToCart(food);
    }
    setTimeout(() => setAdded(false), 1600);
  };

  const itemDetailsUrl = `/restaurants/${food.restaurantSlug}/item/${food.id}`;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white border border-cream-200/90 p-4 transition-all duration-300",
        "shadow-card hover:shadow-lift hover:border-primary-300/80 hover:-translate-y-0.5",
        !food.available && "opacity-75 grayscale-[20%]",
        className
      )}
    >
      <div>
        {/* Top Image Container */}
        <Link href={itemDetailsUrl} className="block relative mb-3.5 h-48 w-full overflow-hidden rounded-2xl bg-cream-100 cursor-pointer">
          <Image
            src={food.image}
            alt={food.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            <div className="rounded-lg bg-white/95 px-2 py-1 backdrop-blur-sm shadow-sm">
              <RestaurantBadge
                type={food.isVeg ? "veg" : "non-veg"}
                size="sm"
                showLabel={false}
              />
            </div>
            {food.isChefSpecial && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm backdrop-blur-sm uppercase">
                <Flame className="w-3 h-3" /> Special
              </span>
            )}
            {food.isPopular && !food.isChefSpecial && (
              <span className="rounded-lg bg-primary-500/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm backdrop-blur-sm uppercase">
                Popular
              </span>
            )}
            {!food.available && (
              <span className="rounded-lg bg-charcoal-900/90 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm uppercase">
                Unavailable
              </span>
            )}
          </div>

          {/* Prep time badge */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-charcoal-900/80 px-2.5 py-0.5 text-[11px] text-white backdrop-blur-sm font-medium">
            <Clock className="w-3 h-3 text-white/80" />
            <span>{food.preparationTime}</span>
          </div>

          {/* Quick View Icon hint */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[11px] font-medium text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View Dish</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* Content */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <Link href={itemDetailsUrl} className="group/title">
              <h4 className="font-display text-base font-bold text-charcoal-900 line-clamp-1 group-hover/title:text-primary-600 transition-colors">
                {food.name}
              </h4>
            </Link>
          </div>

          <p className="text-xs text-charcoal-500 line-clamp-2 leading-relaxed">
            {food.description}
          </p>

          {/* Tags & Subcategory */}
          <div className="flex flex-wrap gap-1 pt-1 items-center">
            {food.tags && food.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-cream-100 px-1.5 py-0.5 text-[10px] font-medium text-charcoal-600"
              >
                {tag}
              </span>
            ))}
            {hasCustomizations && (
              <span className="inline-flex items-center gap-1 rounded-md bg-cream-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-700">
                <SlidersHorizontal className="w-2.5 h-2.5" />
                Customisable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Price & Add Button */}
      <div className="mt-4 pt-3 border-t border-cream-200/70 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-charcoal-900">
              {formatCurrency(food.price)}
            </span>
            {food.originalPrice && (
              <span className="text-xs text-charcoal-400 line-through">
                {formatCurrency(food.originalPrice)}
              </span>
            )}
          </div>
          {food.variants && food.variants.length > 1 && (
            <span className="text-[10px] text-charcoal-400">Multiple sizes</span>
          )}
        </div>

        {/* Action Button */}
        {food.available ? (
          <button
            type="button"
            onClick={handleAddClick}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 shadow-sm active:scale-95",
              added
                ? "bg-emerald-600 text-white"
                : "bg-primary-500 hover:bg-primary-600 text-white hover:shadow"
            )}
            aria-label={`Add ${food.name} to order`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Added</span>
              </>
            ) : hasCustomizations ? (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Customise</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </>
            )}
          </button>
        ) : (
          <span className="rounded-xl bg-cream-200 px-3 py-1.5 text-xs font-medium text-charcoal-400 cursor-not-allowed">
            Sold Out
          </span>
        )}
      </div>
    </div>
  );
}
