"use client"

import React from "react";
import { ConfigProvider } from "@/context/ConfigContext";
import { useConfig } from "@/context/ConfigContext";
import PageRouter from "@/components/pages/PageRouter";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useConfigPolling } from "@/hooks/useConfigPolling";

function AppContent() {
  const { config, error, loading } = useConfig();

  if (loading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#d32f2f", marginBottom: "1rem" }}>
          Error Loading Configuration
        </h2>
        <p style={{ color: "#666", marginBottom: "1rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#d32f2f",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PageRouter config={config!} />
    </ErrorBoundary>
  );
}

export default function AppShell() {
  useConfigPolling();

  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}
