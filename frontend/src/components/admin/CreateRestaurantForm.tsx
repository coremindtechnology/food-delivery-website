"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, Plus, Store } from "lucide-react";

type RestaurantSlug = "veg" | "non-veg";

export type AdminRestaurant = {
  _id: string;
  name: string;
  slug: RestaurantSlug;
  type: RestaurantSlug;
  isOpen: boolean;
  openingHours: string;
  deliveryTime: string;
  minOrderAmount: number;
  bannerText?: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
};

type Draft = {
  name: string;
  slug: RestaurantSlug;
  subtitle: string;
  description: string;
  heroImage: string;
  fssaiLicenseNumber: string;
  contactPhone: string;
  contactEmail: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  openingHours: string;
  deliveryTime: string;
  minOrderAmount: string;
  priceRange: string;
  accentColor: string;
  bannerText: string;
  features: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  slug: "veg",
  subtitle: "",
  description: "",
  heroImage: "",
  fssaiLicenseNumber: "",
  contactPhone: "",
  contactEmail: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  openingHours: "10:00 AM - 11:30 PM",
  deliveryTime: "25-35 min",
  minOrderAmount: "199",
  priceRange: "₹₹",
  accentColor: "#18733f",
  bannerText: "",
  features: "",
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-success-600 focus:ring-2 focus:ring-success-100";

export function CreateRestaurantForm({
  existingSlugs,
  onCreated,
}: {
  existingSlugs: RestaurantSlug[];
  onCreated: (restaurant: AdminRestaurant) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    ...EMPTY_DRAFT,
    slug: existingSlugs.includes("veg") ? "non-veg" : "veg",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableSlugs = (["veg", "non-veg"] as const).filter(
    (slug) => !existingSlugs.includes(slug)
  );

  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          slug: draft.slug,
          type: draft.slug,
          subtitle: draft.subtitle,
          description: draft.description,
          heroImage: draft.heroImage,
          fssaiLicenseNumber: draft.fssaiLicenseNumber,
          contactPhone: draft.contactPhone,
          contactEmail: draft.contactEmail,
          address: {
            street: draft.street,
            city: draft.city,
            state: draft.state,
            pincode: draft.pincode,
          },
          openingHours: draft.openingHours,
          deliveryTime: draft.deliveryTime,
          minOrderAmount: Number(draft.minOrderAmount),
          priceRange: draft.priceRange,
          accentColor: draft.accentColor,
          bannerText: draft.bannerText || undefined,
          features: draft.features.split(",").map((feature) => feature.trim()).filter(Boolean),
          isOpen: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to create the restaurant.");
      }

      const restaurant = result.data as AdminRestaurant;
      onCreated(restaurant);
      setDraft({
        ...EMPTY_DRAFT,
        slug: availableSlugs.find((slug) => slug !== restaurant.slug) || restaurant.slug,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the restaurant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3 border-b border-cream-100 pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f4e4] text-success-700">
          <Store className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-extrabold text-[#152033]">Add a restaurant</h2>
          <p className="mt-1 text-xs text-charcoal-600">
            Add the kitchen first. Then add its categories and menu items from Menu Management.
          </p>
        </div>
      </div>

      {availableSlugs.length === 0 ? (
        <p className="text-sm text-charcoal-600">Both restaurant records already exist.</p>
      ) : (
        <form onSubmit={createRestaurant} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-charcoal-700">
            Kitchen type
            <select
              required
              value={draft.slug}
              onChange={(event) => setDraft({ ...draft, slug: event.target.value as RestaurantSlug })}
              className={inputClass}
            >
              {availableSlugs.map((slug) => (
                <option key={slug} value={slug}>{slug === "veg" ? "Pure Veg" : "Non-Veg"}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Restaurant name
            <input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Subtitle
            <input required minLength={3} maxLength={200} value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700 sm:col-span-2 lg:col-span-3">
            Description
            <textarea required minLength={10} maxLength={1000} rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700 sm:col-span-2">
            Hero image URL
            <input required type="url" value={draft.heroImage} onChange={(event) => setDraft({ ...draft, heroImage: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            FSSAI license (14 digits)
            <input required inputMode="numeric" pattern="[0-9]{14}" maxLength={14} value={draft.fssaiLicenseNumber} onChange={(event) => setDraft({ ...draft, fssaiLicenseNumber: event.target.value.replace(/\D/g, "").slice(0, 14) })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Contact phone
            <input required type="tel" minLength={10} maxLength={15} value={draft.contactPhone} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Contact email
            <input required type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700 sm:col-span-2">
            Street address
            <input required minLength={3} value={draft.street} onChange={(event) => setDraft({ ...draft, street: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            City
            <input required minLength={2} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            State
            <input required minLength={2} value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            PIN code
            <input required minLength={4} maxLength={10} value={draft.pincode} onChange={(event) => setDraft({ ...draft, pincode: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Opening hours
            <input required value={draft.openingHours} onChange={(event) => setDraft({ ...draft, openingHours: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Delivery time
            <input required value={draft.deliveryTime} onChange={(event) => setDraft({ ...draft, deliveryTime: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Minimum order (₹)
            <input required type="number" min="0" step="1" value={draft.minOrderAmount} onChange={(event) => setDraft({ ...draft, minOrderAmount: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Price range
            <input required value={draft.priceRange} onChange={(event) => setDraft({ ...draft, priceRange: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Accent color
            <input type="color" value={draft.accentColor} onChange={(event) => setDraft({ ...draft, accentColor: event.target.value })} className="mt-1 block h-10 w-full rounded-lg border border-cream-300 bg-white p-1" />
          </label>
          <label className="text-xs font-semibold text-charcoal-700">
            Features <span className="font-normal">(comma-separated)</span>
            <input value={draft.features} onChange={(event) => setDraft({ ...draft, features: event.target.value })} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-charcoal-700 sm:col-span-2 lg:col-span-3">
            Homepage banner <span className="font-normal">(optional)</span>
            <input maxLength={200} value={draft.bannerText} onChange={(event) => setDraft({ ...draft, bannerText: event.target.value })} className={inputClass} />
          </label>

          {error && <p role="alert" className="sm:col-span-2 lg:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-success-700 px-4 text-sm font-bold text-white hover:bg-success-800 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating…" : "Create restaurant"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
