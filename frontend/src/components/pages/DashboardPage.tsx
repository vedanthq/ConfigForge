"use client"

import React, { useState, useEffect } from "react";
import { RuntimeConfig, RuntimeEntity } from "@/types/config";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface DashboardPageProps {
  config: RuntimeConfig;
}

interface EntityData {
  entity: RuntimeEntity;
  records: any[];
}

export default function DashboardPage({ config }: DashboardPageProps) {
  const [entityDataList, setEntityDataList] = useState<EntityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          config.entities.map(async (entity) => {
            try {
              const res = await fetch(
                `${API_URL}/api/${entity.name}?limit=5`
              );
              if (!res.ok) return { entity, records: [] };
              const data = await res.json();
              const records = Array.isArray(data) ? data : data.records || [];
              return { entity, records };
            } catch {
              return { entity, records: [] };
            }
          })
        );
        setEntityDataList(results);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [config.entities]);

  if (loading) return <LoadingSkeleton rows={4} />;

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2 style={{ color: "#d32f2f", marginBottom: "1rem" }}>
          Error Loading Dashboard
        </h2>
        <p style={{ color: "#666" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1.5rem",
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        {entityDataList.map(({ entity, records }) => (
          <a
            key={entity.name}
            href={`/${entity.name}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "1.5rem",
                minWidth: "200px",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#007bff",
                }}
              >
                {records.length}
              </div>
              <div style={{ color: "#666", marginTop: "0.25rem" }}>
                {entity.label} records
              </div>
            </div>
          </a>
        ))}
      </div>

      {entityDataList.map(({ entity, records }) => (
        <div key={entity.name} style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Recent {entity.label}
          </h2>
          {records.length === 0 ? (
            <p style={{ color: "#666" }}>No records found</p>
          ) : (
            <div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "0.5rem",
                }}
              >
                <thead>
                  <tr>
                    {entity.fields.slice(0, 4).map((field) => (
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
                  {records.slice(0, 5).map((row: any, idx: number) => (
                    <tr key={row.id || idx}>
                      {entity.fields.slice(0, 4).map((field) => (
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
          )}
          <a
            href={`/${entity.name}/new`}
            style={{
              display: "inline-block",
              padding: "0.4rem 0.75rem",
              backgroundColor: "#28a745",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            Create {entity.label}
          </a>
        </div>
      ))}
    </div>
  );
}
