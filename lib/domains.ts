export type Domain = "stem" | "arts" | "business" | "athletics" | "education";

export type FieldSpec = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "url";
  hint?: string;
};

export type DomainConfig = {
  id: Domain;
  label: string;
  relevantVisas: string[];
  extraFields: FieldSpec[];
  calibrationKey: Domain;
  showGithub: boolean;
  showPublications: boolean;
};

export const DOMAINS: Record<Domain, DomainConfig> = {
  stem: {
    id: "stem",
    label: "STEM",
    relevantVisas: ["o1a", "eb1a", "eb1b", "niw"],
    extraFields: [],
    calibrationKey: "stem",
    showGithub: true,
    showPublications: true,
  },
  arts: {
    id: "arts",
    label: "Arts & Design",
    relevantVisas: ["o1b", "eb1a", "eb1b"],
    extraFields: [
      {
        id: "media",
        label: "IMDb / YouTube / Spotify / Portfolio / Press URLs",
        type: "textarea",
        hint: "Links to your IMDb profile, YouTube channel or videos, Spotify/streaming artist page, portfolio site, or press coverage.",
      },
    ],
    calibrationKey: "arts",
    showGithub: false,
    showPublications: false,
  },
  business: {
    id: "business",
    label: "Founders & Business",
    relevantVisas: ["o1a", "eb1a", "eb1b", "niw"],
    extraFields: [
      {
        id: "businessMetrics",
        label: "Business Metrics",
        type: "textarea",
        hint: "Venture funding amounts, revenue/ARR growth, user adoption, patents, etc.",
      },
    ],
    calibrationKey: "business",
    showGithub: true,
    showPublications: false,
  },
  athletics: {
    id: "athletics",
    label: "Athletics",
    relevantVisas: ["o1a", "eb1a", "eb1b"],
    extraFields: [
      {
        id: "athleticsRecord",
        label: "Athletics Record",
        type: "textarea",
        hint: "Tournament placements, national team selection, ranking systems.",
      },
    ],
    calibrationKey: "athletics",
    showGithub: false,
    showPublications: false,
  },
  education: {
    id: "education",
    label: "Education",
    relevantVisas: ["o1a", "eb1a", "eb1b", "niw"],
    extraFields: [
      {
        id: "educationMetrics",
        label: "Education Metrics",
        type: "textarea",
        hint: "Curriculum adoption, measurable outcomes, peer institutional recognition.",
      },
    ],
    calibrationKey: "education",
    showGithub: false,
    showPublications: true,
  },
};

export const MAX_FIELD_CHARS = 3000;

export function getDomainConfig(id: Domain): DomainConfig {
  return DOMAINS[id];
}

export function getValidDomainsForVisa(visaId: string): Domain[] {
  const allDomains: Domain[] = ["stem", "arts", "business", "athletics", "education"];
  const valid = allDomains.filter(d => DOMAINS[d].relevantVisas.includes(visaId));
  return valid.length > 0 ? valid : allDomains;
}
