---
name: add-visa-pack
description: Add a new visa type (rule pack) to Caliber — criteria list, threshold, and panel wiring. Use when asked to support a new visa category (e.g. EB-1C, L-1, H-1B1) or to adjust an existing visa's criteria/threshold.
---

# Add a visa pack

Caliber scores visas via a deterministic skeleton: `lib/visas.ts` defines each
visa as `{ id, name, fullName, category, tagline, threshold, criteria[] }`.
The LLM panel (`lib/agents/panel.ts`) judges each criterion against the
regulation; code counts `met` verdicts and applies `threshold`. **Never let
the LLM decide the count or the pass/fail rule — that stays deterministic.**

## Steps

1. **Find the legal basis.** Extraordinary-ability visas cite 8 CFR
   214.2(o) (O-1) or 204.5 (EB-1/EB-2). Get the exact regulatory criteria
   list and the "must meet N of M" threshold before writing anything —
   don't invent criteria.

2. **Add the `Visa` entry to `lib/visas.ts`.** Each `Criterion` needs:
   - `id` — short, stable, kebab/camel key (used by the panel schema and by
     `CriterionVerdict.criterionId` — never rename an existing id, it breaks
     stored assessments).
   - `label` — the regulatory criterion name, plain language.
   - `hint` — one line of what counts as evidence.

   Reuse shared criteria arrays (like `OUTSTANDING`) via spread when a new
   visa shares criteria with an existing one — don't duplicate definitions.

3. **Check `lib/agents/panel.ts` calibration notes.** The prompt has a
   "Calibrations (common over-counting to avoid)" block with per-criterion
   guidance on what does/doesn't qualify (e.g. student awards don't count).
   If the new visa introduces a criterion type not already covered, add a
   calibration line — this is what keeps the panel skeptical instead of
   flattering. Skipping this is the most common way a new visa pack silently
   over-grants "met".

4. **No other panel code changes needed.** `runPanel` is visa-agnostic — it
   reads `visa.criteria` and `visa.threshold` generically.

5. **Verify end to end**, not just that it compiles:
   - `getVisa(newId)` resolves.
   - Run `scripts/test-panel.mts` (or add a case) against sample evidence
     for the new visa and read the actual verdicts — check the panel isn't
     over- or under-counting relative to the calibration notes.
   - Confirm the visa shows up wherever visas are listed for selection
     (check `app/assess/new` and any visa picker component).

## Non-goals

- Don't add a new LLM call path per visa — one `generateJSON` call per
  panel run, for all criteria, is a deliberate free-tier rate-limit
  constraint (see comment in `panel.ts`).
- Don't hardcode visa-specific branching in `panel.ts` or `extractor.ts` —
  if a visa needs materially different judging logic (not just different
  criteria text), that's a design conversation, not a quick add.
