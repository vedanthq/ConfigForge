"use client"

import React from "react";
import { FieldProps } from "@/types/config";

export default function TextInput({ id, label, value, onChange }: FieldProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        htmlFor={id}
        style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
    </div>
  );
}
