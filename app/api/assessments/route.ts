import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveAssessment, insertTasks, listUserAssessments, listUserIncompleteTasks } from "@/lib/db";
import { getVisa } from "@/lib/visas";
import { computeVerdict } from "@/lib/agents/panel";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { visaId, domain, result, tasks, evidence } = await req.json();

  if (!result || !Array.isArray(result.criteria)) {
    return NextResponse.json({ error: "missing or invalid criteria" }, { status: 400 });
  }

  const visa = getVisa(visaId);
  if (!visa) {
    return NextResponse.json({ error: "invalid visa type" }, { status: 400 });
  }

  const recomputed = computeVerdict(result.criteria, visa);
  const secureResult = {
    ...result,
    ...recomputed,
    threshold: visa.threshold,
  };

  try {
    const assessmentId = await saveAssessment({
      userEmail: email,
      visaId,
      domain,
      result: secureResult,
      evidence: evidence || []
    });

    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const dbTasks = tasks.map((t: { criterionId: string; title: string; description: string; timeframe: string; outreachTemplate?: string }) => ({
        userEmail: email,
        assessmentId,
        criterionId: t.criterionId,
        title: t.title,
        description: t.description,
        timeframe: t.timeframe,
        outreachTemplate: t.outreachTemplate
      }));
      await insertTasks(dbTasks);
    }

    return NextResponse.json({ id: assessmentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const assessments = await listUserAssessments(email);
    const tasks = await listUserIncompleteTasks(email);
    return NextResponse.json({ assessments, tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
