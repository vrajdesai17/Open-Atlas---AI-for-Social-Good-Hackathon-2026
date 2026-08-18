import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { getPolicyWatch, isPolicyItemRelevant, type WatchItem } from "@/lib/policy/watch";
import { getUserRelevantDomains, getSeenPolicyItemIds, markPolicyItemSeen } from "@/lib/db";

export const dynamic = "force-dynamic";

const IMPACT_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-soft text-amber",
  low: "bg-panel text-faint",
};

export default async function PolicyWatch() {
  const session = await auth();
  if (!session) redirect("/signin");

  let items: WatchItem[] = [];
  let error: string | null = null;
  try {
    items = await getPolicyWatch();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load updates";
  }

  let domain: string | null = null;
  let visaIds: string[] = [];
  let seenIds = new Set<string>();

  if (session?.user?.email) {
    try {
      const relevant = await getUserRelevantDomains(session.user.email);
      domain = relevant.domain;
      visaIds = relevant.visaIds;
      seenIds = await getSeenPolicyItemIds(session.user.email);
    } catch (err) {
      console.error(err);
    }
  }

  const isRelevant = (item: WatchItem) => isPolicyItemRelevant(item, domain, visaIds);

  if (session?.user?.email) {
    const unseenRelevant = items.filter(item => isRelevant(item) && !seenIds.has(item.docNumber));
    if (unseenRelevant.length > 0) {
      Promise.all(unseenRelevant.map(item => markPolicyItemSeen(session.user!.email!, item.docNumber))).catch(console.error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={session.user?.email} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="text-sm font-medium text-accent">Policy Watch</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Recent immigration rule changes
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Live from the Federal Register, summarized in plain language and tagged
          by visa — including F-1 and H-1B. Substantive changes are rare;
          routine notices are marked low impact and never fabricated.
        </p>

        {error && (
          <div className="mt-8 rounded-xl border border-line bg-card p-6 text-sm text-red-600">
            Couldn&apos;t load updates: {error}
          </div>
        )}

        {!error && items.length === 0 && (
          <p className="mt-8 text-muted">No recent items found.</p>
        )}

        <div className="mt-8 space-y-3">
          {items.map((item) => {
            const relevant = isRelevant(item);
            const isNew = relevant && !seenIds.has(item.docNumber);

            return (
              <article
                key={item.docNumber}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                      IMPACT_STYLE[item.impact] ?? IMPACT_STYLE.low
                    }`}
                  >
                    {item.impact} impact
                  </span>
                  <span className="text-xs text-faint">
                    {item.type} · {item.date}
                  </span>
                  {isNew && (
                    <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-xs font-medium">
                      New for you
                    </span>
                  )}
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {item.visas.map((v) => (
                      <span
                        key={v}
                        className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <h2 className="mt-3 text-base font-semibold leading-snug">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-sm text-muted">{item.summary}</p>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Read the rule ↗
                </a>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
