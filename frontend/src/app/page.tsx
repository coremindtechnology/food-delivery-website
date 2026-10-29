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
} from "lucide-react";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";
import { SAMPLE_FOODS, CATEGORIES } from "@/data/foods";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { FoodCard } from "@/components/food/FoodCard";
import { FoodCategoryFilter } from "@/components/food/FoodCategoryFilter";
import { FoodCustomizerModal } from "@/components/food/FoodCustomizerModal";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notification } from "@/components/ui/Notification";
import { FoodItem, CartItem } from "@/types";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeKitchenFilter, setActiveKitchenFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [cartAlert, setCartAlert] = useState<string | null>(null);
  const [customizingFood, setCustomizingFood] = useState<FoodItem | null>(null);

  // Filter foods based on category & kitchen selection (excluding unavailable items)
  const filteredFoods = SAMPLE_FOODS.filter((food) => {
    if (food.available === false) return false;
    const matchesCategory =
      selectedCategory === "all" || food.category === selectedCategory;
    const matchesKitchen =
      activeKitchenFilter === "all" || food.restaurantSlug === activeKitchenFilter;
    return matchesCategory && matchesKitchen;
  });

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
    <div className="space-y-16 lg:space-y-24 pb-20">
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

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-cream-50 to-cream-100 pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 border border-cream-300 shadow-soft">
                <span className="flex h-2.5 w-2.5 rounded-full bg-primary-500" />
                <span className="text-xs font-semibold text-charcoal-700 tracking-wide uppercase">
                  Two Dedicated Kitchens • One Seamless Platform
                </span>
              </div>

              {/* Primary Heading */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-charcoal-900 tracking-tight leading-[1.15]">
                Delicious Food, <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-amber-600">
                  Delivered to Your Door
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-charcoal-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Whether you crave 100% Pure Vegetarian heritage recipes prepared with pure desi ghee or succulent charcoal-grilled non-veg curries & biryanis, our two dedicated culinary kitchens have you covered.
              </p>

              {/* Quick Restaurant CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link href="/restaurants/veg" className="w-full sm:w-auto">
                  <Button
                    variant="veg"
                    size="lg"
                    className="w-full sm:w-auto px-6 py-3.5 text-base shadow-lift"
                  >
                    <RestaurantBadge type="veg" size="sm" showLabel={false} />
                    <span>Explore Veg Kitchen</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>

                <Link href="/restaurants/non-veg" className="w-full sm:w-auto">
                  <Button
                    variant="nonveg"
                    size="lg"
                    className="w-full sm:w-auto px-6 py-3.5 text-base shadow-lift"
                  >
                    <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                    <span>Explore Non-Veg Kitchen</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              {/* Key Highlights */}
              <div className="pt-6 border-t border-cream-300 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <p className="text-xl sm:text-2xl font-black text-charcoal-900">100%</p>
                  <p className="text-xs text-charcoal-500 font-medium">Segregated Kitchens</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-charcoal-900">30 Min</p>
                  <p className="text-xs text-charcoal-500 font-medium">Average Delivery</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-charcoal-900">4.9 ★</p>
                  <p className="text-xs text-charcoal-500 font-medium">3,300+ Reviews</p>
                </div>
              </div>
            </div>

            {/* Right Hero Image Composition */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative blob backdrop */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary-200/50 via-cream-300/40 to-veg-200/40 rounded-3xl blur-2xl -z-10" />

                {/* Hero Dish Image Card */}
                <div className="relative overflow-hidden rounded-3xl bg-white p-3 shadow-lift border border-cream-300">
                  <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-2xl">
                    <Image
                      src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80"
                      alt="Gourmet Dining Platter"
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-md bg-veg-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Pure Veg
                        </span>
                        <span className="rounded-md bg-nonveg-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Non-Veg Grill
                        </span>
                      </div>
                      <p className="font-display text-xl font-bold">Two Kitchens, Zero Compromise</p>
                      <p className="text-xs text-white/80">Crafted by master chefs with fresh spices</p>
                    </div>
                  </div>

                  {/* Floating floating card 1 */}
                  <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl p-3 shadow-lift border border-cream-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-veg-100 flex items-center justify-center text-veg-700">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-charcoal-900">Purity Certified</p>
                      <p className="text-[10px] text-charcoal-500">Zero Cross-Contact</p>
                    </div>
                  </div>

                  {/* Floating floating card 2 */}
                  <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-3 shadow-lift border border-cream-200 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-charcoal-900">Charcoal Smoky</p>
                      <p className="text-[10px] text-charcoal-500">Live Tandoor Fire</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESTAURANT SELECTION SECTION */}
      <section id="restaurants" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3.5 py-1 text-xs font-semibold text-charcoal-700">
            <UtensilsCrossed className="w-3.5 h-3.5 text-primary-500" />
            <span>Select Your Restaurant</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-charcoal-900">
            Two Distinct Kitchens, Uncompromised Flavors
          </h2>
          <p className="text-sm sm:text-base text-charcoal-600">
            Both kitchens run independently with dedicated master chefs, specific cookware, and separate dispatch counters to guarantee absolute authenticity.
          </p>
        </div>

        {/* The Two Restaurant Cards Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <RestaurantCard restaurant={vegRestaurant} priority />
          <RestaurantCard restaurant={nonVegRestaurant} priority />
        </div>
      </section>

      {/* 3. PROMOTIONAL BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-amber-600 p-8 sm:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Special Introductory Offer</span>
            </div>
            <h3 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Enjoy Flat 20% OFF on Your First Dual Kitchen Order
            </h3>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
              Order your favorite biryanis, paneer specialties, kebabs, or curries. Use the promotional coupon at checkout to save on both menus.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-charcoal-900/40 rounded-xl px-4 py-2.5 border border-white/20">
                <span className="text-xs uppercase tracking-wider text-white/80">Code:</span>
                <span className="font-mono text-sm font-bold tracking-widest text-amber-300">
                  DUAL20
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPromoApplied(true)}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-primary-600 shadow-md hover:bg-cream-100 transition-all active:scale-95"
              >
                {promoApplied ? "Coupon Copied!" : "Copy Code"}
              </button>
            </div>
          </div>

          {/* Decorative watermark */}
          <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none text-[160px] font-black font-display leading-none text-white select-none hidden md:block">
            20%
          </div>
        </div>
      </section>

      {/* 4. POPULAR CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-charcoal-900">
              Popular Categories
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              Explore freshly prepared dishes crafted by our specialized kitchen teams.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-charcoal-500">Categories from:</span>
            <span className="text-xs font-bold text-veg-700 bg-veg-50 px-2 py-0.5 rounded-md border border-veg-200">
              Veg
            </span>
            <span className="text-xs font-bold text-nonveg-700 bg-nonveg-50 px-2 py-0.5 rounded-md border border-nonveg-200">
              Non-Veg
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`group cursor-pointer flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all duration-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 ${
                selectedCategory === cat.slug
                  ? "border-primary-500 ring-2 ring-primary-500/20"
                  : "border-cream-300 hover:border-primary-300"
              }`}
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden mb-3 bg-cream-200">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="80px"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h4 className="text-xs font-bold text-charcoal-900 group-hover:text-primary-600 transition-colors">
                {cat.name}
              </h4>
              <span className="text-[11px] text-charcoal-500 mt-0.5">
                {cat.itemCount} items
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FEATURED FOOD SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              onClick={() => setActiveKitchenFilter("all")}
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
              onClick={() => setActiveKitchenFilter("veg")}
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
              onClick={() => setActiveKitchenFilter("non-veg")}
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
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Food Items Grid */}
        {filteredFoods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFoods.map((food) => (
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
      </section>

      {/* 6. ABOUT SECTION */}
      <section id="about" className="bg-white border-y border-cream-300 py-16 lg:py-24">
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
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
                    <h5 className="text-xs font-bold text-charcoal-900">Kitchen Facility</h5>
                    <p className="text-xs text-charcoal-600 mt-0.5">
                      Culinary Hub, Blocks 4 & 5, Sector 18, Metro City – 560001
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
                      +91 98765 43210 / +91 98765 43211
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
                      support@dualkitchens.example.com
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
                Fill in your details and our team will get back to you within 15 minutes.
              </p>

              {contactSubmitted ? (
                <Notification
                  type="success"
                  title="Message Received!"
                  message="Thank you! Our kitchen manager will contact you shortly regarding your request."
                />
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Full Name"
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                        Interested In
                      </label>
                      <select className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-xs text-charcoal-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                        <option>Pure Veg Kitchen Order</option>
                        <option>Non-Veg Kitchen Order</option>
                        <option>Combined / Catering Bulk Order</option>
                        <option>Feedback / General Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-1.5">
                      Your Message or Requirements
                    </label>
                    <textarea
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
