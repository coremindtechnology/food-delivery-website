"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_ORDER_NOTIFICATIONS_EVENT,
  getAdminOrderNotificationsEnabled,
} from "@/lib/admin-notifications";

type NewOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  totalAmount: number;
};

const ORDER_ACCESS_ROLES = new Set([
  "super_admin",
  "restaurant_manager",
  "order_manager",
  "veg_manager",
  "nonveg_manager",
]);

export function AdminOrderNotifications({ role, adminId }: { role: string; adminId: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const syncPreference = () => {
      setEnabled(adminId ? getAdminOrderNotificationsEnabled(adminId) : false);
    };
    syncPreference();
    window.addEventListener(ADMIN_ORDER_NOTIFICATIONS_EVENT, syncPreference);
    window.addEventListener("storage", syncPreference);
    return () => {
      window.removeEventListener(ADMIN_ORDER_NOTIFICATIONS_EVENT, syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, [adminId]);

  useEffect(() => {
    if (
      !enabled ||
      !ORDER_ACCESS_ROLES.has(role) ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) return;

    let active = true;
    let initialized = false;
    const knownOrderIds = new Set<string>();

    const checkForOrders = async () => {
      try {
        const response = await fetch("/api/admin/orders?status=new&limit=100", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.error || "Unable to check for new orders.");
        }
        if (!active) return;

        const orders = result.data as NewOrder[];
        if (!initialized) {
          orders.forEach((order) => knownOrderIds.add(order._id));
          initialized = true;
          return;
        }

        for (const order of orders) {
          if (knownOrderIds.has(order._id)) continue;
          knownOrderIds.add(order._id);
          const notification = new Notification(`New order ${order.orderNumber}`, {
            body: `${order.customerName || "Customer"} · ₹${Number(order.totalAmount || 0).toLocaleString("en-IN")}`,
            tag: `admin-order-${order._id}`,
          });
          notification.onclick = () => {
            window.focus();
            window.location.assign("/admin/orders");
            notification.close();
          };
        }
      } catch (error) {
        if (active) console.error("Admin order notification check failed:", error);
      }
    };

    void checkForOrders();
    const intervalId = window.setInterval(() => void checkForOrders(), 15_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, role]);

  return null;
}
