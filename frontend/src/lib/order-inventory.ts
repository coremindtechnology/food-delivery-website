import { IOrder } from "@/models/Order";
import { MenuItem } from "@/models/MenuItem";
import { InventoryMovement } from "@/models/InventoryMovement";

export async function releaseReservedInventory(
  order: IOrder,
  reason: string,
  performedByAdminId?: IOrder["restaurantId"]
) {
  const quantities = new Map<string, { menuItemId: IOrder["items"][number]["menuItemId"]; quantity: number }>();
  for (const item of order.items) {
    const key = item.menuItemId.toString();
    const current = quantities.get(key);
    quantities.set(key, {
      menuItemId: item.menuItemId,
      quantity: (current?.quantity || 0) + item.quantity,
    });
  }
  const changed: {
    menuItemId: IOrder["items"][number]["menuItemId"];
    quantity: number;
    previous: number;
    next: number;
  }[] = [];

  try {
    for (const stock of quantities.values()) {
      const item = await MenuItem.findByIdAndUpdate(
        stock.menuItemId,
        [{
          $set: {
            inventoryCount: { $add: ["$inventoryCount", stock.quantity] },
            inStock: { $gt: [{ $add: ["$inventoryCount", stock.quantity] }, 0] },
          },
        }],
        { new: true }
      );
      if (item) {
        changed.push({
          menuItemId: item._id,
          quantity: stock.quantity,
          previous: item.inventoryCount - stock.quantity,
          next: item.inventoryCount,
        });
      }
    }

    await InventoryMovement.insertMany(
      changed.map((entry) => ({
        restaurantId: order.restaurantId,
        menuItemId: entry.menuItemId,
        movementType: "order_release",
        quantity: entry.quantity,
        previousCount: entry.previous,
        newCount: entry.next,
        orderId: order._id,
        reason,
        ...(performedByAdminId ? { performedByAdminId } : {}),
      }))
    );
  } catch (error) {
    for (const entry of changed) {
      await MenuItem.updateOne(
        { _id: entry.menuItemId },
        [{
          $set: {
            inventoryCount: { $subtract: ["$inventoryCount", entry.quantity] },
            inStock: { $gt: [{ $subtract: ["$inventoryCount", entry.quantity] }, 0] },
          },
        }]
      );
    }
    await InventoryMovement.deleteMany({ orderId: order._id, movementType: "order_release" });
    throw error;
  }
}
