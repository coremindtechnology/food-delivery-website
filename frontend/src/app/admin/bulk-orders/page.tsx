"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Inbox, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { useAdminAutoRefresh } from "@/lib/use-admin-auto-refresh";

interface BulkOrderInquiry {
  fullName: string;
  phone: string;
  email: string;
  interestedIn: string;
  message: string;
  orderQuantity?: number;
  estimatedBudget?: number;
  createdAt: string;
}

const STORAGE_KEY = "dual-kitchens-bulk-orders";

export default function BulkOrdersPage() {
  const [items, setItems] = useState<BulkOrderInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setItems(Array.isArray(saved) ? saved : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncStoredInquiries = () => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
        setItems(Array.isArray(saved) ? saved : []);
      } catch {
        setItems([]);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncStoredInquiries();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useAdminAutoRefresh(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      setItems(Array.isArray(saved) ? saved : []);
    } catch {
      setItems([]);
    }
  });

  const stats = useMemo(() => {
    const totalOrders = items.reduce((sum, item) => sum + (Number(item.orderQuantity) || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.estimatedBudget) || 0), 0);

    return {
      total: items.length,
      totalOrders,
      totalAmount,
      thisWeek: items.filter((item) => {
        const submitted = new Date(item.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7 && submitted <= now;
      }).length,
    };
  }, [items]);

  const clearAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  return (
    <main className="min-h-screen bg-[#faf8f3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#e9e2d8] bg-white p-5 shadow-[0_3px_12px_rgba(35,40,30,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f28a00]">Admin Requests</p>
            <h1 className="mt-2 font-display text-3xl font-black text-[#15252a]">Bulk Orders</h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#dfe9d8] bg-[#edf8ea] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-charcoal-500">Total Requests</div>
              <div className="text-xl font-black text-[#0f5d39]">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-[#dfe9d8] bg-[#edf8ea] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-charcoal-500">Total Orders</div>
              <div className="text-xl font-black text-[#0f5d39]">{stats.totalOrders}</div>
            </div>
            <div className="rounded-xl border border-[#f0e7d5] bg-[#fff5e7] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-charcoal-500">Total Amount</div>
              <div className="text-xl font-black text-[#b86300]">₹{stats.totalAmount.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-xl border border-[#f0e7d5] bg-[#fff5e7] px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.18em] text-charcoal-500">This Week</div>
              <div className="text-xl font-black text-[#b86300]">{stats.thisWeek}</div>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#e9e2d8] bg-white shadow-[0_3px_12px_rgba(35,40,30,0.04)]">
          <div className="flex items-center justify-between border-b border-[#efe7dc] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1d2a2d]">
              <Inbox className="h-4 w-4 text-[#0c7a4d]" />
              Inquiry Queue
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-[#e5dacc] bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700 hover:bg-cream-50"
            >
              Clear all
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-charcoal-500">Loading bulk inquiries…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-charcoal-300" />
              <h2 className="text-lg font-bold text-charcoal-700">No bulk order requests yet</h2>
              <p className="mt-2 text-sm text-charcoal-500">Customer messages from the website will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f3efe9] text-[11px] uppercase tracking-[0.14em] text-charcoal-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Phone</th>
                    <th className="px-4 py-3 font-bold">Email</th>
                    <th className="px-4 py-3 font-bold">Interested in</th>
                    <th className="px-4 py-3 font-bold">Order Qty</th>
                    <th className="px-4 py-3 font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Message</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.email}-${item.createdAt}-${index}`} className="border-t border-[#f0e6d7] align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 rounded-full bg-[#ecf6ec] p-1.5 text-[#0b7c4b]">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-semibold text-charcoal-800">{item.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-charcoal-700">
                          <Phone className="h-3.5 w-3.5 text-charcoal-500" />
                          <span>{item.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-charcoal-700">
                          <Mail className="h-3.5 w-3.5 text-charcoal-500" />
                          <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#fff1d8] px-2.5 py-1 text-[11px] font-bold text-[#a35c00]">
                          {item.interestedIn}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-charcoal-700">
                        {Number(item.orderQuantity) || 0}
                      </td>
                      <td className="px-4 py-4 text-charcoal-700">
                        {Number(item.estimatedBudget) ? `₹${Number(item.estimatedBudget).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="max-w-md px-4 py-4 text-charcoal-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal-400" />
                          <span className="whitespace-pre-line">{item.message}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-charcoal-600">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-3.5 w-3.5 text-charcoal-400" />
                          <span>{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
