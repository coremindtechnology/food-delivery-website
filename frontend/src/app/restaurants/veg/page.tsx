"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Leaf,
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
} from "lucide-react";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";
import { SAMPLE_FOODS, CATEGORIES } from "@/data/foods";
import { FoodCard } from "@/components/food/FoodCard";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { MenuFilterBar, SortOption, PriceFilter } from "@/components/menu/MenuFilterBar";
import { FoodCustomizerModal } from "@/components/food/FoodCustomizerModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Notification } from "@/components/ui/Notification";
import { FoodItem, CartItem } from "@/types";
import { useCart } from "@/context/CartContext";

export default function VegRestaurantPage() {
  const restaurant = SAMPLE_RESTAURANTS.find((r) => r.slug === "veg")!;

  // Filter & Search states
  const { addItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [onlyPopular, setOnlyPopular] = useState(false);
  const [onlyChefSpecial, setOnlyChefSpecial] = useState(false);

  // Customization modal & toast states
  const [customizingFood, setCustomizingFood] = useState<FoodItem | null>(null);
  const [cartAlert, setCartAlert] = useState<string | null>(null);

  // Filter only Veg items that are ACTIVE/AVAILABLE (Rule: "Do not display unavailable items in normal menu listings")
  const baseVegFoods = useMemo(() => {
    return SAMPLE_FOODS.filter(
      (f) => f.restaurantSlug === "veg" && f.available !== false
    );
  }, []);

  // Filter & sort logic
  const filteredFoods = useMemo(() => {
    let result = [...baseVegFoods];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.tags?.some((t) => t.toLowerCase().includes(q)) ||
          f.ingredients?.some((ing) => ing.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((f) => f.category === selectedCategory);
    }

    // Subcategory filter
    if (selectedSubcategory !== "all") {
      result = result.filter((f) => f.subcategory === selectedSubcategory);
    }

    // Price range filter
    if (priceFilter === "under-200") {
      result = result.filter((f) => f.price < 200);
    } else if (priceFilter === "200-400") {
      result = result.filter((f) => f.price >= 200 && f.price <= 400);
    } else if (priceFilter === "above-400") {
      result = result.filter((f) => f.price > 400);
    }

    // Specialties toggles
    if (onlyPopular) {
      result = result.filter((f) => f.isPopular);
    }
    if (onlyChefSpecial) {
      result = result.filter((f) => f.isChefSpecial);
    }

    // Sorting
    if (sortBy === "popular") {
      result.sort((a, b) => b.rating * b.reviewsCount - a.rating * a.reviewsCount);
    } else if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [
    baseVegFoods,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    priceFilter,
    onlyPopular,
    onlyChefSpecial,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "all" ||
    selectedSubcategory !== "all" ||
    priceFilter !== "all" ||
    onlyPopular ||
    onlyChefSpecial;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setPriceFilter("all");
    setOnlyPopular(false);
    setOnlyChefSpecial(false);
    setSortBy("popular");
  };

  const handleAddToCart = (food: FoodItem) => {
    addItem(
      {
        menuItemId: food.id,
        name: food.name,
        image: food.image,
        isVeg: food.isVeg,
        price: food.price,
        quantity: 1,
        variant: food.variants?.[0]
          ? {
              id: food.variants[0].id,
              name: food.variants[0].name,
              price: food.variants[0].price,
            }
          : undefined,
      },
      {
        id: restaurant.id,
        slug: "veg",
        name: restaurant.name,
        minOrder: restaurant.minOrder,
      }
    );
    setCartAlert(`Added "${food.name}" to your Veg Order`);
    setTimeout(() => setCartAlert(null), 3000);
  };

  const handleCustomizedAddToCart = (customizedItem: CartItem) => {
    const variantLabel = customizedItem.selectedVariant
      ? ` (${customizedItem.selectedVariant.name})`
      : "";
    addItem(
      {
        menuItemId: customizedItem.food.id,
        name: customizedItem.food.name,
        image: customizedItem.food.image,
        isVeg: customizedItem.food.isVeg,
        price: customizedItem.selectedVariant?.price ?? customizedItem.food.price,
        quantity: customizedItem.quantity,
        variant: customizedItem.selectedVariant
          ? {
              id: customizedItem.selectedVariant.id,
              name: customizedItem.selectedVariant.name,
              price: customizedItem.selectedVariant.price,
            }
          : undefined,
        addons: customizedItem.selectedAddons?.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
        })),
        specialInstructions: customizedItem.specialInstructions,
      },
      {
        id: restaurant.id,
        slug: "veg",
        name: restaurant.name,
        minOrder: restaurant.minOrder,
      }
    );
    setCartAlert(
      `Added ${customizedItem.quantity}x "${customizedItem.food.name}${variantLabel}" to order`
    );
    setTimeout(() => setCartAlert(null), 3500);
  };

  return (
    <div className="pb-24 space-y-10 bg-cream-50/50 min-h-screen">
      {/* Toast Alert */}
      {cartAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <Notification
            type="success"
            message={cartAlert}
            onClose={() => setCartAlert(null)}
          />
        </div>
      )}

      {/* Item Customization Modal */}
      <FoodCustomizerModal
        food={customizingFood}
        isOpen={!!customizingFood}
        onClose={() => setCustomizingFood(null)}
        onAddToCart={handleCustomizedAddToCart}
        accentColor="veg"
      />

      {/* Top Switcher Bar */}
      <div className="border-b border-cream-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-charcoal-500">
            <Link href="/" className="hover:text-charcoal-900 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="font-bold text-veg-700">Pure Veg Kitchen Menu</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-500 hidden sm:inline">
              Looking for Non-Veg Barbecue?
            </span>
            <Link href="/restaurants/non-veg">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                <span>Switch to Non-Veg Kitchen</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Banner Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-veg-200 shadow-card">
          <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-cream-200">
            <Image
              src={restaurant.heroImage}
              alt={restaurant.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-900/40 to-transparent" />

            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <div className="rounded-xl bg-white px-3 py-1.5 shadow-md flex items-center gap-1.5">
                <RestaurantBadge type="veg" size="md" />
              </div>
              <span className="rounded-xl bg-veg-700/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white uppercase tracking-wider">
                100% Shuddh Shakahari
              </span>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-charcoal-900/80 px-3 py-1.5 text-white backdrop-blur-sm text-sm font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{restaurant.rating.toFixed(1)}</span>
              <span className="text-white/70 text-xs">({restaurant.reviewCount} reviews)</span>
            </div>

            <div className="absolute bottom-5 left-5 right-5 text-white max-w-3xl">
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
                {restaurant.name}
              </h1>
              <p className="text-xs sm:text-sm text-cream-100 mt-1 max-w-2xl leading-relaxed">
                {restaurant.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-4 sm:p-5 bg-veg-50/70 border-t border-veg-200/60 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-veg-700 flex-shrink-0" />
              <div>
                <span className="text-charcoal-500 block text-[10px]">Delivery</span>
                <span className="font-bold text-charcoal-900">{restaurant.deliveryTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-veg-700 flex-shrink-0" />
              <div>
                <span className="text-charcoal-500 block text-[10px]">Min. Order</span>
                <span className="font-bold text-charcoal-900">₹{restaurant.minOrder}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Leaf className="w-4 h-4 text-veg-700 flex-shrink-0" />
              <div>
                <span className="text-charcoal-500 block text-[10px]">Specialty</span>
                <span className="font-bold text-charcoal-900">Shuddh Desi Ghee</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-veg-700 flex-shrink-0" />
              <div>
                <span className="text-charcoal-500 block text-[10px]">Kitchen</span>
                <span className="font-bold text-charcoal-900">Segregated Cookware</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Filter & Search Controls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-charcoal-900">
              Pure Veg Restaurant Menu
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Showing {filteredFoods.length} of {baseVegFoods.length} authentic dishes
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs text-veg-700 font-semibold bg-veg-100/80 px-3 py-1 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-veg-600" />
            <span>Pure Vegetarian Kitchen Only</span>
          </div>
        </div>

        {/* Reusable MenuFilterBar */}
        <MenuFilterBar
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedSubcategory={selectedSubcategory}
          onSelectSubcategory={setSelectedSubcategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          priceFilter={priceFilter}
          onPriceFilterChange={setPriceFilter}
          onlyPopular={onlyPopular}
          onTogglePopular={() => setOnlyPopular(!onlyPopular)}
          onlyChefSpecial={onlyChefSpecial}
          onToggleChefSpecial={() => setOnlyChefSpecial(!onlyChefSpecial)}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          accentColor="veg"
        />

        {/* Dishes Listing */}
        {filteredFoods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pt-2">
            {filteredFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onAddToCart={handleAddToCart}
                onCustomize={(item) => setCustomizingFood(item)}
                className="border-veg-200/70 hover:border-veg-400"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No pure veg dishes match your search"
            description="We couldn't find any dishes with the selected filters or search terms. Try clearing your filters."
            actionText="Reset All Menu Filters"
            onAction={handleResetFilters}
            icon={<Leaf className="w-8 h-8 text-veg-600" />}
          />
        )}
      </section>
    </div>
  );
}
