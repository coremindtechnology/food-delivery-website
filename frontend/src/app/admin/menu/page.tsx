"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Restaurant = { _id: string; name: string; slug: string; type: string };
type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
};
type MenuItem = {
  _id: string;
  restaurantId: string;
  categoryId: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  isVeg: boolean;
  isPopular: boolean;
  isChefSpecial: boolean;
  preparationTime: string;
  variants: { id: string; name: string; portionDescription?: string; price: number; isDefault?: boolean }[];
  addons: { id: string; name: string; price: number }[];
  available: boolean;
  inStock: boolean;
  inventoryCount: number;
  lowStockThreshold: number;
  sortOrder: number;
  isArchived: boolean;
};
type Variant = MenuItem["variants"][number];
type Addon = MenuItem["addons"][number];
type Movement = {
  _id: string;
  movementType: string;
  quantity: number;
  previousCount: number;
  newCount: number;
  reason?: string;
  createdAt: string;
};
type Draft = Omit<MenuItem, "_id" | "inStock" | "inventoryCount" | "isArchived">;

const emptyDraft = (restaurantId = "", categoryId = ""): Draft => ({
  restaurantId,
  categoryId,
  categorySlug: "",
  name: "",
  slug: "",
  description: "",
  price: 0,
  image: "",
  isVeg: true,
  isPopular: false,
  isChefSpecial: false,
  preparationTime: "20-25 min",
  variants: [],
  addons: [],
  available: true,
  lowStockThreshold: 10,
  sortOrder: 0,
});

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result.data as T;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminMenuPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [formCategories, setFormCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<MenuItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [historyItem, setHistoryItem] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingItem, setEditingItem] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [categoryDraft, setCategoryDraft] = useState({ name: "", slug: "", description: "" });
  const [editingCategory, setEditingCategory] = useState("");
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState("");
  const [itemAvailabilityFilter, setItemAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [tab, setTab] = useState<"items" | "categories" | "inventory">("items");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category._id, category])),
    [categories]
  );
  const filteredItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesSearch = !search ||
          item.name.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.slug.toLowerCase().includes(search);
        const matchesCategory = !itemCategoryFilter || item.categoryId === itemCategoryFilter;
        const isAvailable = item.available && item.inStock && item.inventoryCount > 0;
        const matchesAvailability = itemAvailabilityFilter === "all" ||
          (itemAvailabilityFilter === "available" ? isAvailable : !isAvailable);
        return matchesSearch && matchesCategory && matchesAvailability;
      })
      .sort((a, b) =>
        (categoriesById.get(a.categoryId)?.sortOrder ?? 0) -
          (categoriesById.get(b.categoryId)?.sortOrder ?? 0) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name)
      );
  }, [items, itemSearch, itemCategoryFilter, itemAvailabilityFilter, categoriesById]);
  const itemPositions = useMemo(() => {
    const groups = new Map<string, MenuItem[]>();
    for (const item of items) {
      const siblings = groups.get(item.categoryId) || [];
      siblings.push(item);
      groups.set(item.categoryId, siblings);
    }

    const positions = new Map<string, { index: number; count: number }>();
    for (const siblings of groups.values()) {
      siblings.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      siblings.forEach((item, index) => positions.set(item._id, { index, count: siblings.length }));
    }
    return positions;
  }, [items]);
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  );
  const categoryItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1);
    }
    return counts;
  }, [items]);

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    const [nextCategories, nextItems, nextInventory] = await Promise.all([
      api<Category[]>(`/api/admin/categories?restaurantId=${id}`),
      api<MenuItem[]>(`/api/admin/menu-items?restaurantId=${id}`),
      api<MenuItem[]>(`/api/admin/inventory?restaurantId=${id}`),
    ]);
    setCategories(nextCategories);
    setFormCategories(nextCategories);
    setItems(nextItems);
    setInventory(nextInventory);
    setInventoryDrafts(
      Object.fromEntries(nextInventory.map((item) => [item._id, String(item.inventoryCount)]))
    );
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Restaurant[]>("/api/admin/restaurants"),
      api<{ admin: { assignedRestaurantId?: string } }>("/api/admin/auth/me"),
    ])
      .then(([availableRestaurants, session]) => {
        if (!active) return;
        setRestaurants(availableRestaurants);
        const assigned = session.admin.assignedRestaurantId;
        const initial = assigned || availableRestaurants[0]?._id || "";
        setRestaurantId(initial);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load admin access.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    refresh(restaurantId)
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load menu data.");
      });
    return () => {
      active = false;
    };
  }, [restaurantId, refresh]);

  function notify(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    action()
      .then(() => setMessage("Changes saved."))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The request failed."))
      .finally(() => setBusy(false));
  }

  function beginEdit(item: MenuItem) {
    const { _id, inStock, inventoryCount, isArchived, ...formValues } = item;
    void inStock;
    void inventoryCount;
    void isArchived;
    setEditingItem(_id);
    setDraft({
      ...formValues,
      price: formValues.price ?? 0,
      originalPrice: formValues.originalPrice ?? undefined,
      lowStockThreshold: formValues.lowStockThreshold ?? 10,
      sortOrder: formValues.sortOrder ?? 0,
      preparationTime: formValues.preparationTime ?? "20-25 min",
      description: formValues.description ?? "",
      image: formValues.image ?? "",
      slug: formValues.slug ?? "",
      name: formValues.name ?? "",
      variants: formValues.variants ?? [],
      addons: formValues.addons ?? [],
      isVeg: formValues.isVeg ?? true,
      isPopular: formValues.isPopular ?? false,
      isChefSpecial: formValues.isChefSpecial ?? false,
      available: formValues.available ?? true,
    });
    setFormCategories(categories);
    setVariants(item.variants || []);
    setAddons(item.addons || []);
    setTab("items");
  }

  function resetItemForm(targetRestaurantId = restaurantId) {
    setEditingItem("");
    setInitialStock("0");
    setDraft(emptyDraft(targetRestaurantId, targetRestaurantId === restaurantId ? categories[0]?._id || "" : ""));
    setVariants([]);
    setAddons([]);
    setFormCategories(categories);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...draft,
      categorySlug: new Map(formCategories.map((category) => [category._id, category.slug])).get(draft.categoryId) || "",
      ...(!editingItem ? { inventoryCount: Number(initialStock) } : {}),
      variants,
      addons,
    };
    await api(
      editingItem ? `/api/menu-items/${editingItem}` : "/api/menu-items",
      { method: editingItem ? "PATCH" : "POST", body: JSON.stringify(payload) }
    );
    resetItemForm();
    await refresh(restaurantId);
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("restaurantId", draft.restaurantId);
      formData.set("image", file);
      const response = await fetch("/api/admin/menu-images", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "The image could not be uploaded.");
      }
      setDraft((current) => ({ ...current, image: result.data.imageUrl as string }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    await api(`/api/menu-items/${item._id}`, {
      method: "PATCH",
      body: JSON.stringify({ available: !item.available }),
    });
    await refresh(restaurantId);
  }

  async function archiveItem(item: MenuItem) {
    await api(`/api/menu-items/${item._id}`, { method: "DELETE" });
    await refresh(restaurantId);
  }

  async function archiveCategory(category: Category) {
    await api(`/api/categories/${category._id}`, { method: "DELETE" });
    await refresh(restaurantId);
  }

  async function moveItem(item: MenuItem, direction: -1 | 1) {
    const siblings = items
      .filter((candidate) => candidate.categoryId === item.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const index = siblings.findIndex((candidate) => candidate._id === item._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    const [movingItem] = siblings.splice(index, 1);
    siblings.splice(targetIndex, 0, movingItem);
    await Promise.all(siblings.map((candidate, sortOrder) =>
      api(`/api/menu-items/${candidate._id}`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder }),
      })
    ));
    await refresh(restaurantId);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...categoryDraft, restaurantId, sortOrder: categories.length };
    await api(
      editingCategory ? `/api/categories/${editingCategory}` : "/api/categories",
      { method: editingCategory ? "PATCH" : "POST", body: JSON.stringify(payload) }
    );
    setCategoryDraft({ name: "", slug: "", description: "" });
    setEditingCategory("");
    await refresh(restaurantId);
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const index = ordered.findIndex((candidate) => candidate._id === category._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const [movingCategory] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, movingCategory);
    await Promise.all(ordered.map((candidate, sortOrder) =>
      api(`/api/categories/${candidate._id}`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder }),
      })
    ));
    await refresh(restaurantId);
  }

  async function saveStock(item: MenuItem) {
    const count = Number(inventoryDrafts[item._id]);
    if (!Number.isInteger(count) || count < 0) {
      throw new Error("Stock quantity must be a non-negative whole number.");
    }
    await api("/api/admin/inventory", {
      method: "PATCH",
      body: JSON.stringify({
        menuItemId: item._id,
        inventoryCount: count,
        reason: "Admin stock adjustment",
      }),
    });
    await refresh(restaurantId);
  }

  async function showHistory(item: MenuItem) {
    const history = await api<Movement[]>(`/api/admin/inventory?menuItemId=${item._id}`);
    setHistoryItem(item.name);
    setMovements(history);
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl p-8 text-stone-600">Loading menu management...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Admin portal</p>
          <h1 className="text-3xl font-bold text-stone-900">Menu & inventory</h1>
          <p className="mt-1 text-sm text-stone-600">Manage dishes, categories, availability, and stock history.</p>
        </div>
        <label className="text-sm font-medium text-stone-700">
          Restaurant
          <select
            className="mt-1 block min-w-56 rounded-lg border p-2"
            value={restaurantId}
            onChange={(event) => {
              const nextRestaurantId = event.target.value;
              setRestaurantId(nextRestaurantId);
              resetItemForm(nextRestaurantId);
              setEditingCategory("");
              setCategoryDraft({ name: "", slug: "", description: "" });
            }}
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
            ))}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-success-50 p-3 text-success-800">{message}</p>}
      {!restaurants.length && <p className="rounded-lg bg-amber-50 p-4 text-amber-900">No restaurants are available to this admin account.</p>}

      <nav className="flex gap-2 border-b">
        {(["items", "categories", "inventory"] as const).map((value) => (
          <button
            type="button"
            key={value}
            className={`px-4 py-3 font-medium capitalize ${tab === value ? "border-b-2 border-orange-600 text-orange-700" : "text-stone-600"}`}
            onClick={() => setTab(value)}
          >
            {value}
          </button>
        ))}
      </nav>

      {tab === "items" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <form onSubmit={(event) => notify(() => saveItem(event))} className="h-fit space-y-4 rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">{editingItem ? "Edit food item" : "Add food item"}</h2>
            <label className="block text-sm">Restaurant
              <select
                required
                className="mt-1 w-full rounded border p-2"
                value={draft.restaurantId}
                onChange={(event) => {
                  const targetRestaurantId = event.target.value;
                  setDraft({ ...draft, restaurantId: targetRestaurantId, categoryId: "" });
                  api<Category[]>(`/api/admin/categories?restaurantId=${targetRestaurantId}`)
                    .then(setFormCategories)
                    .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load restaurant categories."));
                }}
              >
                {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">Name
              <input required minLength={2} className="mt-1 w-full rounded border p-2" value={draft.name ?? ""} onChange={(event) => setDraft({ ...draft, name: event.target.value, slug: editingItem ? draft.slug : slugify(event.target.value) })} />
            </label>
            <label className="block text-sm">Slug
              <input required className="mt-1 w-full rounded border p-2" value={draft.slug ?? ""} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} />
            </label>
            <label className="block text-sm">Category
              <select required className="mt-1 w-full rounded border p-2" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}>
                <option value="">Select category</option>
                {formCategories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">Description
              <textarea required minLength={5} maxLength={600} rows={3} className="mt-1 w-full rounded border p-2" value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Price
                <input required type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2" value={draft.price ?? 0} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
              </label>
              <label className="text-sm">Original price (optional)
                <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-2" value={draft.originalPrice ?? ""} onChange={(event) => setDraft({ ...draft, originalPrice: event.target.value ? Number(event.target.value) : undefined })} />
              </label>
              {!editingItem && (
                <label className="text-sm">Initial stock
                  <input required type="number" min="0" step="1" className="mt-1 w-full rounded border p-2" value={initialStock} onChange={(event) => setInitialStock(event.target.value)} />
                </label>
              )}
              <label className="text-sm">Low-stock alert at
                <input required type="number" min="0" className="mt-1 w-full rounded border p-2" value={draft.lowStockThreshold ?? 10} onChange={(event) => setDraft({ ...draft, lowStockThreshold: Number(event.target.value) })} />
              </label>
            </div>
            <label className="block text-sm">Image URL or uploaded image
              <input className="mt-1 w-full rounded border p-2" value={draft.image ?? ""} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="https://..." />
              <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={selectImage} />
            </label>
            {draft.image && <Image src={draft.image} alt="Food preview" width={640} height={200} unoptimized className="h-32 w-full rounded-lg object-cover" />}
            <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">Portion variants</legend>
              {variants.map((variant, index) => (
                <div key={variant.id} className="grid grid-cols-[1fr_1fr_90px_auto] gap-2">
                  <input aria-label={`Variant ${index + 1} name`} required placeholder="Name" className="min-w-0 rounded border p-2 text-sm" value={variant.name} onChange={(event) => setVariants((current) => current.map((entry) => entry.id === variant.id ? { ...entry, name: event.target.value } : entry))} />
                  <input aria-label={`Variant ${index + 1} portion`} placeholder="Portion" className="min-w-0 rounded border p-2 text-sm" value={variant.portionDescription || ""} onChange={(event) => setVariants((current) => current.map((entry) => entry.id === variant.id ? { ...entry, portionDescription: event.target.value } : entry))} />
                  <input aria-label={`Variant ${index + 1} price`} required type="number" min="0" step="0.01" placeholder="Price" className="w-full rounded border p-2 text-sm" value={variant.price} onChange={(event) => setVariants((current) => current.map((entry) => entry.id === variant.id ? { ...entry, price: Number(event.target.value) } : entry))} />
                  <button type="button" aria-label={`Remove variant ${index + 1}`} className="rounded border px-2 text-red-700" onClick={() => setVariants((current) => current.filter((entry) => entry.id !== variant.id))}>×</button>
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-orange-700" onClick={() => setVariants((current) => [...current, { id: crypto.randomUUID(), name: "", price: draft.price }])}>+ Add variant</button>
            </fieldset>
            <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">Add-ons</legend>
              {addons.map((addon, index) => (
                <div key={addon.id} className="grid grid-cols-[1fr_110px_auto] gap-2">
                  <input aria-label={`Add-on ${index + 1} name`} required placeholder="Add-on name" className="min-w-0 rounded border p-2 text-sm" value={addon.name} onChange={(event) => setAddons((current) => current.map((entry) => entry.id === addon.id ? { ...entry, name: event.target.value } : entry))} />
                  <input aria-label={`Add-on ${index + 1} price`} required type="number" min="0" step="0.01" placeholder="Price" className="w-full rounded border p-2 text-sm" value={addon.price} onChange={(event) => setAddons((current) => current.map((entry) => entry.id === addon.id ? { ...entry, price: Number(event.target.value) } : entry))} />
                  <button type="button" aria-label={`Remove add-on ${index + 1}`} className="rounded border px-2 text-red-700" onClick={() => setAddons((current) => current.filter((entry) => entry.id !== addon.id))}>×</button>
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-orange-700" onClick={() => setAddons((current) => [...current, { id: crypto.randomUUID(), name: "", price: 0 }])}>+ Add add-on</button>
            </fieldset>
            <div className="flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" checked={draft.isVeg} onChange={(event) => setDraft({ ...draft, isVeg: event.target.checked })} /> Vegetarian</label>
              <label><input type="checkbox" checked={draft.isPopular} onChange={(event) => setDraft({ ...draft, isPopular: event.target.checked })} /> Popular</label>
              <label><input type="checkbox" checked={draft.isChefSpecial} onChange={(event) => setDraft({ ...draft, isChefSpecial: event.target.checked })} /> Chef special</label>
              <label><input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} /> Available to customers</label>
            </div>
            <div className="flex gap-2">
              <button disabled={busy || !formCategories.length} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : editingItem ? "Save item" : "Create item"}</button>
              {editingItem && <button type="button" disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => resetItemForm()}>Cancel</button>}
            </div>
          </form>

          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Food items</h2>
                <p className="text-sm text-stone-600">Showing {filteredItems.length} of {items.length} items</p>
              </div>
              <button type="button" disabled={busy} className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50" onClick={() => resetItemForm()}>+ New item</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="text-sm">Search dishes
                <input type="search" className="mt-1 w-full rounded border p-2" placeholder="Name, description, or slug" value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
              </label>
              <label className="text-sm">Category
                <select className="mt-1 w-full rounded border p-2" value={itemCategoryFilter} onChange={(event) => setItemCategoryFilter(event.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
              </label>
              <label className="text-sm">Listing status
                <select className="mt-1 w-full rounded border p-2" value={itemAvailabilityFilter} onChange={(event) => setItemAvailabilityFilter(event.target.value as typeof itemAvailabilityFilter)}>
                  <option value="all">All statuses</option>
                  <option value="available">Available to customers</option>
                  <option value="unavailable">Unavailable / out of stock</option>
                </select>
              </label>
            </div>
            {filteredItems.map((item) => (
              <article key={item._id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4">
                <Image src={item.image} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-36 flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-stone-600">{categoriesById.get(item.categoryId)?.name || item.categorySlug} · ₹{item.price}</p>
                  <p className="text-xs text-stone-500">{item.inventoryCount} in stock · {item.available && item.inStock && item.inventoryCount > 0 ? "Visible to customers" : "Unavailable to customers"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => beginEdit(item)}>Edit</button>
                  <button type="button" disabled={busy} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => notify(() => toggleAvailability(item))}>{item.available ? "Pause listing" : "Enable listing"}</button>
                  <button type="button" disabled={busy} className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50" onClick={() => {
                    if (window.confirm(`Archive "${item.name}"? Existing order snapshots will be retained.`)) {
                      notify(() => archiveItem(item));
                    }
                  }}>Archive</button>
                  <button type="button" disabled={busy || itemPositions.get(item._id)?.index === 0} aria-label={`Move ${item.name} up`} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => notify(() => moveItem(item, -1))}>↑</button>
                  <button type="button" disabled={busy || itemPositions.get(item._id)?.index === (itemPositions.get(item._id)?.count ?? 0) - 1} aria-label={`Move ${item.name} down`} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => notify(() => moveItem(item, 1))}>↓</button>
                </div>
              </article>
            ))}
            {!filteredItems.length && <p className="rounded-xl border bg-white p-6 text-stone-600">{items.length ? "No menu items match these filters." : "No menu items yet. Create the first one using the form."}</p>}
          </div>
        </section>
      )}

      {tab === "categories" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
          <form onSubmit={(event) => notify(() => saveCategory(event))} className="h-fit space-y-3 rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">{editingCategory ? "Edit category" : "Add category"}</h2>
            <label className="block text-sm">Name
              <input required minLength={2} className="mt-1 w-full rounded border p-2" value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value, slug: editingCategory ? categoryDraft.slug : slugify(event.target.value) })} />
            </label>
            <label className="block text-sm">Slug
              <input required className="mt-1 w-full rounded border p-2" value={categoryDraft.slug} onChange={(event) => setCategoryDraft({ ...categoryDraft, slug: slugify(event.target.value) })} />
            </label>
            <label className="block text-sm">Description
              <textarea maxLength={300} rows={3} className="mt-1 w-full rounded border p-2" value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} />
            </label>
            <div className="flex gap-2">
              <button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : editingCategory ? "Save category" : "Create category"}</button>
              {editingCategory && <button type="button" disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => { setEditingCategory(""); setCategoryDraft({ name: "", slug: "", description: "" }); }}>Cancel</button>}
            </div>
          </form>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
            {sortedCategories.map((category, index) => (
              <article key={category._id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
                <div className="min-w-36 flex-1">
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-stone-500">{category.slug} · {categoryItemCounts.get(category._id) || 0} items</p>
                  <p className={`text-xs font-medium ${category.isActive ? "text-green-700" : "text-stone-500"}`}>{category.isActive ? "Active" : "Hidden from customers"}</p>
                </div>
                <button type="button" disabled={busy} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => { setEditingCategory(category._id); setCategoryDraft({ name: category.name, slug: category.slug, description: category.description || "" }); }}>Edit</button>
                <button type="button" disabled={busy} className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" onClick={() => notify(async () => { await api(`/api/categories/${category._id}`, { method: "PATCH", body: JSON.stringify({ isActive: !category.isActive }) }); await refresh(restaurantId); })}>{category.isActive ? "Deactivate" : "Activate"}</button>
                <button type="button" disabled={busy || index === 0} aria-label={`Move ${category.name} up`} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => notify(() => moveCategory(category, -1))}>↑</button>
                <button type="button" disabled={busy || index === sortedCategories.length - 1} aria-label={`Move ${category.name} down`} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => notify(() => moveCategory(category, 1))}>↓</button>
                <button type="button" disabled={busy} className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50" onClick={() => {
                  if (window.confirm(`Archive category "${category.name}"?`)) {
                    notify(() => archiveCategory(category));
                  }
                }}>Archive</button>
              </article>
            ))}
            {!categories.length && <p className="rounded-xl border bg-white p-6 text-stone-600">No categories yet. Add a category before creating food items.</p>}
          </div>
        </section>
      )}

      {tab === "inventory" && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Stock and availability</h2>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-stone-50"><tr><th className="p-3">Item</th><th className="p-3">Stock</th><th className="p-3">Alert at</th><th className="p-3">Availability</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">
                      <input type="number" min="0" className="w-24 rounded border p-1.5" value={inventoryDrafts[item._id] ?? item.inventoryCount} onChange={(event) => setInventoryDrafts({ ...inventoryDrafts, [item._id]: event.target.value })} />
                      {item.inventoryCount <= item.lowStockThreshold && <span className="ml-2 text-xs font-semibold text-red-700">Low stock</span>}
                    </td>
                    <td className="p-3">{item.lowStockThreshold}</td>
                    <td className="p-3">{item.available && item.inStock && item.inventoryCount > 0 ? "Available" : "Out of stock"}</td>
                    <td className="space-x-2 p-3">
                      <button type="button" disabled={busy} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => notify(() => saveStock(item))}>Save stock</button>
                      <button type="button" disabled={busy} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => notify(() => toggleAvailability(item))}>{item.available ? "Pause listing" : "Enable listing"}</button>
                      <button type="button" disabled={busy} className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => notify(() => showHistory(item))}>History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historyItem && (
            <section className="rounded-xl border bg-white p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Stock history: {historyItem}</h3><button className="text-sm text-stone-600" onClick={() => setHistoryItem("")}>Close</button></div>
              {!movements.length ? <p className="text-sm text-stone-600">No stock movements recorded.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">When</th><th className="p-2">Type</th><th className="p-2">Change</th><th className="p-2">Before → after</th><th className="p-2">Reason</th></tr></thead>
                  <tbody>{movements.map((movement) => <tr key={movement._id} className="border-t"><td className="p-2">{new Date(movement.createdAt).toLocaleString()}</td><td className="p-2">{movement.movementType}</td><td className="p-2">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td><td className="p-2">{movement.previousCount} → {movement.newCount}</td><td className="p-2">{movement.reason || "—"}</td></tr>)}</tbody>
                </table></div>
              )}
            </section>
          )}
        </section>
      )}
    </main>
  );
}
