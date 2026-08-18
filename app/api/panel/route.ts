import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVisa } from "@/lib/visas";
import { runPanel } from "@/lib/agents/panel";
import type { Domain } from "@/lib/domains";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_DOMAINS = new Set<Domain>([
  "stem",
  "arts",
  "business",
  "athletics",
  "education",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { evidence, visaId, domain, field } = await req.json();
  const visa = getVisa(visaId);
  if (!visa) {
    return NextResponse.json({ error: "unknown visa" }, { status: 400 });
  }
  // Default to "stem" if an unrecognized/missing domain is sent.
  const resolvedDomain: Domain = VALID_DOMAINS.has(domain) ? domain : "stem";
  const fieldOrTitle: string | undefined =
    typeof field === "string" && field.trim() ? field.trim() : undefined;

  try {
    const result = await runPanel(evidence ?? [], visa, resolvedDomain, fieldOrTitle);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
