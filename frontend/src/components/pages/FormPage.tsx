"use client"

import React, { useState } from "react";
import { RuntimeEntity } from "@/types/config";
import { renderField } from "@/lib/renderField";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FormPageProps {
  entity: RuntimeEntity;
}

export default function FormPage({ entity }: FormPageProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (fieldId: string) => (value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/${entity.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      setSuccess(true);
      setFormData({});
    } catch (err: any) {
      setError(err.message || "Failed to create record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setSuccess(false);
    setFormData({});
    setError(null);
  };

  if (success) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}
        >
          {entity.label}
        </h1>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#d4edda",
            color: "#155724",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          Record created successfully!
        </div>
        <button
          onClick={handleCreateAnother}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}
      >
        Create {entity.label}
      </h1>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {entity.fields.map((field) => (
          <div key={field.id}>
            {renderField({
              id: field.id,
              type: field.type,
              label: field.label,
              value: formData[field.id] ?? "",
              onChange: handleChange(field.id),
              options: field.options,
            })}
          </div>
        ))}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.5rem 1.5rem",
            backgroundColor: submitting ? "#6c757d" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
            marginTop: "1rem",
          }}
        >
          {submitting ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
