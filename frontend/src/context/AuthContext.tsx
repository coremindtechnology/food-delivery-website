"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CustomerProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  isVerified: boolean;
  defaultAddressId?: string;
  defaultAddress?: SavedAddress;
}

export interface SavedAddress {
  _id: string;
  label: "Home" | "Work" | "Other" | string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

interface AuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  addresses: SavedAddress[];
  openAuthModal: (onSuccessCallback?: () => void) => void;
  closeAuthModal: () => void;
  sendOtp: (phone: string) => Promise<{
    success: boolean;
    devOtp?: string;
    error?: string;
    cooldownSeconds?: number;
  }>;
  verifyOtp: (
    phone: string,
    otp: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  fetchAddresses: () => Promise<void>;
  addAddress: (addressData: Omit<SavedAddress, "_id">) => Promise<SavedAddress | null>;
  deleteAddress: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [onSuccessCb, setOnSuccessCb] = useState<(() => void) | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/addresses");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAddresses(data.data);
        }
      }
    } catch {
      // Ignore background address fetch errors
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.customer) {
          setCustomer(data.data.customer);
          fetchAddresses();
          return;
        }
      }
      setCustomer(null);
      setAddresses([]);
    } catch {
      setCustomer(null);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAddresses]);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  function openAuthModal(callback?: () => void) {
    if (callback) {
      setOnSuccessCb(() => callback);
    }
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setOnSuccessCb(null);
  }

  async function sendOtp(phone: string) {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Failed to send OTP",
        };
      }

      return {
        success: true,
        devOtp: data.data?.devOtp,
        cooldownSeconds: data.data?.cooldownSeconds ?? 60,
      };
    } catch {
      return {
        success: false,
        error: "Network error while sending OTP",
      };
    }
  }

  async function verifyOtp(phone: string, otp: string, name?: string) {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, name }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Invalid OTP",
        };
      }

      setCustomer(data.data.customer);
      fetchAddresses();

      if (onSuccessCb) {
        onSuccessCb();
      }

      closeAuthModal();
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Network error verifying OTP",
      };
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setCustomer(null);
      setAddresses([]);
    }
  }

  async function addAddress(addressData: Omit<SavedAddress, "_id">): Promise<SavedAddress | null> {
    try {
      const res = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchAddresses();
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function deleteAddress(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAddresses();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        customer,
        isAuthenticated: !!customer,
        isLoading,
        isAuthModalOpen,
        addresses,
        openAuthModal,
        closeAuthModal,
        sendOtp,
        verifyOtp,
        logout,
        refreshCustomer,
        fetchAddresses,
        addAddress,
        deleteAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

