import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { getProfile } from "@/lib/profile";
import { listUserAssessments, listUserIncompleteTasks, type DbAssessment, type DbTask } from "@/lib/db";
import { getVisa } from "@/lib/visas";
import { TaskList } from "./TaskList";

export default async function Assess() {
  const session = await auth();
  if (!session) redirect("/signin");

  const user = session.user;

  // First sign-in (no profile row yet) → send to onboarding. A DB error must
  // never block the dashboard, so failures fall through silently.
  if (user?.email) {
    let needsOnboarding = false;
    try {
      needsOnboarding = (await getProfile(user.email)) === null;
    } catch {
      needsOnboarding = false;
    }
    if (needsOnboarding) redirect("/profile?welcome=1");
  }

  let assessments: DbAssessment[] = [];
  let tasks: DbTask[] = [];

  if (user?.email) {
    try {
      assessments = await listUserAssessments(user.email);
      tasks = await listUserIncompleteTasks(user.email);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user?.email} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <p className="text-sm font-medium text-accent">
          Signed in{user?.name ? ` as ${user.name}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Your assessments
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Start a new eligibility assessment for an achievement-based visa. Your
          results will be saved here.
        </p>

        {assessments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <p className="text-muted">
              No assessments yet. Start one to see where you stand.
            </p>
            <Link
              href="/assess/new"
              className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent/90"
            >
              New assessment
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Past Assessments</h2>
                <Link
                  href="/assess/new"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Start New
                </Link>
              </div>
              <div className="space-y-4">
                {assessments.map((a) => {
                  const visa = getVisa(a.visaId);
                  return (
                    <Link href={`/assess/${a.id}`} key={a.id} className="block rounded-xl border border-line bg-card p-5 transition hover:border-accent/50 hover:bg-accent/5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{visa?.name ?? a.visaId}</span>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent capitalize">
                          {a.domain}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="mb-6 text-xl font-semibold tracking-tight">Outstanding Tasks</h2>
              <TaskList initialTasks={tasks} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
