"use client";

import React from "react";
import { Category } from "@/types";
import { cn } from "@/lib/utils";
import { Utensils } from "lucide-react";

interface FoodCategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  accentColor?: "primary" | "veg" | "nonveg";
}

export function FoodCategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  accentColor = "primary",
}: FoodCategoryFilterProps) {
  const activeClassByAccent = {
    primary: "bg-primary-500 text-white shadow-soft shadow-primary-500/25",
    veg: "bg-veg-600 text-white shadow-soft shadow-veg-600/25",
    nonveg: "bg-nonveg-700 text-white shadow-soft shadow-nonveg-700/25",
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={cn(
          "flex flex-shrink-0 items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-semibold transition-all duration-200 border",
          selectedCategory === "all"
            ? activeClassByAccent[accentColor]
            : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100 hover:border-cream-400"
        )}
      >
        <Utensils className="w-3.5 h-3.5" />
        <span>All Items</span>
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.slug;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.slug)}
            className={cn(
              "flex flex-shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 border",
              isSelected
                ? activeClassByAccent[accentColor]
                : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100 hover:border-cream-400"
            )}
          >
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}

