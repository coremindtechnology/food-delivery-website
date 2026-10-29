import { Router, Request, Response } from "express";
import { FoodItemModel } from "../models/FoodItem.js";

const router = Router();

// Get foods with filtering by restaurantSlug, category, or search
router.get("/", async (req: Request, res: Response) => {
  try {
    const { restaurant, category, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (restaurant && (restaurant === "veg" || restaurant === "non-veg")) {
      filter.restaurantSlug = restaurant;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (search && typeof search === "string") {
      filter.name = { $regex: search, $options: "i" };
    }

    const foods = await FoodItemModel.find(filter).lean();
    res.json({ success: true, count: foods.length, data: foods });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch food items" });
  }
});

export default router;

