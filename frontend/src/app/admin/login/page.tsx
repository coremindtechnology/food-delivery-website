"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  CookingPot,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  LockKeyhole,
  LogIn,
  Mail,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  UtensilsCrossed,
  UsersRound,
} from "lucide-react";

type LoginStep = "credentials" | "sms" | "authenticator";
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const REMEMBERED_EMAIL_KEY = "admin_login_email";

const benefits = [
  { label: "Manage Orders", Icon: ChartNoAxesColumnIncreasing },
  { label: "Update Menu", Icon: UtensilsCrossed },
  { label: "Control Kitchens", Icon: Store },
  { label: "Manage Users", Icon: UsersRound },
  { label: "View Reports", Icon: Settings },
];

function StorefrontIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 180"
      fill="none"
      className="h-auto w-full max-w-[360px]"
    >
      <path d="M22 160h318" stroke="#78b735" strokeWidth="2" />
      <path d="M47 89h170v71H47z" fill="#fffdf5" stroke="#197b39" strokeWidth="2" />
      <path d="M38 85h188l-13-34H51L38 85Z" fill="#f3f8e8" stroke="#197b39" strokeWidth="2" />
      <path d="M43 85c0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0 0 11 16 11 16 0l-2-8H43Z" fill="#a8d85c" stroke="#197b39" strokeWidth="2" />
      <path d="M56 72h158M64 60h145" stroke="#197b39" strokeWidth="2" />
      <path d="M72 102h45v38H72z" fill="#eaf4d9" stroke="#287d3d" strokeWidth="2" />
      <path d="M82 112h25M82 120h25" stroke="#7ab943" strokeWidth="2" />
      <path d="M141 107h54v53h-54z" fill="#fff" stroke="#287d3d" strokeWidth="2" />
      <path d="M151 119h34v41h-34z" fill="#eaf4d9" stroke="#287d3d" strokeWidth="2" />
      <path d="M162 119v41M173 119v41" stroke="#287d3d" strokeWidth="1.5" />
      <path d="M237 116h55v44h-55z" fill="#fffdf5" stroke="#287d3d" strokeWidth="2" />
      <path d="M232 114h65l-8-16h-49l-8 16Z" fill="#b9dd72" stroke="#287d3d" strokeWidth="2" />
      <path d="M243 114c0 8 12 8 12 0 0 8 12 8 12 0 0 8 12 8 12 0 0 8 12 8 12 0" stroke="#287d3d" strokeWidth="2" />
      <path d="M259 129h13v31h-13z" fill="#eaf4d9" stroke="#287d3d" strokeWidth="2" />
      <path d="M28 144c7-21 17-28 25-18 6-16 20-16 26 0 12-8 22 5 23 22M299 148c3-16 15-24 25-15 3-16 20-21 29-8" stroke="#78b735" strokeWidth="3" strokeLinecap="round" />
      <path d="M69 121v28m254-20v19" stroke="#197b39" strokeWidth="2" />
      <circle cx="69" cy="118" r="13" fill="#b8db6b" />
      <circle cx="52" cy="126" r="12" fill="#a7d457" />
      <circle cx="86" cy="130" r="13" fill="#c6e47e" />
      <circle cx="324" cy="120" r="13" fill="#acd55b" />
      <circle cx="308" cy="131" r="12" fill="#c1df77" />
      <circle cx="340" cy="133" r="12" fill="#a1cf4d" />
      <path d="M120 159v-12m-5 12v-8m-5 8v-11" stroke="#79ad3b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [devTotpCode, setDevTotpCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) setEmail(savedEmail);
    } catch {
      setInfo("Your browser could not load saved login details.");
    }
  }, []);

  async function post<T>(url: string, body: Record<string, string>): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let result: ApiResponse<T>;
    try {
      result = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new Error("The server returned an invalid response. Please try again.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to complete sign in. Please try again.");
    }
    return result;
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      const result = await post<{
        challengeToken: string;
        maskedPhone: string;
        devOtp?: string;
      }>("/api/admin/auth/login-step1", { email: email.trim(), password });

      if (!result.data) throw new Error("Login challenge was not returned. Please try again.");

      try {
        if (rememberMe) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        setInfo("Login is continuing, but this browser could not save your email.");
      }

      setChallengeToken(result.data.challengeToken);
      setMaskedPhone(result.data.maskedPhone);
      setDevOtp(result.data.devOtp || "123456");
      setOtp(result.data.devOtp || "123456");
      setStep("sms");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSmsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await post<{ totpEnabled: boolean; devTotpCode?: string }>(
        "/api/admin/auth/login-step2",
        { challengeToken, otp: otp.replace(/\D/g, "") }
      );
      setTotpEnabled(result.data?.totpEnabled ?? false);
      setDevTotpCode(result.data?.devTotpCode || "123456");
      setAuthenticatorCode(result.data?.devTotpCode || "123456");
      setStep("authenticator");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthenticatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const body: Record<string, string> = showRecoveryCode
        ? { challengeToken, recoveryCode: recoveryCode.trim() }
        : { challengeToken, totpCode: authenticatorCode.replace(/\D/g, "") };
      await post("/api/admin/auth/login-step3", body);
      router.replace("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Authenticator verification failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function startOver() {
    setStep("credentials");
    setPassword("");
    setOtp("");
    setAuthenticatorCode("");
    setDevTotpCode("");
    setRecoveryCode("");
    setChallengeToken("");
    setError("");
    setInfo("");
  }

  const submitLabel =
    step === "credentials"
      ? "Login to Admin Panel"
      : step === "sms"
        ? "Verify SMS OTP"
        : "Verify & Login";

  return (
    <main className="relative min-h-[calc(100vh-0px)] overflow-hidden bg-[#fffaf4] px-4 py-8 sm:px-8 lg:flex lg:items-center lg:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f7eddd]/70 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-[#e6f3d9]/80 blur-3xl" />
      <Leaf aria-hidden="true" className="pointer-events-none absolute left-[7%] top-[25%] h-6 w-6 rotate-[-30deg] fill-[#82b930] text-[#82b930]" />
      <Leaf aria-hidden="true" className="pointer-events-none right-[8%] top-[12%] hidden h-10 w-10 rotate-[35deg] fill-[#8fbd42] text-[#8fbd42] sm:absolute sm:block" />
      <Leaf aria-hidden="true" className="pointer-events-none absolute bottom-[10%] right-[4%] h-8 w-8 rotate-[-25deg] fill-[#8fbd42] text-[#8fbd42]" />

      <div className="relative mx-auto grid w-full max-w-[1160px] items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <section className="hidden min-h-[500px] flex-col justify-center border-r border-[#e8dfd3] pr-10 lg:flex">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-[#ff7900] font-display text-3xl font-black text-white shadow-sm">
              DK
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-display text-[25px] font-black leading-none text-[#162032]">Dual Kitchens</h1>
                <Leaf className="h-6 w-6 rotate-[35deg] fill-success-600 text-success-600" />
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#623e1d]">
                Veg &amp; Non-Veg Cloud Kitchens
              </p>
            </div>
          </div>

          <h2 className="font-display text-[42px] font-black leading-tight tracking-tight text-[#122033]">
            <span className="text-success-800">Admin</span> Login
          </h2>
          <p className="mt-1 max-w-[360px] text-sm leading-relaxed text-charcoal-600">
            Access your restaurant dashboard to manage menu, orders, kitchens and more.
          </p>

          <ul className="mt-6 space-y-2.5">
            {benefits.map(({ label, Icon }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7f2de] text-success-800">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </span>
                <span className="text-sm font-bold text-[#162032]">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 max-w-[390px]">
            <StorefrontIllustration />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[500px]">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff7900] font-display text-2xl font-black text-white">DK</span>
            <span>
              <span className="block font-display text-xl font-black text-[#162032]">Dual Kitchens</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#623e1d]">Admin Panel</span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white bg-white/95 px-5 pb-6 pt-6 shadow-[0_20px_60px_rgba(53,50,37,0.15)] sm:px-8 sm:pb-8 sm:pt-7">
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-r from-[#e7f4df] via-white to-[#dcefd2]" />
            <div className="relative z-10">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-success-600 to-success-800 text-white shadow-sm">
                {step === "credentials" ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : step === "sms" ? (
                  <Smartphone className="h-6 w-6" />
                ) : (
                  <KeyRound className="h-6 w-6" />
                )}
              </div>
              <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-[#162032]">
                {step === "credentials" ? "Admin Login" : step === "sms" ? "Verify Your Phone" : "Two-Factor Verification"}
              </h2>
              <p className="mt-1 text-center text-xs text-charcoal-600">
                {step === "credentials"
                  ? "Dual Kitchens Admin Panel"
                  : step === "sms"
                    ? `Enter the SMS code sent to ${maskedPhone}`
                    : "Enter your Authenticator App code or a recovery code"}
              </p>

              {error && (
                <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && <p role="status" className="mt-3 text-xs text-charcoal-600">{info}</p>}

              {step === "credentials" && (
                <form onSubmit={handleCredentialsSubmit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="admin-email" className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-[#20251f]">
                      <Mail className="h-4 w-4 text-success-700" />
                      Email Address
                    </label>
                    <input
                      id="admin-email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your admin email"
                      className="h-11 w-full rounded-xl border border-cream-300 bg-white px-4 text-sm text-charcoal-900 shadow-sm outline-none transition placeholder:text-charcoal-400 focus:border-success-600 focus:ring-2 focus:ring-success-600/15"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-password" className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-[#20251f]">
                      <LockKeyhole className="h-4 w-4 text-success-700" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="h-11 w-full rounded-xl border border-cream-300 bg-white px-4 pr-12 text-sm text-charcoal-900 shadow-sm outline-none transition placeholder:text-charcoal-400 focus:border-success-600 focus:ring-2 focus:ring-success-600/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-charcoal-500 hover:text-charcoal-900"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-charcoal-800">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 accent-success-700"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => setInfo("For security, contact your system administrator to reset your admin password.")}
                      className="text-[11px] font-bold text-success-800 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#087b36] to-[#00652e] px-4 text-sm font-bold text-white shadow-[0_6px_14px_rgba(0,105,46,0.22)] transition hover:from-[#076b30] hover:to-[#005526] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        Login to Admin Panel
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === "sms" && (
                <form onSubmit={handleSmsSubmit} className="mt-5 space-y-4">
                  {devOtp && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Development OTP: <strong className="font-mono tracking-widest">{devOtp}</strong>
                    </div>
                  )}
                  <div>
                    <label htmlFor="admin-sms-otp" className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-[#20251f]">
                      <Smartphone className="h-4 w-4 text-success-700" />
                      6-Digit SMS OTP
                    </label>
                    <input
                      id="admin-sms-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="h-14 w-full rounded-xl border border-cream-300 bg-white text-center font-mono text-2xl font-bold tracking-[0.5em] text-charcoal-900 outline-none focus:border-success-600 focus:ring-2 focus:ring-success-600/15"
                    />
                  </div>
                  <button type="submit" disabled={isLoading || otp.length !== 6} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#087b36] to-[#00652e] text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                    {isLoading ? "Verifying..." : <>Verify SMS OTP <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <button type="button" onClick={startOver} className="mx-auto flex items-center gap-1 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </button>
                </form>
              )}

              {step === "authenticator" && (
                <form onSubmit={handleAuthenticatorSubmit} className="mt-5 space-y-4">
                  {!totpEnabled && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
                      This account has not completed authenticator setup. If you have not enrolled yet, contact your administrator before signing in.
                    </div>
                  )}
                  {devTotpCode && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Development authenticator code:{" "}
                      <strong className="font-mono tracking-widest">{devTotpCode}</strong>
                    </div>
                  )}
                  {showRecoveryCode ? (
                    <div>
                      <label htmlFor="admin-recovery-code" className="mb-1.5 block text-[11px] font-bold text-[#20251f]">
                        Recovery Code
                      </label>
                      <input
                        id="admin-recovery-code"
                        type="text"
                        autoComplete="one-time-code"
                        required
                        value={recoveryCode}
                        onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        className="h-12 w-full rounded-xl border border-cream-300 bg-white px-4 text-center font-mono text-base font-bold tracking-widest outline-none focus:border-success-600 focus:ring-2 focus:ring-success-600/15"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="admin-totp" className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-[#20251f]">
                        <KeyRound className="h-4 w-4 text-success-700" />
                        Authenticator App Code
                      </label>
                      <input
                        id="admin-totp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        autoFocus
                        value={authenticatorCode}
                        onChange={(event) => setAuthenticatorCode(event.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="h-14 w-full rounded-xl border border-cream-300 bg-white text-center font-mono text-2xl font-bold tracking-[0.5em] text-charcoal-900 outline-none focus:border-success-600 focus:ring-2 focus:ring-success-600/15"
                      />
                    </div>
                  )}
                  <button type="submit" disabled={isLoading || (showRecoveryCode ? !recoveryCode.trim() : authenticatorCode.length !== 6)} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#087b36] to-[#00652e] text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                    {isLoading ? "Verifying..." : <>Verify & Login <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setShowRecoveryCode((show) => !show)} className="text-[11px] font-semibold text-success-800 hover:underline">
                      {showRecoveryCode ? "Use authenticator app instead" : "Use a recovery code"}
                    </button>
                    <button type="button" onClick={startOver} className="flex items-center gap-1 text-[11px] font-semibold text-charcoal-600 hover:text-charcoal-900">
                      <ArrowLeft className="h-3 w-3" /> Start over
                    </button>
                  </div>
                </form>
              )}

              <div className="relative mt-5 flex items-center justify-center gap-1.5 text-center text-[10px] text-charcoal-600">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-700" />
                Protected admin access · Dual Kitchens
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
