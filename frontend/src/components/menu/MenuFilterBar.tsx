"use client";

import React, { useState } from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown, Flame, Star, RotateCcw } from "lucide-react";
import { Category } from "@/types";
import { cn } from "@/lib/utils";

export type SortOption = "menu-order" | "popular" | "price-low" | "price-high" | "name-asc";
export type PriceFilter = "all" | "under-200" | "200-400" | "above-400";

interface MenuFilterBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  selectedSubcategory: string;
  onSelectSubcategory: (subSlug: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  priceFilter: PriceFilter;
  onPriceFilterChange: (price: PriceFilter) => void;
  onlyPopular: boolean;
  onTogglePopular: () => void;
  onlyChefSpecial: boolean;
  onToggleChefSpecial: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  accentColor?: "primary" | "veg" | "nonveg";
}

export function MenuFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory,
  onSelectSubcategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  priceFilter,
  onPriceFilterChange,
  onlyPopular,
  onTogglePopular,
  onlyChefSpecial,
  onToggleChefSpecial,
  onResetFilters,
  hasActiveFilters,
  accentColor = "primary",
}: MenuFilterBarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Active category object
  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const subcategories = activeCategoryObj?.subcategories || [];

  const accentStyles = {
    primary: "bg-primary-500 text-white shadow-soft shadow-primary-500/25",
    veg: "bg-veg-600 text-white shadow-soft shadow-veg-600/25",
    nonveg: "bg-nonveg-700 text-white shadow-soft shadow-nonveg-700/25",
  };

  return (
    <div className="space-y-4">
      {/* Search Input & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by dish name, spices, ingredients..."
            className="w-full rounded-2xl border border-cream-300 bg-white pl-10 pr-10 py-3 text-xs sm:text-sm text-charcoal-900 placeholder:text-charcoal-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full sm:w-auto appearance-none rounded-2xl border border-cream-300 bg-white pl-9 pr-8 py-3 text-xs font-semibold text-charcoal-800 shadow-sm hover:border-cream-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              <option value="menu-order">Sort: Restaurant menu order</option>
              <option value="popular">Sort: Popularity & Rating</option>
              <option value="price-low">Sort: Price Low to High</option>
              <option value="price-high">Sort: Price High to Low</option>
              <option value="name-asc">Sort: Name (A to Z)</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
          </div>

          {/* Toggle More Filters Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-sm transition-all",
              showAdvancedFilters || hasActiveFilters
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-cream-300 bg-white text-charcoal-700 hover:bg-cream-100"
            )}
            aria-expanded={showAdvancedFilters}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-primary-500" />
            )}
          </button>
        </div>
      </div>

      {/* Primary Category Pills Scrollbar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            onSelectCategory("all");
            onSelectSubcategory("all");
          }}
          className={cn(
            "flex flex-shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-semibold transition-all border",
            selectedCategory === "all"
              ? accentStyles[accentColor]
              : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
          )}
        >
          <span>All Categories</span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory(cat.slug);
                onSelectSubcategory("all");
              }}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-semibold transition-all border",
                isSelected
                  ? accentStyles[accentColor]
                  : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
              )}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Subcategories (if selected category has any) */}
      {subcategories.length > 0 && selectedCategory !== "all" && (
        <div className="flex items-center gap-2 overflow-x-auto pl-2 py-1 text-xs">
          <span className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider flex-shrink-0">
            Subcategory:
          </span>
          <button
            type="button"
            onClick={() => onSelectSubcategory("all")}
            className={cn(
              "rounded-xl px-3 py-1 font-medium transition-colors flex-shrink-0",
              selectedSubcategory === "all"
                ? "bg-charcoal-900 text-white"
                : "bg-cream-100 text-charcoal-600 hover:bg-cream-200"
            )}
          >
            All Subcategories
          </button>
          {subcategories.map((sub) => {
            const isSubSelected = selectedSubcategory === sub.slug;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubcategory(sub.slug)}
                className={cn(
                  "rounded-xl px-3 py-1 font-medium transition-colors flex-shrink-0",
                  isSubSelected
                    ? "bg-charcoal-900 text-white"
                    : "bg-cream-100 text-charcoal-600 hover:bg-cream-200"
                )}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Advanced Filter Drawer / Bar */}
      {showAdvancedFilters && (
        <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
              Filter By Price & Specialties
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Price Filter Options */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-charcoal-500">
                Price Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "All Prices", val: "all" as const },
                  { label: "Under ₹200", val: "under-200" as const },
                  { label: "₹200 - ₹400", val: "200-400" as const },
                  { label: "₹400+", val: "above-400" as const },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onPriceFilterChange(item.val)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
                      priceFilter === item.val
                        ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                        : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Badges Toggles */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-charcoal-500">
                Specialties
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onTogglePopular}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
                    onlyPopular
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
                  )}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Popular Only</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleChefSpecial}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
                    onlyChefSpecial
                      ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                      : "bg-white text-charcoal-700 border-cream-300 hover:bg-cream-100"
                  )}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Chef Specials</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
