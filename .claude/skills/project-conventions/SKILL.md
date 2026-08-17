---
name: project-conventions
description: Caliber's core architecture rules — AI-proposes/code-disposes split, LLM provider isolation, evidence fidelity. Load automatically before editing lib/agents/, lib/visas.ts, or lib/policy/.
user-invocable: false
---

# Caliber architecture conventions

## AI proposes, code disposes

The LLM extracts evidence and argues each criterion. Deterministic code
holds the legal rules, counts verdicts, and renders the eligibility verdict.
This split is *the* thing that makes the tool trustworthy — never let an LLM
call return a final eligible/not-eligible decision or a count. Counting and
threshold comparison belong in plain TypeScript (see `runPanel` in
`lib/agents/panel.ts`), not in a prompt.

## Provider isolation

All LLM access goes through `generateJSON()` in `lib/agents/llm.ts`. Nothing
else touches the Groq endpoint, an API key, or provider-specific request
shapes directly. If you're adding a new agent call, import `generateJSON`
— don't `fetch()` the provider again. This keeps a provider/model swap a
one-file change.

## Evidence fidelity

Every prompt in `lib/agents/` explicitly forbids inventing facts, numbers,
awards, or citations. When editing or adding prompts, preserve that
constraint verbatim-in-spirit — this is a legal-adjacent tool (petition
arguments), and a hallucinated credential is a real-world harm, not just a
bug.

## Adversarial framing, not flattery

The panel prompt sets a skeptical-USCIS-officer standard of review by
design (`lib/agents/panel.ts`, "STANDARD OF REVIEW" block) — Advocate
argues for, Examiner argues against, Adjudicator weighs both. Don't soften
this into a single supportive pass; the adversarial structure is what
catches over-counted criteria before a user relies on the result.

## Known constraint: single-call panel

The panel currently runs one structured LLM call producing all three role
outputs per criterion (not three independent calls) — this is deliberate,
to fit the Groq free-tier rate limit (~5 req/min), documented in
`panel.ts`. Don't "fix" this into multiple calls without checking the rate
limit implication first.
