"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  ArrowRight,
  CookingPot,
  Heart,
  KeyRound,
  Leaf,
  LockKeyhole,
  Phone,
  RefreshCw,
  Truck,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Reset modal state when closed
  useEffect(() => {
    if (!isAuthModalOpen) {
      setStep("phone");
      setOtp("");
      setError(null);
      setDevOtpHint(null);
    }
  }, [isAuthModalOpen]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isAuthModalOpen) return null;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(cleanPhone);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to send OTP");
      return;
    }

    if (res.devOtp) {
      setDevOtpHint(res.devOtp);
      setOtp(res.devOtp); // pre-fill for ease of dev testing
    }

    setCooldown(res.cooldownSeconds || 60);
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setIsLoading(true);
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const res = await verifyOtp(cleanPhone, otp, name.trim() || undefined);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "Verification failed");
      return;
    }
  }

  async function handleResendOtp() {
    if (cooldown > 0 || isLoading) return;
    setError(null);
    setIsLoading(true);
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const res = await sendOtp(cleanPhone);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to resend OTP");
      return;
    }

    if (res.devOtp) {
      setDevOtpHint(res.devOtp);
      setOtp(res.devOtp);
    }

    setCooldown(res.cooldownSeconds || 60);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111614]/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative my-auto w-full max-w-[680px] overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br from-[#fffefa] via-[#fdfaf4] to-[#f3f8e9] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-7 top-16 rotate-[-28deg] text-[#7ab943]/80">
          <Leaf className="h-12 w-12 fill-current" />
        </div>
        <div className="pointer-events-none absolute -right-1 top-28 rotate-[35deg] text-[#9bc963]/70">
          <Leaf className="h-7 w-7 fill-current" />
        </div>
        <div className="pointer-events-none absolute -left-2 bottom-8 rotate-[-25deg] text-[#85bd4d]/80">
          <Leaf className="h-10 w-10 fill-current" />
        </div>
        <div className="pointer-events-none absolute -right-2 bottom-4 rotate-[25deg] text-[#85bd4d]/80">
          <Leaf className="h-10 w-10 fill-current" />
        </div>

        <div className="relative px-5 pb-5 pt-5 sm:px-11 sm:pb-8 sm:pt-9">
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close login"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-charcoal-700 shadow-sm transition hover:bg-cream-100 sm:right-7 sm:top-7"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-7 flex items-center gap-2.5 pr-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff7900] text-lg font-black tracking-tight text-white shadow-sm">
              DK
            </div>
            <div>
              <p className="font-display text-base font-extrabold leading-tight text-[#171717]">Dual Kitchens</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal-600">Veg &amp; Non-Veg Cloud Kitchens</p>
            </div>
          </div>

          <div className="relative">
            <CookingPot aria-hidden="true" className="absolute right-7 top-0 hidden h-11 w-11 text-[#16853e] sm:block" strokeWidth={1.8} />
            <h2 className="pr-10 font-display text-[1.65rem] font-black leading-tight tracking-tight text-[#171717] sm:text-[1.8rem]">
              {step === "phone" ? (
                <>Welcome to <span className="text-[#16853e]">Dual Kitchens</span></>
              ) : (
                <>Verify <span className="text-[#16853e]">Mobile Number</span></>
              )}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-700">
            {step === "phone"
              ? "Login or create an account with SMS OTP to track orders & save addresses"
              : `Enter the 6-digit code sent to +91 ${phone}`}
          </p>

          {step === "phone" && (
            <div className="my-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white/85 px-2 text-[10px] font-semibold text-charcoal-800 shadow-[0_3px_12px_rgba(40,50,30,0.06)] sm:gap-2 sm:px-3 sm:text-xs">
                <Truck className="h-4 w-4 text-[#16853e]" />
                <span>Track Orders</span>
              </div>
              <div className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white/85 px-2 text-[10px] font-semibold text-charcoal-800 shadow-[0_3px_12px_rgba(40,50,30,0.06)] sm:gap-2 sm:px-3 sm:text-xs">
                <Wallet className="h-4 w-4 text-[#16853e]" />
                <span>Get Best Offers</span>
              </div>
              <div className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-white/85 px-2 text-[10px] font-semibold text-charcoal-800 shadow-[0_3px_12px_rgba(40,50,30,0.06)] sm:gap-2 sm:px-3 sm:text-xs">
                <Heart className="h-4 w-4 text-[#16853e]" />
                <span>Save Addresses</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Dev Mock OTP Notification */}
          {devOtpHint && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 shrink-0 text-amber-700" />
                <strong>Dev Mock OTP:</strong>
                <code className="rounded bg-amber-100 px-2 py-1 font-mono font-bold tracking-wider text-amber-800">{devOtpHint}</code>
              </span>
              <button
                type="button"
                onClick={() => setOtp(devOtpHint)}
                className="shrink-0 text-[11px] font-bold text-primary-600 underline"
              >
                Auto-fill
              </button>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-[#20251f]">
                  <Phone className="h-4 w-4 text-[#145c35]" />
                  Mobile Number
                </label>
                <div className="flex overflow-hidden rounded-2xl border border-[#b8d9b2] bg-white shadow-[0_2px_8px_rgba(38,100,44,0.05)] transition focus-within:ring-2 focus-within:ring-[#238545]/25">
                  <div className="flex items-center border-r border-[#d6e5d1] bg-[#edf5e9] px-4 text-sm font-bold text-charcoal-800">
                    IN +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    autoFocus
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base font-semibold tracking-wide text-charcoal-900 outline-none placeholder:font-normal placeholder:text-charcoal-400"
                  />
                </div>
                <p className="mt-2 text-xs text-charcoal-500">
                  We will send a 6-digit one-time password via SMS.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-1 h-12 rounded-full bg-gradient-to-r from-[#078d42] to-[#087332] font-bold shadow-[0_7px_16px_rgba(0,115,49,0.2)] hover:from-[#087a3b] hover:to-[#075d2a] focus-visible:ring-[#078d42]"
              >
                <span>Send OTP</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-3">
                <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  Your Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                </div>
                <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    autoFocus
                    required
                    className="h-[76px] w-full rounded-[22px] border-2 border-primary-500 bg-white py-3 pl-14 pr-4 text-center font-mono text-2xl font-bold tracking-[0.45em] text-charcoal-900 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
                  />
                  <KeyRound className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal-700" />
                </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-charcoal-500 hover:text-charcoal-900 font-medium underline"
                >
                  Change Number
                </button>

                {cooldown > 0 ? (
                  <span className="text-charcoal-400 font-medium">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-primary-600 hover:text-primary-700 font-bold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                  </button>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-1 h-12 rounded-full bg-primary-500 font-extrabold shadow-sm hover:bg-primary-600"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          <div className="relative mt-5 flex items-center justify-center gap-1.5 text-center text-[10px] leading-relaxed text-charcoal-600 sm:text-[11px]">
            <LockKeyhole className="h-3.5 w-3.5 flex-shrink-0 text-charcoal-500" />
            <p>
              By proceeding, you agree to our{" "}
              <Link href="/terms-of-service" className="font-semibold text-[#16853e] hover:underline">Terms of Service</Link>
              {" & "}
              <Link href="/privacy-policy" className="font-semibold text-[#16853e] hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
