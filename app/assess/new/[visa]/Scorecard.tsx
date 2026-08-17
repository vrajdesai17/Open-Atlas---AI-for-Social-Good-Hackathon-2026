"use client";

import { useState } from "react";
import type { CriterionVerdict, PanelResult, Verdict } from "@/lib/agents/panel";

const VERDICT_STYLE: Record<
  Verdict,
  { pill: string; label: string; dot: string }
> = {
  met: { pill: "bg-green-soft text-green", label: "Met", dot: "bg-green" },
  partial: { pill: "bg-amber-soft text-amber", label: "Partial", dot: "bg-amber" },
  gap: { pill: "bg-panel text-faint", label: "Gap", dot: "bg-faint" },
};

const MERITS_STYLE: Record<PanelResult["finalMerits"], string> = {
  strong: "text-green",
  borderline: "text-amber",
  weak: "text-faint",
};

export function Scorecard({ result }: { result: PanelResult }) {
  return (
    <div>
      {/* Verdict banner */}
      <div
        className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${
          result.eligible ? "bg-green-soft" : "bg-amber-soft"
        }`}
      >
        <div
          className={`text-3xl font-semibold ${
            result.eligible ? "text-green" : "text-amber"
          }`}
        >
          {result.metCount} / {result.total}
        </div>
        <div className="border-l border-line pl-4">
          <p
            className={`text-sm font-semibold ${
              result.eligible ? "text-green" : "text-amber"
            }`}
          >
            {result.eligible ? "Likely eligible" : "Not yet eligible"}
          </p>
          <p className="text-sm text-muted">{result.summary}</p>
        </div>
      </div>

      <div className="mt-3 text-sm text-muted">
        Step 2 — Final Merits: your record reads as{" "}
        <span className={`font-semibold ${MERITS_STYLE[result.finalMerits]}`}>
          {result.finalMerits}
        </span>{" "}
        beyond the raw count
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-faint">
        Criteria breakdown
      </p>
      <div className="mt-2 space-y-2">
        {result.criteria.map((c) => (
          <CriterionCard key={c.criterionId} c={c} />
        ))}
      </div>
    </div>
  );
}

function CriterionCard({ c }: { c: CriterionVerdict }) {
  const [open, setOpen] = useState(false);
  const style = VERDICT_STYLE[c.verdict];

  return (
    <div className="rounded-xl border border-line bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span className="text-sm font-medium">{c.label}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-faint">{c.confidence} confidence</span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${style.pill}`}
          >
            {style.label}
          </span>
          <span className="text-faint">{open ? "−" : "+"}</span>
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
          <Argument label="Advocate" tone="text-green" body={c.advocate} />
          <Argument
            label="Examiner (likely RFE)"
            tone="text-amber"
            body={c.examiner}
          />
          <Argument label="Adjudicator" tone="text-accent" body={c.reasoning} />
          {c.verdict !== "met" && c.runway && (
            <div className="rounded-lg bg-accent-soft px-3 py-2">
              <p className="text-xs font-semibold text-accent">
                How to close this
              </p>
              <p className="mt-0.5 text-muted">{c.runway}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Argument({
  label,
  tone,
  body,
}: {
  label: string;
  tone: string;
  body: string;
}) {
  return (
    <div>
      <p className={`text-xs font-semibold ${tone}`}>{label}</p>
      <p className="mt-0.5 text-muted">{body}</p>
    </div>
  );
}
