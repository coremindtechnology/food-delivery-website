"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading delicious dishes...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-4">
        <div className="h-12 w-12 rounded-full border-4 border-cream-300 border-t-primary-500 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-charcoal-700">{message}</p>
      <p className="text-xs text-charcoal-400 mt-1">
        Freshly preparing your culinary catalog
      </p>
    </div>
  );
}

export function FoodCardSkeleton() {
  return (
    <div className="animate-pulse flex flex-col justify-between rounded-2xl bg-white border border-cream-200/80 p-4 shadow-card">
      <div>
        <div className="h-48 w-full rounded-xl bg-cream-200 mb-3.5" />
        <div className="h-4 w-3/4 rounded bg-cream-200 mb-2" />
        <div className="h-3 w-full rounded bg-cream-100 mb-1" />
        <div className="h-3 w-2/3 rounded bg-cream-100" />
      </div>
      <div className="mt-4 pt-3 border-t border-cream-200/60 flex items-center justify-between">
        <div className="h-5 w-16 rounded bg-cream-200" />
        <div className="h-8 w-20 rounded-xl bg-cream-200" />
      </div>
    </div>
  );
}

