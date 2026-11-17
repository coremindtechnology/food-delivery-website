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
  Truck,
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
      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#ece7e1] bg-[#f7f4f1]/95 backdrop-blur-md transition-all shadow-[0_1px_0_rgba(17,18,21,0.08)]">
        <div className="max-w-[1280px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f78a2b] to-[#e55f22] text-white font-black text-xl shadow-[0_10px_20px_rgba(229,95,34,0.28)] group-hover:scale-105 transition-transform">
                DK
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold tracking-tight text-[#1f1d1a] group-hover:text-[#e55f22] transition-colors">
                  Dual Kitchens
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#6f6a64] mt-1">
                  Veg & Non-Veg Cloud Kitchens
                </span>
              </div>
            </Link>

            {/* Middle Restaurant Quick Switcher & Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-[#f0eee9] p-1 rounded-full border border-[#e7e1d8] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Link
                href="/"
                className={cn(
                  "px-4 py-2 text-[11px] font-semibold rounded-full transition-all",
                  pathname === "/"
                    ? "bg-[#191d22] text-white shadow-[0_6px_14px_rgba(17,18,21,0.18)]"
                    : "text-[#3b3a36] hover:text-[#1f1d1a] hover:bg-white/60"
                )}
              >
                All Kitchens
              </Link>

              <Link
                href="/restaurants/veg"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[11px] font-semibold rounded-full transition-all border",
                  isVegSection
                    ? "bg-[#1d9c5d] text-white border-[#1d9c5d] shadow-[0_6px_14px_rgba(29,156,93,0.18)]"
                    : "text-[#3b3a36] border-transparent hover:bg-white/60 hover:text-[#1d9c5d]"
                )}
              >
                <RestaurantBadge type="veg" size="sm" showLabel={false} />
                <span>Pure Veg Kitchen</span>
              </Link>

              <Link
                href="/restaurants/non-veg"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[11px] font-semibold rounded-full transition-all border",
                  isNonVegSection
                    ? "bg-[#d63c2d] text-white border-[#d63c2d] shadow-[0_6px_14px_rgba(214,60,45,0.18)]"
                    : "text-[#3b3a36] border-transparent hover:bg-white/60 hover:text-[#d63c2d]"
                )}
              >
                <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
                <span>Non-Veg Grill & Curries</span>
              </Link>
            </nav>

            {/* Right Action Elements */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                href="/track-order"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all border",
                  pathname === "/track-order"
                    ? "bg-[#0b3b24] text-white border-[#0b3b24] shadow-sm"
                    : "text-[#282c3f] border-[#e7e1d8] bg-white/70 hover:bg-white hover:text-[#0b3b24] hover:border-[#c5decb]"
                )}
              >
                <Truck className="w-3.5 h-3.5 text-[#0b512a]" />
                <span className="hidden sm:inline">Order Tracking</span>
                <span className="sm:hidden">Track</span>
              </Link>

              <Link
                href="/#about"
                className="hidden xl:inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4d4b47] hover:text-[#1f1d1a] transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-[#f7b267]" />
                Our Standards
              </Link>

              {isAuthenticated && customer ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-[#e7e1d8] bg-white/60 hover:bg-white text-[11px] font-bold text-[#1f1d1a] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#f8e3d3] text-[#d96c28] flex items-center justify-center font-black text-[10px]">
                      {customer.name?.charAt(0) || "U"}
                    </div>
                    <span className="hidden md:inline max-w-[100px] truncate">
                      {customer.name || customer.phone}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#efe6df] py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-[#efe6df]">
                        <p className="text-xs font-bold text-[#1f1d1a] truncate">
                          {customer.name || "Customer"}
                        </p>
                        <p className="text-[11px] text-[#6f6a64]">
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
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#e7e1d8] bg-white/60 hover:bg-white text-[11px] font-bold text-[#1f1d1a] transition-colors"
                >
                  <User className="w-4 h-4 text-[#5a524d]" />
                  <span>Sign In</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-[#f39031] to-[#e55f22] hover:brightness-105 text-white font-bold text-[11px] shadow-[0_10px_20px_rgba(229,95,34,0.24)] transition-all active:scale-95"
                aria-label="View Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span className="flex items-center justify-center bg-white text-[#d96c28] text-[10px] font-black h-5 w-5 rounded-full shadow-xs">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden rounded-full border border-[#e7e1d8] bg-white/60 p-2.5 text-[#1f1d1a] hover:bg-white focus:outline-none"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
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
