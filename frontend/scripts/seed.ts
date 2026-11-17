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

const customerSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, required: true },
    name: String,
    email: String,
    isVerified: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const deliveryPersonnelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    status: { type: String, default: "available" },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, uppercase: true, required: true },
    restaurantId: mongoose.Schema.Types.ObjectId,
    restaurantSlug: String,
    fulfillmentType: { type: String, default: "delivery" },
    customerId: mongoose.Schema.Types.ObjectId,
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    items: [
      {
        menuItemId: mongoose.Schema.Types.ObjectId,
        name: String,
        image: String,
        isVeg: Boolean,
        price: Number,
        quantity: Number,
        itemTotalPrice: Number,
      },
    ],
    subtotal: Number,
    deliveryFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: String,
    totalAmount: Number,
    paymentMethod: { type: String, default: "cod" },
    paymentStatus: { type: String, default: "paid" },
    orderStatus: { type: String, default: "new" },
    placedAt: { type: Date, default: Date.now },
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
const CustomerModel =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
const DeliveryPersonnelModel =
  mongoose.models.DeliveryPersonnel || mongoose.model("DeliveryPersonnel", deliveryPersonnelSchema);
const OrderModel =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

// ── Sample restaurant data ─────────────────────────────────────────────────────
const vegRestaurantData = {
  name: "Sai Baba Dhaba and Family Restaurant",
  slug: "veg",
  type: "veg",
  subtitle: "Vegetarian food only",
  description: "Vegetarian food served in Bhanpur, Bhopal.",
  heroImage:
    "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80",
  fssaiLicenseNumber: "10019011007999",
  contactPhone: "+91-98765-43210",
  contactEmail: "veg@sampleclientkitchen.dev",
  address: {
    street: "Sai Baba Dhaba and Family Restaurant, Bhanpur",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462038",
  },
  openingHours: "10:00 AM - 11:30 PM",
  deliveryTime: "25-35 min",
  minOrderAmount: 199,
  priceRange: "₹₹",
  accentColor: "#16A34A",
  bannerText: "Vegetarian food only",
  features: ["Vegetarian food only"],
  rating: 4.8,
  reviewCount: 1420,
  isOpen: true,
};

const nonVegRestaurantData = {
  name: "New Bhopal Dhaba & Family Restaurant",
  slug: "non-veg",
  type: "non-veg",
  subtitle: "Non-vegetarian food only",
  description: "Non-vegetarian food served in Bhanpur, Bhopal.",
  heroImage:
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
  fssaiLicenseNumber: "10019011008000",
  contactPhone: "+91-98765-43211",
  contactEmail: "nonveg@sampleclientkitchen.dev",
  address: {
    street: "Opp. Patel Market, Bhanpur",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462038",
  },
  openingHours: "11:00 AM - 12:00 AM",
  deliveryTime: "30-40 min",
  minOrderAmount: 249,
  priceRange: "₹₹₹",
  accentColor: "#DC2626",
  bannerText: "Non-vegetarian food only",
  features: ["Non-vegetarian food only"],
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

  // ── Seed Admin Users
  console.log("\n🌱  Seeding Admin Users...");
  await AdminUserModel.deleteMany({});
  const superAdminHash = await hashPass("AdminPassword@123");
  const vegManagerHash = await hashPass("ManagerPassword@123");
  const nonVegManagerHash = await hashPass("ManagerPassword@123");

  const createdAdmins = await AdminUserModel.create([
    {
      name: "Main Super Admin",
      email: "admin@dualkitchens.com",
      phone: "9876543210",
      passwordHash: superAdminHash,
      role: "super_admin",
      isActive: true,
      totpEnabled: false,
    },
    {
      name: "Veg Kitchen Manager",
      email: "vegmanager@dualkitchens.com",
      phone: "9876543211",
      passwordHash: vegManagerHash,
      role: "veg_manager",
      assignedRestaurantId: vegRest._id,
      isActive: true,
      totpEnabled: false,
    },
    {
      name: "Non-Veg Kitchen Manager",
      email: "nonvegmanager@dualkitchens.com",
      phone: "9876543212",
      passwordHash: nonVegManagerHash,
      role: "nonveg_manager",
      assignedRestaurantId: nonVegRest._id,
      isActive: true,
      totpEnabled: false,
    },
  ]);
  console.log(`    ✔ Admin accounts     → ${createdAdmins.length} created (login: admin@dualkitchens.com / AdminPassword@123)`);

  // ── Seed Delivery Personnel
  console.log("\n🌱  Seeding Delivery Personnel...");
  await DeliveryPersonnelModel.deleteMany({});
  const riderHash = await hashPass("RiderPassword@123");
  const createdRiders = await DeliveryPersonnelModel.create([
    {
      name: "Amit Verma",
      phone: "9876543210",
      passwordHash: riderHash,
      vehicleNumber: "MP-04-EA-7842",
      status: "available",
      isBlocked: false,
    },
    {
      name: "Rahul Sharma",
      phone: "9876543211",
      passwordHash: riderHash,
      vehicleNumber: "MP-04-TR-1289",
      status: "available",
      isBlocked: false,
    },
  ]);
  console.log(`    ✔ Delivery personnel → ${createdRiders.length} created (Amit Verma, Rahul Sharma)`);

  // ── Seed Sample Customer
  console.log("\n🌱  Seeding Sample Customer...");
  await CustomerModel.deleteMany({});
  const sampleCustomer = await CustomerModel.create({
    name: "Gourav Verma",
    phone: "9876543210",
    email: "customer@dualkitchens.com",
    isVerified: true,
  });
  console.log(`    ✔ Sample Customer    → created: ${sampleCustomer.phone}`);

  // ── Seed Sample Orders
  console.log("\n🌱  Seeding Sample Orders...");
  await OrderModel.deleteMany({});

  const chickenDish = nonVegItems[0];
  const chickenTandoori = nonVegItems[1] || nonVegItems[0];
  const paneerDish = vegItems[0];
  const naanDish = vegItems[1] || vegItems[0];

  const createdOrders = await OrderModel.create([
    {
      orderNumber: "DK-12547",
      restaurantId: nonVegRest._id,
      restaurantSlug: "non-veg",
      fulfillmentType: "delivery",
      customerId: sampleCustomer._id,
      customerName: "Gourav Verma",
      customerPhone: "9876543210",
      customerEmail: "customer@dualkitchens.com",
      deliveryAddress: {
        street: "Patel Nagar, Near City Square",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462038",
      },
      items: [
        {
          menuItemId: chickenDish._id,
          name: "Chicken Biryani",
          image: chickenDish.image,
          isVeg: false,
          price: 349,
          quantity: 1,
          itemTotalPrice: 349,
        },
        {
          menuItemId: chickenTandoori._id,
          name: "Tandoori Chicken (Half)",
          image: chickenTandoori.image,
          isVeg: false,
          price: 399,
          quantity: 1,
          itemTotalPrice: 399,
        },
        {
          menuItemId: chickenDish._id,
          name: "Mint Raita",
          image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
          isVeg: true,
          price: 81,
          quantity: 1,
          itemTotalPrice: 81,
        },
      ],
      subtotal: 829,
      deliveryFee: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 829,
      paymentMethod: "cod",
      paymentStatus: "paid",
      orderStatus: "dispatched",
      placedAt: new Date(Date.now() - 35 * 60 * 1000),
    },
    {
      orderNumber: "DK-84920",
      restaurantId: vegRest._id,
      restaurantSlug: "veg",
      fulfillmentType: "delivery",
      customerId: sampleCustomer._id,
      customerName: "Gourav Verma",
      customerPhone: "9876543210",
      deliveryAddress: {
        street: "Bhanpur Sector 2",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462038",
      },
      items: [
        {
          menuItemId: paneerDish._id,
          name: paneerDish.name,
          image: paneerDish.image,
          isVeg: true,
          price: paneerDish.price,
          quantity: 1,
          itemTotalPrice: paneerDish.price,
        },
        {
          menuItemId: naanDish._id,
          name: naanDish.name,
          image: naanDish.image,
          isVeg: true,
          price: naanDish.price,
          quantity: 2,
          itemTotalPrice: naanDish.price * 2,
        },
      ],
      subtotal: paneerDish.price + naanDish.price * 2,
      deliveryFee: 0,
      taxAmount: 0,
      totalAmount: paneerDish.price + naanDish.price * 2,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      orderStatus: "preparing",
      placedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      orderNumber: "DK-51923",
      restaurantId: vegRest._id,
      restaurantSlug: "veg",
      fulfillmentType: "delivery",
      customerId: sampleCustomer._id,
      customerName: "Gourav Verma",
      customerPhone: "9876543210",
      deliveryAddress: {
        street: "Bhanpur Market",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462038",
      },
      items: [
        {
          menuItemId: paneerDish._id,
          name: paneerDish.name,
          image: paneerDish.image,
          isVeg: true,
          price: paneerDish.price,
          quantity: 2,
          itemTotalPrice: paneerDish.price * 2,
        },
      ],
      subtotal: paneerDish.price * 2,
      deliveryFee: 0,
      taxAmount: 0,
      totalAmount: paneerDish.price * 2,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      orderStatus: "delivered",
      placedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ]);
  console.log(`    ✔ Sample Orders      → ${createdOrders.length} created (DK-12547, DK-84920, DK-51923)`);

  // ── Summary
  console.log("\n✅  Complete Database Setup & Seeding successful!");
  console.log("─────────────────────────────────────────────");
  console.log(`    Restaurants         : 2`);
  console.log(`    Categories          : ${vegCats.length + nonVegCats.length}`);
  console.log(`    Menu Items          : ${vegItems.length + nonVegItems.length}`);
  console.log(`    Coupons             : ${createdCoupons.length}`);
  console.log(`    Admin Accounts      : ${createdAdmins.length}`);
  console.log(`    Delivery Personnel  : ${createdRiders.length}`);
  console.log(`    Sample Orders       : ${createdOrders.length}`);
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
