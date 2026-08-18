import type { Domain } from "@/lib/domains";

export function lookupWagePercentile(fieldOrTitle: string, domain: Domain): { socCode: string; percentile90: number; matched: string } | null {
  const normalized = fieldOrTitle.toLowerCase().trim();
  
  // ==============================================================================
  // 🛑 IMPORTANT: ILLUSTRATIVE PLACEHOLDERS ONLY - NOT REAL BLS DATA 🛑
  // ==============================================================================
  // A curated set of common field labels per domain for demonstration purposes.
  // This is a narrow fallback map, not a comprehensive or accurate system.
  // NOTE: The percentile90 figures below are entirely illustrative placeholders.
  // They are NOT verified against actual BLS OEWS data and are merely designed
  // to be plausible within their domain for UI testing.
  // You MUST replace these with sourced numbers before treating this as authoritative.
  // See agentic_pipeline_plan.md Layer 3 for why this stays a narrow lookup, 
  // not a live BLS integration.
  // ==============================================================================
  const WAGE_MAP: Record<Domain, Record<string, { socCode: string; percentile90: number }>> = {
    stem: {
      "software engineer": { socCode: "15-1252", percentile90: 208000 },
      "research scientist": { socCode: "19-2099", percentile90: 175000 },
      "data scientist": { socCode: "15-1221", percentile90: 185000 },
      "machine learning engineer": { socCode: "15-1221", percentile90: 220000 },
      "data engineer": { socCode: "15-1253", percentile90: 190000 },
      "product manager, technical": { socCode: "11-3021", percentile90: 215000 },
      "devops engineer": { socCode: "15-1252", percentile90: 195000 },
      "security engineer": { socCode: "15-1212", percentile90: 200000 },
    },
    arts: {
      "graphic designer": { socCode: "27-1024", percentile90: 105000 },
      "art director": { socCode: "27-1011", percentile90: 165000 },
      "film director": { socCode: "27-2012", percentile90: 180000 },
      "musician": { socCode: "27-2042", percentile90: 115000 },
      "actor": { socCode: "27-2011", percentile90: 130000 },
      "writer": { socCode: "27-3043", percentile90: 120000 },
      "author": { socCode: "27-3043", percentile90: 120000 },
      "animator": { socCode: "27-1014", percentile90: 135000 },
    },
    business: {
      "chief executive": { socCode: "11-1011", percentile90: 250000 },
      "marketing manager": { socCode: "11-2021", percentile90: 195000 },
      "product manager": { socCode: "11-2022", percentile90: 185000 },
      "startup founder": { socCode: "11-1011", percentile90: 230000 },
      "venture partner": { socCode: "13-2052", percentile90: 240000 },
      "financial manager": { socCode: "11-3031", percentile90: 210000 },
      "management analyst": { socCode: "13-1111", percentile90: 160000 },
      "sales manager": { socCode: "11-2022", percentile90: 180000 },
    },
    athletics: {
      "athlete": { socCode: "27-2021", percentile90: 150000 },
      "coach": { socCode: "27-2022", percentile90: 125000 },
      "professional athlete": { socCode: "27-2021", percentile90: 160000 },
      "sports physical therapist": { socCode: "29-1123", percentile90: 135000 },
      "athletic trainer": { socCode: "29-9091", percentile90: 95000 },
      "fitness manager": { socCode: "11-9039", percentile90: 105000 },
      "umpire": { socCode: "27-2023", percentile90: 85000 },
      "sports scout": { socCode: "27-2022", percentile90: 110000 },
    },
    education: {
      "postsecondary teacher": { socCode: "25-1099", percentile90: 145000 },
      "instructional coordinator": { socCode: "25-9031", percentile90: 110000 },
      "professor": { socCode: "25-1099", percentile90: 150000 },
      "curriculum director": { socCode: "25-9031", percentile90: 125000 },
      "academic researcher": { socCode: "19-2099", percentile90: 130000 },
      "education administrator": { socCode: "11-9033", percentile90: 155000 },
      "special education teacher": { socCode: "25-2059", percentile90: 95000 },
      "school counselor": { socCode: "21-1012", percentile90: 90000 },
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
