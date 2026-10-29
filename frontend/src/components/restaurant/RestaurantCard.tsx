"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, ShoppingBag, ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { Restaurant } from "@/types";
import { RestaurantBadge } from "./RestaurantBadge";
import { Button } from "../ui/Button";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  restaurant: Restaurant;
  priority?: boolean;
}

export function RestaurantCard({ restaurant, priority = false }: RestaurantCardProps) {
  const isVeg = restaurant.type === "veg";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl bg-white border transition-all duration-300",
        "shadow-card hover:shadow-lift hover:-translate-y-1",
        isVeg
          ? "border-veg-200/60 hover:border-veg-500/50"
          : "border-nonveg-200/60 hover:border-nonveg-500/50"
      )}
    >
      {/* Top Banner Tag */}
      {restaurant.bannerText && (
        <div
          className={cn(
            "px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white uppercase",
            isVeg ? "bg-veg-700" : "bg-nonveg-800"
          )}
        >
          {restaurant.bannerText}
        </div>
      )}

      {/* Hero Image */}
      <div className="relative h-60 w-full overflow-hidden bg-cream-200">
        <Image
          src={restaurant.heroImage}
          alt={restaurant.name}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />

        {/* Floating Dietary Badge */}
        <div className="absolute top-4 left-4 rounded-xl bg-white/95 px-3 py-1.5 backdrop-blur-sm shadow-soft">
          <RestaurantBadge type={restaurant.type} size="md" />
        </div>

        {/* Rating Floating Tag */}
        <div className="absolute top-4 right-4 flex items-center gap-1 rounded-xl bg-charcoal-900/80 px-2.5 py-1 text-white backdrop-blur-sm text-xs font-semibold">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{restaurant.rating.toFixed(1)}</span>
          <span className="text-white/60 text-[10px]">({restaurant.reviewCount})</span>
        </div>

        {/* Bottom Image Overlay Details */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="font-display text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {restaurant.name}
          </h3>
          <p className="text-xs text-white/90 line-clamp-1 mt-0.5">
            {restaurant.subtitle}
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 divide-x divide-cream-300 rounded-2xl bg-cream-50 p-3 mb-5 border border-cream-200">
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="flex items-center gap-1 text-[11px] font-medium text-charcoal-500">
                <Clock className="w-3.5 h-3.5" /> Delivery
              </span>
              <span className="text-xs font-bold text-charcoal-800 mt-0.5">
                {restaurant.deliveryTime}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="flex items-center gap-1 text-[11px] font-medium text-charcoal-500">
                <ShoppingBag className="w-3.5 h-3.5" /> Min Order
              </span>
              <span className="text-xs font-bold text-charcoal-800 mt-0.5">
                ₹{restaurant.minOrder}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-1">
              <span className="text-[11px] font-medium text-charcoal-500">
                Price Level
              </span>
              <span className="text-xs font-bold text-charcoal-800 mt-0.5 truncate max-w-full">
                {restaurant.priceRange.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed mb-4">
            {restaurant.description}
          </p>

          {/* Features Highlights */}
          <div className="space-y-1.5 mb-6">
            {restaurant.features.slice(0, 3).map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-charcoal-700"
              >
                <ShieldCheck
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isVeg ? "text-veg-600" : "text-nonveg-700"
                  )}
                />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mb-6">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-charcoal-400" />
            <span className="truncate">{restaurant.address}</span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <Link href={`/restaurants/${restaurant.slug}`} className="block">
            <Button
              variant={isVeg ? "veg" : "nonveg"}
              size="lg"
              className="w-full justify-between group-hover:shadow-md transition-all"
            >
              <span>Explore {isVeg ? "Veg" : "Non-Veg"} Menu</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

