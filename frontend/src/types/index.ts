export type RestaurantType = "veg" | "non-veg";

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  type: RestaurantType;
  heroImage: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  minOrder: number;
  priceRange: string;
  address: string;
  openingHours: string;
  features: string[];
  bannerText?: string;
  accentColor: string;
}

export interface ItemVariant {
  id: string;
  name: "Regular" | "Medium" | "Large" | string;
  portionDescription?: string;
  price: number;
  isDefault?: boolean;
}

export interface ItemAddon {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory?: string;
  restaurantId: string;
  restaurantSlug: "veg" | "non-veg";
  isVeg: boolean;
  isPopular?: boolean;
  isChefSpecial?: boolean;
  spicyLevel?: 0 | 1 | 2 | 3;
  rating: number;
  reviewsCount: number;
  preparationTime: string;
  calories?: number;
  tags?: string[];
  available: boolean;
  variants?: ItemVariant[];
  addons?: ItemAddon[];
  allergens?: string[];
  serves?: string;
  ingredients?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  image: string;
  itemCount: number;
  restaurantType?: RestaurantType | "both";
  subcategories?: { id: string; name: string; slug: string }[];
}

export interface CartItem {
  food: FoodItem;
  quantity: number;
  selectedVariant?: ItemVariant;
  selectedAddons?: ItemAddon[];
  specialInstructions?: string;
  itemTotalPrice: number;
}
