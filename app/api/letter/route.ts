import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVisa } from "@/lib/visas";
import { draftLetter } from "@/lib/agents/letter";
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
  const resolvedDomain: Domain | undefined = VALID_DOMAINS.has(domain)
    ? domain
    : undefined;

  try {
    const letter = await draftLetter(visa, panel, evidence ?? [], resolvedDomain);
    return NextResponse.json({ letter });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
