import { generatePlan } from "../lib/agents/planner.ts";
import { getVisa } from "../lib/visas.ts";
import type { EvidenceItem } from "../lib/agents/extractor.ts";
import type { PanelResult, CriterionVerdict } from "../lib/agents/panel.ts";

const visa = getVisa("o1a")!;

const evidence: EvidenceItem[] = [
  { title: "1st Place Award", detail: "1st place at IIT Bombay TECHFEST 2022 (student competition, 100 teams).", source: "github", relatedCriteria: ["awards"] },
  { title: "Highly cited paper", detail: "Paper 'Multivariate Mutual Information Feature Selection' cited 42 times.", source: "openalex", relatedCriteria: ["scholarly"] },
];

// Hand-built gap/partial panel result — skip a live panel call, go straight
// to the planner (fewer moving parts to isolate this specific agent).
const criteria: CriterionVerdict[] = visa.criteria.map((c) => ({
  criterionId: c.id,
  label: c.label,
  verdict: c.id === "scholarly" ? "partial" : "gap",
  confidence: "medium",
  advocate: "",
  examiner: "",
  reasoning: "",
  runway: "",
}));

const panel: PanelResult = {
  criteria,
  metCount: 0,
  partialCount: 1,
  threshold: visa.threshold,
  total: visa.criteria.length,
  eligible: false,
  summary: "test fixture",
  strengthScore: 0.1,
  finalMerits: "weak",
};

const plan = await generatePlan(evidence, panel, visa, "stem");
console.log("strategyRationale:", plan.strategyRationale);
console.log("phases:", plan.phases.length);
for (const phase of plan.phases) {
  console.log(`\n[${phase.phase} / ${phase.timeframe}] ${phase.tasks.length} task(s)`);
  for (const t of phase.tasks) {
    console.log(`  - ${t.criterionId}: ${t.title}`);
    console.log(`    proof: ${t.expectedEvidentiaryProof}`);
    if (t.outreachTemplate) {
      console.log(`    outreachTemplate: ${t.outreachTemplate.slice(0, 200)}${t.outreachTemplate.length > 200 ? "…" : ""}`);
    }
  }
}
