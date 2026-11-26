"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/lib/crm/toast-context";

const COOLDOWN_MS = 15000;

export function SecurityMonitor() {
  const pathname = usePathname();
  const { show } = useToast();
  const lastSentRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const reportEvent = (
      eventType: "CLIPBOARD_COPY" | "CLIPBOARD_CUT" | "SCREENSHOT_ATTEMPT" | "PRINT_ATTEMPT",
      details: string,
      notifyUser?: string
    ) => {
      const now = Date.now();
      const prev = lastSentRef.current[eventType] || 0;
      if (now - prev < COOLDOWN_MS) return;
      lastSentRef.current[eventType] = now;

      if (notifyUser) {
        show(notifyUser);
      }

      const payload = JSON.stringify({
        eventType,
        pagePath: pathname || "/",
        details,
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/crm/security-events", blob);
      } else {
        fetch("/api/crm/security-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: true,
          body: payload,
        }).catch(() => {});
      }
    };

    const handleCopy = () => {
      const selection = window.getSelection()?.toString() || "";
      if (!selection.trim()) return;
      const preview = selection.trim().slice(0, 100);
      reportEvent(
        "CLIPBOARD_COPY",
        `Copied ${selection.length} char(s) from ${pathname}: "${preview}${selection.length > 100 ? "…" : ""}"`,
        "Security notice: Copy activity logged & reported to support@nexorastaffingllp.com."
      );
    };

    const handleCut = () => {
      const selection = window.getSelection()?.toString() || "";
      if (!selection.trim()) return;
      reportEvent(
        "CLIPBOARD_CUT",
        `Cut ${selection.length} char(s) from ${pathname}`,
        "Security notice: Clipboard activity logged & reported."
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      // Print / Save PDF (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && key === "p") {
        reportEvent(
          "PRINT_ATTEMPT",
          `Print / Save PDF shortcut triggered on ${pathname}`,
          "Security notice: Print attempt logged & reported to support@nexorastaffingllp.com."
        );
      }
      // Snipping tool / macOS screenshot shortcuts (Win+Shift+S, Cmd+Shift+3/4/5)
      if (
        (e.metaKey && e.shiftKey && (key === "s" || key === "3" || key === "4" || key === "5")) ||
        key === "printscreen"
      ) {
        reportEvent(
          "SCREENSHOT_ATTEMPT",
          `Screenshot shortcut (${e.key}) detected on ${pathname}`,
          "Security notice: Screenshot activity logged & reported to support@nexorastaffingllp.com."
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key || "").toLowerCase() === "printscreen") {
        reportEvent(
          "SCREENSHOT_ATTEMPT",
          `PrintScreen key pressed on ${pathname}`,
          "Security notice: Screenshot activity logged & reported to support@nexorastaffingllp.com."
        );
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pathname, show]);

  return null;
}
