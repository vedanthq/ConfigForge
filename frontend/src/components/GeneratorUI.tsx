"use client"

import { useState } from "react";
import { API_URL } from "@/lib/config";
import { useApiToken } from "@/hooks/useApiToken";
import { useToast } from "@/components/ui/Toast";

export default function GeneratorUI() {
  const token = useApiToken();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedConfig(null);

    try {
      const res = await fetch(`${API_URL}/api/generate-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "LLM_NOT_CONFIGURED"
            ? "LLM service not configured. Set ANTHROPIC_API_KEY to enable."
            : data.error || "Generation failed"
        );
        return;
      }
      setGeneratedConfig(data.config);
    } catch (err: any) {
      setError(err.message || "Failed to generate config");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!generatedConfig) return;
    if (!token) {
      setError("Please sign in to apply configurations");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API_URL}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(generatedConfig),
      });
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to apply config");
        return;
      }
      setOpen(false);
      setPrompt("");
      setGeneratedConfig(null);
      showToast(`Configuration applied! Version ${data.version || "updated"}`, "success");
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to apply config");
    } finally {
      setApplying(false);
    }
  };

  const handleTryAgain = () => {
    setError(null);
    setGeneratedConfig(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          padding: "1rem 1.5rem",
          backgroundColor: "#6c5ce7",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(108,92,231,0.3)",
          zIndex: 1000,
        }}
      >
        Generate with AI
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "640px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>AI Config Generator</h2>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your app..."
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ccc",
            borderRadius: "6px",
            fontSize: "1rem",
            resize: "vertical",
            marginBottom: "1rem",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        {!generatedConfig && !error && (
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: loading || !prompt.trim() ? "#aaa" : "#6c5ce7",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
              fontWeight: 600,
              width: "100%",
            }}
          >
            {loading ? "Generating config..." : "Generate"}
          </button>
        )}

        {loading && (
          <p style={{ marginTop: "1rem", color: "#666" }}>
            Generating config... (this may take a moment)
          </p>
        )}

        {generatedConfig && (
          <div>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
              Generated Config:
            </p>
            <div
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: "6px",
                padding: "1rem",
                marginBottom: "1rem",
                maxHeight: "300px",
                overflow: "auto",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {JSON.stringify(generatedConfig, null, 2)}
              </pre>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.5rem",
                  backgroundColor: applying ? "#aaa" : "#27ae60",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: applying ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {applying ? "Applying..." : "Apply Config"}
              </button>
              <button
                onClick={handleTryAgain}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {error && (
          <div>
            <p style={{ color: "#e74c3c", marginBottom: "1rem" }}>{error}</p>
            <button
              onClick={handleTryAgain}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6c5ce7",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                width: "100%",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
