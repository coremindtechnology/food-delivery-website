import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import foodRoutes from "./routes/food.routes.js";
import orderRoutes from "./routes/order.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Dual Kitchens Commercial API",
    supportedRestaurants: ["veg", "non-veg"],
  });
});

// Mount Routes
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Database Connection & Server Start
connectDB().then(() => {
  if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
      console.log(`🚀 Backend Server running at http://localhost:${PORT}`);
      console.log(`🍱 Serving Veg & Non-Veg Commercial Kitchen Services`);
    });
  }
});

export default app;

