"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectsTable } from "@/components/projects-table";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { type DisplayProject, type ManualProject, manualToDisplay } from "@/lib/types";

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

  useEffect(() => {
    setManualProjects(loadManual());
  }, []);

  function handleAdd(project: ManualProject) {
    const updated = [...manualProjects, project];
    setManualProjects(updated);
    saveManual(updated);
  }

  const all: DisplayProject[] = [
    ...vercelProjects,
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
        <ProjectsTable projects={all} />
      </CardContent>
    </Card>
  );
}
