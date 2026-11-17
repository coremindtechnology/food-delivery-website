"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationProps {
  type?: NotificationType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Notification({
  type = "info",
  title,
  message,
  onClose,
  className,
}: NotificationProps) {
  const styles = {
    success: {
      bg: "bg-success-50 border-success-200 text-success-900",
      icon: <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />,
      closeBtn: "text-success-700 hover:bg-success-100",
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-900",
      icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
      closeBtn: "text-red-700 hover:bg-red-100",
    },
    info: {
      bg: "bg-sky-50 border-sky-200 text-sky-900",
      icon: <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />,
      closeBtn: "text-sky-700 hover:bg-sky-100",
    },
    warning: {
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      closeBtn: "text-amber-700 hover:bg-amber-100",
    },
  };

  const current = styles[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 shadow-soft transition-all duration-200",
        current.bg,
        className
      )}
    >
      <div className="pt-0.5">{current.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-semibold mb-0.5">{title}</h4>}
        <p className="text-sm opacity-90 leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className={cn(
            "rounded-lg p-1 transition-colors -mr-1 -mt-1",
            current.closeBtn
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
