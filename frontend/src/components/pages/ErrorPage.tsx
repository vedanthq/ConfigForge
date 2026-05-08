"use client"

import React from "react";

interface ErrorPageProps {
  message?: string;
}

export default function ErrorPage({ message }: ErrorPageProps) {
  const is404 = !message || message === "Page not found";

  return (
    <div
      style={{
        padding: "4rem 2rem",
        textAlign: "center",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {is404 && (
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: 700,
            color: "#dee2e6",
            margin: "0 0 1rem",
          }}
        >
          404
        </h1>
      )}
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {is404 ? "Page not found" : message}
      </h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        {is404
          ? "The page you are looking for does not exist or has been moved."
          : "An error occurred while processing your request."}
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Go back
        </button>
        <a
          href="/"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "4px",
            display: "inline-block",
          }}
        >
          Home
        </a>
      </div>
    </div>
  );
}
