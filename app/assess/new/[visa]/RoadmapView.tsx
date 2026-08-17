"use client";

import { useState } from "react";
import type { PlanResult } from "@/lib/agents/planner";

export function RoadmapView({ plan }: { plan: PlanResult }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
        Action Plan
      </div>
      <p className="text-sm text-ink mb-6">{plan.strategyRationale}</p>

      <div className="space-y-8">
        {plan.phases.map((phase, i) => (
          <div key={i}>
            <h3 className="mb-3 text-lg font-semibold">{phase.phase}</h3>
            <div className="space-y-4">
              {phase.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-line bg-card p-5">
                  <p className="font-semibold text-ink">{task.title}</p>
                  <p className="mt-1 text-sm text-muted">{task.description}</p>
                  
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-faint">
                      Expected Evidentiary Proof
                    </p>
                    <p className="mt-1 text-sm text-ink">{task.expectedEvidentiaryProof}</p>
                  </div>

                  {task.outreachTemplate && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-faint">
                          Outreach Template
                        </p>
                        <button
                          onClick={() => handleCopy(task.id, task.outreachTemplate!)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {copiedId === task.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap rounded-lg bg-panel p-3 text-sm font-mono text-muted">
                        {task.outreachTemplate}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-faint">
        Track task completion from your assessments dashboard once saved.
      </p>
    </div>
  );
}
