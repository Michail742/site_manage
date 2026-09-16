export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricCards } from "@/components/metric-cards";
import { ProjectsView } from "@/components/projects-view";
import { getProjects, toDisplayProject } from "@/lib/vercel";
import { getPagesProjects, toDisplayProject as cfToDisplayProject } from "@/lib/cloudflare";
import { getReminders } from "@/lib/reminders";
import { getManualProjects } from "@/lib/manual-projects";
import { getProjectGroups } from "@/lib/project-groups";
import { getProjectMeta } from "@/lib/project-meta";
import { manualToDisplay, withMeta } from "@/lib/types";
import { Layers } from "lucide-react";

async function DashboardContent() {
  const [allProjects, cloudflareResult, reminders, manualProjects, groups, meta] =
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
    ]);
  const vercelProjects = allProjects
    .filter((p) => p.id !== process.env.VERCEL_PROJECT_ID)
    .map(toDisplayProject)
    .map((p) => withMeta(p, meta));
  const cloudflareProjects = cloudflareResult
    .map(cfToDisplayProject)
    .map((p) => withMeta(p, meta));

  const liveNames = new Set(
    [...vercelProjects, ...cloudflareProjects].map((p) => p.name.toLowerCase())
  );
  const manualDisplay = manualProjects
    .filter((p) => !liveNames.has(p.name.toLowerCase()))
    .map((p) => withMeta(manualToDisplay(p), meta));

  return (
    <div className="space-y-6">
      <MetricCards projects={[...vercelProjects, ...cloudflareProjects, ...manualDisplay]} />
      <ProjectsView
        vercelProjects={vercelProjects}
        cloudflareProjects={cloudflareProjects}
        manualProjects={manualProjects}
        meta={meta}
        reminders={reminders}
        groups={groups}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview των web projects σου</p>
          </div>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}
