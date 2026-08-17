import { Type } from "@google/genai";
import { generateJSON } from "./llm";
import type { Visa } from "@/lib/visas";

export type EvidenceItem = {
  title: string;
  detail: string;
  source: string; // github | openalex | resume | press | input
  relatedCriteria: string[]; // criterion ids from the visa
};

// Trim the raw bundle to what the model should reason over (drop errors/nulls).
function bundleForModel(bundle: Record<string, any>) {
  const out: Record<string, unknown> = {};
  const clean = (v: any) => (v && !("error" in v) ? v : undefined);
  const gh = clean(bundle.github);
  const oa = clean(bundle.openalex);
  const rz = clean(bundle.resume);
  const md = clean(bundle.media);
  const bm = clean(bundle.businessMetrics);
  const ar = clean(bundle.athleticsRecord);
  const em = clean(bundle.educationMetrics);

  if (gh) out.github = gh;
  if (oa) out.openalex = oa;
  if (rz?.text) out.resumeText = rz.text;
  if (md) out.media = md;
  if (bm) out.businessMetrics = bm;
  if (ar) out.athleticsRecord = ar;
  if (em) out.educationMetrics = em;
  if (bundle.press?.length) out.pressLinks = bundle.press;
  if (bundle.field) out.field = bundle.field;
  if (bundle.salary) out.salary = bundle.salary;
  return out;
}

const schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          source: { type: Type.STRING },
          relatedCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "detail", "source", "relatedCriteria"],
      },
    },
  },
  required: ["items"],
};

export async function extractEvidence(
  bundle: Record<string, any>,
  visa: Visa,
): Promise<EvidenceItem[]> {
  const criteriaList = visa.criteria
    .map((c) => `- ${c.id}: ${c.label}`)
    .join("\n");

  const prompt = `You are an evidence extractor for a US ${visa.name} visa ("${visa.fullName}") assessment.

From the raw candidate data below, extract a list of DISCRETE, CONCRETE evidence items — achievements, roles, outputs, or metrics that could matter to an immigration officer.

For each item, tag which of these criteria it could plausibly support. Use ONLY these criterion ids; use an empty array if it supports none:
${criteriaList}

Rules:
- Be strictly faithful to the data. Never invent facts, numbers, awards, or roles that are not present.
- One item per distinct achievement. Merge obvious duplicates.
- Keep "title" short (a few words). Put the specifics — numbers, names, venues, dates — in "detail".
- "source" is one of: github, openalex, resume, press, input.

Return a JSON object of exactly this shape:
{"items": [{"title": string, "detail": string, "source": string, "relatedCriteria": string[]}]}

RAW DATA (JSON):
${JSON.stringify(bundleForModel(bundle), null, 2)}`;

  const parsed = await generateJSON<{ items?: EvidenceItem[] }>(prompt, schema);
  const items: EvidenceItem[] = parsed.items ?? [];
  // Guardrail: drop any criterion id the model invented that isn't real.
  const valid = new Set(visa.criteria.map((c) => c.id));
  return items.map((it) => ({
    ...it,
    relatedCriteria: (it.relatedCriteria ?? []).filter((id) => valid.has(id)),
  }));
}
