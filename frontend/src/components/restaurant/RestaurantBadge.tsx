"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RestaurantBadgeProps {
  type: "veg" | "non-veg";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function RestaurantBadge({
  type,
  size = "md",
  showLabel = true,
  className,
}: RestaurantBadgeProps) {
  const isVeg = type === "veg";

  const sizeClasses = {
    sm: "w-3.5 h-3.5 p-0.5",
    md: "w-4 h-4 p-0.5",
    lg: "w-5 h-5 p-0.5",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 select-none font-medium",
        className
      )}
    >
      <div
        className={cn(
          "border-2 flex items-center justify-center rounded-sm",
          isVeg ? "border-veg-600" : "border-nonveg-700",
          sizeClasses[size]
        )}
        title={isVeg ? "Pure Vegetarian" : "Non-Vegetarian"}
      >
        <div
          className={cn(
            isVeg ? "rounded-full bg-veg-600" : "bg-nonveg-700 transform rotate-45 rounded-[1px]",
            dotSizes[size]
          )}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-xs font-semibold tracking-wide uppercase",
            isVeg ? "text-veg-700" : "text-nonveg-700"
          )}
        >
          {isVeg ? "Pure Veg" : "Non-Veg"}
        </span>
      )}
    </div>
  );
}

