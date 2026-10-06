"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ProjectsTable } from "@/components/projects-table";
import { AddProjectDialog } from "@/components/add-project-dialog";
import { NewProjectPrompt } from "@/components/new-project-prompt";
import {
  ProjectsFilters,
  emptyFilters,
  isFiltersActive,
  type FiltersState,
} from "@/components/projects-filters";
import { type DisplayProject, type ManualProject, manualToDisplay, withMeta } from "@/lib/types";
import { type ManualProjectInput } from "@/lib/manual-projects";
import { type ProjectMeta } from "@/lib/project-meta";
import { type ReminderView } from "@/lib/reminders";
import { type DomainExpiry } from "@/lib/domains";
import {
  setProjectEnabled,
  addManualProject,
  setManualProjectEnabled,
  scanProjects,
} from "@/app/actions";

interface ProjectsViewProps {
  vercelProjects: DisplayProject[];
  cloudflareProjects: DisplayProject[];
  manualProjects: ManualProject[];
  meta: Record<string, ProjectMeta>;
  reminders: Record<string, ReminderView>;
  domainExpiries: Record<string, DomainExpiry>;
  groups: Record<string, string>;
  dealIds: string[];
  keziahCard?: React.ReactNode;
}

export function ProjectsView({
  keziahCard,
  vercelProjects,
  cloudflareProjects,
  manualProjects,
  meta,
  reminders,
  domainExpiries,
  groups,
  dealIds,
}: ProjectsViewProps) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
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

  function handleAdd(input: ManualProjectInput) {
    startTransition(async () => {
      try {
        await addManualProject(input);
        router.refresh();
      } catch (err) {
        console.error("Αποτυχία προσθήκης project:", err);
      }
    });
  }

  function handleToggle(project: DisplayProject, enabled: boolean) {
    if (!project.toggleable) return;
    setPendingIds((ids) => new Set(ids).add(project.id));
    startTransition(async () => {
      addEnabledOverride([project.id, enabled]);
      try {
        if (project.source === "manual") {
          await setManualProjectEnabled(project.id, enabled);
        } else {
          await setProjectEnabled(project.id, enabled);
        }
        router.refresh();
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

  const liveNames = new Set(
    [...vercelProjects, ...cloudflareProjects].map((p) => p.name.toLowerCase())
  );

  const all: DisplayProject[] = [
    ...vercelProjects.map((p) => ({
      ...p,
      enabled: enabledOverrides[p.id] ?? p.enabled,
    })),
    ...cloudflareProjects.map((p) => ({
      ...p,
      enabled: enabledOverrides[p.id] ?? p.enabled,
    })),
    ...manualProjects
      // Χειροκίνητα entries που στο μεταξύ ήρθαν "ζωντανά" από Vercel/Cloudflare
      // (π.χ. τα παλιά placeholder anyweather-crm/anyweather-home/yachtshelter)
      // δεν επαναλαμβάνονται — προτεραιότητα στα ζωντανά δεδομένα.
      .filter((p) => !liveNames.has(p.name.toLowerCase()))
      .map(manualToDisplay)
      .map((p) => withMeta(p, meta))
      .map((p) => ({
        ...p,
        enabled: enabledOverrides[p.id] ?? p.enabled,
      })),
  ];

  // Αταξινόμητο = όχι μέλος/γονέας ομάδας (προσωπικό ή gamehub/anyweather), όχι
  // σε συμφωνία πελάτη (project_deals) και χωρίς υπενθύμιση. Ρωτάμε ένα-ένα,
  // πάνω στα πλήρη δεδομένα — όχι στα φιλτραρισμένα.
  const groupParents = new Set(Object.values(groups));
  const deals = new Set(dealIds);
  const unclassified = all.find(
    (p) =>
      !groups[p.id] &&
      !groupParents.has(p.id) &&
      !deals.has(p.id) &&
      !reminders[p.id] &&
      !skippedIds.has(p.id)
  );

  const q = filters.search.trim().toLowerCase();
  const filtered = all.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
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
        <NewProjectPrompt
          project={unclassified ?? null}
          onSkip={(id) => setSkippedIds((s) => new Set(s).add(id))}
          onChanged={() => router.refresh()}
        />
        <ProjectsFilters value={filters} onChange={setFilters} />
        <ProjectsTable
          projects={filtered}
          reminders={reminders}
          domainExpiries={domainExpiries}
          groups={groups}
          keziahCard={keziahCard}
          onToggle={handleToggle}
          onReminderChanged={() => router.refresh()}
          onMetaChanged={() => router.refresh()}
          pendingIds={pendingIds}
        />
      </CardContent>
    </Card>
  );
}
