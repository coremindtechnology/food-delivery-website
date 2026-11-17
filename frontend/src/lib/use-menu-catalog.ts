"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, SAMPLE_FOODS } from "@/data/foods";
import { Category, FoodItem } from "@/types";

type RestaurantSlug = "veg" | "non-veg";
type CatalogCategory = Category & { restaurantType: RestaurantSlug | "both" };
type Catalog = { foods: FoodItem[]; categories: CatalogCategory[]; restaurantIds: Record<string, string> };

interface ApiMenuItem {
  _id: string;
  restaurantId: string;
  categorySlug: string;
  subcategorySlug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  isVeg: boolean;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  spicyLevel?: number;
  rating?: number;
  reviewsCount?: number;
  preparationTime?: string;
  calories?: number;
  tags?: string[];
  ingredients?: string[];
  allergens?: string[];
  variants?: FoodItem["variants"];
  addons?: FoodItem["addons"];
  available: boolean;
  serves?: string;
}

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  iconName?: string;
  image?: string;
  subcategories?: { _id?: string; name: string; slug: string }[];
}

const initialCatalog: Catalog = {
  foods: [],
  categories: CATEGORIES.map((category) => ({
    ...category,
    restaurantType: category.restaurantType === "both" ? "both" : "veg",
  })),
  restaurantIds: {},
};

export function useMenuCatalog(restaurant: RestaurantSlug | "all") {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const slugs: RestaurantSlug[] = restaurant === "all" ? ["veg", "non-veg"] : [restaurant];
    const fallbackCategories = (slug: RestaurantSlug): CatalogCategory[] =>
      CATEGORIES.map((category) => ({
        ...category,
        restaurantType: slug,
      }));

    async function load() {
      const menus = await Promise.all(
        slugs.map(async (slug) => {
          try {
            const response = await fetch(`/api/restaurants/${slug}/menu?limit=100`);
            const result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.error || `Unable to load the ${slug} menu.`);
            }

            const menuData = result.data as {
              restaurant: { _id: string };
              items: ApiMenuItem[];
              categories: ApiCategory[];
            };
            const foods: FoodItem[] = menuData.items.map((item) => ({
              id: item._id,
              name: item.name,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              image: item.image,
              category: item.categorySlug,
              subcategory: item.subcategorySlug,
              restaurantId: item.restaurantId,
              restaurantSlug: slug,
              isVeg: item.isVeg,
              isPopular: item.isPopular,
              isChefSpecial: item.isChefSpecial,
              spicyLevel: item.spicyLevel === 0 || item.spicyLevel === 2 || item.spicyLevel === 3
                ? item.spicyLevel
                : 1,
              rating: item.rating ?? 4.8,
              reviewsCount: item.reviewsCount ?? 0,
              preparationTime: item.preparationTime || "20-25 min",
              calories: item.calories,
              tags: item.tags,
              available: item.available,
              variants: item.variants,
              addons: item.addons,
              allergens: item.allergens,
              serves: item.serves,
              ingredients: item.ingredients,
            }));
            const categories = menuData.categories.map((category) => ({
              id: category._id,
              name: category.name,
              slug: category.slug,
              iconName: category.iconName || "Utensils",
              image:
                category.image ||
                CATEGORIES.find((fallback) => fallback.slug === category.slug)?.image ||
                CATEGORIES[0].image,
              itemCount: foods.filter((food) => food.category === category.slug).length,
              restaurantType: slug,
              subcategories: category.subcategories?.map((subcategory) => ({
                id: subcategory._id || subcategory.slug,
                name: subcategory.name,
                slug: subcategory.slug,
              })),
            }));
            return { slug, restaurantId: menuData.restaurant._id, foods, categories, error: "" };
          } catch (cause) {
            return {
              slug,
              restaurantId: "",
              foods: SAMPLE_FOODS.filter((food) => food.restaurantSlug === slug),
              categories: fallbackCategories(slug),
              error: cause instanceof Error ? cause.message : `Unable to load the ${slug} menu.`,
            };
          }
        })
      );

      if (!active) return;
      setCatalog({
        foods: menus.flatMap((menu) => menu.foods),
        categories: menus.flatMap((menu) => menu.categories),
        restaurantIds: Object.fromEntries(
          menus.filter((menu) => menu.restaurantId).map((menu) => [menu.slug, menu.restaurantId])
        ),
      });
      setError(
        menus.some((menu) => menu.error)
          ? `Live menu partially unavailable; sample data is shown where needed. ${menus
              .filter((menu) => menu.error)
              .map((menu) => `${menu.slug}: ${menu.error}`)
              .join(" ")}`
          : ""
      );
      setLoading(false);
    }

    setLoading(true);
    load();
    return () => {
      active = false;
    };
  }, [restaurant]);

  return { ...catalog, loading, error };
}
