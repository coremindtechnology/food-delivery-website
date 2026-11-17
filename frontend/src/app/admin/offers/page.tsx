"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gift,
  Grid2X2,
  List,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

type Restaurant = { _id: string; name: string; slug: string; type: string };
type CampaignStatus = "active" | "scheduled" | "expired" | "inactive";
type Campaign = {
  _id: string;
  campaignType: "offer" | "coupon";
  title: string;
  code: string;
  description?: string;
  restaurantId?: Restaurant | string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};
type CampaignDraft = {
  campaignType: "offer" | "coupon";
  title: string;
  code: string;
  description: string;
  restaurantId: string;
  discountType: "percentage" | "flat";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};
type CampaignStats = {
  totalOffers: number;
  totalCoupons: number;
  activeNow: number;
  scheduled: number;
  expired: number;
};
type CampaignResponse = {
  data: Campaign[];
  meta: { page: number; totalCount: number; totalPages: number; stats: CampaignStats };
};
type Tab = "all" | "offer" | "coupon";
type StatusFilter = "all" | CampaignStatus;

const EMPTY_STATS: CampaignStats = {
  totalOffers: 0,
  totalCoupons: 0,
  activeNow: 0,
  scheduled: 0,
  expired: 0,
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputValue(value: string) {
  return localDate(new Date(value));
}

function createDraft(restaurantId = ""): CampaignDraft {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + 30);
  return {
    campaignType: "coupon",
    title: "",
    code: "",
    description: "",
    restaurantId,
    discountType: "flat",
    discountValue: "50",
    minOrderAmount: "0",
    maxDiscountAmount: "",
    usageLimit: "",
    validFrom: localDate(today),
    validUntil: localDate(expiry),
    isActive: true,
  };
}

function campaignToDraft(campaign: Campaign): CampaignDraft {
  const restaurantId =
    campaign.restaurantId && typeof campaign.restaurantId === "object"
      ? campaign.restaurantId._id
      : campaign.restaurantId || "";
  return {
    campaignType: campaign.campaignType,
    title: campaign.title,
    code: campaign.campaignType === "coupon" ? campaign.code : "",
    description: campaign.description || "",
    restaurantId,
    discountType: campaign.discountType,
    discountValue: String(campaign.discountValue),
    minOrderAmount: String(campaign.minOrderAmount),
    maxDiscountAmount: campaign.maxDiscountAmount ? String(campaign.maxDiscountAmount) : "",
    usageLimit: campaign.usageLimit ? String(campaign.usageLimit) : "",
    validFrom: dateInputValue(campaign.validFrom),
    validUntil: dateInputValue(campaign.validUntil),
    isActive: campaign.isActive,
  };
}

function statusOf(campaign: Campaign): CampaignStatus {
  if (!campaign.isActive) return "inactive";
  const now = Date.now();
  if (new Date(campaign.validFrom).getTime() > now) return "scheduled";
  if (new Date(campaign.validUntil).getTime() < now) return "expired";
  if (campaign.usageLimit && campaign.usedCount >= campaign.usageLimit) return "expired";
  return "active";
}

function formatCurrency(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}

function kitchenName(campaign: Campaign) {
  if (!campaign.restaurantId) return "Both Kitchens";
  return typeof campaign.restaurantId === "string" ? "Selected Kitchen" : campaign.restaurantId.name;
}

async function request<T>(url: string, init?: RequestInit): Promise<{ data: T; meta?: CampaignResponse["meta"] }> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return { data: result.data as T, meta: result.meta };
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3.5 ${tone}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold opacity-75">{label}</p>
        <p className="mt-0.5 text-xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function AdminOffersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<CampaignStats>(EMPTY_STATS);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [kitchen, setKitchen] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState<"table" | "grid">("table");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<CampaignDraft>(createDraft());

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30", search, campaignType: tab, status });
      if (kitchen) params.set("restaurantId", kitchen);
      const [campaignResult, restaurantResult] = await Promise.all([
        request<Campaign[]>(`/api/admin/coupons?${params.toString()}`),
        request<Restaurant[]>("/api/admin/restaurants"),
      ]);
      setCampaigns(campaignResult.data);
      setStats(campaignResult.meta?.stats || EMPTY_STATS);
      setTotalCount(campaignResult.meta?.totalCount || 0);
      setTotalPages(Math.max(campaignResult.meta?.totalPages || 1, 1));
      setRestaurants(restaurantResult.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load offers and coupons.");
    } finally {
      setLoading(false);
    }
  }, [page, search, tab, status, kitchen]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const counts = useMemo(() => {
    return { offers: stats.totalOffers, coupons: stats.totalCoupons };
  }, [stats]);

  function startCreate() {
    setEditingId("");
    setDraft(createDraft());
    setError("");
    setModalOpen(true);
  }

  function startEdit(campaign: Campaign) {
    setEditingId(campaign._id);
    setDraft(campaignToDraft(campaign));
    setError("");
    setModalOpen(true);
  }

  function startDuplicate(campaign: Campaign) {
    const duplicate = campaignToDraft(campaign);
    duplicate.title = `Copy of ${campaign.title}`.slice(0, 100);
    duplicate.code = campaign.campaignType === "coupon"
      ? `${campaign.code.slice(0, 10)}${Date.now().toString().slice(-6)}`
      : "";
    duplicate.isActive = true;
    duplicate.validFrom = localDate();
    setEditingId("");
    setDraft(duplicate);
    setError("");
    setModalOpen(true);
  }

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      campaignType: draft.campaignType,
      title: draft.title.trim(),
      ...(draft.campaignType === "coupon" ? { code: draft.code.trim().toUpperCase() } : {}),
      description: draft.description.trim(),
      restaurantId: draft.restaurantId || null,
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue),
      minOrderAmount: Number(draft.minOrderAmount || 0),
      ...(draft.maxDiscountAmount ? { maxDiscountAmount: Number(draft.maxDiscountAmount) } : {}),
      ...(draft.usageLimit ? { usageLimit: Number(draft.usageLimit) } : {}),
      validFrom: `${draft.validFrom}T00:00:00.000Z`,
      validUntil: `${draft.validUntil}T23:59:59.999Z`,
      isActive: draft.isActive,
    };

    try {
      await request<Campaign>(editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      setNotice(editingId ? "Campaign updated successfully." : "Campaign created successfully.");
      await loadCampaigns();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCampaign(campaign: Campaign) {
    setBusy(true);
    setError("");
    try {
      await request<Campaign>(`/api/admin/coupons/${campaign._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !campaign.isActive }),
      });
      setNotice(`${campaign.title} ${campaign.isActive ? "deactivated" : "activated"}.`);
      await loadCampaigns();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update campaign status.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    if (!window.confirm(`Delete "${campaign.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await request<{ id: string }>(`/api/admin/coupons/${campaign._id}`, { method: "DELETE" });
      setNotice("Campaign deleted successfully.");
      await loadCampaigns();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete campaign.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft<Key extends keyof CampaignDraft>(key: Key, value: CampaignDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[#e7e9e3] bg-white px-3 py-2.5 text-sm text-[#202b25] outline-none transition focus:border-[#168342] focus:ring-2 focus:ring-[#168342]/10";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#188343]">Campaign management</p>
          <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-[#17231d] sm:text-3xl">Offers &amp; Coupons</h1>
          <p className="mt-1 text-sm text-[#68736c]">Create and manage discounts, special offers, and coupon campaigns.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ff7900] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e96f00] focus:outline-none focus:ring-2 focus:ring-[#ff7900]/30"
        >
          <Plus className="h-4 w-4" />
          Create Offer / Coupon
        </button>
      </div>

      <section aria-label="Campaign overview" className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard label="Total Offers" value={stats.totalOffers} icon={<Tag className="h-5 w-5 text-[#188343]" />} tone="border-[#dcebdc] bg-[#f0f8ef] text-[#174b2d]" />
        <MetricCard label="Total Coupons" value={stats.totalCoupons} icon={<Gift className="h-5 w-5 text-[#f07615]" />} tone="border-[#f3e5d8] bg-[#fff7ef] text-[#844316]" />
        <MetricCard label="Active Now" value={stats.activeNow} icon={<Check className="h-5 w-5 text-[#168342]" />} tone="border-[#dcebdc] bg-[#f0f8ef] text-[#174b2d]" />
        <MetricCard label="Scheduled" value={stats.scheduled} icon={<CalendarDays className="h-5 w-5 text-[#d89016]" />} tone="border-[#f2e7d0] bg-[#fff9ed] text-[#805a18]" />
        <MetricCard label="Expired" value={stats.expired} icon={<X className="h-5 w-5 text-[#dc5555]" />} tone="border-[#f1dfdf] bg-[#fff4f4] text-[#8d3939]" />
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e9e8e1] bg-white shadow-[0_6px_24px_rgba(27,42,30,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeee9] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Campaign type">
            {([
              ["all", "All", counts.offers + counts.coupons],
              ["offer", "Offers", counts.offers],
              ["coupon", "Coupons", counts.coupons],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => { setTab(value); setPage(1); }}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${tab === value ? "bg-[#08772c] text-white shadow-sm" : "bg-[#f7f8f5] text-[#536159] hover:bg-[#edf3eb]"}`}
              >
                {label} <span className={tab === value ? "ml-1 text-white/75" : "ml-1 text-[#8a938c]"}>({count})</span>
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-[#e8ebe6] bg-white p-0.5">
            <button type="button" aria-label="Table view" aria-pressed={view === "table"} onClick={() => setView("table")} className={`rounded-md p-1.5 ${view === "table" ? "bg-[#08772c] text-white" : "text-[#68736c] hover:bg-[#f4f6f2]"}`}>
              <List className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-[#08772c] text-white" : "text-[#68736c] hover:bg-[#f4f6f2]"}`}>
              <Grid2X2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-2.5 border-b border-[#eeeee9] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))] sm:px-5">
          <label className="relative block">
            <span className="sr-only">Search offers and coupons</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89928b]" />
            <input maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name or code..." className="w-full rounded-xl border border-[#e6e9e4] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#168342] focus:ring-2 focus:ring-[#168342]/10" />
          </label>
          <label>
            <span className="sr-only">Filter by kitchen</span>
            <select value={kitchen} onChange={(event) => { setKitchen(event.target.value); setPage(1); }} className="w-full rounded-xl border border-[#e6e9e4] bg-white px-3 py-2.5 text-xs font-semibold text-[#35433a] outline-none focus:border-[#168342]">
              <option value="">All Kitchens</option>
              {restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
              <option value="both">Both Kitchens</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by discount type</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="w-full rounded-xl border border-[#e6e9e4] bg-white px-3 py-2.5 text-xs font-semibold text-[#35433a] outline-none focus:border-[#168342]">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="hidden items-center text-xs text-[#778078] lg:flex">Manage visibility, validity and usage</div>
        </div>

        {error && <p role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">{error}</p>}
        {notice && <p role="status" className="mx-4 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 sm:mx-5">{notice}</p>}

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-[#647168]">
            <LoaderCircle className="h-5 w-5 animate-spin text-[#168342]" /> Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef6ec] text-[#168342]"><Tag className="h-5 w-5" /></span>
            <h2 className="mt-3 text-base font-extrabold text-[#26342b]">No campaigns found</h2>
            <p className="mt-1 max-w-sm text-sm text-[#778078]">Try changing your filters or create a new offer or coupon.</p>
            <button type="button" onClick={startCreate} className="mt-4 rounded-lg bg-[#08772c] px-4 py-2 text-xs font-bold text-white hover:bg-[#066323]">Create campaign</button>
          </div>
        ) : view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f4f7f1] text-[10px] font-extrabold uppercase tracking-wide text-[#4c5a50]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Offer / Coupon Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Applicable On</th>
                  <th className="px-4 py-3">Validity</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f1ed]">
                {campaigns.map((campaign, index) => {
                  const campaignStatus = statusOf(campaign);
                  return (
                    <tr key={campaign._id} className="text-xs text-[#29332d] hover:bg-[#fcfdfb]">
                      <td className="px-4 py-3 font-semibold text-[#677169]">{(page - 1) * 30 + index + 1}</td>
                      <td className="max-w-[210px] px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${campaign.campaignType === "coupon" ? "bg-[#fff4de] text-[#e48c12]" : "bg-[#eaf5e9] text-[#168342]"}`}>
                            {campaign.campaignType === "coupon" ? <Tag className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-extrabold">{campaign.title}</span>
                            <span className="mt-0.5 block truncate text-[10px] text-[#778078]">{campaign.description || "Campaign discount"}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${campaign.campaignType === "coupon" ? "bg-[#e6f7e7] text-[#1a803b]" : "bg-[#fff0df] text-[#bd6b16]"}`}>{campaign.campaignType === "coupon" ? "Coupon" : "Offer"}</span></td>
                      <td className="px-4 py-3 font-bold">{campaign.campaignType === "coupon" ? campaign.code : "—"}</td>
                      <td className="px-4 py-3 font-extrabold">{campaign.discountType === "flat" ? `${formatCurrency(campaign.discountValue)} OFF` : `${campaign.discountValue}% OFF`}</td>
                      <td className="px-4 py-3">{kitchenName(campaign)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[10px] text-[#59655d]"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(campaign.validFrom)} – {formatDate(campaign.validUntil)}</span></td>
                      <td className="whitespace-nowrap px-4 py-3">{campaign.usageLimit ? `${campaign.usedCount.toLocaleString("en-IN")} / ${campaign.usageLimit.toLocaleString("en-IN")}` : `${campaign.usedCount.toLocaleString("en-IN")} / ∞`}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => void toggleCampaign(campaign)} disabled={busy} aria-label={`${campaign.isActive ? "Deactivate" : "Activate"} ${campaign.title}`} aria-pressed={campaign.isActive} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold disabled:opacity-50 ${campaignStatus === "active" ? "bg-[#e6f7e7] text-[#187c39]" : campaignStatus === "scheduled" ? "bg-[#fff3df] text-[#b67014]" : campaignStatus === "expired" ? "bg-[#f0f1f2] text-[#5b6268]" : "bg-[#f4f4f4] text-[#747b80]"}`}>
                          <span className={`h-2 w-2 rounded-full ${campaignStatus === "active" ? "bg-[#179449]" : campaignStatus === "scheduled" ? "bg-[#e6a327]" : campaignStatus === "expired" ? "bg-[#7a8289]" : "bg-[#a6abad]"}`} />
                          {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => startEdit(campaign)} aria-label={`Edit ${campaign.title}`} className="rounded-md p-1.5 text-[#59655d] hover:bg-[#eff5ed] hover:text-[#08772c]"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => startDuplicate(campaign)} aria-label={`Duplicate ${campaign.title}`} className="rounded-md p-1.5 text-[#59655d] hover:bg-[#eff5ed] hover:text-[#08772c]"><Copy className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void deleteCampaign(campaign)} aria-label={`Delete ${campaign.title}`} className="rounded-md p-1.5 text-[#d84b4b] hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => {
              const campaignStatus = statusOf(campaign);
              return (
                <article key={campaign._id} className="rounded-xl border border-[#eaeee8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef6ec] text-[#168342]"><Tag className="h-4 w-4" /></span>
                      <div><h2 className="font-extrabold text-[#29332d]">{campaign.title}</h2><p className="mt-0.5 text-[11px] text-[#778078]">{campaign.campaignType === "coupon" ? campaign.code : "Offer"}</p></div>
                    </div>
                    <span className="rounded-full bg-[#f1f4ef] px-2 py-1 text-[10px] font-bold capitalize">{campaignStatus}</span>
                  </div>
                  <p className="mt-4 text-xl font-black text-[#08772c]">{campaign.discountType === "flat" ? `${formatCurrency(campaign.discountValue)} OFF` : `${campaign.discountValue}% OFF`}</p>
                  <p className="mt-1 text-xs text-[#68736c]">{kitchenName(campaign)} · {formatDate(campaign.validFrom)} – {formatDate(campaign.validUntil)}</p>
                  <p className="mt-2 text-xs text-[#68736c]">Usage: {campaign.usedCount} / {campaign.usageLimit || "Unlimited"}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#edf0eb] pt-3">
                    <button type="button" onClick={() => void toggleCampaign(campaign)} disabled={busy} className="text-xs font-bold text-[#08772c] disabled:opacity-50">{campaign.isActive ? "Deactivate" : "Activate"}</button>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => startEdit(campaign)} aria-label={`Edit ${campaign.title}`} className="rounded-md p-1.5 text-[#59655d] hover:bg-[#eff5ed]"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => startDuplicate(campaign)} aria-label={`Duplicate ${campaign.title}`} className="rounded-md p-1.5 text-[#59655d] hover:bg-[#eff5ed]"><Copy className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void deleteCampaign(campaign)} aria-label={`Delete ${campaign.title}`} className="rounded-md p-1.5 text-[#d84b4b] hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && totalCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#eeeee9] px-4 py-3 text-xs text-[#68736c] sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p>Showing {(page - 1) * 30 + 1} to {Math.min(page * 30, totalCount)} of {totalCount} offers &amp; coupons</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-[#e7e9e4] px-2.5 py-2 font-semibold hover:bg-[#f8faf7] disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Previous</button>
              <span className="px-2 font-bold text-[#25342b]">Page {page} of {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-[#e7e9e4] px-2.5 py-2 font-semibold hover:bg-[#f8faf7] disabled:opacity-40">Next<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#132019]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="campaign-form-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf0eb] bg-white px-5 py-4">
              <div>
                <h2 id="campaign-form-title" className="text-lg font-black text-[#1d2b22]">{editingId ? "Edit campaign" : "Create offer / coupon"}</h2>
                <p className="mt-0.5 text-xs text-[#768078]">Configure the discount, kitchen and campaign validity.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close campaign form" className="rounded-lg p-2 text-[#68736c] hover:bg-[#f2f4f1]"><X className="h-5 w-5" /></button>
            </header>
            <form onSubmit={submitCampaign} className="space-y-4 p-5">
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#35433a]">Campaign type
                  <select value={draft.campaignType} onChange={(event) => updateDraft("campaignType", event.target.value as CampaignDraft["campaignType"])} className={inputClass}>
                    <option value="coupon">Coupon</option><option value="offer">Offer</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#35433a]">Campaign name
                  <input required minLength={2} maxLength={100} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="e.g. Welcome Offer" className={inputClass} />
                </label>
                {draft.campaignType === "coupon" && (
                  <label className="text-xs font-bold text-[#35433a]">Coupon code
                    <input required minLength={3} maxLength={20} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" value={draft.code} onChange={(event) => updateDraft("code", event.target.value.toUpperCase())} placeholder="WELCOME50" className={`${inputClass} uppercase`} />
                  </label>
                )}
                <label className="text-xs font-bold text-[#35433a]">Applicable kitchen
                  <select value={draft.restaurantId} onChange={(event) => updateDraft("restaurantId", event.target.value)} className={inputClass}>
                    <option value="">Both Kitchens</option>{restaurants.map((restaurant) => <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-[#35433a]">Discount type
                  <select value={draft.discountType} onChange={(event) => updateDraft("discountType", event.target.value as CampaignDraft["discountType"])} className={inputClass}>
                    <option value="flat">Fixed discount (₹ OFF)</option><option value="percentage">Percentage discount (%)</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-[#35433a]">Discount value
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#78837b]">{draft.discountType === "flat" ? "₹" : "%"}</span>
                    <input required type="number" min="0.01" max={draft.discountType === "percentage" ? 100 : undefined} step="0.01" value={draft.discountValue} onChange={(event) => updateDraft("discountValue", event.target.value)} className={`${inputClass} mt-0 pl-8`} />
                  </div>
                </label>
                <label className="text-xs font-bold text-[#35433a]">Minimum order value (₹)
                  <input type="number" min="0" step="1" value={draft.minOrderAmount} onChange={(event) => updateDraft("minOrderAmount", event.target.value)} className={inputClass} />
                </label>
                {draft.discountType === "percentage" && (
                  <label className="text-xs font-bold text-[#35433a]">Maximum discount (₹, optional)
                    <input type="number" min="0.01" step="1" value={draft.maxDiscountAmount} onChange={(event) => updateDraft("maxDiscountAmount", event.target.value)} placeholder="No maximum" className={inputClass} />
                  </label>
                )}
                <label className="text-xs font-bold text-[#35433a]">Usage limit (optional)
                  <input type="number" min="1" step="1" value={draft.usageLimit} onChange={(event) => updateDraft("usageLimit", event.target.value)} placeholder="Unlimited" className={inputClass} />
                </label>
                <label className="text-xs font-bold text-[#35433a]">Start date
                  <input required type="date" value={draft.validFrom} onChange={(event) => updateDraft("validFrom", event.target.value)} className={inputClass} />
                </label>
                <label className="text-xs font-bold text-[#35433a]">Expiry date
                  <input required type="date" min={draft.validFrom} value={draft.validUntil} onChange={(event) => updateDraft("validUntil", event.target.value)} className={inputClass} />
                </label>
              </div>
              <label className="block text-xs font-bold text-[#35433a]">Description (optional)
                <textarea maxLength={300} rows={2} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Short detail shown to admins" className={`${inputClass} resize-y`} />
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e8ede7] px-3 py-3">
                <input type="checkbox" checked={draft.isActive} onChange={(event) => updateDraft("isActive", event.target.checked)} className="h-4 w-4 accent-[#168342]" />
                <span><span className="block text-xs font-bold text-[#35433a]">Active campaign</span><span className="mt-0.5 block text-[11px] text-[#78837b]">Turn off to keep this campaign unavailable to customers.</span></span>
              </label>
              <div className="flex justify-end gap-2 border-t border-[#edf0eb] pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-[#e4e8e2] px-4 py-2.5 text-sm font-bold text-[#526057] hover:bg-[#f8faf7]">Cancel</button>
                <button type="submit" disabled={busy} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#08772c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#066323] disabled:opacity-60">
                  {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{editingId ? "Save changes" : "Create campaign"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
