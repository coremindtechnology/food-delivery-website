"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/delivery/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Unable to sign in.");
        return;
      }
      router.replace("/delivery");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-cream-100 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-cream-200 bg-white p-7 shadow-soft">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Delivery team</p>
          <h1 className="mt-1 text-2xl font-black text-charcoal-900">Sign in</h1>
          <p className="mt-2 text-sm text-charcoal-500">Use the login credentials issued by your delivery manager.</p>
        </div>
        <label className="block text-sm font-semibold text-charcoal-800">
          Phone number
          <input
            required
            inputMode="numeric"
            autoComplete="username"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm font-semibold text-charcoal-800">
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2.5"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" fullWidth isLoading={loading}>Sign in to delivery panel</Button>
      </form>
    </main>
  );
}
