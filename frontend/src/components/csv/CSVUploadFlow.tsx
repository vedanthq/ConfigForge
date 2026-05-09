"use client"

import React, { useState, useRef } from "react";
import { RuntimeField } from "@/types/config";
import CSVMapperUI from "./CSVMapperUI";
import ImportResult from "./ImportResult";
import { API_URL } from "@/lib/config";

type FlowState = "upload" | "mapping" | "result";

interface CSVUploadFlowProps {
  entityName: string;
  fields: RuntimeField[];
  onClose: () => void;
  onImportComplete: () => void;
}

export default function CSVUploadFlow({ entityName, fields, onClose, onImportComplete }: CSVUploadFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileDataRef = useRef<File | null>(null);

  const handleFileSelect = async () => {
    const fileInput = fileRef.current;
    if (!fileInput?.files?.length) return;
    const file = fileInput.files[0];
    fileDataRef.current = file;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/csv-parse`, {
        method: 'POST',
        body: formData,
      });

      if (res.status === 403) {
        setError('CSV import is not enabled for this application');
        setUploading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setHeaders(data.headers);
      setPreview(data.preview);
      setFlowState("mapping");
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async (mapping: Record<string, string>) => {
    const file = fileDataRef.current;
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity', entityName);
      formData.append('mapping', JSON.stringify(mapping));

      const res = await fetch(`${API_URL}/api/csv-import`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setImportResult(data);
      setFlowState("result");
      if (data.imported > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFlowState("upload");
    setHeaders([]);
    setPreview([]);
    setImportResult(null);
    setError(null);
    fileDataRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  if (flowState === "mapping") {
    return (
      <CSVMapperUI
        headers={headers}
        preview={preview}
        fields={fields}
        onImport={handleImport}
        onBack={handleReset}
        loading={uploading}
      />
    );
  }

  if (flowState === "result" && importResult) {
    return (
      <ImportResult
        result={importResult}
        onDone={onClose}
        onImportAnother={handleReset}
      />
    );
  }

  return (
    <div
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        backgroundColor: '#f8f9fa',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Import CSV</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: '#666',
          }}
        >
          ×
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
          <button
            onClick={handleReset}
            style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#721c24',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ marginBottom: '0.5rem' }}
        />
        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>Maximum file size: 2MB</p>
      </div>

      {uploading && <p style={{ color: '#666', marginTop: '0.5rem' }}>Uploading and parsing...</p>}
    </div>
  );
}
