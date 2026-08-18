import { runPanel } from "../lib/agents/panel.ts";
import { getVisa } from "../lib/visas.ts";
import type { EvidenceItem } from "../lib/agents/extractor.ts";

const visa = getVisa("o1a")!;
// Student-style profile — the calibrated panel should be skeptical of these.
const evidence: EvidenceItem[] = [
  { title: "1st Place Award", detail: "1st place at IIT Bombay TECHFEST 2022 (student competition, 100 teams).", source: "github", relatedCriteria: ["awards"] },
  { title: "Highly cited paper", detail: "Paper 'Multivariate Mutual Information Feature Selection' cited 42 times.", source: "openalex", relatedCriteria: ["scholarly"] },
  { title: "Published article", detail: "Paper in International Journal of Innovative Science and Research Technology (IJISRT).", source: "openalex", relatedCriteria: ["scholarly"] },
  { title: "Software Engineer role", detail: "Software Engineer, ML Research at a university institute.", source: "resume", relatedCriteria: ["critical-role"] },
  { title: "High salary", detail: "$180,000 annual salary (no comparative wage data provided).", source: "resume", relatedCriteria: ["salary"] },
  { title: "Open-source project", detail: "Published an npm CLI for semantic code diff analysis (a few stars).", source: "resume", relatedCriteria: ["original"] },
];

const result = await runPanel(evidence, visa, "stem");
console.log("VERDICT:", result.summary, `(eligible=${result.eligible})`);
for (const c of result.criteria) {
  console.log(`  ${c.verdict.toUpperCase().padEnd(8)} ${c.confidence.padEnd(7)} ${c.label}`);
}
