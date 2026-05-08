"use client"

import React, { useState } from "react";
import { RuntimeField } from "@/types/config";

interface CSVMapperUIProps {
  headers: string[];
  preview: any[];
  fields: RuntimeField[];
  onImport: (mapping: Record<string, string>) => void;
  onBack: () => void;
  loading: boolean;
}

export default function CSVMapperUI({ headers, preview, fields, onImport, onBack, loading }: CSVMapperUIProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleMappingChange = (csvColumn: string, fieldId: string) => {
    setMapping((prev) => ({ ...prev, [csvColumn]: fieldId }));
  };

  const handleImport = () => {
    onImport(mapping);
  };

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#f8f9fa' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Map CSV Columns to Fields</h3>

      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 600 }}>CSV Column</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 600 }}>Map to Field</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #dee2e6', backgroundColor: '#e9ecef', fontWeight: 600 }}>Preview</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => (
              <tr key={header}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', fontWeight: 500 }}>{header}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                  <select
                    value={mapping[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #ced4da', width: '100%' }}
                  >
                    <option value="">-- Skip --</option>
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', color: '#666', fontSize: '0.9rem' }}>
                  {preview[0]?.[header] || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onBack}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  );
}
