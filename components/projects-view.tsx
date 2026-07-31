"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ProjectsTable } from "@/components/projects-table";
import { AddProjectDialog } from "@/components/add-project-dialog";
import {
  ProjectsFilters,
  emptyFilters,
  isFiltersActive,
  type FiltersState,
} from "@/components/projects-filters";
import { type DisplayProject, type ManualProject, manualToDisplay } from "@/lib/types";
import { useManualProjects, saveManualProjects } from "@/lib/manual-projects";
import { setProjectEnabled, scanProjects } from "@/app/actions";

interface ProjectsViewProps {
  vercelProjects: DisplayProject[];
}

export function ProjectsView({ vercelProjects }: ProjectsViewProps) {
  const router = useRouter();
  const manualProjects = useManualProjects();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [, startTransition] = useTransition();
  // Optimistic on/off overrides ανά project id — αδειάζουν μόλις
  // ολοκληρωθεί το server action και έρθουν τα φρέσκα props.
  const [enabledOverrides, addEnabledOverride] = useOptimistic<
    Record<string, boolean>,
    [string, boolean]
  >({}, (state, [id, enabled]) => ({ ...state, [id]: enabled }));

  async function handleScan() {
    setScanning(true);
    await scanProjects();
    router.refresh();
    setScanning(false);
  }

  function handleAdd(project: ManualProject) {
    saveManualProjects([...manualProjects, project]);
  }

  function handleToggle(project: DisplayProject, enabled: boolean) {
    if (project.manual) {
      saveManualProjects(
        manualProjects.map((p) => (p.id === project.id ? { ...p, enabled } : p))
      );
      return;
    }

    setPendingIds((ids) => new Set(ids).add(project.id));
    startTransition(async () => {
      addEnabledOverride([project.id, enabled]);
      try {
        await setProjectEnabled(project.id, enabled);
      } catch (err) {
        console.error("Αποτυχία αλλαγής κατάστασης project:", err);
      } finally {
        setPendingIds((ids) => {
          const next = new Set(ids);
          next.delete(project.id);
          return next;
        });
      }
    });
  }

  const all: DisplayProject[] = [
    ...vercelProjects.map((p) => ({
      ...p,
      enabled: enabledOverrides[p.id] ?? p.enabled,
    })),
    ...manualProjects.map(manualToDisplay),
  ];

  const frameworks = Array.from(
    new Set(all.map((p) => p.framework).filter((f): f is string => Boolean(f)))
  ).sort();

  const q = filters.search.trim().toLowerCase();
  const filtered = all.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (filters.status !== "all" && p.status !== filters.status) return false;
    if (filters.framework !== "all" && p.framework !== filters.framework) return false;
    if (filters.onlineOnly && !p.enabled) return false;
    return true;
  });

  const active = isFiltersActive(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Projects</CardTitle>
          <CardDescription className="mt-1">
            {active
              ? `${filtered.length} από ${all.length} project${all.length !== 1 ? "s" : ""}`
              : `${all.length} project${all.length !== 1 ? "s" : ""} συνολικά`}
            {manualProjects.length > 0 && ` (${manualProjects.length} manual)`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Scan"}
          </Button>
          <AddProjectDialog onAdd={handleAdd} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProjectsFilters value={filters} onChange={setFilters} frameworks={frameworks} />
        <ProjectsTable projects={filtered} onToggle={handleToggle} pendingIds={pendingIds} />
      </CardContent>
    </Card>
  );
}
