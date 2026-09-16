import { type DeploymentState } from "@/lib/vercel";

export interface DisplayProject {
  id: string;
  name: string;
  framework: string | null;
  status: DeploymentState | null;
  deployedAt: number | null;
  url: string | null;
  manual: boolean;
  enabled: boolean;
}

export interface ManualProject {
  id: string;
  name: string;
  framework: string;
  status: DeploymentState;
  url: string;
  createdAt: number;
  enabled: boolean;
}

export function manualToDisplay(p: ManualProject): DisplayProject {
  return {
    id: p.id,
    name: p.name,
    framework: p.framework || null,
    status: p.status,
    deployedAt: p.createdAt,
    url: p.url,
    manual: true,
    enabled: p.enabled,
  };
}
