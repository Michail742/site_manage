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
import { ExternalLink } from "lucide-react";
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
  return new Intl.DateTimeFormat("el-GR", {
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
  onToggle: (project: DisplayProject, enabled: boolean) => void;
  onReminderChanged: () => void;
  pendingIds: Set<string>;
}

export function ProjectsTable({
  projects,
  reminders,
  onToggle,
  onReminderChanged,
  pendingIds,
}: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16">
        Δεν βρέθηκαν projects.
      </p>
    );
  }

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
        {projects.map((project) => (
          <TableRow
            key={project.id}
            className={!project.enabled ? "opacity-50" : undefined}
          >
            <TableCell className="font-medium">
              <span>{project.name}</span>
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
