import { type DeploymentState } from "@/lib/vercel";

export type ProjectSource = "vercel" | "cloudflare" | "manual";

export interface DisplayProject {
  id: string;
  name: string;
  framework: string | null;
  /** Ποια βάση δεδομένων χρησιμοποιεί — καμία πηγή δεν το αναφέρει μόνη της,
   * γεμίζει χειροκίνητα (βλ. lib/project-meta.ts) και μπαίνει εδώ στο merge. */
  database: string | null;
  status: DeploymentState | null;
  deployedAt: number | null;
  url: string | null;
  manual: boolean;
  enabled: boolean;
  source: ProjectSource;
  /** false όταν η πηγή δεν έχει API για on/off (π.χ. Cloudflare Pages). */
  toggleable: boolean;
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
    database: null,
    status: p.status,
    deployedAt: p.createdAt,
    url: p.url,
    manual: true,
    enabled: p.enabled,
    source: "manual",
    toggleable: true,
  };
}

/** Εφαρμόζει τις χειροκίνητες framework/database πινακίδες πάνω σε ένα project
 * ήδη μετατραπμένο σε DisplayProject — δουλεύει το ίδιο για Vercel, Cloudflare
 * και manual, αφού και τα τρία περνούν πρώτα από το δικό τους toDisplayProject. */
export function withMeta(
  p: DisplayProject,
  meta: Record<string, { database: string | null; framework: string | null }>
): DisplayProject {
  const m = meta[p.id];
  if (!m) return p;
  return {
    ...p,
    framework: m.framework || p.framework,
    database: m.database || p.database,
  };
}
