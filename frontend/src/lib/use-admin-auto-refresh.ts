"use client";

import { useEffect, useRef } from "react";

const REFRESH_INTERVAL_MS = 15_000;

function isEditingFormControl() {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement &&
    activeElement.matches("input, select, textarea, [contenteditable='true']");
}

export function useAdminAutoRefresh(refresh: () => Promise<void> | void) {
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const refreshData = async () => {
      runningRef.current = true;
      try {
        await refreshRef.current();
      } catch (error) {
        console.error("Admin data auto-refresh failed:", error);
      } finally {
        runningRef.current = false;
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isEditingFormControl() || runningRef.current) return;
      void refreshData();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);
}
