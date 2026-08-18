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
    await s`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS evidence JSONB`;
    await s`CREATE TABLE IF NOT EXISTS user_tasks (id TEXT PRIMARY KEY, user_email TEXT NOT NULL, assessment_id TEXT NOT NULL, criterion_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, timeframe TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, outreach_template TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`;
    await s`CREATE TABLE IF NOT EXISTS seen_policy_items (user_email TEXT NOT NULL, item_id TEXT NOT NULL, seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (user_email, item_id))`;
  })();
  return schemaReady;
}

export type DbAssessment = {
  id: string;
  userEmail: string;
  visaId: string;
  domain: string;
  result: Record<string, unknown>;
  evidence: unknown[];
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
  await s`insert into assessments (id, user_email, visa_id, domain, result, evidence) values (${id}, ${assessment.userEmail}, ${assessment.visaId}, ${assessment.domain}, ${s.json(assessment.result as any)}, ${s.json(assessment.evidence as any)})`;
  return id;
}

export async function listUserAssessments(email: string): Promise<DbAssessment[]> {
  await ensureSchema();
  const s = db();
  const rows = await s`select id, user_email as "userEmail", visa_id as "visaId", domain, result, evidence, created_at as "createdAt" from assessments where user_email = ${email} order by created_at desc`;
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

export async function getAssessmentById(id: string, email: string): Promise<DbAssessment | null> {
  await ensureSchema();
  const s = db();
  const rows = await s`select id, user_email as "userEmail", visa_id as "visaId", domain, result, evidence, created_at as "createdAt" from assessments where id = ${id} and user_email = ${email}`;
  return (rows[0] as unknown as DbAssessment) || null;
}

export async function updateAssessmentResult(id: string, email: string, evidence: unknown[], result: Record<string, unknown>): Promise<void> {
  await ensureSchema();
  const s = db();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await s`update assessments set evidence = ${s.json(evidence as any)}, result = ${s.json(result as any)} where id = ${id} and user_email = ${email}`;
}

export async function listTasksForAssessment(assessmentId: string, email: string): Promise<DbTask[]> {
  await ensureSchema();
  const s = db();
  const rows = await s`select id, user_email as "userEmail", assessment_id as "assessmentId", criterion_id as "criterionId", title, description, timeframe, completed, outreach_template as "outreachTemplate", created_at as "createdAt" from user_tasks where assessment_id = ${assessmentId} and user_email = ${email} order by created_at desc`;
  return rows as unknown as DbTask[];
}

export async function deleteAssessment(id: string, email: string): Promise<void> {
  await ensureSchema();
  const s = db();
  await s`delete from user_tasks where assessment_id = ${id} and user_email = ${email}`;
  await s`delete from assessments where id = ${id} and user_email = ${email}`;
}

export async function deleteTask(id: string, email: string): Promise<void> {
  await ensureSchema();
  const s = db();
  await s`delete from user_tasks where id = ${id} and user_email = ${email}`;
}

export async function updateTask(id: string, email: string, updates: { title?: string; description?: string }): Promise<void> {
  await ensureSchema();
  const s = db();
  if (updates.title !== undefined && updates.description !== undefined) {
    await s`update user_tasks set title = ${updates.title}, description = ${updates.description} where id = ${id} and user_email = ${email}`;
  } else if (updates.title !== undefined) {
    await s`update user_tasks set title = ${updates.title} where id = ${id} and user_email = ${email}`;
  } else if (updates.description !== undefined) {
    await s`update user_tasks set description = ${updates.description} where id = ${id} and user_email = ${email}`;
  }
}

export async function insertTask(task: Omit<DbTask, 'id' | 'createdAt' | 'completed'>): Promise<string> {
  await ensureSchema();
  const s = db();
  const id = crypto.randomUUID();
  await s`insert into user_tasks (id, user_email, assessment_id, criterion_id, title, description, timeframe, outreach_template) values (${id}, ${task.userEmail}, ${task.assessmentId}, ${task.criterionId}, ${task.title}, ${task.description}, ${task.timeframe}, ${task.outreachTemplate ?? null})`;
  return id;
}

export async function markPolicyItemSeen(email: string, itemId: string): Promise<void> {
  await ensureSchema();
  const s = db();
  await s`insert into seen_policy_items (user_email, item_id) values (${email}, ${itemId}) on conflict do nothing`;
}

export async function getSeenPolicyItemIds(email: string): Promise<Set<string>> {
  await ensureSchema();
  const s = db();
  const rows = await s`select item_id from seen_policy_items where user_email = ${email}`;
  return new Set(rows.map(r => r.item_id as string));
}

export async function getUserRelevantDomains(email: string): Promise<{domain: string | null, visaIds: string[]}> {
  await ensureSchema();
  const s = db();
  const profiles = await s`select domain from profiles where user_email = ${email}`;
  const domain = profiles.length > 0 ? (profiles[0].domain as string) : null;
  
  const assessments = await s`select distinct visa_id from assessments where user_email = ${email}`;
  const visaIds = assessments.map(r => r.visa_id as string);
  
  return { domain, visaIds };
}
