/**
 * DEVELOPMENT SEED SCRIPT
 * ─────────────────────────────────────────────────────
 * Populates MongoDB Atlas with clearly-labelled sample
 * data for both restaurants.
 *
 * Usage:
 *   cd frontend
 *   npm run seed
 *
 * Requires: MONGODB_URI in frontend/.env.local
 * ─────────────────────────────────────────────────────
 */

import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";

async function hashPass(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$16384$8$1$${salt}$${derivedKey.toString("hex")}`);
    });
  });
}

// ── Inline connection (avoids Next.js global cache) ───────────────────────────
async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "\n❌  MONGODB_URI is not set.\n" +
        "    Copy frontend/.env.example → frontend/.env.local and fill in your Atlas URI.\n"
    );
    process.exit(1);
  }
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("✅  Connected to MongoDB Atlas");
}

// ── Schemas (minimal inline versions for seed only) ───────────────────────────
const restaurantSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    type: String,
    subtitle: String,
    description: String,
    heroImage: String,
    fssaiLicenseNumber: String,
    contactPhone: String,
    contactEmail: String,
    address: { street: String, city: String, state: String, pincode: String },
    openingHours: { type: String, default: "10:00 AM - 11:30 PM" },
    deliveryTime: String,
    minOrderAmount: { type: Number, default: 199 },
    priceRange: String,
    accentColor: String,
    bannerText: String,
    features: [String],
    rating: { type: Number, default: 4.8 },
    reviewCount: { type: Number, default: 0 },
    isOpen: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    restaurantId: mongoose.Schema.Types.ObjectId,
    name: String,
    slug: String,
    description: String,
    iconName: { type: String, default: "Utensils" },
    image: String,
    sortOrder: { type: Number, default: 0 },
    subcategories: [
      {
        name: String,
        slug: String,
        description: String,
        isActive: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: mongoose.Schema.Types.ObjectId,
    categoryId: mongoose.Schema.Types.ObjectId,
    categorySlug: String,
    subcategorySlug: String,
    name: String,
    slug: String,
    description: String,
    price: Number,
    originalPrice: Number,
    image: String,
    isVeg: Boolean,
    isPopular: { type: Boolean, default: false },
    isChefSpecial: { type: Boolean, default: false },
    spicyLevel: { type: Number, default: 1 },
    preparationTime: { type: String, default: "20-25 min" },
    calories: Number,
    serves: String,
    tags: [String],
    ingredients: [String],
    allergens: [String],
    variants: [
      {
        id: String,
        name: String,
        portionDescription: String,
        price: Number,
        isDefault: { type: Boolean, default: false },
      },
    ],
    addons: [{ id: String, name: String, price: Number }],
    available: { type: Boolean, default: true },
    inStock: { type: Boolean, default: true },
    inventoryCount: { type: Number, default: 100 },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, uppercase: true },
    description: String,
    restaurantId: mongoose.Schema.Types.ObjectId,
    discountType: { type: String, enum: ["percentage", "flat"] },
    discountValue: Number,
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: Number,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    validFrom: Date,
    validUntil: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true },
    phone: String,
    passwordHash: String,
    name: String,
    role: String,
    assignedRestaurantId: mongoose.Schema.Types.ObjectId,
    totpSecret: String,
    totpEncryptedSecret: String,
    totpIV: String,
    totpAuthTag: String,
    totpEnabled: { type: Boolean, default: false },
    totpRecoveryCodes: [String],
    failedLoginAttempts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Guard against hot-reload re-registration
const RestaurantModel =
  mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema);
const CategoryModel =
  mongoose.models.MenuCategory || mongoose.model("MenuCategory", categorySchema);
const MenuItemModel =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);
const CouponModel =
  mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
const AdminUserModel =
  mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);

// ── Sample restaurant data ─────────────────────────────────────────────────────
const vegRestaurantData = {
  name: "Sample Client Pure Veg Kitchen",
  slug: "veg",
  type: "veg",
  subtitle: "Authentic Pure Vegetarian, South & North Indian Delicacies",
  description:
    "100% pure vegetarian cloud kitchen serving heritage thalis, fresh paneer specialties, crispy dosas, rich gravies, and handcrafted desserts made with pure desi ghee.",
  heroImage:
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80",
  fssaiLicenseNumber: "10019011007999",
  contactPhone: "+91-98765-43210",
  contactEmail: "veg@sampleclientkitchen.dev",
  address: {
    street: "Block 4, Gourmet Plaza, Culinary Avenue",
    city: "Metro City",
    state: "Maharashtra",
    pincode: "400001",
  },
  openingHours: "10:00 AM - 11:30 PM",
  deliveryTime: "25-35 min",
  minOrderAmount: 199,
  priceRange: "₹₹",
  accentColor: "#16A34A",
  bannerText: "Pure Vegetarian Kitchen • Desi Ghee Specials",
  features: [
    "100% Pure Vegetarian Dedicated Kitchen",
    "Pure Desi Ghee & Fresh Farm Produce",
    "Hygienic Tamper-Proof Packaging",
    "Separate Utensils & Strict Segregation",
  ],
  rating: 4.8,
  reviewCount: 1420,
  isOpen: true,
};

const nonVegRestaurantData = {
  name: "Sample Client Non-Veg Grill & Curries",
  slug: "non-veg",
  type: "non-veg",
  subtitle: "Smoky Kebabs, Dum Biryanis, Slow-Cooked Meat & Coastal Seafood",
  description:
    "Specialty non-vegetarian kitchen offering fire-roasted tandoori meats, royal Dum Biryanis, slow-simmered rich curries, and succulent grilled poultry seasoned with whole artisanal spices.",
  heroImage:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
  fssaiLicenseNumber: "10019011008000",
  contactPhone: "+91-98765-43211",
  contactEmail: "nonveg@sampleclientkitchen.dev",
  address: {
    street: "Block 5, Gourmet Plaza, Culinary Avenue",
    city: "Metro City",
    state: "Maharashtra",
    pincode: "400001",
  },
  openingHours: "11:00 AM - 12:00 AM",
  deliveryTime: "30-40 min",
  minOrderAmount: 249,
  priceRange: "₹₹₹",
  accentColor: "#DC2626",
  bannerText: "Signature Tandoori & Royal Biryanis • Fresh Cuts Daily",
  features: [
    "Authentic Charcoal Tandoor & Smoker",
    "Tender Halal-Certified Fresh Cuts",
    "Signature Dum Biryani Handis",
    "Dedicated Independent Cooking Facility",
  ],
  rating: 4.9,
  reviewCount: 1890,
  isOpen: true,
};

// ── Sample Categories ──────────────────────────────────────────────────────────
function vegCategories(restaurantId: mongoose.Types.ObjectId) {
  return [
    {
      restaurantId,
      name: "Paneer Specialties",
      slug: "paneer",
      description: "Fresh homemade paneer dishes — rich, creamy, and indulgent",
      iconName: "Flame",
      image:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
      sortOrder: 1,
      subcategories: [
        { name: "Dry Paneer", slug: "dry-paneer", isActive: true },
        { name: "Gravy Paneer", slug: "gravy-paneer", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "South Indian",
      slug: "south-indian",
      description: "Crispy dosas, fluffy idlis, and aromatic sambar",
      iconName: "UtensilsCrossed",
      image:
        "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=400&q=80",
      sortOrder: 2,
      subcategories: [
        { name: "Dosas", slug: "dosas", isActive: true },
        { name: "Idli & Vada", slug: "idli-vada", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "Thalis & Combos",
      slug: "thalis",
      description: "Complete balanced meals served on a traditional thali",
      iconName: "Soup",
      image:
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80",
      sortOrder: 3,
      subcategories: [
        { name: "Mini Thali", slug: "mini-thali", isActive: true },
        { name: "Grand Thali", slug: "grand-thali", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "Desi Ghee Desserts",
      slug: "desserts",
      description: "Handcrafted sweets made with pure desi ghee",
      iconName: "Cake",
      image:
        "https://images.unsplash.com/photo-1624461050280-ae0e92e24d7a?auto=format&fit=crop&w=400&q=80",
      sortOrder: 4,
      subcategories: [],
    },
  ];
}

function nonVegCategories(restaurantId: mongoose.Types.ObjectId) {
  return [
    {
      restaurantId,
      name: "Royal Biryanis",
      slug: "biryanis",
      description: "Authentic Dum cooked biryanis with fragrant basmati rice",
      iconName: "Flame",
      image:
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
      sortOrder: 1,
      subcategories: [
        { name: "Chicken Biryani", slug: "chicken-biryani", isActive: true },
        { name: "Mutton Biryani", slug: "mutton-biryani", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "Tandoori & Starters",
      slug: "starters",
      description: "Fire-roasted kebabs and smoky tandoori appetizers",
      iconName: "UtensilsCrossed",
      image:
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80",
      sortOrder: 2,
      subcategories: [
        { name: "Tandoori Skewers", slug: "tandoori-skewers", isActive: true },
        { name: "Crispy Starters", slug: "crispy-starters", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "Rich Gravies & Curries",
      slug: "curries",
      description: "Slow-simmered gravies with aromatic whole spices",
      iconName: "Soup",
      image:
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80",
      sortOrder: 3,
      subcategories: [
        { name: "Chicken Gravies", slug: "chicken-gravies", isActive: true },
        { name: "Mutton Curries", slug: "mutton-curries", isActive: true },
      ],
    },
    {
      restaurantId,
      name: "Coastal Seafood",
      slug: "seafood",
      description: "Fresh catch curries and grills with coastal spices",
      iconName: "Fish",
      image:
        "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=400&q=80",
      sortOrder: 4,
      subcategories: [
        { name: "Fish Specials", slug: "fish-specials", isActive: true },
        { name: "Prawn Dishes", slug: "prawn-dishes", isActive: true },
      ],
    },
  ];
}

// ── Sample Menu Items ──────────────────────────────────────────────────────────
function vegMenuItems(
  restaurantId: mongoose.Types.ObjectId,
  categoryMap: Record<string, mongoose.Types.ObjectId>
) {
  return [
    {
      restaurantId,
      categoryId: categoryMap["paneer"],
      categorySlug: "paneer",
      subcategorySlug: "gravy-paneer",
      name: "Paneer Butter Masala",
      slug: "paneer-butter-masala",
      description:
        "Soft cottage cheese cubes in a velvety tomato-cashew gravy finished with cream and desi ghee. A timeless North Indian classic.",
      price: 299,
      originalPrice: 349,
      image:
        "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
      isVeg: true,
      isPopular: true,
      isChefSpecial: false,
      spicyLevel: 1,
      preparationTime: "20-25 min",
      calories: 420,
      serves: "1-2",
      tags: ["paneer", "gravy", "north-indian", "popular"],
      ingredients: ["Paneer", "Tomato", "Cashew", "Cream", "Butter", "Spices"],
      allergens: ["Dairy"],
      variants: [
        { id: "v1", name: "Half", portionDescription: "250g", price: 299, isDefault: true },
        { id: "v2", name: "Full", portionDescription: "500g", price: 549, isDefault: false },
      ],
      addons: [
        { id: "a1", name: "Extra Roti", price: 30 },
        { id: "a2", name: "Extra Gravy", price: 50 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["paneer"],
      categorySlug: "paneer",
      subcategorySlug: "dry-paneer",
      name: "Paneer Tikka",
      slug: "paneer-tikka",
      description:
        "Marinated cottage cheese cubes grilled in a charcoal tandoor with bell peppers and onions. Served with mint chutney.",
      price: 249,
      originalPrice: 299,
      image:
        "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80",
      isVeg: true,
      isPopular: true,
      isChefSpecial: true,
      spicyLevel: 2,
      preparationTime: "25-30 min",
      calories: 380,
      serves: "2",
      tags: ["paneer", "tandoori", "starter", "popular", "chef-special"],
      ingredients: ["Paneer", "Bell Peppers", "Onion", "Yogurt", "Spices"],
      allergens: ["Dairy"],
      variants: [],
      addons: [{ id: "a3", name: "Extra Chutney", price: 20 }],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["south-indian"],
      categorySlug: "south-indian",
      subcategorySlug: "dosas",
      name: "Masala Dosa",
      slug: "masala-dosa",
      description:
        "Crispy golden rice-lentil crepe stuffed with spiced potato masala. Served with coconut chutney and sambhar.",
      price: 149,
      image:
        "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=400&q=80",
      isVeg: true,
      isPopular: true,
      isChefSpecial: false,
      spicyLevel: 1,
      preparationTime: "15-20 min",
      calories: 340,
      serves: "1",
      tags: ["south-indian", "dosa", "breakfast", "popular"],
      ingredients: ["Rice Batter", "Lentil Batter", "Potato", "Onion", "Spices"],
      allergens: [],
      variants: [
        { id: "v3", name: "Regular", portionDescription: "1 piece", price: 149, isDefault: true },
        {
          id: "v4",
          name: "Ghee Roast",
          portionDescription: "Extra crispy with ghee",
          price: 179,
          isDefault: false,
        },
      ],
      addons: [
        { id: "a4", name: "Extra Sambhar", price: 30 },
        { id: "a5", name: "Extra Chutney", price: 20 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["thalis"],
      categorySlug: "thalis",
      subcategorySlug: "grand-thali",
      name: "Grand Veg Thali",
      slug: "grand-veg-thali",
      description:
        "A royal spread with 2 sabzis, dal makhani, paneer dish, 4 rotis, rice, raita, papad, pickle, and gulab jamun.",
      price: 399,
      originalPrice: 499,
      image:
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80",
      isVeg: true,
      isPopular: true,
      isChefSpecial: true,
      spicyLevel: 1,
      preparationTime: "20-30 min",
      calories: 900,
      serves: "1-2",
      tags: ["thali", "combo", "value", "popular", "chef-special"],
      ingredients: ["Roti", "Rice", "Dal", "Paneer", "Sabzi", "Raita", "Dessert"],
      allergens: ["Dairy", "Gluten"],
      variants: [],
      addons: [
        { id: "a6", name: "Extra Roti (2 pcs)", price: 40 },
        { id: "a7", name: "Extra Dessert", price: 60 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["desserts"],
      categorySlug: "desserts",
      subcategorySlug: undefined,
      name: "Gulab Jamun",
      slug: "gulab-jamun",
      description:
        "Soft milk-solid dumplings soaked in rose-cardamom sugar syrup. Served warm with a scoop of vanilla ice cream.",
      price: 99,
      image:
        "https://images.unsplash.com/photo-1624461050280-ae0e92e24d7a?auto=format&fit=crop&w=400&q=80",
      isVeg: true,
      isPopular: false,
      isChefSpecial: false,
      spicyLevel: 0,
      preparationTime: "5 min",
      calories: 320,
      serves: "1",
      tags: ["dessert", "sweet", "traditional"],
      ingredients: ["Milk Solids", "Sugar", "Rose Water", "Cardamom"],
      allergens: ["Dairy"],
      variants: [
        {
          id: "v5",
          name: "2 Pieces",
          portionDescription: "2 pieces",
          price: 99,
          isDefault: true,
        },
        {
          id: "v6",
          name: "4 Pieces",
          portionDescription: "4 pieces",
          price: 179,
          isDefault: false,
        },
      ],
      addons: [{ id: "a8", name: "Add Ice Cream", price: 50 }],
      available: true,
    },
  ];
}

function nonVegMenuItems(
  restaurantId: mongoose.Types.ObjectId,
  categoryMap: Record<string, mongoose.Types.ObjectId>
) {
  return [
    {
      restaurantId,
      categoryId: categoryMap["biryanis"],
      categorySlug: "biryanis",
      subcategorySlug: "chicken-biryani",
      name: "Chicken Dum Biryani",
      slug: "chicken-dum-biryani",
      description:
        "Fragrant basmati rice slow-cooked with tender chicken in a sealed handi using the royal Dum technique. Served with raita and salan.",
      price: 349,
      originalPrice: 399,
      image:
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
      isVeg: false,
      isPopular: true,
      isChefSpecial: true,
      spicyLevel: 2,
      preparationTime: "35-45 min",
      calories: 680,
      serves: "1-2",
      tags: ["biryani", "chicken", "popular", "chef-special", "dum"],
      ingredients: ["Basmati Rice", "Chicken", "Saffron", "Whole Spices", "Fried Onions", "Ghee"],
      allergens: ["Dairy"],
      variants: [
        { id: "v1", name: "Regular", portionDescription: "400g", price: 349, isDefault: true },
        { id: "v2", name: "Large", portionDescription: "700g", price: 599, isDefault: false },
      ],
      addons: [
        { id: "a1", name: "Extra Raita", price: 40 },
        { id: "a2", name: "Boiled Egg (2)", price: 30 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["biryanis"],
      categorySlug: "biryanis",
      subcategorySlug: "mutton-biryani",
      name: "Mutton Dum Biryani",
      slug: "mutton-dum-biryani",
      description:
        "Tender slow-cooked mutton pieces layered with saffron-infused basmati rice and sealed with dough. The flagship royal biryani.",
      price: 449,
      originalPrice: 520,
      image:
        "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80",
      isVeg: false,
      isPopular: true,
      isChefSpecial: true,
      spicyLevel: 2,
      preparationTime: "45-55 min",
      calories: 780,
      serves: "1-2",
      tags: ["biryani", "mutton", "popular", "chef-special", "premium"],
      ingredients: ["Basmati Rice", "Mutton", "Saffron", "Whole Spices", "Caramelised Onions"],
      allergens: ["Dairy"],
      variants: [
        { id: "v3", name: "Regular", portionDescription: "450g", price: 449, isDefault: true },
        { id: "v4", name: "Large", portionDescription: "750g", price: 749, isDefault: false },
      ],
      addons: [{ id: "a3", name: "Extra Raita", price: 40 }],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["starters"],
      categorySlug: "starters",
      subcategorySlug: "tandoori-skewers",
      name: "Tandoori Chicken",
      slug: "tandoori-chicken",
      description:
        "Whole chicken leg marinated overnight in yogurt and 22 whole spices, roasted in a 900°C charcoal tandoor till perfectly charred.",
      price: 349,
      image:
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80",
      isVeg: false,
      isPopular: true,
      isChefSpecial: false,
      spicyLevel: 2,
      preparationTime: "30-35 min",
      calories: 520,
      serves: "2",
      tags: ["tandoori", "chicken", "starter", "popular", "grilled"],
      ingredients: ["Chicken", "Yogurt", "Tandoori Masala", "Lemon", "Ginger-Garlic"],
      allergens: ["Dairy"],
      variants: [
        { id: "v5", name: "Half", portionDescription: "2 pieces", price: 349, isDefault: true },
        { id: "v6", name: "Full", portionDescription: "4 pieces", price: 649, isDefault: false },
      ],
      addons: [
        { id: "a4", name: "Mint Chutney", price: 20 },
        { id: "a5", name: "Onion Laccha", price: 30 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["curries"],
      categorySlug: "curries",
      subcategorySlug: "chicken-gravies",
      name: "Butter Chicken",
      slug: "butter-chicken",
      description:
        "Succulent tandoori chicken pieces simmered in a rich, mildly spiced tomato-cashew-cream gravy. The iconic North Indian favourite.",
      price: 319,
      originalPrice: 369,
      image:
        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80",
      isVeg: false,
      isPopular: true,
      isChefSpecial: false,
      spicyLevel: 1,
      preparationTime: "25-30 min",
      calories: 580,
      serves: "1-2",
      tags: ["chicken", "gravy", "popular", "mild", "north-indian"],
      ingredients: ["Chicken", "Tomato", "Cashew", "Cream", "Butter", "Fenugreek"],
      allergens: ["Dairy"],
      variants: [
        { id: "v7", name: "Half", portionDescription: "250g", price: 319, isDefault: true },
        { id: "v8", name: "Full", portionDescription: "500g", price: 589, isDefault: false },
      ],
      addons: [
        { id: "a6", name: "Extra Roti", price: 30 },
        { id: "a7", name: "Extra Gravy", price: 50 },
      ],
      available: true,
    },
    {
      restaurantId,
      categoryId: categoryMap["seafood"],
      categorySlug: "seafood",
      subcategorySlug: "fish-specials",
      name: "Coastal Fish Curry",
      slug: "coastal-fish-curry",
      description:
        "Fresh river fish simmered in a tangy coconut-tamarind gravy with coastal spices. Best enjoyed with steamed rice.",
      price: 399,
      image:
        "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=400&q=80",
      isVeg: false,
      isPopular: false,
      isChefSpecial: true,
      spicyLevel: 3,
      preparationTime: "30-40 min",
      calories: 460,
      serves: "1-2",
      tags: ["seafood", "fish", "coastal", "chef-special", "spicy"],
      ingredients: ["Fish", "Coconut Milk", "Tamarind", "Coastal Spices", "Onion", "Tomato"],
      allergens: ["Fish"],
      variants: [],
      addons: [{ id: "a8", name: "Steamed Rice", price: 60 }],
      available: true,
    },
  ];
}

// ── Main seed function ─────────────────────────────────────────────────────────
async function seed() {
  await connect();

  console.log("\n🗑️   Clearing existing seed data...");
  await Promise.all([
    RestaurantModel.deleteMany({ slug: { $in: ["veg", "non-veg"] } }),
    CategoryModel.deleteMany({}),
    MenuItemModel.deleteMany({}),
  ]);
  console.log("    ✔ Cleared restaurants, categories, menu items");

  // ── Seed Restaurants
  console.log("\n🌱  Seeding restaurants...");
  const [vegRest, nonVegRest] = await Promise.all([
    RestaurantModel.create(vegRestaurantData),
    RestaurantModel.create(nonVegRestaurantData),
  ]);
  console.log(`    ✔ Veg Restaurant      → _id: ${vegRest._id}`);
  console.log(`    ✔ Non-Veg Restaurant  → _id: ${nonVegRest._id}`);

  // ── Seed Categories
  console.log("\n🌱  Seeding categories...");
  const vegCats = await CategoryModel.insertMany(vegCategories(vegRest._id));
  const nonVegCats = await CategoryModel.insertMany(nonVegCategories(nonVegRest._id));

  const vegCatMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of vegCats) {
    vegCatMap[cat.slug as string] = cat._id as mongoose.Types.ObjectId;
  }

  const nonVegCatMap: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of nonVegCats) {
    nonVegCatMap[cat.slug as string] = cat._id as mongoose.Types.ObjectId;
  }

  console.log(`    ✔ Veg categories     → ${vegCats.length} created`);
  console.log(`    ✔ Non-Veg categories → ${nonVegCats.length} created`);

  // ── Seed Menu Items
  console.log("\n🌱  Seeding menu items...");
  const vegItems = await MenuItemModel.insertMany(
    vegMenuItems(vegRest._id, vegCatMap)
  );
  const nonVegItems = await MenuItemModel.insertMany(
    nonVegMenuItems(nonVegRest._id, nonVegCatMap)
  );
  console.log(`    ✔ Veg menu items     → ${vegItems.length} created`);
  console.log(`    ✔ Non-Veg menu items → ${nonVegItems.length} created`);

  // ── Seed Coupons
  console.log("\n🌱  Seeding coupons...");
  const sampleCoupons = [
    {
      code: "WELCOME50",
      description: "50% off on your first order up to ₹150",
      discountType: "percentage",
      discountValue: 50,
      minOrderAmount: 199,
      maxDiscountAmount: 150,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      code: "FEAST100",
      description: "Flat ₹100 off on gourmet orders above ₹499",
      discountType: "flat",
      discountValue: 100,
      minOrderAmount: 499,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ];
  await CouponModel.deleteMany({});
  const createdCoupons = await CouponModel.insertMany(sampleCoupons);
  console.log(`    ✔ Promotional coupons → ${createdCoupons.length} created`);

  // ── Summary
  console.log("\n✅  Seed complete!");
  console.log("─────────────────────────────────────────────");
  console.log(`    Restaurants : 2`);
  console.log(`    Categories  : ${vegCats.length + nonVegCats.length}`);
  console.log(`    Menu Items  : ${vegItems.length + nonVegItems.length}`);
  console.log(`    Coupons     : ${createdCoupons.length}`);
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  mongoose.disconnect();
  process.exit(1);
});

