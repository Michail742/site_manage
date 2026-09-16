export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MetricCards } from "@/components/metric-cards";
import { ProjectsView } from "@/components/projects-view";
import { getProjects, toDisplayProject } from "@/lib/vercel";
import { getReminders } from "@/lib/reminders";
import { getManualProjects } from "@/lib/manual-projects";
import { Layers } from "lucide-react";

async function DashboardContent() {
  const [allProjects, reminders, manualProjects] = await Promise.all([
    getProjects(),
    getReminders(),
    getManualProjects(),
  ]);
  const vercelProjects = allProjects
    .filter((p) => p.id !== process.env.VERCEL_PROJECT_ID)
    .map(toDisplayProject);

  const rawProjects = allProjects.filter(
    (p) => p.id !== process.env.VERCEL_PROJECT_ID
  );

  return (
    <div className="space-y-6">
      <MetricCards projects={rawProjects} />
      <ProjectsView
        vercelProjects={vercelProjects}
        manualProjects={manualProjects}
        reminders={reminders}
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
