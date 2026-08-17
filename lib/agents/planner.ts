import { generateJSON } from "./llm";
import type { Visa } from "@/lib/visas";
import type { PanelResult } from "./panel";
import type { EvidenceItem } from "./extractor";
import type { Domain } from "@/lib/domains";

export type ActionTask = {
  id: string;
  criterionId: string;
  title: string;
  description: string;
  timeframe: "30_days" | "60_days" | "180_days";
  expectedEvidentiaryProof: string;
  outreachTemplate?: string;
};

export type PlanPhase = {
  phase: string;
  timeframe: string;
  tasks: ActionTask[];
};

export type PlanResult = {
  targetCriteria: string[];
  strategyRationale: string;
  phases: PlanPhase[];
};

const TIMEFRAME_LOOKUP: Record<string, "30_days" | "60_days" | "180_days"> = {
  judging: "30_days",
  membership: "60_days",
  press: "60_days",
  "recognition-experts": "60_days",
  positioned: "60_days",
  salary: "60_days",
  awards: "180_days",
  scholarly: "180_days",
  original: "180_days",
  exhibitions: "180_days",
  commercial: "180_days",
  "critical-role": "180_days",
  "lead-role": "180_days",
  "lead-org": "180_days",
  success: "180_days",
  recognition: "180_days",
  merit: "180_days",
  benefit: "180_days",
};

export async function generatePlan(
  evidence: EvidenceItem[],
  panel: PanelResult,
  visa: Visa,
  domain: Domain
): Promise<PlanResult> {
  // Step 1: deterministic ranking (code, NO LLM call)
  const targetIds = panel.criteria
    .filter((c) => c.verdict === "partial" || c.verdict === "gap")
    .map((c) => c.criterionId);

  if (targetIds.length === 0) {
    return {
      targetCriteria: [],
      strategyRationale: "All criteria are met. No further planning needed.",
      phases: [],
    };
  }

  const targets = visa.criteria.filter((c) => targetIds.includes(c.id));

  // Step 2: ONE generateJSON call
  const targetText = targets
    .map((c) => `- ${c.id}: ${c.label} — ${c.hint}`)
    .join("\n");

  const evidenceText =
    evidence.map((e) => `- [${e.source}] ${e.title}: ${e.detail}`).join("\n") ||
    "(no evidence provided)";

  const prompt = `You are an expert strategic planner for US ${visa.name} immigration petitions.
  
Your task is to create an action plan for the beneficiary (in the ${domain} domain) to satisfy the following target criteria (which are currently partially met or unmet).

TARGET CRITERIA:
${targetText}

BENEFICIARY'S EVIDENCE (their full record):
${evidenceText}

Provide a JSON object with two top-level keys:
- "strategyRationale": A short paragraph explaining the overall strategy for this candidate.
- "tasks": An array of objects, one for EACH target criterion, containing:
  - "criterionId": The exact ID of the criterion from the TARGET CRITERIA list above.
  - "title": A short, action-oriented title for the task.
  - "description": A concise explanation of what the beneficiary needs to do.
  - "expectedEvidentiaryProof": A description of the concrete documentation they should aim to collect (e.g., "A letter from the program chair confirming...").
  - "outreachTemplate": A draft email or message template the beneficiary can use to reach out to potential recommenders, venues, or organizations. MUST be generic and fill-in-the-blank. NEVER name a real person, journal, publication, company, or institution not explicitly present in the evidence provided.
  - "namedEntities": An array of strings listing every real person, journal, publication, company, or institution name referenced in this task's outreachTemplate (empty array if the template is fully generic/fill-in-the-blank). This is a way for the system to double check it did not accidentally reference anyone not in the evidence.

Return exactly this JSON shape:
{"strategyRationale": string, "tasks": [{"criterionId": string, "title": string, "description": string, "expectedEvidentiaryProof": string, "outreachTemplate": string, "namedEntities": ["string"]}]}
`;

  const parsed = await generateJSON<{
    strategyRationale?: string;
    tasks?: Array<{
      criterionId: string;
      title: string;
      description: string;
      expectedEvidentiaryProof: string;
      outreachTemplate?: string;
      namedEntities?: string[];
    }>;
  }>(
    prompt,
    {},
    {
      temperature: 0.4,
    }
  );

  // Step 3: deterministic post-check on the LLM output
  const corpus = evidence
    .map((e) => `${e.title} ${e.detail}`)
    .join(" ")
    .toLowerCase();

  const tasksByTimeframe: Record<"30_days" | "60_days" | "180_days", ActionTask[]> = {
    "30_days": [],
    "60_days": [],
    "180_days": [],
  };

  let taskIdCounter = 1;

  for (const target of targets) {
    const llmTask = parsed.tasks?.find((t) => t.criterionId === target.id);
    const timeframe = TIMEFRAME_LOOKUP[target.id] || "180_days";

    let safeTemplate = llmTask?.outreachTemplate || "";

    if (safeTemplate && Array.isArray(llmTask?.namedEntities) && llmTask.namedEntities.length > 0) {
      for (const entity of llmTask.namedEntities) {
        if (!corpus.includes(entity.toLowerCase())) {
          // Escape regex special characters in the entity string
          const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const replaceRegex = new RegExp(escapedEntity, "gi");
          safeTemplate = safeTemplate.replace(replaceRegex, "[Name/Institution]");
        }
      }
    }

    const task: ActionTask = {
      id: `task-${taskIdCounter++}`,
      criterionId: target.id,
      title: llmTask?.title || `Plan for ${target.label}`,
      description:
        llmTask?.description || `Take steps to satisfy the ${target.label} criterion.`,
      timeframe,
      expectedEvidentiaryProof:
        llmTask?.expectedEvidentiaryProof || "Documentation as specified by the regulations.",
    };

    if (safeTemplate) {
      task.outreachTemplate = safeTemplate;
    }

    tasksByTimeframe[timeframe].push(task);
  }

  // Step 4: assemble PlanResult
  const phases: PlanPhase[] = [];

  if (tasksByTimeframe["30_days"].length > 0) {
    phases.push({
      phase: "Quick wins",
      timeframe: "30_days",
      tasks: tasksByTimeframe["30_days"],
    });
  }

  if (tasksByTimeframe["60_days"].length > 0) {
    phases.push({
      phase: "Medium-term",
      timeframe: "60_days",
      tasks: tasksByTimeframe["60_days"],
    });
  }

  if (tasksByTimeframe["180_days"].length > 0) {
    phases.push({
      phase: "Long-term",
      timeframe: "180_days",
      tasks: tasksByTimeframe["180_days"],
    });
  }

  return {
    targetCriteria: targetIds,
    strategyRationale: parsed.strategyRationale || "Strategic plan generated successfully.",
    phases,
  };
}
