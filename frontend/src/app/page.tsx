"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  Star,
  ArrowRight,
  Flame,
  CheckCircle2,
  UtensilsCrossed,
  Phone,
  Mail,
  MapPin,
  Send,
  ShoppingCart,
  Check,
} from "lucide-react";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { FoodCard } from "@/components/food/FoodCard";
import { FoodCategoryFilter } from "@/components/food/FoodCategoryFilter";
import { FoodCustomizerModal } from "@/components/food/FoodCustomizerModal";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notification } from "@/components/ui/Notification";
import { FoodItem, CartItem } from "@/types";
import { useMenuCatalog } from "@/lib/use-menu-catalog";
import { useCart } from "@/context/CartContext";
import { FloatingLeaf } from "@/components/home/FloatingLeaf";

export default function HomePage() {
  const { foods, categories: catalogCategories, loading: menuLoading, error: menuError } = useMenuCatalog("all");
  const { setIsCartDrawerOpen, totalItems } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeKitchenFilter, setActiveKitchenFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [showAllFoodItems, setShowAllFoodItems] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [cartAlert, setCartAlert] = useState<string | null>(null);
  const [customizingFood, setCustomizingFood] = useState<FoodItem | null>(null);

  // Filter foods based on category & kitchen selection (excluding unavailable items)
  const filteredFoods = foods.filter((food) => {
    if (!food.available) return false;
    const matchesCategory =
      selectedCategory === "all" || food.category === selectedCategory;
    const matchesKitchen =
      activeKitchenFilter === "all" || food.restaurantSlug === activeKitchenFilter;
    return matchesCategory && matchesKitchen;
  });
  const foodDisplayLimit = activeKitchenFilter === "all" ? 8 : 4;
  const visibleFoods = showAllFoodItems ? filteredFoods : filteredFoods.slice(0, foodDisplayLimit);
  const categoriesBySlug = new Map<string, (typeof catalogCategories)[number]>();
  for (const category of catalogCategories) {
    const existing = categoriesBySlug.get(category.slug);
    categoriesBySlug.set(
      category.slug,
      existing
        ? { ...existing, itemCount: existing.itemCount + category.itemCount, restaurantType: "both" }
        : category
    );
  }
  const categories = [...categoriesBySlug.values()];

  const vegRestaurant = SAMPLE_RESTAURANTS.find((r) => r.slug === "veg")!;
  const nonVegRestaurant = SAMPLE_RESTAURANTS.find((r) => r.slug === "non-veg")!;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => setContactSubmitted(false), 5000);
  };

  const handleFoodAddToCart = (food: FoodItem) => {
    setCartAlert(`Added "${food.name}" to your current order!`);
    setTimeout(() => setCartAlert(null), 3000);
  };

  const handleCustomizedAddToCart = (customizedItem: CartItem) => {
    const variantLabel = customizedItem.selectedVariant
      ? ` (${customizedItem.selectedVariant.name})`
      : "";
    setCartAlert(
      `Added ${customizedItem.quantity}x "${customizedItem.food.name}${variantLabel}" to order`
    );
    setTimeout(() => setCartAlert(null), 3500);
  };

  return (
    <div className="space-y-6 pb-20 bg-[#FAF7F0] lg:space-y-12">
      {menuError && <p role="status" className="mx-auto max-w-7xl px-4 pt-4 text-sm text-amber-800">{menuError}</p>}
      {/* Item Customizer Modal */}
      <FoodCustomizerModal
        food={customizingFood}
        isOpen={!!customizingFood}
        onClose={() => setCustomizingFood(null)}
        onAddToCart={handleCustomizedAddToCart}
      />

      {/* Floating Cart / Action Notification Toast */}
      {cartAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <Notification
            type="success"
            message={cartAlert}
            onClose={() => setCartAlert(null)}
          />
        </div>
      )}

      {/* 1. HERO SECTION (Matching User Design: Exact Dark Theme, Leaves, Typography & Scroll-Rotating Plate) */}
      <section className="relative overflow-hidden bg-[#111215] text-white pt-8 pb-8 lg:pt-14 lg:pb-12 border-b border-white/10 selection:bg-[#25c255] selection:text-black">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#25c255]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating background leaves positioned according to reference image */}
        {/* Top-left cluster leaves */}
        <FloatingLeaf
          size={56}
          rotation={22}
          delay={0}
          duration={6}
          className="top-2 left-4 sm:top-6 sm:left-10"
        />
        <FloatingLeaf
          size={34}
          rotation={-35}
          delay={1.5}
          duration={5.4}
          className="top-14 left-16 sm:top-20 sm:left-28 opacity-85"
        />
        {/* Top middle-right leaf */}
        <FloatingLeaf
          size={42}
          rotation={-25}
          delay={0.8}
          duration={7}
          className="top-4 left-1/2 -translate-x-1/2 sm:left-[48%]"
        />
        {/* Far-right leaves */}
        <FloatingLeaf
          size={38}
          rotation={40}
          delay={2.1}
          duration={6.2}
          className="top-8 right-6 sm:top-12 sm:right-16"
        />
        <FloatingLeaf
          size={36}
          rotation={-50}
          delay={1.2}
          duration={6.8}
          className="bottom-16 right-4 sm:bottom-24 sm:right-12"
        />
        {/* Lower-left leaf near description text */}
        <FloatingLeaf
          size={34}
          rotation={-18}
          delay={1.7}
          duration={5.8}
          className="bottom-28 left-[38%] hidden sm:block"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Typography, Subtitle & Action Controls */}
            <div className="order-last space-y-2 text-left lg:order-first lg:col-span-6">
              {/* Cursive "Discover Our" */}
              <p className="font-script text-4xl sm:text-5xl lg:text-6xl text-[#e8903c] italic leading-tight tracking-wide select-none">
                Discover Our
              </p>

              {/* Bold "Delicious" in Neon Green */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-[#25c255] tracking-tight leading-[0.95] uppercase">
                Delicious
              </h1>

              {/* Bold "Food Menu" in Crisp White */}
              <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight leading-[1] uppercase pt-1 pb-4">
                Food Menu
              </h2>

              {/* Subtitle description */}
              <p className="text-sm sm:text-base text-gray-400 max-w-md leading-relaxed pb-6">
                  Enjoy delicious dhaba-style food, freshly prepared with authentic spices and flavors.
              </p>

              {/* Order Now Button */}
              <div>
                <Link
                  href="#restaurants"
                  className="rounded-full border border-white/60 hover:border-white text-white font-medium text-xs sm:text-sm px-7 py-3 transition-all duration-200 hover:bg-white/10 active:scale-95 inline-flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4 text-[#25c255]" />
                  <span>Order Now</span>
                </Link>
              </div>

              {/* Bottom Interactive Controls Bar */}
              <div className="flex items-center gap-3 pt-6 sm:pt-10">
                <button
                  type="button"
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="w-10 h-10 rounded-full border border-white/60 hover:border-white text-white flex items-center justify-center transition-all duration-150 hover:bg-white/10 active:scale-90 relative"
                  title="View cart"
                  aria-label="View cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold text-white animate-pulse">
                      {totalItems}
                    </span>
                  )}
                </button>

                <a
                  href="#food-menu"
                  className="inline-flex items-center justify-center bg-[#e03b3b] hover:bg-[#c92a2a] text-white font-bold text-xs sm:text-sm px-7 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-red-900/40 active:scale-95 ml-1"
                >
                  View More
                </a>
              </div>

              {/* Kitchen quick navigation pills */}
              <div className="pt-6 flex flex-wrap items-center gap-3">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Kitchens:</span>
                <Link
                  href="/restaurants/veg"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900/90 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  100% Pure Veg Kitchen
                </Link>
                <Link
                  href="/restaurants/non-veg"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-500/40 hover:bg-red-900/90 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  Charcoal Non-Veg Kitchen
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Food Image */}
            <div className="order-first relative flex items-center justify-center pt-0 lg:order-last lg:col-span-6">
              <div className="relative mx-auto w-[min(68vw,280px)] aspect-square sm:w-[min(58vw,380px)] lg:w-full lg:max-w-[520px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/10 via-red-500/10 to-transparent blur-3xl opacity-60" />
                <div className="absolute inset-[8%] rounded-full bg-black/80 blur-2xl translate-y-6" />
                <div className="relative z-10 h-full w-full">
                  <Image
                    src="/hero-plate.png"
                    alt="Discover Our Delicious Food Menu"
                    fill
                    priority
                    sizes="(max-width: 639px) 68vw, (max-width: 1023px) 58vw, 520px"
                    className="object-contain pointer-events-none select-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESTAURANT SELECTION SECTION */}
      <section id="restaurants" className="relative overflow-hidden bg-[#FAF7F0] pt-4 pb-12 sm:pt-4 sm:pb-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <FloatingLeaf size={64} rotation={18} delay={0.5} duration={7} className="-left-2 top-6 sm:left-4" />
          <FloatingLeaf size={44} rotation={-32} delay={1.2} duration={6} className="left-12 top-20 opacity-80" />
          <FloatingLeaf size={72} rotation={-18} delay={1.8} duration={8} className="right-2 top-7 sm:right-10" />
          <FloatingLeaf size={50} rotation={34} delay={0.8} duration={7.5} className="right-16 bottom-6 opacity-80" />
          <FloatingLeaf size={40} rotation={-40} delay={1.5} duration={5.8} className="left-[36%] bottom-10 hidden sm:block opacity-80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7a35f] bg-[#faeed8] px-4 py-2 shadow-[0_2px_0_#d89a52]">
              <div className="flex items-center justify-center gap-1.5 text-[#d77d2d]">
                <span className="text-xl leading-none">✦</span>
                <span className="text-xl leading-none">✦</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b4a1c]">Select Your Restaurant</span>
            </div>
            <h2 className="font-display text-[2.2rem] sm:text-5xl lg:text-[4.1rem] font-black leading-[1.05] tracking-[-0.04em] text-[#2e1e13]">
              Two Distinct Kitchens, Uncompromised <span className="relative inline-block whitespace-nowrap">Flavors<span className="absolute left-0 right-0 -bottom-1 h-3 rounded-full bg-[#f6d772] opacity-90" /></span>
            </h2>
            <p className="mx-auto max-w-3xl text-sm sm:text-base lg:text-lg text-[#5a4031] leading-relaxed">
              Both kitchens run independently with dedicated master chefs, specific cookware, and separate dispatch counters to guarantee absolute authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            <RestaurantCard restaurant={vegRestaurant} priority />
            <RestaurantCard restaurant={nonVegRestaurant} priority />
          </div>
        </div>
      </section>

      {/* 3. PROMOTIONAL BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-300 px-6 py-7 shadow-lg sm:px-10 sm:py-8 lg:px-12">
          <div className="grid items-center gap-3 sm:grid-cols-[1.1fr_0.9fr] sm:gap-6">
            <div className="relative z-10 space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-charcoal-900 sm:text-xs">
                <span className="h-1 w-7 rounded-full bg-primary-700" />
                <span>Special Introductory Offer</span>
              </div>
              <h3 className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-charcoal-900 sm:text-5xl">
                Get 20% Off
                <span className="mt-1 block text-2xl sm:text-4xl">on Your First Order</span>
              </h3>
              <p className="text-sm font-semibold text-charcoal-800 sm:text-base">
                Use code: <span className="font-extrabold">DUAL20</span> at checkout.
              </p>

              <Link
                href="#food-menu"
                className="inline-flex items-center gap-2 rounded-xl bg-veg-800 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-veg-700 active:scale-95 sm:text-sm"
              >
                Order Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative -mb-7 -mr-6 h-52 sm:-mb-8 sm:-mr-10 sm:h-60 lg:-mr-12 lg:h-64">
              <Image
                src="/offer-dhaba-feast.png"
                alt="Indian curry, naan, and chai"
                fill
                sizes="(min-width: 1024px) 500px, (min-width: 640px) 45vw, 90vw"
                className="translate-y-1 object-contain object-center drop-shadow-[0_20px_14px_rgba(0,0,0,0.4)] sm:translate-y-2 sm:object-right"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-veg-700 mb-2">
              <Sparkles className="w-3 h-3" />
              <span>Our Specialties</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal-900">
              Popular Categories
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              Explore our most-loved food categories and find your perfect meal.
            </p>
          </div>
          {categories.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllCategories((showAll) => !showAll)}
              aria-expanded={showAllCategories}
              className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-800 transition-colors hover:text-veg-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veg-600 focus-visible:ring-offset-4"
            >
              {showAllCategories ? "Show Less" : "View All Categories"}
              <ArrowRight className={`h-4 w-4 transition-transform ${showAllCategories ? "-rotate-90" : ""}`} />
            </button>
          )}
        </div>

        <div aria-label="Popular food categories" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {(showAllCategories ? categories : categories.slice(0, 6)).map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                aria-label={`${cat.name}, ${cat.itemCount} dishes`}
                aria-pressed={isSelected}
                className={`group flex min-w-0 flex-col items-center rounded-2xl p-2.5 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-veg-500/40 sm:p-3 ${
                  isSelected
                    ? "bg-veg-800 text-white shadow-lg shadow-veg-900/15"
                    : "bg-white text-charcoal-900 shadow-sm ring-1 ring-black/5 hover:-translate-y-1 hover:bg-veg-800 hover:text-white hover:shadow-lg hover:shadow-veg-900/15 hover:ring-veg-800"
                }`}
              >
                <span className="relative mx-auto block aspect-square w-full max-w-[168px] overflow-hidden rounded-xl">
                  <Image
                    src={cat.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-2.5 line-clamp-1 text-xs font-bold sm:text-sm">{cat.name}</span>
                <span className={`mt-1 text-[10px] sm:text-xs ${isSelected ? "text-white/75" : "text-charcoal-500 group-hover:text-white/75"}`}>
                  {cat.itemCount} dishes
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? "bg-amber-400 text-veg-900"
                      : "text-charcoal-700 group-hover:bg-amber-400 group-hover:text-veg-900"
                  }`}
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. WHY CHOOSE US */}
      <section className="relative overflow-hidden border-y border-emerald-950/30 bg-[#063b2a] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(34,197,94,0.12),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-16">
          <div className="relative mx-auto flex aspect-square w-full max-w-[480px] items-center justify-center">
            <div className="absolute inset-[8%] rounded-full border border-amber-400/25" />
            <div className="absolute inset-[14%] rounded-full bg-emerald-300/10 blur-2xl" />
            <Image
              src="/why-choose-pasta.png"
              alt="Penne pasta with tomato, basil, and parmesan"
              fill
              sizes="(min-width: 1024px) 480px, 90vw"
              className="object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,0.45)]"
            />
          </div>

          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300 sm:text-sm">
              <span className="h-1 w-7 rounded-full bg-amber-400" />
              <span>Why Choose Us</span>
            </div>
            <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Fresh Food
              <span className="block">Better Life</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              We are committed to delivering delicious and healthy meals made from fresh ingredients.
              Enjoy a better food experience with every order.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-3">
              {[
                { label: <>Fresh<br />Ingredients</>, Icon: CheckCircle2 },
                { label: <>Quality<br />Meals</>, Icon: UtensilsCrossed },
                { label: <>On Time<br />Delivery</>, Icon: Clock },
                { label: <>24/7<br />Support</>, Icon: Phone },
              ].map(({ label, Icon }, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/80 text-amber-300">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold leading-tight text-white/90">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. FEATURED FOOD SECTION */}
      <section id="food-menu" className="bg-[#F1F5E9] py-2 sm:py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">
              <Star className="w-3.5 h-3.5 fill-primary-500" />
              <span>Chef Handcrafted</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal-900">
              Featured Food Items
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              Signature recipes loved by thousands of happy diners across the city.
            </p>
          </div>

          {/* Kitchen Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-cream-300 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setActiveKitchenFilter("all");
                setShowAllFoodItems(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeKitchenFilter === "all"
                  ? "bg-charcoal-900 text-white"
                  : "text-charcoal-600 hover:bg-cream-100"
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveKitchenFilter("veg");
                setShowAllFoodItems(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeKitchenFilter === "veg"
                  ? "bg-veg-600 text-white"
                  : "text-charcoal-600 hover:bg-veg-50 hover:text-veg-700"
              }`}
            >
              <RestaurantBadge type="veg" size="sm" showLabel={false} />
              <span>Veg Only</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveKitchenFilter("non-veg");
                setShowAllFoodItems(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeKitchenFilter === "non-veg"
                  ? "bg-nonveg-700 text-white"
                  : "text-charcoal-600 hover:bg-nonveg-50 hover:text-nonveg-700"
              }`}
            >
              <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
              <span>Non-Veg Only</span>
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="mb-8">
          <FoodCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              setShowAllFoodItems(false);
            }}
          />
        </div>

        {/* Food Items Grid */}
        {menuLoading ? (
          <p className="py-12 text-center text-sm text-charcoal-500">Loading the latest menu...</p>
        ) : filteredFoods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onAddToCart={handleFoodAddToCart}
                onCustomize={(item) => setCustomizingFood(item)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-cream-300 p-12 text-center bg-white">
            <UtensilsCrossed className="w-10 h-10 text-charcoal-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-charcoal-800">
              No dishes found in this category
            </h4>
            <p className="text-xs text-charcoal-500 mt-1">
              Try selecting &quot;All Items&quot; or clear your filter to see our complete menu.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setActiveKitchenFilter("all");
              }}
              className="mt-4 text-xs font-bold text-primary-600 underline"
            >
              Reset Filters
            </button>
          </div>
        )}
        {!menuLoading && filteredFoods.length > foodDisplayLimit && (
          <div className="mt-8 flex justify-center">
            {activeKitchenFilter === "all" ? (
              <Button
                type="button"
                variant="outline"
                aria-expanded={showAllFoodItems}
                onClick={() => setShowAllFoodItems((showAll) => !showAll)}
              >
                {showAllFoodItems ? "Show fewer" : `View all ${filteredFoods.length} items`}
              </Button>
            ) : (
              <Link
                href={`/restaurants/${activeKitchenFilter}`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-charcoal-700/20 bg-white/60 px-5 text-sm font-medium text-charcoal-800 transition-all hover:border-charcoal-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-700 focus-visible:ring-offset-2"
              >
                View all {activeKitchenFilter === "veg" ? "Veg" : "Non-Veg"} items
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
        </div>
      </section>

      {/* 6. ABOUT SECTION */}
      <section id="about" className="bg-white border-y border-cream-300 py-8 sm:py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative h-44 rounded-2xl overflow-hidden shadow-soft">
                  <Image
                    src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80"
                    alt="Vegetarian Spices and Thali"
                    fill
                    className="object-cover"
                    sizes="250px"
                  />
                </div>
                <div className="rounded-2xl bg-veg-50 border border-veg-200 p-5 text-center">
                  <span className="block text-2xl font-black text-veg-700">100%</span>
                  <span className="text-xs font-semibold text-veg-800">
                    Separate Cookware & Ghee
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="rounded-2xl bg-nonveg-50 border border-nonveg-200 p-5 text-center">
                  <span className="block text-2xl font-black text-nonveg-700">Live</span>
                  <span className="text-xs font-semibold text-nonveg-800">
                    Charcoal Dum Tandoor
                  </span>
                </div>
                <div className="relative h-44 rounded-2xl overflow-hidden shadow-soft">
                  <Image
                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80"
                    alt="Grilled Kebabs on Coals"
                    fill
                    className="object-cover"
                    sizes="250px"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-cream-200 px-3.5 py-1 text-xs font-semibold text-charcoal-800">
                <ShieldCheck className="w-4 h-4 text-success-600" />
                <span>Our Culinary Standard</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl font-bold text-charcoal-900 leading-tight">
                Two Dedicated Kitchens. <br />
                Zero Compromise on Authenticity & Purity.
              </h2>

              <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed">
                Founded with a mission to bring culinary peace of mind to both devout vegetarians and passionate meat lovers, our facility houses two separate commercial kitchens under one client.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RestaurantBadge type="veg" size="sm" showLabel={false} />
                    <h4 className="text-xs font-bold text-charcoal-900">
                      The Pure Veg Promise
                    </h4>
                  </div>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Exclusive veg-only chefs, dedicated refrigeration, separate pantry, and authentic Shuddh Desi Ghee preparations.
                  </p>
                </div>

                <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                    <h4 className="text-xs font-bold text-charcoal-900">
                      The Non-Veg Mastery
                    </h4>
                  </div>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Charcoal bhatti, traditional dum handis, certified fresh cuts, and slow-braised curries rich in secret spice blends.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/restaurants/veg">
                  <Button variant="outline" size="md">
                    <span>Learn More About Our Facility & Standards</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CONTACT & BULK ORDER SECTION */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-cream-300 bg-white p-8 sm:p-12 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Contact Info */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
                  We Are Here to Serve
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-charcoal-900 mt-1">
                  Contact & Bulk Orders
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-2 leading-relaxed">
                  Have a question about food preparation, allergens, or planning a corporate or family party? Reach out directly to our kitchen managers.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-charcoal-700 flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900">Veg Kitchen</h5>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      Sai Baba Dhaba and Family Restaurant, Bhanpur, Bhopal, Madhya Pradesh 462038
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-charcoal-700 flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900">Non-Veg Kitchen</h5>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      New Bhopal Dhaba & Family Restaurant, Opp. Patel Market, Bhanpur, Bhopal, Madhya Pradesh 462038
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-charcoal-700 flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900">Direct Kitchen Hotline</h5>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      +91-9713596109
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-200 text-charcoal-700 flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900">Email Inquiries</h5>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      sahusurendra628@gmail.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-7 bg-cream-50 p-6 sm:p-8 rounded-2xl border border-cream-200">
              <h4 className="text-base font-bold text-charcoal-900 mb-1">
                Send Us a Message or Party Request
              </h4>
              <p className="text-xs text-charcoal-500 mb-6">
                Fill in your details and your request will appear directly in the admin dashboard.
              </p>

              {contactSubmitted ? (
                <Notification
                  type="success"
                  title="Request Recorded!"
                  message="Thank you! Your inquiry has been recorded in the admin dashboard and is ready for review."
                />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const inquiry = {
                      fullName: String(formData.get("fullName") || "").trim(),
                      phone: String(formData.get("phone") || "").trim(),
                      email: String(formData.get("email") || "").trim(),
                      interestedIn: String(formData.get("interestedIn") || "Pure Veg Kitchen Order"),
                      message: String(formData.get("message") || "").trim(),
                      orderQuantity: Number(formData.get("orderQuantity") || 0),
                      estimatedBudget: Number(formData.get("estimatedBudget") || 0),
                      createdAt: new Date().toISOString(),
                    };

                    if (!inquiry.fullName || !inquiry.phone || !inquiry.email || !inquiry.message) {
                      return;
                    }

                    try {
                      const previous = JSON.parse(
                        window.localStorage.getItem("dual-kitchens-bulk-orders") || "[]"
                      );
                      const next = Array.isArray(previous) ? previous : [];
                      next.unshift(inquiry);
                      window.localStorage.setItem("dual-kitchens-bulk-orders", JSON.stringify(next));
                    } catch {
                      // Ignore storage failures silently in unsupported browsers.
                    }

                    event.currentTarget.reset();
                    setContactSubmitted(true);
                    setTimeout(() => setContactSubmitted(false), 5000);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      name="fullName"
                      label="Your Full Name"
                      placeholder="Your Full Name"
                      required
                    />
                    <Input
                      name="phone"
                      label="Phone Number"
                      type="tel"
                      placeholder="Phone Number"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      name="email"
                      label="Email Address"
                      type="email"
                      placeholder="Email Address"
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                        Interested In
                      </label>
                      <select
                        name="interestedIn"
                        defaultValue="Pure Veg Kitchen Order"
                        className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-xs text-charcoal-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option>Pure Veg Kitchen Order</option>
                        <option>Non-Veg Kitchen Order</option>
                        <option>Combined / Catering Bulk Order</option>
                        <option>Feedback / General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                        Approx. Order Quantity
                      </label>
                      <input
                        name="orderQuantity"
                        type="number"
                        min="1"
                        placeholder="e.g. 25"
                        className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-xs text-charcoal-900 placeholder:text-charcoal-500/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                        Estimated Budget (₹)
                      </label>
                      <input
                        name="estimatedBudget"
                        type="number"
                        min="0"
                        placeholder="e.g. 2500"
                        className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-xs text-charcoal-900 placeholder:text-charcoal-500/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                      Your Message or Requirements
                    </label>
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Mention any delivery address, dietary requirements, or headcount..."
                      className="w-full rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-xs text-charcoal-900 placeholder:text-charcoal-500/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      required
                    />
                  </div>

                  <Button type="submit" variant="primary" size="md" className="w-full">
                    <Send className="w-4 h-4 mr-1.5" />
                    <span>Submit Inquiry</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
