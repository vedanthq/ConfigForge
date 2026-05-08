"use client"

import React, { useState, useEffect } from "react";
import { RuntimeEntity } from "@/types/config";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import ErrorPage from "@/components/pages/ErrorPage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface DetailPageProps {
  entity: RuntimeEntity;
  id?: string;
}

export default function DetailPage({ entity, id }: DetailPageProps) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No record ID provided");
      setLoading(false);
      return;
    }

    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/${entity.name}/${id}`);
        if (res.status === 404) {
          setError("NOT_FOUND");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRecord(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch record");
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [entity.name, id]);

  if (loading) return <LoadingSkeleton rows={4} />;

  if (error === "NOT_FOUND") {
    return <ErrorPage message="Record not found" />;
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#d32f2f", marginBottom: "1rem" }}>Error</h2>
        <p style={{ color: "#666" }}>{error}</p>
      </div>
    );
  }

  const data = record?.data || record || {};

  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}
      >
        {entity.label} Details
      </h1>
      <div
        style={{
          border: "1px solid #dee2e6",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {entity.fields.map((field) => (
          <div
            key={field.id}
            style={{
              display: "flex",
              borderBottom: "1px solid #dee2e6",
              padding: "0.75rem 1rem",
            }}
          >
            <div style={{ fontWeight: 600, width: "200px", flexShrink: 0 }}>
              {field.label}
            </div>
            <div style={{ color: "#333" }}>
              {String(data[field.id] ?? "")}
            </div>
          </div>
        ))}
      </div>
      <a
        href={`/${entity.name}`}
        style={{
          display: "inline-block",
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#6c757d",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "4px",
        }}
      >
        Back to list
      </a>
    </div>
  );
}
