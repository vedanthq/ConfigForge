"use client"

import React from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ConfigProvider } from "@/context/ConfigContext";
import { useConfig } from "@/context/ConfigContext";
import PageRouter from "@/components/pages/PageRouter";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { useConfigPolling } from "@/hooks/useConfigPolling";
import RuntimeStatus from "@/components/RuntimeStatus";

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

function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show nav bar on login/signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0.75rem 2rem",
      backgroundColor: "#1e293b",
      color: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <a href="/" style={{ color: "#fff", textDecoration: "none", fontSize: "1.1rem", fontWeight: 700 }}>
          ConfigForge
        </a>
        {status === "authenticated" && (
          <a href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>
            Dashboard
          </a>
        )}
        <RuntimeStatus />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {status === "loading" && (
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Loading...</span>
        )}
        {status === "authenticated" && session?.user?.email && (
          <>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                padding: "0.375rem 0.75rem",
                backgroundColor: "transparent",
                color: "#94a3b8",
                border: "1px solid #475569",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Sign Out
            </button>
          </>
        )}
        {status === "unauthenticated" && (
          <>
            <a
              href="/login"
              style={{
                padding: "0.375rem 0.75rem",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              Sign In
            </a>
            <a
              href="/signup"
              style={{
                padding: "0.375rem 0.75rem",
                backgroundColor: "#2563eb",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "0.85rem",
              }}
            >
              Sign Up
            </a>
          </>
        )}
      </div>
    </nav>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  // Auth pages are accessible without authentication
  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <LoadingSkeleton rows={4} />;
  }

  if (status === "unauthenticated") {
    return (
      <div style={{
        minHeight: "calc(100vh - 56px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#e0e7ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          fontSize: "1.75rem",
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem", color: "#1e293b" }}>
          Sign in to continue
        </h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem", maxWidth: "400px" }}>
          You need to be signed in to access this application. Sign in or create an account to get started.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a
            href="/login"
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: 500,
            }}
          >
            Sign In
          </a>
          <a
            href="/signup"
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#fff",
              color: "#2563eb",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: 500,
              border: "1px solid #2563eb",
            }}
          >
            Create Account
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AppShell() {
  useConfigPolling();

  return (
    <ConfigProvider>
      <NavBar />
      <AuthGate>
        <AppContent />
      </AuthGate>
    </ConfigProvider>
  );
}
