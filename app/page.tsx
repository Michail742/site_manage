export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricCards } from "@/components/metric-cards";
import { ProjectsView } from "@/components/projects-view";
import { getProjects, toDisplayProject } from "@/lib/vercel";
import { getPagesProjects, toDisplayProject as cfToDisplayProject } from "@/lib/cloudflare";
import { getReminders } from "@/lib/reminders";
import { getManualProjects } from "@/lib/manual-projects";
import { getKeziahCredit } from "@/lib/keziah-credit";
import { KeziahCreditCard } from "@/components/keziah-credit-card";
import { getProjectGroups } from "@/lib/project-groups";
import { getDealIds } from "@/lib/project-deals";
import { getProjectMeta } from "@/lib/project-meta";
import { getDomainExpiries } from "@/lib/domains";
import { manualToDisplay, withMeta } from "@/lib/types";
import { Layers } from "lucide-react";
import { AccountActions } from "@/components/account-actions";
import { TabLock } from "@/components/tab-lock";
import { SimpleNavbar } from "@/components/ui/core-header-navbar";

// Projects που υπάρχουν στο Cloudflare αλλά δεν θέλουμε στη λίστα (δεν διαγράφονται).
const HIDDEN_PROJECTS = ["onemorebite", "mia-anasa"];

async function DashboardContent() {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) redirect("/login");
  const [allProjects, cloudflareResult, reminders, manualProjects, groups, meta, keziahCredit, dealIds] =
    await Promise.all([
      getProjects(),
      getPagesProjects().catch((err) => {
        console.error("Cloudflare Pages fetch failed:", err);
        return [];
      }),
      getReminders(),
      getManualProjects(),
      getProjectGroups(),
      getProjectMeta(),
      getKeziahCredit().catch((err) => {
        console.error("Keziah credit failed:", err);
        return { error: "Δεν φορτώθηκε το υπόλοιπο" };
      }),
      getDealIds(),
    ]);
  const vercelProjects = allProjects
    .filter((p) => p.id !== process.env.VERCEL_PROJECT_ID)
    .map(toDisplayProject)
    .map((p) => withMeta(p, meta));
  const cloudflareProjects = cloudflareResult
    .filter((p) => !HIDDEN_PROJECTS.includes(p.name))
    .map(cfToDisplayProject)
    .map((p) => withMeta(p, meta));

  const liveNames = new Set(
    [...vercelProjects, ...cloudflareProjects].map((p) => p.name.toLowerCase())
  );
  const manualDisplay = manualProjects
    .filter((p) => !liveNames.has(p.name.toLowerCase()))
    .map((p) => withMeta(manualToDisplay(p), meta));

  const domainExpiries = await getDomainExpiries(
    [...vercelProjects, ...cloudflareProjects, ...manualDisplay]
      .map((p) => p.domain)
      .filter((d): d is string => d !== null)
  );

  return (
    <div className="space-y-6">
      <MetricCards projects={[...vercelProjects, ...cloudflareProjects, ...manualDisplay]} />
      <ProjectsView
        keziahCard={<KeziahCreditCard credit={keziahCredit} />}
        vercelProjects={vercelProjects}
        cloudflareProjects={cloudflareProjects}
        manualProjects={manualProjects}
        meta={meta}
        reminders={reminders}
        domainExpiries={domainExpiries}
        groups={groups}
        dealIds={dealIds}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <TabLock>
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <SimpleNavbar
          icon={<Layers className="w-6 h-6 text-primary" />}
          title="Admin Dashboard"
          subtitle="Overview των web projects σου"
        >
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {/* Απλό <a> (όχι next/link): πάει σε στατικό αρχείο, όχι σε route του Next */}
            <a
              href="/courier/index.html"
              className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Διανομή
            </a>
            <AccountActions />
          </div>
        </SimpleNavbar>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
    </TabLock>
  );
}
