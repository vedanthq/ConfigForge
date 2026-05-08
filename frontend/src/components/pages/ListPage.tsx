"use client"

import React, { useState, useEffect } from "react";
import { RuntimeEntity } from "@/types/config";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import CSVUploadFlow from "@/components/csv/CSVUploadFlow";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const PAGE_SIZE = 20;

interface ListPageProps {
  entity: RuntimeEntity;
}

export default function ListPage({ entity }: ListPageProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showCsvImport, setShowCsvImport] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/${entity.name}?page=${page}&limit=${PAGE_SIZE}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRecords(json.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch records");
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [entity.name, page]);

  if (loading) return <LoadingSkeleton rows={5} />;

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#d32f2f", marginBottom: "1rem" }}>Error</h2>
        <p style={{ color: "#666" }}>{error}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#666", fontSize: "1.1rem" }}>
          No records found for {entity.label}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          {entity.label}
        </h1>
        <button
          onClick={() => setShowCsvImport(true)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Import CSV
        </button>
      </div>

      {showCsvImport && (
        <CSVUploadFlow
          entityName={entity.name}
          fields={entity.fields}
          onClose={() => setShowCsvImport(false)}
          onImportComplete={() => setPage(1)}
        />
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {entity.fields.map((field) => (
                <th
                  key={field.id}
                  style={{
                    textAlign: "left",
                    padding: "0.5rem",
                    borderBottom: "2px solid #dee2e6",
                    backgroundColor: "#f8f9fa",
                    fontWeight: 600,
                  }}
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row: any, idx: number) => (
              <tr key={row.id || idx}>
                {entity.fields.map((field) => (
                  <td
                    key={field.id}
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #dee2e6",
                    }}
                  >
                    {String(row.data?.[field.id] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: page === 1 ? "#e9ecef" : "#007bff",
            color: page === 1 ? "#6c757d" : "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={records.length < PAGE_SIZE}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: records.length < PAGE_SIZE ? "#e9ecef" : "#007bff",
            color: records.length < PAGE_SIZE ? "#6c757d" : "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: records.length < PAGE_SIZE ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
