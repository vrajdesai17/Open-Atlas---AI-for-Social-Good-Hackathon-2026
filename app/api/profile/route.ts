import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProfile, upsertProfile } from "@/lib/profile";
import { extractResumeText } from "@/lib/sources/resume";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getProfile(email);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const github = String(form.get("github") ?? "").trim();
    const publications = String(form.get("publications") ?? "").trim();
    const field = String(form.get("field") ?? "").trim();
    const salary = String(form.get("salary") ?? "").trim();
    const domain = String(form.get("domain") ?? "").trim();
    const media = String(form.get("media") ?? "").trim();
    const businessMetrics = String(form.get("businessMetrics") ?? "").trim();
    const athleticsRecord = String(form.get("athleticsRecord") ?? "").trim();
    const educationMetrics = String(form.get("educationMetrics") ?? "").trim();
    const press = form
      .getAll("press")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);

    const resumeFile = form.get("resume");
    let resumeText: string;
    if (resumeFile instanceof File) {
      const buf = new Uint8Array(await resumeFile.arrayBuffer());
      resumeText = await extractResumeText(buf);
    } else {
      // No new résumé uploaded — keep whatever is already stored.
      const existing = await getProfile(email);
      resumeText = existing?.resumeText ?? "";
    }

    await upsertProfile(email, {
      github,
      publications,
      press,
      field,
      salary,
      resumeText,
      domain,
      media,
      businessMetrics,
      athleticsRecord,
      educationMetrics,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
