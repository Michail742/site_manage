"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, CornerDownRight, Plus, Minus } from "lucide-react";
import { type DeploymentState } from "@/lib/vercel";
import { type DisplayProject } from "@/lib/types";
import { type ReminderView, reminderStatus } from "@/lib/reminders";
import { ReminderDialog } from "@/components/reminder-dialog";

const STATUS_MAP: Record<
  DeploymentState,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  READY: { label: "Ready", variant: "default" },
  BUILDING: { label: "Building", variant: "secondary" },
  QUEUED: { label: "Queued", variant: "outline" },
  ERROR: { label: "Error", variant: "destructive" },
  CANCELED: { label: "Canceled", variant: "outline" },
};

function StatusBadge({ state }: { state: DeploymentState }) {
  const { label, variant } = STATUS_MAP[state] ?? {
    label: state,
    variant: "outline" as const,
  };
  return <Badge variant={variant}>{label}</Badge>;
}

function formatDate(ms: number) {
  // Pinned timezone: server (UTC) and client (Europe/Athens) must agree,
  // otherwise the text differs between SSR and hydration (React #418).
  return new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function RenewalCell({ reminder }: { reminder: ReminderView }) {
  const status = reminderStatus(reminder.daysUntil);
  const days = Math.abs(reminder.daysUntil);

  const label =
    status === "overdue"
      ? `Έληξε πριν ${days} ${days === 1 ? "μέρα" : "μέρες"}`
      : reminder.daysUntil === 0
        ? "Λήγει σήμερα"
        : `Σε ${days} ${days === 1 ? "μέρα" : "μέρες"}`;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm">{reminder.renewalDate}</span>
      <span
        className={
          status === "overdue"
            ? "text-xs text-destructive"
            : status === "soon"
              ? "text-xs text-yellow-600 dark:text-yellow-500"
              : "text-xs text-muted-foreground"
        }
      >
        {label}
        {reminder.amount !== null && ` · ${reminder.amount}€`}
      </span>
    </div>
  );
}

interface ProjectsTableProps {
  projects: DisplayProject[];
  reminders: Record<string, ReminderView>;
  groups: Record<string, string>;
  onToggle: (project: DisplayProject, enabled: boolean) => void;
  onReminderChanged: () => void;
  pendingIds: Set<string>;
}

interface GroupedRow {
  project: DisplayProject;
  isChild: boolean;
  childCount: number;
}

/**
 * Τοποθετεί κάθε project με parent (π.χ. τα mini-games του gamehub) αμέσως
 * μετά τη γραμμή του γονέα του, ώστε να φαίνονται σαν υποκατηγορίες στον
 * πίνακα. Αν ο γονέας δεν είναι στη λίστα (π.χ. φιλτραρίστηκε), το project
 * εμφανίζεται στην κανονική του θέση χωρίς εσοχή. Τα παιδιά ενός γονέα που
 * δεν είναι στο `expanded` παραλείπονται εντελώς.
 */
function withGroups(
  projects: DisplayProject[],
  groups: Record<string, string>,
  expanded: Set<string>
): GroupedRow[] {
  const idsInList = new Set(projects.map((p) => p.id));
  const childrenByParent = new Map<string, DisplayProject[]>();
  const nestedChildIds = new Set<string>();

  for (const p of projects) {
    const parentId = groups[p.id];
    if (parentId && idsInList.has(parentId) && parentId !== p.id) {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId)!.push(p);
      nestedChildIds.add(p.id);
    }
  }

  const result: GroupedRow[] = [];
  for (const p of projects) {
    if (nestedChildIds.has(p.id)) continue;
    const children = childrenByParent.get(p.id) ?? [];
    result.push({ project: p, isChild: false, childCount: children.length });
    if (children.length > 0 && expanded.has(p.id)) {
      for (const child of children) {
        result.push({ project: child, isChild: true, childCount: 0 });
      }
    }
  }
  return result;
}

export function ProjectsTable({
  projects,
  reminders,
  groups,
  onToggle,
  onReminderChanged,
  pendingIds,
}: ProjectsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (projects.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16">
        Δεν βρέθηκαν projects.
      </p>
    );
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const rows = withGroups(projects, groups, expanded);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[260px]">Project</TableHead>
          <TableHead>Framework</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Deploy</TableHead>
          <TableHead className="w-[190px]">Ανανέωση</TableHead>
          <TableHead className="text-right">URL</TableHead>
          <TableHead className="w-[80px] text-right">On/Off</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ project, isChild, childCount }) => (
          <TableRow
            key={project.id}
            className={!project.enabled ? "opacity-50" : undefined}
          >
            <TableCell className="font-medium">
              <span className={isChild ? "inline-flex items-center gap-1.5 pl-4" : "inline-flex items-center gap-1.5"}>
                {isChild && (
                  <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                {childCount > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(project.id)}
                    className="inline-flex items-center justify-center w-4 h-4 rounded border border-input text-muted-foreground hover:bg-muted shrink-0"
                    aria-label={
                      expanded.has(project.id)
                        ? `Σύμπτυξη υποκατηγοριών ${project.name}`
                        : `Ανάπτυξη υποκατηγοριών ${project.name}`
                    }
                  >
                    {expanded.has(project.id) ? (
                      <Minus className="w-2.5 h-2.5" />
                    ) : (
                      <Plus className="w-2.5 h-2.5" />
                    )}
                  </button>
                )}
                {project.name}
              </span>
              {childCount > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({childCount})</span>
              )}
              {project.manual && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">
                  manual
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground capitalize">
              {project.framework ?? "—"}
            </TableCell>
            <TableCell>
              {project.status ? (
                <StatusBadge state={project.status} />
              ) : (
                <span className="text-muted-foreground text-sm">No deployments</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {project.deployedAt ? formatDate(project.deployedAt) : "—"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {reminders[project.id] ? (
                  <RenewalCell reminder={reminders[project.id]} />
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
                <ReminderDialog
                  project={project}
                  reminder={reminders[project.id] ?? null}
                  onChanged={onReminderChanged}
                />
              </div>
            </TableCell>
            <TableCell className="text-right">
              {project.url ? (
                <a
                  href={project.url.startsWith("http") ? project.url : `https://${project.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {project.url.replace(/^https?:\/\//, "").split(".")[0]}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Switch
                checked={project.enabled}
                disabled={pendingIds.has(project.id)}
                onCheckedChange={(checked) => onToggle(project, checked)}
                aria-label={`${project.enabled ? "Απενεργοποίηση" : "Ενεργοποίηση"} ${project.name}`}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
