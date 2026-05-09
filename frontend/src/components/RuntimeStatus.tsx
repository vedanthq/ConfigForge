"use client"

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/config";

interface RuntimeInfo {
  status: string;
  version: number;
  app: string | null;
  entities: number;
  uptime: number;
}

export default function RuntimeStatus() {
  const [info, setInfo] = useState<RuntimeInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (!res.ok) throw new Error("Health check failed");
        const data = await res.json();
        setInfo(data);
        setError(false);
      } catch {
        setError(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "#ef4444" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }} />
        Disconnected
      </span>
    );
  }

  if (!info) {
    return (
      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Connecting...</span>
    );
  }

  const isHealthy = info.status === "healthy";
  const statusColor = isHealthy ? "#22c55e" : "#f59e0b";
  const statusText = isHealthy ? "Connected" : "Starting";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", color: "#94a3b8" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusColor, display: "inline-block" }} />
      {statusText}
      {info.version > 0 && <span style={{ color: "#64748b" }}>v{info.version}</span>}
    </span>
  );
}
