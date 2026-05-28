import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { type VercelProject, type DeploymentState } from "@/lib/vercel";

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

interface ProjectsTableProps {
  projects: VercelProject[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
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
          <TableHead className="text-right">URL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const latest = project.latestDeployments?.[0];
          return (
            <TableRow key={project.id}>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {project.framework ?? "—"}
              </TableCell>
              <TableCell>
                {latest ? (
                  <StatusBadge state={latest.readyState} />
                ) : (
                  <span className="text-muted-foreground text-sm">No deployments</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {latest ? formatDate(latest.createdAt) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {latest?.url ? (
                  <a
                    href={`https://${latest.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {latest.url.split(".")[0]}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
