"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Failed to load restaurant menu. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-red-200 bg-red-50/60 p-8 text-center",
        className
      )}
      role="alert"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="font-display text-base font-bold text-red-950 mb-1">
        {title}
      </h3>
      <p className="text-xs text-red-700/90 max-w-sm mx-auto mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry} className="mx-auto">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}

