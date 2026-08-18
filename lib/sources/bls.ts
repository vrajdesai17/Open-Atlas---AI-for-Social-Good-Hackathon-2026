import type { Domain } from "@/lib/domains";

export function lookupWagePercentile(fieldOrTitle: string, domain: Domain): { socCode: string; percentile90: number; matched: string } | null {
  const normalized = fieldOrTitle.toLowerCase().trim();
  
  // A small curated set of common field labels per domain.
  // This is a narrow fallback map, not a comprehensive system.
  // NOTE: percentile90 figures below are illustrative placeholders, not
  // verified against actual BLS OEWS data — replace with sourced numbers
  // before treating this as authoritative. See agentic_pipeline_plan.md
  // Layer 3 for why this stays a narrow lookup, not a live BLS integration.
  const WAGE_MAP: Record<Domain, Record<string, { socCode: string; percentile90: number }>> = {
    stem: {
      "software engineer": { socCode: "15-1252", percentile90: 208000 },
      "research scientist": { socCode: "19-2099", percentile90: 175000 },
      "data scientist": { socCode: "15-1221", percentile90: 185000 },
    },
    arts: {
      "graphic designer": { socCode: "27-1024", percentile90: 105000 },
      "art director": { socCode: "27-1011", percentile90: 165000 },
    },
    business: {
      "chief executive": { socCode: "11-1011", percentile90: 250000 },
      "marketing manager": { socCode: "11-2021", percentile90: 195000 },
    },
    athletics: {
      "athlete": { socCode: "27-2021", percentile90: 150000 },
      "coach": { socCode: "27-2022", percentile90: 125000 },
    },
    education: {
      "postsecondary teacher": { socCode: "25-1099", percentile90: 145000 },
      "instructional coordinator": { socCode: "25-9031", percentile90: 110000 },
    }
  };

  const domainMap = WAGE_MAP[domain];
  if (!domainMap) {
    return null;
  }

  for (const [key, data] of Object.entries(domainMap)) {
    if (normalized.includes(key)) {
      return {
        socCode: data.socCode,
        percentile90: data.percentile90,
        matched: key,
      };
    }
  }

  return null;
}
