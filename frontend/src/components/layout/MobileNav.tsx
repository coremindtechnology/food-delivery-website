"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Home, UtensilsCrossed, Phone, ShieldCheck, HeartHandshake, ShoppingBag, User, LogOut, Truck } from "lucide-react";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";
import { Button } from "../ui/Button";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { totalItems, setIsCartDrawerOpen } = useCart();
  const { customer, isAuthenticated, openAuthModal, logout } = useAuth();

  if (!isOpen) return null;

  const links = [
    { label: "Home", href: "/", icon: Home },
    { label: "Order Tracking", href: "/track-order", icon: Truck },
    { label: "Pure Veg Kitchen", href: "/restaurants/veg", badge: "veg" as const },
    { label: "Non-Veg Grill & Curries", href: "/restaurants/non-veg", badge: "non-veg" as const },
    { label: "About Us", href: "/#about", icon: HeartHandshake },
    { label: "Contact & Support", href: "/#contact", icon: Phone },
  ];

  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 flex w-[calc(100%-24px)] max-w-[360px] flex-col justify-between overflow-y-auto border-l border-cream-300 bg-cream-50 p-4 sm:p-5 shadow-2xl">
        <div className="space-y-4 sm:space-y-5">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-cream-200 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 font-black text-white text-base">
                DK
              </span>
              <div>
                <p className="text-sm font-bold text-charcoal-900">Dual Kitchens</p>
                <p className="text-[10px] text-charcoal-500">Commercial Food Hub</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-charcoal-600 hover:bg-cream-200"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Dual Switcher Box */}
          <div className="rounded-2xl border border-cream-200 bg-white p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
              Select Dining Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/restaurants/veg"
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                  pathname === "/restaurants/veg"
                    ? "bg-veg-50 border-veg-600 text-veg-700 font-bold"
                    : "border-cream-300 hover:bg-cream-100"
                )}
              >
                <RestaurantBadge type="veg" size="sm" showLabel={false} />
                <span className="text-xs mt-1">Pure Veg</span>
              </Link>
              <Link
                href="/restaurants/non-veg"
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                  pathname === "/restaurants/non-veg"
                    ? "bg-nonveg-50 border-nonveg-700 text-nonveg-800 font-bold"
                    : "border-cream-300 hover:bg-cream-100"
                )}
              >
                <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                <span className="text-xs mt-1">Non-Veg</span>
              </Link>
            </div>
          </div>

          {/* Links */}
          <nav className="space-y-1.5">
            {/* Mobile Cart Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsCartDrawerOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold bg-primary-50 text-primary-700 border border-primary-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-primary-600" />
                <span>My Cart</span>
              </div>
              {totalItems > 0 && (
                <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-black">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Auth Button */}
            {isAuthenticated && customer ? (
              <div className="rounded-xl border border-cream-300 p-3 bg-white space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-charcoal-900 truncate">
                      {customer.name || "Customer"}
                    </p>
                    <p className="text-[10px] text-charcoal-500">+91 {customer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-bold"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal();
                }}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-charcoal-700 hover:bg-cream-200 transition-colors"
              >
                <User className="w-4 h-4 text-charcoal-600" />
                <span>Sign In with OTP</span>
              </button>
            )}

            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500 text-white font-semibold shadow-soft"
                      : "text-charcoal-700 hover:bg-cream-200 hover:text-charcoal-900"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {Icon && <Icon className="w-4 h-4 opacity-80" />}
                    {link.badge && (
                      <RestaurantBadge type={link.badge} size="sm" showLabel={false} />
                    )}
                    <span className="min-w-0 leading-snug">{link.label}</span>
                  </div>
                  {link.badge && (
                    <span
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold uppercase",
                        isActive
                          ? "bg-white/20 text-white"
                          : link.badge === "veg"
                          ? "bg-veg-100 text-veg-700"
                          : "bg-nonveg-100 text-nonveg-700"
                      )}
                    >
                      {link.badge === "veg" ? "PURE VEG" : "MEAT"}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer in Drawer */}
        <div className="border-t border-cream-200 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-charcoal-500">
            <ShieldCheck className="w-4 h-4 text-success-600" />
            <span>Strict Kitchen Segregation</span>
          </div>
          <Link href="/#contact" onClick={onClose} className="block">
            <Button variant="outline" size="md" className="w-full">
              <Phone className="w-4 h-4 mr-2" /> Call for Bulk Orders
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
