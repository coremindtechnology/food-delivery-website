export const ADMIN_ORDER_NOTIFICATIONS_EVENT = "admin-order-notifications-changed";

export function getAdminOrderNotificationsKey(adminId: string) {
  return `admin-order-notifications:${adminId}`;
}

export function getAdminOrderNotificationsEnabled(adminId: string) {
  return window.localStorage.getItem(getAdminOrderNotificationsKey(adminId)) === "true";
}

export function setAdminOrderNotificationsEnabled(adminId: string, enabled: boolean) {
  window.localStorage.setItem(getAdminOrderNotificationsKey(adminId), String(enabled));
  window.dispatchEvent(new Event(ADMIN_ORDER_NOTIFICATIONS_EVENT));
}
