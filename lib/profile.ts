import { db, ensureSchema } from "./db";

export type Profile = {
  github: string;
  publications: string;
  press: string[];
  field: string;
  salary: string;
  resumeText: string;
  domain: string;
  media: string;
  businessMetrics: string;
  athleticsRecord: string;
  educationMetrics: string;
};

export async function getProfile(email: string): Promise<Profile | null> {
  await ensureSchema();
  const s = db();
  const rows = await s`
    select github, publications, press, field, salary, resume_text, domain, media, business_metrics as "businessMetrics", athletics_record as "athleticsRecord", education_metrics as "educationMetrics"
    from profiles where user_email = ${email}`;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    github: r.github ?? "",
    publications: r.publications ?? "",
    press: (r.press as string[]) ?? [],
    field: r.field ?? "",
    salary: r.salary ?? "",
    resumeText: r.resume_text ?? "",
    domain: r.domain ?? "",
    media: r.media ?? "",
    businessMetrics: r.businessMetrics ?? "",
    athleticsRecord: r.athleticsRecord ?? "",
    educationMetrics: r.educationMetrics ?? "",
  };
}

export async function upsertProfile(
  email: string,
  p: Profile,
): Promise<void> {
  await ensureSchema();
  const s = db();
  await s`
    insert into profiles (user_email, github, publications, press, field, salary, resume_text, domain, media, business_metrics, athletics_record, education_metrics, updated_at)
    values (${email}, ${p.github}, ${p.publications}, ${s.json(p.press)}, ${p.field}, ${p.salary}, ${p.resumeText}, ${p.domain}, ${p.media}, ${p.businessMetrics}, ${p.athleticsRecord}, ${p.educationMetrics}, now())
    on conflict (user_email) do update set
      github = excluded.github,
      publications = excluded.publications,
      press = excluded.press,
      field = excluded.field,
      salary = excluded.salary,
      resume_text = excluded.resume_text,
      domain = excluded.domain,
      media = excluded.media,
      business_metrics = excluded.business_metrics,
      athletics_record = excluded.athletics_record,
      education_metrics = excluded.education_metrics,
      updated_at = now()`;
}
