import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchGithub } from "@/lib/sources/github";
import { fetchOpenAlex } from "@/lib/sources/openalex";
import { extractResumeText } from "@/lib/sources/resume";
import { extractMediaLinks } from "@/lib/sources/media";
import { MAX_FIELD_CHARS } from "@/lib/domains";
export const runtime = "nodejs";

function errMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const github = String(form.get("github") ?? "").trim();
  const publications = String(form.get("publications") ?? "").trim();
  const field = String(form.get("field") ?? "").trim();
  const salary = String(form.get("salary") ?? "").trim();
  const press = form
    .getAll("press")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const resume = form.get("resume");
  const resumeText = String(form.get("resumeText") ?? "").trim().slice(0, MAX_FIELD_CHARS);
  const media = String(form.get("media") ?? "").trim();
  const businessMetrics = String(form.get("businessMetrics") ?? "").trim().slice(0, MAX_FIELD_CHARS);
  const athleticsRecord = String(form.get("athleticsRecord") ?? "").trim().slice(0, MAX_FIELD_CHARS);
  const educationMetrics = String(form.get("educationMetrics") ?? "").trim().slice(0, MAX_FIELD_CHARS);

  const resumeTask: Promise<string | null> =
    resume instanceof File
      ? resume.arrayBuffer()
          .then((b) => extractResumeText(new Uint8Array(b)))
          .then((t) => (t ? t.slice(0, MAX_FIELD_CHARS) : null))
      : resumeText
        ? Promise.resolve(resumeText)
        : Promise.resolve(null);

  const [gh, oa, rz, md] = await Promise.allSettled([
    github ? fetchGithub(github) : Promise.resolve(null),
    publications ? fetchOpenAlex(publications) : Promise.resolve(null),
    resumeTask,
    media ? extractMediaLinks(media) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    field,
    salary,
    press,
    businessMetrics: businessMetrics ? { text: businessMetrics } : null,
    athleticsRecord: athleticsRecord ? { text: athleticsRecord } : null,
    educationMetrics: educationMetrics ? { text: educationMetrics } : null,
    github:
      gh.status === "fulfilled" ? gh.value : { error: errMessage(gh.reason) },
    openalex:
      oa.status === "fulfilled" ? oa.value : { error: errMessage(oa.reason) },
    resume:
      rz.status === "fulfilled"
        ? rz.value
          ? { chars: rz.value.length, text: rz.value }
          : null
        : { error: errMessage(rz.reason) },
    media:
      md.status === "fulfilled" ? md.value : { error: errMessage(md.reason) },
  });
}
