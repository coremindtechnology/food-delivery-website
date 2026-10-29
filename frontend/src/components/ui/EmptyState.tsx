"use client";

import React from "react";
import { UtensilsCrossed, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No dishes found",
  description = "We couldn't find any items matching your active search or filters.",
  actionText = "Clear All Filters",
  onAction,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed border-cream-300 bg-white p-12 text-center shadow-sm",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100 text-charcoal-400">
        {icon || <UtensilsCrossed className="w-8 h-8" />}
      </div>
      <h3 className="font-display text-lg font-bold text-charcoal-900 mb-1">
        {title}
      </h3>
      <p className="text-xs text-charcoal-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>{actionText}</span>
        </Button>
      )}
    </div>
  );
}

