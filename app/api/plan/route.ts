import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVisa } from "@/lib/visas";
import { generatePlan } from "@/lib/agents/planner";
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

  const { evidence, panel, visaId, domain } = await req.json();
  const visa = getVisa(visaId);
  if (!visa) {
    return NextResponse.json({ error: "unknown visa" }, { status: 400 });
  }
  
  if (!panel) {
    return NextResponse.json({ error: "missing panel result" }, { status: 400 });
  }

  const resolvedDomain: Domain = VALID_DOMAINS.has(domain) ? domain : "stem";

  try {
    const result = await generatePlan(
      evidence ?? [],
      panel,
      visa,
      resolvedDomain
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
