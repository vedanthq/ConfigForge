"use client"

import React from "react";

interface ImportResultProps {
  result: {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; errors: any[] }>;
  };
  onDone: () => void;
  onImportAnother: () => void;
}

export default function ImportResult({ result, onDone, onImportAnother }: ImportResultProps) {
  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#f8f9fa' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Import Complete</h3>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: '#28a745', fontWeight: 600, margin: '0.5rem 0' }}>
          {result.imported} row{result.imported !== 1 ? 's' : ''} imported successfully
        </p>
        {result.skipped > 0 && (
          <p style={{ color: '#e67e22', fontWeight: 600, margin: '0.5rem 0' }}>
            {result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped
          </p>
        )}
      </div>

      {result.errors.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#d32f2f' }}>
            Errors ({result.errors.length} shown)
          </h4>
          {result.errors.map((err, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.5rem',
                backgroundColor: '#fff',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                marginBottom: '0.25rem',
              }}
            >
              <strong>Row {err.row}:</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>
                {err.errors.map((e: any, i: number) => (
                  <li key={i} style={{ color: '#666', fontSize: '0.9rem' }}>
                    {e.message || e.path?.join('.') || JSON.stringify(e)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onImportAnother}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Import Another
        </button>
        <button
          onClick={onDone}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
