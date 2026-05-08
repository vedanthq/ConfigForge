"use client"

import React from "react";
import { FieldProps } from "@/types/config";

export default function UnknownField({ id, type, label }: FieldProps) {
  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.75rem",
        border: "1px solid orange",
        borderRadius: "4px",
        backgroundColor: "#fff3cd",
        color: "#856404",
      }}
    >
      <strong>Unknown field type: {type}</strong>
      <br />
      <span>
        Field ID: {id}, Label: {label}
      </span>
    </div>
  );
}
