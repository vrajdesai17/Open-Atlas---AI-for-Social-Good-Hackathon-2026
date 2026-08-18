# Caliber: Multi-Domain Agentic Pipeline Implementation Plan

## Context

Caliber (Open Atlas "AI for Social Good" hackathon, Immigration & Mobility track) currently runs a two-call pipeline — an Extractor agent structures evidence, an adversarial Panel agent (Advocate/Examiner/Adjudicator in one Groq call) judges each visa criterion, and deterministic code counts verdicts against a threshold. This works, but it's a **classifier that stops at a scorecard**, not a full agentic pipeline, and its "STANDARD OF REVIEW" calibration is written entirely for the O-1A/EB-1A extraordinary-ability standard — even though O-1B and EB-2 NIW are already selectable and use a materially different legal test.

A prior draft (`implementation_plan.md`) proposed the full architecture this plan builds: a 5-layer pipeline — **Domain Routing → Calibrated Adversarial Panel → Deterministic Statutory Engine (incl. Kazarian Two-Step) → Strategic Planning Agent → Synthesis & Persistence**. Confirmed with the user: keep all 5 domains (STEM, Arts & Design, Founders/Business, Athletics, Education) and keep the full arc as real, distinct pipeline stages — not folded into a single hidden branch inside `panel.ts`. Runway is a few days; there's no working `.env.local` yet (a teammate is providing keys), so the plan must reach a fully typechecked, buildable state without live LLM/DB access — live verification is the final step once keys land.

Two risks flagged in review of the original draft are addressed explicitly below: outreach-template generation must never fabricate real contacts, and effort/timeframe estimates must come from code (deterministic tiers), never from a model presenting a guess as measured data.

---

## Architecture

```mermaid
flowchart TB
    U["User picks domain\n(explicit selector, UI)"] --> R["Domain Router\n(code, no LLM) — lib/domains.ts"]

    subgraph Layer1["Layer 1 — Ingestion & Domain Routing"]
        R --> F1["STEM fetchers\ngithub.ts / openalex.ts\n(real APIs)"]
        R --> F2["Arts links\nmedia.ts\n(user-supplied URLs)"]
        R --> F3["Business / Athletics / Education\nstructured form fields\n(no free API — manual input)"]
        F1 & F2 & F3 --> EX["Extractor Agent — LLM call 1\nlib/agents/extractor.ts\n(domain-aware bundle → EvidenceItem[])"]
    end

    subgraph Layer2["Layer 2 — Calibrated Adversarial Panel"]
        CAL["Calibration Pack lookup (code)\nlib/agents/calibration.ts\ngetCalibration(domain, visaId)"]
        EX --> PANEL["Panel Agent — LLM call 2\nlib/agents/panel.ts\nAdvocate / Examiner / Adjudicator\nper criterion, one structured call"]
        CAL --> PANEL
    end

    subgraph Layer3["Layer 3 — Deterministic Statutory Engine (code only, no LLM)"]
        PANEL --> NM["N-of-M threshold count\n(existing, panel.ts)"]
        PANEL --> BLS["BLS wage lookup\nlib/sources/bls.ts\n(salary criterion evidence)"]
        NM --> K2["Kazarian Step 2\nfinal-merits aggregate\n(confidence-weighted score)"]
        BLS -.-> PANEL
    end

    K2 --> SC["Scorecard\n(verdict + Step 2 read + gap runway)"]

    subgraph Layer4["Layer 4 — Strategic Planning Agent (on demand)"]
        SC -->|"Generate action plan\" button"| RANK["Deterministic ranking (code)\neffort tier → phase/timeframe"]
        RANK --> PLAN["Planning Agent — LLM call 3a\nlib/agents/planner.ts\n(task content + guardrailed\noutreach templates)"]
    end

    subgraph Layer5["Layer 5 — Synthesis & Persistence"]
        SC -->|"Draft letter\" button"| LETTER["Letter Agent — LLM call 3b\nlib/agents/letter.ts\n(alternative on-demand call)"]
        PLAN --> DB[("Postgres\nassessments + user_tasks")]
        SC --> DB
        DB --> DASH["/assess dashboard\nsaved history + checkable tasks"]
    end
```

Default path per assessment: **2 LLM calls** (Extractor, Panel) — domain routing and calibration selection are pure code, so 5 domains cost nothing extra. Plan and Letter are mutually-optional on-demand 3rd calls (3a *or* 3b, rarely both in one session).

**Rate-limit math stays honest:** domain routing and calibration selection are both plain code dispatch, not LLM decisions — adding 5 domains costs **zero** extra LLM calls. The default assess flow is still exactly 2 calls (Extract, Panel); Plan and Letter remain on-demand, mutually-optional 3rd calls. Full breadth, same budget.

---

## Layer 1 — Domain Routing & Ingestion

### `lib/domains.ts` (new)

The Domain Router, as plain config + a lookup function — deterministic, not an LLM step (an LLM call here would burn budget on a decision the user already made by picking a domain in the UI):

```ts
export type Domain = "stem" | "arts" | "business" | "athletics" | "education";

export type DomainConfig = {
  id: Domain;
  label: string;
  relevantVisas: string[];       // visa ids this domain typically uses
  extraFields: FieldSpec[];       // domain-specific input fields
  calibrationKey: Domain;         // which calibration pack to use
};
```
`getDomainConfig(id)` is the router's dispatch function — called once, in code, from the assess form and from the panel/extractor prompt builders. No new visa entries and **no `domain` field added to `Visa` in `lib/visas.ts`** — a visa (e.g. O-1A) legitimately spans multiple domains, so domain is a property of the *assessment*, not the visa. This deliberately deviates from the original draft's "tag visas with domain" instruction to avoid modeling the same fact twice.

### Domain-specific ingestion — honest about what's a real fetcher vs. structured input

- **STEM**: existing `lib/sources/github.ts` + `openalex.ts` (real APIs, unchanged).
- **Arts & Design**: new `lib/sources/media.ts` — accepts IMDb/portfolio/press URLs as **user-supplied links passed through to the extractor as text**, not scraped (no reliable free API for IMDb/portfolio sites — same reasoning as the existing "LinkedIn has no usable API" decision; don't build a scraper).
- **Founders/Business, Athletics, Education**: no free structured APIs exist for funding/ARR, tournament results, or curriculum adoption. These are **structured manual-entry form fields**, validated by code (numbers are numbers, dates are dates), then passed into the same extractor bundle as `input` source. This is a correction to the original draft, which implied "Data Fetchers" for all 5 domains — three of the five don't have one, and pretending otherwise would be the kind of over-claiming the project's own "Honesty is a feature" principle exists to prevent.

### `lib/agents/extractor.ts` (modify)

Extend `bundleForModel()` to include the new bundle keys (`media`, `businessMetrics`, `athleticsRecord`, `educationMetrics`) when present. No new call, no new schema shape beyond existing `EvidenceItem[]` — extraction is already domain-agnostic at the type level.

---

## Layer 2 — Calibrated Adversarial Panel Engine

### `lib/agents/calibration.ts` (new)

`getCalibration(domain: Domain, visaId: string): string` — five calibration blocks, each a "STANDARD OF REVIEW" text tuned to what actually counts as qualifying evidence in that field:

- **stem** (default today, keep as-is): peer-reviewed publications, citation impact, technical judging roles.
- **arts**: festival laurels, tier-1 critical press (not any press), gallery/exhibition placement, streaming/box-office volume, expert testimonials — explicitly rejects student showcases and self-published reviews.
- **business**: venture funding amounts and stage, revenue/ARR growth with real numbers, user/customer adoption, patents, regional economic impact — and for EB-2 NIW specifically, the 3-prong Dhanasar test (`merit`, `positioned`, `benefit` — the criteria already in `visas.ts`).
- **athletics**: tournament placement tier, national team selection, ranking systems — rejects local/regional/amateur-league achievement as insufficient alone.
- **education**: curriculum adoption evidence, measurable outcomes, peer institutional recognition — rejects ordinary teaching evaluations.

`lib/agents/panel.ts` (modify): replace the hardcoded standard-of-review string with `getCalibration(domain, visa.id)`. `runPanel()` gains a `domain: Domain` parameter. Everything else in `panel.ts` — the single-call structure, the JSON schema, the verdict aggregation — is unchanged.

> **AGY second-opinion flag (token budget, addressed):** Groq's free tier caps ~12k tokens/min. Stacking dense per-domain calibration text on top of per-criterion evidence in one `runPanel()` call risks pushing dense visas (EB-1A, 10 criteria) toward that cap, especially with BLS data also injected. Mitigation: cap each calibration block at roughly the length of the existing STEM block (~5-6 bullet lines) — don't let new domain packs grow unchecked — and if `test-panel.mts` runs against EB-1A show call sizes creeping close to the limit, trim evidence text (not calibration text) first, since calibration is fixed cost per call and evidence is the variable one.

---

## Layer 3 — Deterministic Statutory Engine

### N-of-M threshold — unchanged (already correct, in `runPanel()`).

### Kazarian Two-Step final-merits determination (new, code only — no LLM call)

Real USCIS practice has two steps: Step 1 counts which regulatory criteria are met; Step 2 is a holistic "final merits determination" — does the *totality* of the record show sustained acclaim, even after the count clears threshold? Caliber currently only does Step 1. Adding a full LLM-judged Step 2 would mean a model deciding a fuzzy holistic yes/no — exactly what the project's core principle forbids. Instead, compute Step 2 **deterministically** from data the panel already returns:

```ts
// in lib/agents/panel.ts's result assembly — no new LLM call
const weight = { met: 1.0, partial: 0.5, gap: 0 };
const confidenceMult = { high: 1.0, medium: 0.75, low: 0.5 };
// Score only the visa's threshold-many strongest criteria — averaging over
// ALL criteria (including ones the candidate never attempted) dilutes a
// genuinely strong record with untouched gaps and unfairly reads "weak".
const perCriterionScore = criteria.map(
  (c) => weight[c.verdict] * confidenceMult[c.confidence]
);
const topN = perCriterionScore
  .sort((a, b) => b - a)
  .slice(0, visa.threshold);
const strengthScore = topN.reduce((sum, s) => sum + s, 0) / visa.threshold;
const finalMerits: "strong" | "borderline" | "weak" =
  strengthScore >= 0.75 ? "strong" : strengthScore >= 0.45 ? "borderline" : "weak";
```
Surfaced as a supplementary line under the scorecard ("Step 2 — Final Merits: your record reads as **strong/borderline/weak** beyond the raw N-of-M count"), never overriding the code-counted N-of-M eligibility verdict — purely additional, honest context, computed from numbers the panel already produced. Thresholds (0.75/0.45) are a starting calibration — sanity-check against `scripts/test-panel.mts` sample runs once env access lands and adjust if real outputs skew.

> **AGY second-opinion fix (applied):** the original formula divided by `criteria.length` (all criteria, e.g. 10 for EB-1A) instead of the threshold (e.g. 3) — a candidate with 3 excellent criteria and 7 untouched ones would score "weak" despite qualifying. Fixed by scoring only the top-`threshold` criteria.

### BLS wage lookup (not an "engine" — a narrow fallback map)

`lib/sources/bls.ts` (new): static SOC-code → wage-percentile table for a small set of common, high-confidence field labels per domain (e.g. "software engineer," "research scientist" — not open free-text). Match is a simple keyword lookup against a short curated alias list per SOC code, **not** general free-text job-title parsing — free-text title matching against SOC codes is a real classification problem on its own and will fail most inputs if attempted here. When the user's stated field/title doesn't hit a curated alias, the lookup returns "insufficient data, needs manual comparison" rather than guessing — this is the expected common case, not an edge case, and the UI copy should say so plainly.

> **AGY second-opinion fix (applied):** calling this an "engine" over-claimed its robustness — reframed as a narrow curated lookup with an explicit, expected-to-be-common failure mode, not a general title-matching system.

`lib/agents/panel.ts` salary criterion: when a lookup succeeds, the real percentile comparison is injected into the evidence passed to the panel instead of the LLM guessing; when it fails, current behavior (treat as `partial` at most, flag verification needed) is unchanged.

---

## Layer 4 — Strategic Planning Agent (flagship, on-demand 3rd call)

### `lib/agents/planner.ts` (new)

`generatePlan(evidence, panel, visa, domain): Promise<PlanResult>` — same "code decides priority, LLM elaborates content" discipline as the rest of the app:

1. **Deterministic ranking (code, no LLM):** for each `partial`/`gap` criterion, a static effort-tier table keyed by criterion id (domain-aware where the same criterion id means different work — e.g. "awards" in athletics vs. STEM) produces the phase (`30_days`/`60_days`/`180_days`) and task order. Never let the model invent an hour count or a phase.
2. **One `generateJSON` call** returning, per criterion: `title`, `description`, `expectedEvidentiaryProof`, `outreachTemplate`. Prompt instruction: outreach templates are **generic and fill-in-the-blank** — never name a real person, journal, company, or institution not explicitly present in the user's own evidence.
3. **Deterministic post-check (code, no LLM) — the actual guardrail.** A prompt instruction alone is not reliable; models routinely ignore negative constraints and confidently invent plausible-sounding journal/conference/expert names. After the call returns, extract capitalized multi-word sequences (a cheap proper-noun heuristic) from each `outreachTemplate` and verify each one appears verbatim in the `evidence` text passed into the same call. Any name that doesn't match gets stripped and replaced with a `[Journal/Editor Name]`-style placeholder before the template reaches the user. This is the real fix for the hallucination gap the original draft only prompted against.
4. Code assembles `PlanResult` (the `ActionTask`/`PlanResult` shape from the original draft is sound, reused as-is) using code-computed phases.

> **AGY second-opinion fix (applied):** "never invent names" as a prompt-only instruction was flagged as insufficient — added the step-3 deterministic post-check above.

### `app/api/plan/route.ts` (new) — thin, auth-gated, same shape as `app/api/letter/route.ts`.

### `app/assess/new/[visa]/RoadmapView.tsx` (new) — phased task cards, one-click-copy outreach templates, checkboxes. Triggered by a "Generate action plan" button after the scorecard — never automatic, to keep the default path at 2 calls.

---

## Layer 5 — Synthesis & Persistence

### `lib/db.ts` (modify) — extend `ensureSchema()`:
```sql
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY, user_email TEXT NOT NULL, visa_id TEXT NOT NULL,
  domain TEXT NOT NULL, result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_tasks (
  id TEXT PRIMARY KEY, user_email TEXT NOT NULL, assessment_id TEXT NOT NULL,
  criterion_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  timeframe TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE,
  outreach_template TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
(Here `domain` on `assessments` is fine — it's recording what domain *this run* used, not tagging the visa config itself, consistent with Layer 1's design decision.)

### `app/api/assessments/route.ts` (new) — save/list assessments; task-completion toggle endpoint.

### `app/assess/page.tsx` (modify) — list saved assessments (with domain badge) and outstanding tasks. Already flagged "Not built (DB ready)" in the handbook and on README's "What's next" — finishing planned work, not scope creep.

### `lib/agents/letter.ts` — minor prompt update to reference domain framing where relevant (no new call).

---

## UI (Component 5, across layers)

`app/assess/new/[visa]/AssessmentForm.tsx` (modify, currently 653 lines — split domain-specific field rendering into a small sibling component per domain rather than growing this file further):
- Domain archetype selector (5 options) drives which `extraFields` from `lib/domains.ts` render.
- After scorecard: "Generate action plan" button → `RoadmapView`.

---

## Verification

Available now, no env required:
- `npx tsc --noEmit` after each layer
- `npx eslint --fix` on changed files (already wired as a PostToolUse hook)
- `npm run build` — confirms new routes/pages compile

Once the teammate's `.env.local` lands:
- `npx tsx scripts/test-panel.mts` — run all 5 calibration packs against representative sample evidence each; confirm verdicts track the calibration text (e.g. a student hackathon award reads as `gap` under every pack)
- New `npx tsx scripts/test-planner.mts` — sample gap criteria in, check phases/tasks/no-fabricated-contacts out
- `npx tsx scripts/test-db.mts` extended for the new tables
- Manual: `npm run dev` → full flow per domain (pick domain → assess → scorecard incl. Step 2 final-merits line → generate plan → check off a task → reload `/assess` → state persisted)
- Run the `security-reviewer` subagent against `app/api/plan/route.ts` and `app/api/assessments/route.ts` (outreach-template prompt injection, IDOR on `assessment_id`/`user_email`)
- Run the `performance-analyzer` subagent to confirm the 3rd on-demand call and 5-domain calibration lookup don't change the per-assessment call count from 2 (default) / 3 (with plan or letter)
