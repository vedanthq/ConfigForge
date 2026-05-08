"use client"

import React from "react";
import { FieldProps } from "@/types/config";

export default function BooleanInput({ id, label, value, onChange }: FieldProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label htmlFor={id} style={{ fontWeight: 500 }}>
        <input
          id={id}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ marginRight: "0.5rem" }}
        />
        {label}
      </label>
    </div>
  );
}
