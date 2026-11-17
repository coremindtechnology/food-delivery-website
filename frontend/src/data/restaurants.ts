import { Restaurant } from "@/types";

export const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-veg-01",
    slug: "veg",
    name: "Sai Baba Dhaba and Family Restaurant",
    subtitle: "Vegetarian food only",
    description:
      "Order vegetarian food from Sai Baba Dhaba and Family Restaurant in Bhanpur, Bhopal.",
    type: "veg",
    heroImage:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80",
    deliveryTime: "25-35 min",
    minOrder: 199,
    priceRange: "₹₹ (Affordable Premium)",
    address: "Bhanpur, Bhopal, Madhya Pradesh 462038",
    locationUrl: "https://maps.app.goo.gl/cREz6pG8HysQum9u8",
    openingHours: "10:00 AM - 11:30 PM",
    features: ["Vegetarian food only"],
    bannerText: "Vegetarian food only",
    accentColor: "#16A34A",
  },
  {
    id: "rest-nonveg-02",
    slug: "non-veg",
    name: "New Bhopal Dhaba & Family Restaurant",
    subtitle: "Non-vegetarian food only",
    description:
      "Order non-vegetarian food from New Bhopal Dhaba & Family Restaurant in Bhanpur, Bhopal.",
    type: "non-veg",
    heroImage:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    deliveryTime: "30-40 min",
    minOrder: 249,
    priceRange: "₹₹₹ (Premium Specialty)",
    address: "Opp. Patel Market, Bhanpur, Bhopal, Madhya Pradesh 462038",
    locationUrl: "https://maps.app.goo.gl/D4qxRUxwGrypBEFC6?g_st=aw",
    openingHours: "11:00 AM - Midnight",
    features: ["Non-vegetarian food only"],
    bannerText: "Non-vegetarian food only",
    accentColor: "#DC2626",
  },
];
