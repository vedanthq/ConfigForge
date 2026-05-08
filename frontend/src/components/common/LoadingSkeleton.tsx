"use client"

import React from "react";

export default function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ padding: "1rem" }}>
      <style>{`
        @keyframes sk-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "1rem",
            marginBottom: "0.75rem",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            animation: "sk-pulse 1.5s ease-in-out infinite",
            width: `${60 + i * 10}%`,
          }}
        />
      ))}
    </div>
  );
}
