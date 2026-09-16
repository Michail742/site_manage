import { type DisplayProject } from "@/lib/types";
import { type DeploymentState } from "@/lib/vercel";

const CF_API = "https://api.cloudflare.com/client/v4";

interface CloudflareStage {
  name: string;
  status: string | null;
}

interface CloudflareDeployment {
  id: string;
  url: string;
  created_on: string;
  latest_stage?: CloudflareStage | null;
}

interface CloudflareDeploymentConfig {
  d1_databases?: Record<string, { id: string }>;
}

export interface CloudflarePagesProject {
  id: string;
  name: string;
  subdomain: string;
  domains?: string[];
  production_branch: string;
  created_on: string;
  latest_deployment?: CloudflareDeployment | null;
  deployment_configs?: {
    production?: CloudflareDeploymentConfig;
    preview?: CloudflareDeploymentConfig;
  };
  accountId: string;
}

interface CloudflareListResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T[];
  result_info?: { page: number; per_page: number; total_pages: number };
}

// Ένα ή περισσότερα Cloudflare accounts, χωρισμένα με κόμμα.
function accountIds(): string[] {
  const raw =
    process.env.CLOUDFLARE_ACCOUNT_IDS || process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!raw) throw new Error("CLOUDFLARE_ACCOUNT_ID(S) is not set");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getPagesProjects(): Promise<CloudflarePagesProject[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not set");

  const all: CloudflarePagesProject[] = [];

  for (const accountId of accountIds()) {
    let page = 1;
    for (;;) {
      // Το endpoint αυτό δεν δέχεται per_page (γυρνάει "Invalid list options") —
      // μένουμε στο δικό του default (10) και προχωράμε με page.
      const url = new URL(`${CF_API}/accounts/${accountId}/pages/projects`);
      url.searchParams.set("page", String(page));

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60, tags: ["projects"] },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Cloudflare API error ${res.status}: ${body}`);
      }

      const data: CloudflareListResponse<
        Omit<CloudflarePagesProject, "accountId">
      > = await res.json();
      if (!data.success) {
        throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
      }

      all.push(...data.result.map((p) => ({ ...p, accountId })));

      const info = data.result_info;
      if (!info || page >= info.total_pages) break;
      page++;
    }
  }

  return all;
}

function mapStatus(stageStatus: string | null | undefined): DeploymentState | null {
  switch (stageStatus) {
    case "success":
      return "READY";
    case "failure":
      return "ERROR";
    case "canceled":
      return "CANCELED";
    case "active":
      return "BUILDING";
    case "idle":
      return "QUEUED";
    default:
      return null;
  }
}

// Η D1 binding ΕΙΝΑΙ ορατή στο API (deployment_configs), σε αντίθεση με μια
// εξωτερική βάση (π.χ. Neon) πίσω από ένα env var — αυτή τη μαντεύουμε σωστά
// μόνο εδώ, οτιδήποτε άλλο μένει στο χειροκίνητο project_meta.
function detectDatabase(p: CloudflarePagesProject): string | null {
  const configs = p.deployment_configs;
  const hasD1 = Boolean(
    Object.keys(configs?.production?.d1_databases ?? {}).length ||
      Object.keys(configs?.preview?.d1_databases ?? {}).length
  );
  return hasD1 ? "Cloudflare D1" : null;
}

export function toDisplayProject(p: CloudflarePagesProject): DisplayProject {
  const latest = p.latest_deployment;
  const url = p.domains?.[0] ?? p.subdomain ?? null;
  return {
    // namespaced ώστε να μη συγκρούεται με Vercel/manual ids, ούτε μεταξύ
    // δύο Cloudflare accounts με τυχαία ίδιο project id.
    id: `cf_${p.accountId}_${p.id}`,
    name: p.name,
    framework: null,
    database: detectDatabase(p),
    status: latest ? mapStatus(latest.latest_stage?.status) : null,
    deployedAt: latest ? Date.parse(latest.created_on) || null : null,
    url,
    manual: false,
    enabled: true,
    source: "cloudflare",
    // Το Cloudflare Pages δεν έχει API για pause/unpause σαν το Vercel.
    toggleable: false,
  };
}
