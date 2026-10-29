import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "default_admin_jwt_secret";

export interface AuthenticatedUserPayload {
  userId: string;
  phone: string;
}

export interface AuthenticatedAdminPayload {
  adminId: string;
  email: string;
  role: "super_admin" | "veg_manager" | "nonveg_manager";
  assignedRestaurantSlug?: "veg" | "non-veg";
}

export interface CustomRequest extends Request {
  user?: AuthenticatedUserPayload;
  admin?: AuthenticatedAdminPayload;
}

export function requireUserAuth(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token missing or invalid" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdminAuth(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Admin token missing or invalid" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AuthenticatedAdminPayload;
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired admin session" });
  }
}

