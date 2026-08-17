import { Type } from "@google/genai";
import { generateJSON } from "./llm";
import type { Visa } from "@/lib/visas";
import type { EvidenceItem } from "./extractor";
import type { Domain } from "@/lib/domains";
import { getCalibration } from "./calibration";
import { lookupWagePercentile } from "@/lib/sources/bls";

export type Verdict = "met" | "partial" | "gap";
export type Confidence = "low" | "medium" | "high";

export type CriterionVerdict = {
  criterionId: string;
  label: string;
  verdict: Verdict;
  confidence: Confidence;
  advocate: string;
  examiner: string;
  reasoning: string;
  runway: string; // how to close a gap/partial; empty when met
};

export type PanelResult = {
  criteria: CriterionVerdict[];
  metCount: number;
  partialCount: number;
  threshold: number;
  total: number;
  eligible: boolean;
  summary: string;
  finalMerits: "strong" | "borderline" | "weak";
  strengthScore: number;
};

// One structured call judges every criterion. The free tier caps requests per
// minute hard (~5), so per-criterion calls overflow instantly — the whole panel
// runs in a single request instead. Each criterion still gets its own
// Advocate / Examiner / Adjudicator output in the response array.
const panelSchema = {
  type: Type.OBJECT,
  properties: {
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          criterionId: { type: Type.STRING },
          verdict: { type: Type.STRING, enum: ["met", "partial", "gap"] },
          confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
          advocate: { type: Type.STRING },
          examiner: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          runway: { type: Type.STRING },
        },
        required: [
          "criterionId",
          "verdict",
          "confidence",
          "advocate",
          "examiner",
          "reasoning",
          "runway",
        ],
      },
    },
  },
  required: ["criteria"],
};

const VERDICTS = new Set<Verdict>(["met", "partial", "gap"]);
const CONFS = new Set<Confidence>(["low", "medium", "high"]);

type RawVerdict = {
  criterionId: string;
  verdict: Verdict;
  confidence: Confidence;
  advocate: string;
  examiner: string;
  reasoning: string;
  runway: string;
};

export async function runPanel(
  evidence: EvidenceItem[],
  visa: Visa,
  domain: Domain,
  fieldOrTitle?: string,
): Promise<PanelResult> {
  const evidenceText =
    evidence.map((e) => `- [${e.source}] ${e.title}: ${e.detail}`).join("\n") ||
    "(no evidence provided)";

  const criteriaList = visa.criteria
    .map((c) => `- ${c.id}: ${c.label} — ${c.hint}`)
    .join("\n");

  let salaryContext = "";
  if (fieldOrTitle) {
    const wageData = lookupWagePercentile(fieldOrTitle, domain);
    if (wageData) {
      salaryContext = `\nSALARY BENCHMARK FOR THIS FIELD: The 90th percentile wage for ${wageData.matched} (SOC ${wageData.socCode}) is $${wageData.percentile90.toLocaleString()}. Use this as a baseline to judge if the candidate's reported salary is "high".`;
    }
  }

  const prompt = `You are a three-member panel — Advocate, Examiner, and Adjudicator — assessing a US ${visa.name} petition ("${visa.fullName}"). The petition qualifies if the candidate MEETS at least ${visa.threshold} of the criteria below.

CRITERIA (judge each independently, only against its own standard):
${criteriaList}
${salaryContext}

${getCalibration(domain, visa.id)}

CANDIDATE'S EVIDENCE (their full record):
${evidenceText}

For EACH criterion above, return an object with:
- criterionId: the id shown above
- advocate: the strongest good-faith argument that the evidence MEETS this specific criterion, citing concrete facts — or state honestly if nothing supports it
- examiner: how a skeptical USCIS officer would push back — the likely Request for Evidence; name exactly what is thin, missing, or unpersuasive
- verdict: "met" only if the evidence clearly satisfies this criterion; "partial" if there is a real but insufficient start; "gap" if essentially nothing supports it
- confidence: low, medium, or high
- reasoning: the adjudicator's short decision weighing both sides against the standard
- runway: if the verdict is "partial" or "gap", give 1–2 concrete, field-specific next steps — what evidence would actually count for this criterion and how someone in this candidate's field typically obtains it. If the verdict is "met", return an empty string.

Be strictly faithful to the evidence. Never invent facts, awards, numbers, roles, or citations. Return exactly one object per criterion.

Return a JSON object of exactly this shape:
{"criteria": [{"criterionId": string, "verdict": "met"|"partial"|"gap", "confidence": "low"|"medium"|"high", "advocate": string, "examiner": string, "reasoning": string, "runway": string}]}`;

  const parsed = await generateJSON<{ criteria?: RawVerdict[] }>(
    prompt,
    panelSchema,
    { temperature: 0.3 },
  );

  const byId = new Map<string, RawVerdict>();
  for (const r of parsed.criteria ?? []) byId.set(r.criterionId, r);

  // Assemble in the canonical criterion order; a criterion the model skipped
  // defaults to a gap.
  const criteria: CriterionVerdict[] = visa.criteria.map((c) => {
    const r = byId.get(c.id);
    return {
      criterionId: c.id,
      label: c.label,
      verdict: r && VERDICTS.has(r.verdict) ? r.verdict : "gap",
      confidence: r && CONFS.has(r.confidence) ? r.confidence : "medium",
      advocate: r?.advocate ?? "",
      examiner: r?.examiner ?? "No evidence was provided for this criterion.",
      reasoning: r?.reasoning ?? "No supporting evidence found.",
      runway: r?.runway ?? "",
    };
  });

  // Deterministic verdict: code counts and applies the rule.
  const verdict = computeVerdict(criteria, visa);

  return {
    criteria,
    threshold: visa.threshold,
    ...verdict,
  };
}

export function computeVerdict(criteria: CriterionVerdict[], visa: Visa) {
  const metCount = criteria.filter((c) => c.verdict === "met").length;
  const partialCount = criteria.filter((c) => c.verdict === "partial").length;
  const total = visa.criteria.length;
  const eligible = metCount >= visa.threshold;

  const summary = eligible
    ? `You meet ${metCount} of ${total} criteria. ${visa.name} requires ${visa.threshold} — likely eligible.`
    : `You meet ${metCount} of ${total} criteria. ${visa.name} requires ${visa.threshold} — ${visa.threshold - metCount} short${partialCount ? `, with ${partialCount} in reach` : ""}.`;

  const weight = { met: 1.0, partial: 0.5, gap: 0 };
  const confidenceMult = { high: 1.0, medium: 0.75, low: 0.5 };
  const perCriterionScore = criteria.map((c) => weight[c.verdict] * confidenceMult[c.confidence]);
  const topN = [...perCriterionScore].sort((a, b) => b - a).slice(0, visa.threshold);
  const strengthScore = topN.reduce((sum, s) => sum + s, 0) / visa.threshold;
  const finalMerits: "strong" | "borderline" | "weak" = strengthScore >= 0.75 ? "strong" : strengthScore >= 0.45 ? "borderline" : "weak";

  return {
    metCount,
    partialCount,
    total,
    eligible,
    summary,
    strengthScore,
    finalMerits,
  };
}
