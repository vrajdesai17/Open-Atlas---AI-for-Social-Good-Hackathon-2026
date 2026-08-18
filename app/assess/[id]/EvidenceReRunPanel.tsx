"use client";

import { useState } from "react";
import type { PanelResult } from "@/lib/agents/panel";
import type { EvidenceItem } from "@/lib/agents/extractor";
import { Scorecard } from "../new/[visa]/Scorecard";

export function EvidenceReRunPanel({
  assessmentId,
  initialResult,
  initialEvidence,
}: {
  assessmentId: string;
  initialResult: PanelResult;
  initialEvidence: EvidenceItem[];
}) {
  const [result, setResult] = useState<PanelResult>(initialResult);
  const [evidence, setEvidence] = useState<EvidenceItem[]>(initialEvidence);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const updateEvidence = (index: number, updates: Partial<EvidenceItem>) => {
    setEvidence((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const addEvidence = () => {
    setEvidence((prev) => [
      ...prev,
      { title: "", detail: "", source: "input", relatedCriteria: [] },
    ]);
  };

  const handleReRun = async () => {
    setRerunning(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence }),
      });

      if (!res.ok) {
        throw new Error("Failed to re-run assessment.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setRerunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <Scorecard result={result} />

      <div className="rounded-xl border border-line bg-card">
        <button
          onClick={() => setIsEvidenceOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none"
        >
          <span className="font-semibold tracking-tight">Edit evidence</span>
          <span className="text-muted">{isEvidenceOpen ? "−" : "+"}</span>
        </button>

        {isEvidenceOpen && (
          <div className="space-y-4 border-t border-line p-5">
            {evidence.length === 0 ? (
              <p className="text-sm text-muted">
                No evidence recorded for this assessment - add some below to re-run.
              </p>
            ) : (
              <div className="space-y-4">
                {evidence.map((item, index) => (
                  <div key={index} className="space-y-3 rounded-lg border border-line p-4">
                    <div className="flex items-start justify-between gap-4">
                      <input
                        type="text"
                        className="w-full bg-transparent font-medium focus:outline-none"
                        value={item.title}
                        onChange={(e) => updateEvidence(index, { title: e.target.value })}
                        placeholder="Evidence title"
                      />
                      <button
                        onClick={() => removeEvidence(index)}
                        className="text-xs font-medium text-red-600 hover:opacity-80"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      className="w-full resize-none bg-transparent text-sm text-muted focus:outline-none"
                      value={item.detail}
                      onChange={(e) => updateEvidence(index, { detail: e.target.value })}
                      rows={3}
                      placeholder="Evidence details..."
                    />
                    {item.source !== "input" && (
                      <div className="text-xs text-muted">Source: {item.source}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={addEvidence}
                className="text-sm font-medium text-accent hover:opacity-80"
              >
                + Add evidence item
              </button>
            </div>

            <div className="mt-6 border-t border-line pt-6">
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleReRun}
                  disabled={rerunning}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50 sm:w-auto self-start"
                >
                  {rerunning ? "Re-running..." : "Re-run assessment"}
                </button>
                <p className="text-xs text-muted">
                  This re-runs the adversarial panel against your edited evidence - can take up to 30 seconds.
                </p>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              {success && (
                <p className="mt-3 text-sm text-green-600">
                  Assessment updated successfully!
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
