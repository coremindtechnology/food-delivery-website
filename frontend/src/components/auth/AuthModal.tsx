"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Phone, KeyRound, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-cream-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="relative bg-gradient-to-r from-primary-600 to-amber-500 px-6 py-8 text-white">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Authentication
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight">
            {step === "phone" ? "Welcome to Dual Kitchens" : "Verify Mobile Number"}
          </h2>
          <p className="text-white/85 text-xs mt-1">
            {step === "phone"
              ? "Login or create an account with SMS OTP to track orders & save addresses"
              : `Enter the 6-digit code sent to +91 ${phone}`}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Dev Mock OTP Notification */}
          {devOtpHint && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-medium flex items-center justify-between">
              <span>
                🛠️ <strong>Dev Mock OTP:</strong> <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">{devOtpHint}</code>
              </span>
              <button
                type="button"
                onClick={() => setOtp(devOtpHint)}
                className="text-[11px] underline text-primary-600 font-bold"
              >
                Auto-fill
              </button>
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-charcoal-500 font-bold text-sm">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="98765 43210"
                    autoFocus
                    required
                    className="w-full pl-20 pr-4 py-3.5 rounded-2xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-charcoal-900 font-semibold tracking-wide text-base placeholder:text-charcoal-400 placeholder:font-normal"
                  />
                </div>
                <p className="text-[11px] text-charcoal-500 mt-1.5">
                  We will send a 6-digit one-time password via SMS.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                className="mt-2 font-bold"
              >
                <span>Send OTP</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
                  Your Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-2xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-charcoal-900 text-sm mb-3 placeholder:text-charcoal-400"
                />

                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1.5">
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
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 px-4 rounded-2xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-charcoal-900"
                  />
                  <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-charcoal-400" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
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
                className="mt-2 font-bold"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-cream-200 text-center">
            <p className="text-[11px] text-charcoal-500">
              By proceeding, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

