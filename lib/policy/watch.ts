import { fetchRecentRules, type RawRule } from "./federalRegister";
import { classifyRules, type Impact } from "@/lib/agents/policyClassifier";
import { getVisa } from "@/lib/visas";

export type WatchItem = RawRule & {
  summary: string;
  visas: string[];
  impact: Impact;
};

// The classifier's tag vocabulary (policyClassifier.ts's VISA_TAGS) doesn't
// line up 1:1 with visas.ts's `name` field — O-1A is tagged just "O-1"
// there — and domain strings ("stem"/"arts"/…) never appear in that
// vocabulary at all. Translate explicitly rather than comparing raw
// strings across the two vocabularies.
const VISA_NAME_TO_TAG: Record<string, string> = {
  "O-1A": "O-1",
  "EB-1A": "EB-1A",
  "O-1B": "O-1B",
  "EB-1B": "EB-1B",
  "EB-2 NIW": "EB-2 NIW",
};

const DOMAIN_TO_TAGS: Record<string, string[]> = {
  stem: ["O-1", "EB-1A", "EB-1B", "EB-2 NIW"],
  arts: ["O-1B", "EB-1A"],
  business: ["O-1", "EB-1A", "EB-2 NIW"],
  athletics: ["O-1", "EB-1A"],
  education: ["O-1", "EB-1A", "EB-2 NIW"],
};

export function isPolicyItemRelevant(
  item: WatchItem,
  domain: string | null,
  visaIds: string[],
): boolean {
  const tags = new Set(item.visas);
  if (domain) {
    const domainTags = DOMAIN_TO_TAGS[domain] ?? [];
    if (domainTags.some((t) => tags.has(t))) return true;
  }
  for (const vId of visaIds) {
    const visaName = getVisa(vId)?.name;
    const tag = visaName ? VISA_NAME_TO_TAG[visaName] : undefined;
    if (tag && tags.has(tag)) return true;
  }
  return false;
}

// ponytail: in-memory cache so navigating to the page doesn't re-hit Groq every
// load. Resets on server restart — fine for a demo; swap for a real cache/store
// if this ever runs at scale.
const TTL = 6 * 60 * 60 * 1000;
let cache: { at: number; items: WatchItem[] } | null = null;

const IMPACT_RANK: Record<Impact, number> = { high: 0, medium: 1, low: 2 };

export async function getPolicyWatch(): Promise<WatchItem[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.items;

  const rules = (await fetchRecentRules(240)).slice(0, 8);
  const classified = await classifyRules(rules);
  const byDoc = new Map(classified.map((c) => [c.docNumber, c]));

  const items: WatchItem[] = rules.map((r) => {
    const c = byDoc.get(r.docNumber);
    return {
      ...r,
      summary: c?.summary ?? r.abstract.slice(0, 160),
      visas: c?.visas?.length ? c.visas : ["General"],
      impact: c?.impact ?? "low",
    };
  });

  items.sort(
    (a, b) =>
      IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] ||
      b.date.localeCompare(a.date),
  );

  cache = { at: Date.now(), items };
  return items;
}
