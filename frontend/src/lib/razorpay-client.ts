"use client";

export interface RazorpayCheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (result: RazorpayCheckoutResult) => void | Promise<void>;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayConstructor {
  new(options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export async function launchRazorpayCheckout(
  input: Omit<RazorpayOptions, "handler" | "modal">
) {
  await loadRazorpayCheckout();
  if (!window.Razorpay) throw new Error("Razorpay checkout did not initialize.");

  return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      ...input,
      handler: resolve,
      modal: { ondismiss: () => reject(new Error("Payment window was closed.")) },
    });
    checkout.open();
  });
}
