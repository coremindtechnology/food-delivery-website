"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle,
  Award,
} from "lucide-react";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-cream-300 bg-cream-100 text-charcoal-700">
      {/* Trust & Guarantee Banner */}
      <div className="border-b border-cream-200/80 bg-cream-50 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-veg-100 text-veg-700 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-charcoal-900">
                  100% Segregated Kitchens
                </h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Separate staff, cookware & oil for pure vegetarian prep.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-charcoal-900">
                  Premium Quality Ingredients
                </h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Farm fresh produce, pure desi ghee and fresh meat cuts daily.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 justify-center md:justify-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 flex-shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-charcoal-900">
                  Tamper-Evident Packaging
                </h4>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Thermal sealed food containers keep meals piping hot and safe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white font-black text-lg">
                DK
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-charcoal-900">
                Dual Kitchens
              </span>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed max-w-sm">
              A premier dual-culinary experience operating under one client: offering
              dedicated, uncompromised Pure Vegetarian delights alongside gourmet
              authentic Charcoal Non-Vegetarian barbecue and curries.
            </p>
            <div className="pt-2 text-xs text-charcoal-500 space-y-1">
              <p>FSSAI License: <strong>10022099000123</strong> (Pure Veg Unit)</p>
              <p>FSSAI License: <strong>10022099000124</strong> (Non-Veg Unit)</p>
            </div>
          </div>

          {/* Pure Veg Quick Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RestaurantBadge type="veg" size="sm" showLabel={false} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                Veg Kitchen
              </h4>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/restaurants/veg" className="hover:text-veg-700 transition-colors">
                  Full Veg Menu
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="hover:text-veg-700 transition-colors">
                  Paneer Specialties
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="hover:text-veg-700 transition-colors">
                  Nawabi Subz Biryani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="hover:text-veg-700 transition-colors">
                  Slow-Cooked Dal Makhani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="hover:text-veg-700 transition-colors">
                  Desi Ghee Sweets
                </Link>
              </li>
            </ul>
          </div>

          {/* Non-Veg Quick Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                Non-Veg Grill
              </h4>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/restaurants/non-veg" className="hover:text-nonveg-700 transition-colors">
                  Full Non-Veg Menu
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="hover:text-nonveg-700 transition-colors">
                  Hyderabadi Dum Biryani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="hover:text-nonveg-700 transition-colors">
                  Smoked Butter Chicken
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="hover:text-nonveg-700 transition-colors">
                  Charcoal Kebabs & Tikkas
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="hover:text-nonveg-700 transition-colors">
                  Mutton Rogan Josh
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
              Kitchen & Support
            </h4>
            <div className="space-y-2.5 text-xs text-charcoal-600">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <span>Culinary Plaza, Blocks 4 & 5, Sector 18, Metro City</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>orders@dualkitchens.example.com</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>Open Daily: 10:00 AM – Midnight</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Policy & Legal Links */}
        <div className="mt-12 pt-8 border-t border-cream-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
          <p>© {currentYear} Dual Kitchens Platform. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#privacy" className="hover:text-charcoal-800 transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-charcoal-800 transition-colors">
              Terms of Service
            </a>
            <a href="#refund" className="hover:text-charcoal-800 transition-colors">
              Refund & Cancellation Policy
            </a>
            <a href="#fssai" className="hover:text-charcoal-800 transition-colors">
              Food Safety & Hygiene
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

