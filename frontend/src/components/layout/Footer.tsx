"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Mail, MapPin, Phone, Play } from "lucide-react";
import { RestaurantBadge } from "../restaurant/RestaurantBadge";
import { FloatingLeaf } from "../home/FloatingLeaf";
import { SAMPLE_RESTAURANTS } from "@/data/restaurants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-[#111215] text-white/75">
      <FloatingLeaf size={58} rotation={18} delay={0.2} duration={7} className="bottom-2 left-2 hidden opacity-50 sm:block" />
      <FloatingLeaf size={42} rotation={-35} delay={1.1} duration={6} className="bottom-5 left-[72px] hidden opacity-40 sm:block" />
      <FloatingLeaf size={34} rotation={35} delay={1.8} duration={6.5} className="bottom-1 left-[126px] hidden opacity-35 sm:block" />
      <FloatingLeaf size={58} rotation={-28} delay={0.8} duration={8} className="bottom-2 right-2 hidden opacity-50 sm:block" />
      <FloatingLeaf size={42} rotation={32} delay={1.6} duration={6.5} className="bottom-5 right-[72px] hidden opacity-40 sm:block" />
      <FloatingLeaf size={34} rotation={-18} delay={2.2} duration={7} className="bottom-1 right-[126px] hidden opacity-35 sm:block" />

      {/* Brand Story Banner */}
      <div className="relative z-20 px-4 pt-8 sm:px-6 lg:px-8">
        <div className="relative mx-auto grid max-w-7xl items-center gap-5 overflow-hidden rounded-2xl border border-emerald-400/15 bg-[#063b2a] px-5 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.28)] sm:grid-cols-[1fr_auto_auto] sm:gap-8 sm:px-8 sm:py-5">
          <FloatingLeaf size={48} rotation={-25} delay={0.4} duration={7} className="-bottom-3 left-[34%] opacity-70" />
          <FloatingLeaf size={42} rotation={28} delay={1.2} duration={6} className="-bottom-2 right-2 opacity-70" />

          <div className="relative z-10 text-center sm:text-left">
            <p className="font-script text-3xl italic leading-tight text-white sm:text-4xl">
              Good Food
            </p>
            <p className="font-script text-3xl italic leading-tight text-amber-300 sm:text-4xl">
              Brings People Together
            </p>
            <span className="mt-1 block h-0.5 w-36 rotate-[-4deg] rounded-full bg-amber-400 sm:w-44" />
          </div>

          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
            {[
              { src: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=160&q=80", alt: "Fresh biryani" },
              { src: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=160&q=80", alt: "Grilled food special" },
              { src: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=160&q=80", alt: "Indian curry" },
            ].map((dish) => (
              <span
                key={dish.src}
                className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-amber-300/80 bg-white/10 shadow-lg sm:h-16 sm:w-16"
              >
                <Image src={dish.src} alt={dish.alt} fill sizes="64px" className="object-cover" />
              </span>
            ))}
          </div>

          <Link
            href="/#about"
            className="relative z-10 mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 transition-colors hover:border-amber-300/70 hover:bg-white/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#063b2a] sm:mx-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-emerald-950 transition-transform hover:scale-110">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
            <span>Watch Our Story</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
          </Link>
        </div>
        <div className="mx-auto max-w-7xl border-b border-white/10" />
      </div>

      {/* Main Footer Links */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white font-black text-lg">
                DK
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Dual Kitchens
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed max-w-sm">
              A premier dual-culinary experience operating under one client: offering
              dedicated, uncompromised Pure Vegetarian delights alongside gourmet
              authentic Charcoal Non-Vegetarian barbecue and curries.
            </p>
            
          </div>

          {/* Pure Veg Quick Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RestaurantBadge type="veg" size="sm" showLabel={false} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Veg Kitchen
              </h4>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/restaurants/veg" className="text-white/75 hover:text-veg-300 transition-colors">
                  Full Veg Menu
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="text-white/75 hover:text-veg-300 transition-colors">
                  Paneer Specialties
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="text-white/75 hover:text-veg-300 transition-colors">
                  Nawabi Subz Biryani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="text-white/75 hover:text-veg-300 transition-colors">
                  Slow-Cooked Dal Makhani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/veg" className="text-white/75 hover:text-veg-300 transition-colors">
                  Desi Ghee Sweets
                </Link>
              </li>
            </ul>
          </div>

          {/* Non-Veg Quick Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RestaurantBadge type="non-veg" size="sm" showLabel={false} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Non-Veg Grill
              </h4>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/restaurants/non-veg" className="text-white/75 hover:text-nonveg-300 transition-colors">
                  Full Non-Veg Menu
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="text-white/75 hover:text-nonveg-300 transition-colors">
                  Hyderabadi Dum Biryani
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="text-white/75 hover:text-nonveg-300 transition-colors">
                  Smoked Butter Chicken
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="text-white/75 hover:text-nonveg-300 transition-colors">
                  Charcoal Kebabs & Tikkas
                </Link>
              </li>
              <li>
                <Link href="/restaurants/non-veg" className="text-white/75 hover:text-nonveg-300 transition-colors">
                  Mutton Rogan Josh
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Kitchen & Support
            </h4>
            <div className="space-y-2.5 text-xs text-white/70">
              {SAMPLE_RESTAURANTS.map((restaurant) => (
                <p key={restaurant.id} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white/90">
                      {restaurant.type === "veg" ? "Veg" : "Non-Veg"} Kitchen:
                    </strong>{" "}
                    {restaurant.address}
                  </span>
                </p>
              ))}
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <a className="hover:text-white" href="tel:+919713596109">
                  +91 97135 96109
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <a className="break-all hover:text-white" href="mailto:sahusurendra628@gmail.com">
                  sahusurendra628@gmail.com
                </a>
              </p>
              <p className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <span>
                  {SAMPLE_RESTAURANTS.map((restaurant) => (
                    <React.Fragment key={restaurant.id}>
                      {restaurant.type === "veg" ? "Veg" : "Non-Veg"}:{" "}
                      {restaurant.openingHours}
                      <br />
                    </React.Fragment>
                  ))}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Policy & Legal Links */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© {currentYear} Dual Kitchens Platform. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/refund-cancellation-policy" className="hover:text-white transition-colors">
              Refund & Cancellation Policy
            </Link>
            <Link href="/food-safety-hygiene" className="hover:text-white transition-colors">
              Food Safety & Hygiene
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
