"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, MapPin, ShoppingBag, ArrowRight } from "lucide-react";
import { Restaurant } from "@/types";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  restaurant: Restaurant;
  priority?: boolean;
}

export function RestaurantCard({ restaurant, priority = false }: RestaurantCardProps) {
  const isVeg = restaurant.type === "veg";
  const buttonTone = isVeg
    ? "bg-[#0f8d44] hover:bg-[#0b7438]"
    : "bg-[#b63131] hover:bg-[#9c2727]";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[30px] border-[3px] bg-[#fffaf2] p-2.5 shadow-[0_12px_32px_rgba(108,74,28,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(108,74,28,0.12)]",
        isVeg ? "border-[#0d8d36]/20" : "border-[#b74040]/20"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[24px]",
          isVeg ? "bg-[#1e8a39]" : "bg-[#9a2d2d]"
        )}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
          <div className={cn("inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur-sm", isVeg ? "" : "") }>
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full border border-white/60", isVeg ? "bg-[#37d178]" : "bg-[#ff9d7a]") } />
            {restaurant.bannerText}
          </div>
        </div>

        <div className="relative h-[280px] sm:h-[330px] lg:h-[360px]">
          <Image
            src={restaurant.heroImage}
            alt={restaurant.name}
            fill
            priority={priority}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            className={cn(
              "absolute inset-0",
              isVeg ? "bg-gradient-to-t from-[#0d4d1b]/80 via-[#0d4d1b]/10 to-transparent" : "bg-gradient-to-t from-[#3d0d12]/80 via-[#3d0d12]/10 to-transparent"
            )}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
          <h3 className="max-w-[85%] text-3xl font-black leading-[0.96] tracking-[-0.06em] text-white sm:text-[2.5rem]">
            {restaurant.name}
          </h3>
        </div>
      </div>

      <div className="space-y-5 px-1 pb-2 pt-4">
        <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-[#eddfc6] bg-[#f8f1e6] p-2.5">
          <div className="flex flex-col items-center justify-center rounded-[12px] bg-white/70 px-1 py-2 text-center">
            <div className="mb-1 flex items-center gap-1 text-[#6a4a2d]">
              <Clock3 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em]">Delivery</span>
            </div>
            <span className="text-sm font-bold text-[#2b1d14]">{restaurant.deliveryTime}</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[12px] bg-white/70 px-1 py-2 text-center">
            <div className="mb-1 flex items-center gap-1 text-[#6a4a2d]">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em]">Min Order</span>
            </div>
            <span className="text-sm font-bold text-[#2b1d14]">₹{restaurant.minOrder}</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[#5d4733]">
          {restaurant.description}
        </p>

        <div className="space-y-2.5 text-sm text-[#3d2d23]">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs", isVeg ? "text-[#178646] border-[#178646]/50" : "text-[#c14b4b] border-[#c14b4b]/50")}>✓</span>
            <span className="font-medium">{restaurant.features[0]}</span>
          </div>
          <div className="flex items-center gap-2 text-[#5d4733]">
            <MapPin className={cn("h-4 w-4 flex-shrink-0", isVeg ? "text-[#178646]" : "text-[#c14b4b]")} />
            <span className="truncate">{restaurant.address}</span>
          </div>
        </div>

        <Link
          href={`/restaurants/${restaurant.slug}`}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-[15px] px-5 py-3.5 text-base font-extrabold text-white shadow-[0_10px_18px_rgba(24,24,24,0.18)] transition-transform hover:-translate-y-0.5",
            buttonTone
          )}
        >
          <span>Explore {isVeg ? "Veg" : "Non-Veg"} Menu</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
