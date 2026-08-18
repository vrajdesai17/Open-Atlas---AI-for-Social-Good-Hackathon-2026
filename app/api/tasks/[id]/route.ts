import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleTaskCompleted, updateTask, deleteTask } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const { id } = params;
  const { completed, title, description } = await req.json();

  try {
    if (completed !== undefined) {
      await toggleTaskCompleted(id, session.user.email, !!completed);
    }
    if (title !== undefined || description !== undefined) {
      await updateTask(id, session.user.email, { title, description });
    }
    return NextResponse.json({ success: true });
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
    await deleteTask(id, session.user.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
