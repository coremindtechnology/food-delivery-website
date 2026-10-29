"use client";

import React, { useState, use, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Clock,
  Flame,
  Info,
  Check,
  Plus,
  Minus,
  ShieldCheck,
  Share2,
  Heart,
  UtensilsCrossed,
} from "lucide-react";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";
import { SAMPLE_FOODS } from "@/data/foods";
import { FoodItem, ItemVariant, ItemAddon, CartItem } from "@/types";
import { RestaurantBadge } from "@/components/restaurant/RestaurantBadge";
import { FoodCard } from "@/components/food/FoodCard";
import { Button } from "@/components/ui/Button";
import { Notification } from "@/components/ui/Notification";
import { formatCurrency, cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

interface PageProps {
  params: Promise<{
    slug: string;
    itemId: string;
  }>;
}

export default function FoodItemDetailsPage({ params }: PageProps) {
  const instructionsId = useId();
  const { slug, itemId } = use(params);

  // Validate restaurant slug
  if (slug !== "veg" && slug !== "non-veg") {
    notFound();
  }

  // Find restaurant and food item
  const restaurant = SAMPLE_RESTAURANTS.find((r) => r.slug === slug);
  const food = SAMPLE_FOODS.find((f) => f.id === itemId && f.restaurantSlug === slug);

  if (!restaurant || !food) {
    notFound();
  }

  // Customization state
  const defaultVariant = food.variants?.find((v) => v.isDefault) || food.variants?.[0];
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(defaultVariant);
  const [selectedAddons, setSelectedAddons] = useState<ItemAddon[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Related recommended items from the same restaurant (Strictly matching slug and available)
  const relatedFoods = SAMPLE_FOODS.filter(
    (item) =>
      item.restaurantSlug === slug &&
      item.id !== food.id &&
      item.available !== false &&
      (item.category === food.category || item.isPopular)
  ).slice(0, 3);

  // Pricing calculations
  const basePrice = selectedVariant ? selectedVariant.price : food.price;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const singleItemPrice = basePrice + addonsTotal;
  const totalPrice = singleItemPrice * quantity;

  const handleToggleAddon = (addon: ItemAddon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(
      {
        menuItemId: food.id,
        name: food.name,
        image: food.image,
        isVeg: food.isVeg,
        price: selectedVariant ? selectedVariant.price : food.price,
        quantity,
        variant: selectedVariant
          ? {
              id: selectedVariant.id,
              name: selectedVariant.name,
              price: selectedVariant.price,
            }
          : undefined,
        addons: selectedAddons.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
        })),
        specialInstructions: specialInstructions.trim() || undefined,
      },
      {
        id: restaurant.id,
        slug: restaurant.slug as "veg" | "non-veg",
        name: restaurant.name,
        minOrder: restaurant.minOrder,
      }
    );

    setToastMessage(
      `Added ${quantity}x ${food.name} (${selectedVariant?.name || "Regular"}) to order!`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isVeg = restaurant.type === "veg";

  return (
    <div className="pb-24 pt-4 sm:pt-8 bg-cream-50/60 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5">
          <Notification
            type="success"
            title="Item Added to Order"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/restaurants/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {restaurant.name}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-white px-3 py-1 shadow-sm border border-cream-200">
              <RestaurantBadge type={food.isVeg ? "veg" : "non-veg"} size="sm" />
            </span>
          </div>
        </div>

        {/* Main Item Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Image & Highlights (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative h-72 sm:h-96 md:h-[420px] w-full overflow-hidden rounded-3xl bg-cream-200 shadow-card border border-cream-200">
              <Image
                src={food.image}
                alt={food.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 650px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent" />

              {/* Floating Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {food.isChefSpecial && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/95 px-3 py-1 text-xs font-bold text-white shadow-md uppercase backdrop-blur-sm">
                    <Flame className="w-3.5 h-3.5" /> Chef Special
                  </span>
                )}
                {food.isPopular && (
                  <span className="rounded-xl bg-primary-500/95 px-3 py-1 text-xs font-bold text-white shadow-md uppercase backdrop-blur-sm">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Rating on bottom left */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                <div className="flex items-center gap-1 rounded-xl bg-charcoal-900/80 px-3 py-1 backdrop-blur-sm text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{food.rating.toFixed(1)}</span>
                  <span className="text-white/70">({food.reviewsCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-charcoal-900/80 px-3 py-1 backdrop-blur-sm text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-white/80" />
                  <span>{food.preparationTime}</span>
                </div>
              </div>
            </div>

            {/* Ingredients & Dietary Purity Guarantee */}
            <div className="rounded-3xl border border-cream-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-charcoal-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary-500" />
                <span>Culinary Profile & Ingredients</span>
              </h3>

              {food.ingredients && food.ingredients.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                    Key Ingredients
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {food.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-medium text-charcoal-700"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {food.allergens && food.allergens.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                    Allergen Information
                  </p>
                  <p className="text-xs text-charcoal-600">
                    Contains: {food.allergens.join(", ")}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-cream-200 flex items-center gap-2 text-xs text-charcoal-500">
                <ShieldCheck className={cn("w-4 h-4", isVeg ? "text-veg-600" : "text-nonveg-700")} />
                <span>
                  {isVeg
                    ? "Prepared in our certified 100% Pure Vegetarian segregated kitchen."
                    : "Prepared fresh over live charcoal with certified fresh cuts daily."}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Customization & Ordering Box (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-cream-300 bg-white p-6 sm:p-8 shadow-card space-y-6">
              {/* Dish Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                    {restaurant.name}
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-charcoal-900 leading-tight">
                  {food.name}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-2 leading-relaxed">
                  {food.description}
                </p>

                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-2xl font-black text-charcoal-900">
                    {formatCurrency(basePrice)}
                  </span>
                  {food.originalPrice && (
                    <span className="text-sm text-charcoal-400 line-through">
                      {formatCurrency(food.originalPrice)}
                    </span>
                  )}
                  {food.serves && (
                    <span className="text-xs font-medium text-charcoal-500 ml-2">
                      ({food.serves})
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Variants Selection */}
              {food.variants && food.variants.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-cream-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                      Select Portion Size
                    </h3>
                    <span className="text-[10px] font-bold uppercase text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                      Required
                    </span>
                  </div>

                  <div className="space-y-2">
                    {food.variants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <label
                          key={variant.id}
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all",
                            isSelected
                              ? isVeg
                                ? "border-veg-600 bg-veg-50/70 shadow-sm"
                                : "border-nonveg-700 bg-nonveg-50/70 shadow-sm"
                              : "border-cream-300 hover:bg-cream-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="detail-variant"
                              value={variant.id}
                              checked={isSelected}
                              onChange={() => setSelectedVariant(variant)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-charcoal-900">
                                {variant.name}
                              </p>
                              {variant.portionDescription && (
                                <p className="text-[11px] text-charcoal-500">
                                  {variant.portionDescription}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-charcoal-900">
                            {formatCurrency(variant.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Add-ons & Extras */}
              {food.addons && food.addons.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-cream-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                      Add-ons & Extras
                    </h3>
                    <span className="text-[11px] text-charcoal-500">Optional</span>
                  </div>

                  <div className="space-y-2">
                    {food.addons.map((addon) => {
                      const isChecked = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all",
                            isChecked
                              ? "border-primary-500 bg-primary-50/50 shadow-sm"
                              : "border-cream-300 hover:bg-cream-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleAddon(addon)}
                              className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs font-semibold text-charcoal-800">
                              {addon.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-primary-600">
                            +{formatCurrency(addon.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Special Preparation Instructions */}
              <div className="space-y-2 pt-4 border-t border-cream-200">
                <label
                  htmlFor={instructionsId}
                  className="block text-xs font-bold uppercase tracking-wider text-charcoal-900"
                >
                  Special Preparation Instructions
                </label>
                <textarea
                  id={instructionsId}
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, extra crispy, less oil, no coriander..."
                  className="w-full rounded-2xl border border-cream-300 bg-cream-50/50 p-3 text-xs text-charcoal-800 placeholder:text-charcoal-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Quantity Selector & Confirm Add to Order */}
              <div className="pt-4 border-t border-cream-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3 bg-cream-100 p-1 rounded-2xl border border-cream-300">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-charcoal-700 shadow-sm disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-charcoal-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-charcoal-700 shadow-sm"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={isVeg ? "veg" : "nonveg"}
                  size="lg"
                  onClick={handleAddToCart}
                  className="w-full justify-between shadow-lift h-12"
                >
                  <span>Add to Order</span>
                  <span className="font-bold">{formatCurrency(totalPrice)}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Dishes from this restaurant */}
        {relatedFoods.length > 0 && (
          <section className="pt-10 border-t border-cream-300 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal-900">
                  More Dishes from {restaurant.name}
                </h2>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Handcrafted favorites with the same kitchen purity promise
                </p>
              </div>
              <Link
                href={`/restaurants/${slug}`}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                View Complete Menu →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedFoods.map((relFood) => (
                <FoodCard
                  key={relFood.id}
                  food={relFood}
                  onAddToCart={() => {
                    setToastMessage(`Added "${relFood.name}" to your order!`);
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

