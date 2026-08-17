import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL not set — create a free Postgres DB (Neon or Supabase) and add it to .env.local",
    );
  }
  sql ??= postgres(process.env.DATABASE_URL, { ssl: "require" });
  return sql;
}

let schemaReady: Promise<void> | null = null;

// Lazily create tables on first use — no migration step needed for a demo.
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const s = db();
    await s`create table if not exists profiles (
      user_email text primary key,
      github text,
      publications text,
      press jsonb default '[]'::jsonb,
      field text,
      salary text,
      resume_text text,
      updated_at timestamptz default now()
    )`;
    await s`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS domain TEXT`;
    await s`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS media TEXT`;
    await s`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_metrics TEXT`;
    await s`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS athletics_record TEXT`;
    await s`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_metrics TEXT`;
    await s`CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, user_email TEXT NOT NULL, visa_id TEXT NOT NULL, domain TEXT NOT NULL, result JSONB NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`;
    await s`CREATE TABLE IF NOT EXISTS user_tasks (id TEXT PRIMARY KEY, user_email TEXT NOT NULL, assessment_id TEXT NOT NULL, criterion_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, timeframe TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, outreach_template TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`;
  })();
  return schemaReady;
}

export type DbAssessment = {
  id: string;
  userEmail: string;
  visaId: string;
  domain: string;
  result: Record<string, unknown>;
  createdAt: Date;
};

export type DbTask = {
  id: string;
  userEmail: string;
  assessmentId: string;
  criterionId: string;
  title: string;
  description: string;
  timeframe: string;
  completed: boolean;
  outreachTemplate?: string;
  createdAt: Date;
};

export async function saveAssessment(assessment: Omit<DbAssessment, "id" | "createdAt">): Promise<string> {
  await ensureSchema();
  const s = db();
  const id = crypto.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await s`insert into assessments (id, user_email, visa_id, domain, result) values (${id}, ${assessment.userEmail}, ${assessment.visaId}, ${assessment.domain}, ${s.json(assessment.result as any)})`;
  return id;
}

export async function listUserAssessments(email: string): Promise<DbAssessment[]> {
  await ensureSchema();
  const s = db();
  const rows = await s`select id, user_email as "userEmail", visa_id as "visaId", domain, result, created_at as "createdAt" from assessments where user_email = ${email} order by created_at desc`;
  return rows as unknown as DbAssessment[];
}

export async function insertTasks(tasks: Omit<DbTask, "id" | "createdAt" | "completed">[]): Promise<void> {
  if (!tasks.length) return;
  await ensureSchema();
  const s = db();
  
  const insertRows = tasks.map(t => ({
    id: crypto.randomUUID(),
    user_email: t.userEmail,
    assessment_id: t.assessmentId,
    criterion_id: t.criterionId,
    title: t.title,
    description: t.description,
    timeframe: t.timeframe,
    outreach_template: t.outreachTemplate ?? null
  }));
  
  await s`insert into user_tasks ${s(insertRows, 'id', 'user_email', 'assessment_id', 'criterion_id', 'title', 'description', 'timeframe', 'outreach_template')}`;
}

export async function listUserIncompleteTasks(email: string): Promise<DbTask[]> {
  await ensureSchema();
  const s = db();
  const rows = await s`select id, user_email as "userEmail", assessment_id as "assessmentId", criterion_id as "criterionId", title, description, timeframe, completed, outreach_template as "outreachTemplate", created_at as "createdAt" from user_tasks where user_email = ${email} and completed = false order by created_at desc`;
  return rows as unknown as DbTask[];
}

export async function toggleTaskCompleted(id: string, email: string, completed: boolean): Promise<void> {
  await ensureSchema();
  const s = db();
  await s`update user_tasks set completed = ${completed} where id = ${id} and user_email = ${email}`;
}
