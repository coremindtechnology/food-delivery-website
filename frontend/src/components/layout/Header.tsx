"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Menu,
  MapPin,
  UtensilsCrossed,
  ShieldCheck,
  PhoneCall,
  User,
  LogOut,
} from "lucide-react";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";
import { MobileNav } from "./MobileNav";
import { Button } from "../ui/Button";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { totalItems, setIsCartDrawerOpen } = useCart();
  const { customer, isAuthenticated, openAuthModal, logout } = useAuth();

  const isVegSection = pathname.startsWith("/restaurants/veg");
  const isNonVegSection = pathname.startsWith("/restaurants/non-veg");

  return (
    <>
      {/* Top Notification Announcement Bar */}
      <div className="bg-charcoal-900 text-white text-xs py-2 px-4 border-b border-charcoal-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90">
              Two Separate Kitchens • 100% Segregated Utensils • Verified Pure Veg & Gourmet Non-Veg
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/75 text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary-400" /> Metro Delivery Hub (Radius: 10 KM)
            </span>
            <span className="inline-flex items-center gap-1 text-primary-300 font-semibold">
              <PhoneCall className="w-3 h-3" /> Support: +91 98765 43210
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-cream-200/80 bg-cream-50/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-black text-xl shadow-soft group-hover:scale-105 transition-transform">
                DK
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold tracking-tight text-charcoal-900 group-hover:text-primary-600 transition-colors">
                  Dual Kitchens
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-charcoal-500">
                  Veg & Non-Veg Cloud Kitchens
                </span>
              </div>
            </Link>

            {/* Middle Restaurant Quick Switcher & Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-white/70 p-1 rounded-2xl border border-cream-300 shadow-sm">
              <Link
                href="/"
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-xl transition-all",
                  pathname === "/"
                    ? "bg-charcoal-900 text-white shadow-soft"
                    : "text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-100"
                )}
              >
                All Kitchens
              </Link>

              <Link
                href="/restaurants/veg"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all border",
                  isVegSection
                    ? "bg-veg-600 text-white border-veg-600 shadow-soft"
                    : "text-charcoal-700 border-transparent hover:bg-veg-50 hover:text-veg-700"
                )}
              >
                <RestaurantBadge type="veg" size="sm" showLabel={false} />
                <span>Pure Veg Kitchen</span>
              </Link>

              <Link
                href="/restaurants/non-veg"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all border",
                  isNonVegSection
                    ? "bg-nonveg-700 text-white border-nonveg-700 shadow-soft"
                    : "text-charcoal-700 border-transparent hover:bg-nonveg-50 hover:text-nonveg-700"
                )}
              >
                <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                <span>Non-Veg Grill & Curries</span>
              </Link>
            </nav>

            {/* Right Action Elements */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Secondary story link */}
              <Link
                href="/#about"
                className="hidden xl:inline-block text-xs font-semibold text-charcoal-600 hover:text-primary-600 transition-colors px-2"
              >
                Our Standards
              </Link>

              {/* Customer Account Button */}
              {isAuthenticated && customer ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-cream-300 hover:bg-cream-100 text-xs font-bold text-charcoal-800 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-black text-xs">
                      {customer.name?.charAt(0) || "U"}
                    </div>
                    <span className="hidden md:inline max-w-[100px] truncate">
                      {customer.name || customer.phone}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-cream-200 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-cream-100">
                        <p className="text-xs font-bold text-charcoal-900 truncate">
                          {customer.name || "Customer"}
                        </p>
                        <p className="text-[11px] text-charcoal-500">
                          +91 {customer.phone}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-cream-300 hover:bg-cream-100 text-xs font-bold text-charcoal-800 transition-colors"
                >
                  <User className="w-4 h-4 text-charcoal-600" />
                  <span>Sign In</span>
                </button>
              )}

              {/* Cart Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-soft transition-all active:scale-95"
                aria-label="View Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span className="flex items-center justify-center bg-white text-primary-700 text-[11px] font-black h-5 w-5 rounded-full shadow-xs">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden rounded-2xl border border-cream-300 p-2.5 text-charcoal-700 hover:bg-cream-200 focus:outline-none"
                aria-label="Open mobile menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}

