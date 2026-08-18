import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAssessmentById, listTasksForAssessment, deleteAssessment, updateAssessmentResult } from "@/lib/db";
import { getVisa } from "@/lib/visas";
import { runPanel } from "@/lib/agents/panel";
import type { EvidenceItem } from "@/lib/agents/extractor";
import type { Domain } from "@/lib/domains";

export const runtime = "nodejs";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { id } = params;

  try {
    const assessment = await getAssessmentById(id, session.user.email);
    if (!assessment) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const tasks = await listTasksForAssessment(id, session.user.email);
    return NextResponse.json({ assessment, tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { id } = params;

  try {
    await deleteAssessment(id, session.user.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { id } = params;
  const { evidence } = await req.json();

  if (!evidence || !Array.isArray(evidence)) {
    return NextResponse.json({ error: "missing or invalid evidence" }, { status: 400 });
  }

  try {
    const assessment = await getAssessmentById(id, session.user.email);
    if (!assessment) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const visa = getVisa(assessment.visaId);
    if (!visa) {
      return NextResponse.json({ error: "invalid visa type" }, { status: 400 });
    }

    const result = await runPanel(evidence as EvidenceItem[], visa, assessment.domain as Domain);
    
    await updateAssessmentResult(id, session.user.email, evidence, result);

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
