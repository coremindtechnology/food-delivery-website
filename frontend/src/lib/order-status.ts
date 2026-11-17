export const ORDER_STATUSES = [
  "pending_payment",
  "new",
  "accepted",
  "preparing",
  "ready",
  "dispatched",
  "ready_for_pickup",
  "delivered",
  "rejected",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  placed: "new",
  confirmed: "accepted",
  out_for_delivery: "dispatched",
};

export function normalizeOrderStatus(status: string): OrderStatus | null {
  if ((ORDER_STATUSES as readonly string[]).includes(status)) return status as OrderStatus;
  return LEGACY_STATUS_MAP[status] || null;
}

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["new", "cancelled"],
  new: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "rejected", "cancelled"],
  preparing: ["ready", "rejected", "cancelled"],
  ready: ["ready_for_pickup", "dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}
