"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectsTable } from "@/components/projects-table";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { type DisplayProject, type ManualProject, manualToDisplay } from "@/lib/types";
import { setProjectEnabled } from "@/app/actions";

const LS_KEY = "site_manage_manual_projects";

function loadManual(): ManualProject[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveManual(projects: ManualProject[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

interface ProjectsViewProps {
  vercelProjects: DisplayProject[];
}

export function ProjectsView({ vercelProjects }: ProjectsViewProps) {
  const [manualProjects, setManualProjects] = useState<ManualProject[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  // Optimistic on/off overrides ανά project id — αδειάζουν μόλις
  // ολοκληρωθεί το server action και έρθουν τα φρέσκα props.
  const [enabledOverrides, addEnabledOverride] = useOptimistic<
    Record<string, boolean>,
    [string, boolean]
  >({}, (state, [id, enabled]) => ({ ...state, [id]: enabled }));

  useEffect(() => {
    setManualProjects(loadManual());
  }, []);

  function handleAdd(project: ManualProject) {
    const updated = [...manualProjects, project];
    setManualProjects(updated);
    saveManual(updated);
  }

  function handleToggle(project: DisplayProject, enabled: boolean) {
    if (project.manual) {
      const updated = manualProjects.map((p) =>
        p.id === project.id ? { ...p, enabled } : p
      );
      setManualProjects(updated);
      saveManual(updated);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Projects</CardTitle>
          <CardDescription className="mt-1">
            {all.length} project{all.length !== 1 ? "s" : ""} συνολικά
            {manualProjects.length > 0 && ` (${manualProjects.length} manual)`}
          </CardDescription>
        </div>
        <AddProjectDialog onAdd={handleAdd} />
      </CardHeader>
      <CardContent>
        <ProjectsTable projects={all} onToggle={handleToggle} pendingIds={pendingIds} />
      </CardContent>
    </Card>
  );
}
