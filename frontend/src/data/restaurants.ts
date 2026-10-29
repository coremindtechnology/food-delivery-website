import { Restaurant } from "@/types";

export const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-veg-01",
    slug: "veg",
    name: "Sample Client Pure Veg Kitchen",
    subtitle: "Authentic Pure Vegetarian, South & North Indian Delicacies",
    description:
      "100% pure vegetarian cloud kitchen serving heritage thalis, fresh paneer specialties, crispy dosas, rich gravies, and handcrafted desserts made with pure desi ghee.",
    type: "veg",
    heroImage:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80",
    rating: 4.8,
    reviewCount: 1420,
    deliveryTime: "25-35 min",
    minOrder: 199,
    priceRange: "₹₹ (Affordable Premium)",
    address: "Block 4, Gourmet Plaza, Culinary Avenue, Metro City",
    openingHours: "10:00 AM - 11:30 PM",
    features: [
      "100% Pure Vegetarian Dedicated Kitchen",
      "Pure Desi Ghee & Fresh Farm Produce",
      "Hygienic Tamper-Proof Packaging",
      "Separate Utensils & Strict Segregation",
    ],
    bannerText: "Pure Vegetarian Kitchen • Desi Ghee Specials",
    accentColor: "#16A34A",
  },
  {
    id: "rest-nonveg-02",
    slug: "non-veg",
    name: "Sample Client Non-Veg Grill & Curries",
    subtitle: "Smoky Kebabs, Dum Biryanis, Slow-Cooked Meat & Coastal Seafood",
    description:
      "Specialty non-vegetarian kitchen offering fire-roasted tandoori meats, royal Dum Biryanis, slow-simmered rich curries, and succulent grilled poultry seasoned with whole artisanal spices.",
    type: "non-veg",
    heroImage:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    rating: 4.9,
    reviewCount: 1890,
    deliveryTime: "30-40 min",
    minOrder: 249,
    priceRange: "₹₹₹ (Premium Specialty)",
    address: "Block 5, Gourmet Plaza, Culinary Avenue, Metro City",
    openingHours: "11:00 AM - Midnight",
    features: [
      "Authentic Charcoal Tandoor & Smoker",
      "Tender Halal-Certified Fresh Cuts",
      "Signature Dum Biryani Handis",
      "Dedicated Independent Cooking Facility",
    ],
    bannerText: "Signature Tandoori & Royal Biryanis • Fresh Cuts Daily",
    accentColor: "#DC2626",
  },
];

