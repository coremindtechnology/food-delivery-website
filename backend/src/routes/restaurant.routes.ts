import { Router, Request, Response } from "express";
import { RestaurantModel } from "../models/Restaurant.js";

const router = Router();

// Get both restaurants
router.get("/", async (_req: Request, res: Response) => {
  try {
    const restaurants = await RestaurantModel.find().lean();
    res.json({ success: true, count: restaurants.length, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch restaurants" });
  }
});

// Get specific restaurant by slug (veg or non-veg)
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const restaurant = await RestaurantModel.findOne({ slug }).lean();
    if (!restaurant) {
      res.status(404).json({ success: false, error: "Restaurant not found" });
      return;
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch restaurant" });
  }
});

export default router;

