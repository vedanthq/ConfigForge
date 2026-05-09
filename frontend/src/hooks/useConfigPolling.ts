"use client"

import { useEffect, useRef } from "react";
import { API_URL } from "@/lib/config";
const POLL_INTERVAL = 10000;

export function useConfigPolling() {
  const versionRef = useRef<string | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_URL}/config/version`);
        if (!res.ok) return;
        const data = await res.json();
        const newVersion = data.version || data.hash || JSON.stringify(data);
        if (versionRef.current && versionRef.current !== newVersion) {
          window.location.reload();
        }
        versionRef.current = newVersion;
      } catch {
        // Silently ignore errors
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);
}
