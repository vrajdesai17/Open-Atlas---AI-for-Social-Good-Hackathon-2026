import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAssessmentById, insertTask } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const assessmentId = params.id;
  const { title, description, timeframe, outreachTemplate } = await req.json();

  try {
    const assessment = await getAssessmentById(assessmentId, session.user.email);
    if (!assessment) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const newTaskId = await insertTask({
      userEmail: session.user.email,
      assessmentId,
      criterionId: "manual",
      title,
      description,
      timeframe,
      outreachTemplate,
    });

    return NextResponse.json({ id: newTaskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
