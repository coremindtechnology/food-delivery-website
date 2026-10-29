"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "veg" | "nonveg" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

    const variants = {
      primary:
        "bg-primary-500 hover:bg-primary-600 text-white shadow-soft focus-visible:ring-primary-500 shadow-orange-500/20",
      secondary:
        "bg-cream-200 hover:bg-cream-300 text-charcoal-800 focus-visible:ring-charcoal-700",
      outline:
        "border-2 border-charcoal-700/20 hover:border-charcoal-800 text-charcoal-800 bg-white/60 hover:bg-white focus-visible:ring-charcoal-700",
      ghost:
        "hover:bg-cream-200 text-charcoal-700 focus-visible:ring-charcoal-700",
      veg: "bg-veg-600 hover:bg-veg-700 text-white shadow-soft shadow-veg-600/25 focus-visible:ring-veg-600",
      nonveg:
        "bg-nonveg-700 hover:bg-nonveg-800 text-white shadow-soft shadow-nonveg-700/25 focus-visible:ring-nonveg-700",
      danger:
        "bg-red-600 hover:bg-red-700 text-white shadow-soft shadow-red-600/25 focus-visible:ring-red-600",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-xs gap-1.5",
      md: "h-11 px-5 text-sm gap-2",
      lg: "h-13 px-7 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

