import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hosts που δίνει η ίδια η πλατφόρμα — δεν είναι domains που πληρώνουμε/λήγουν.
const PLATFORM_SUFFIXES = [".vercel.app", ".pages.dev", ".workers.dev"];

// ponytail: απλοϊκή εύρεση apex (τελευταία 2 labels, ή 3 για com.gr/co.uk κ.λπ.).
// Αν χρειαστεί πλήρης ακρίβεια → Public Suffix List (π.χ. πακέτο `tldts`).
const SECOND_LEVEL = new Set(["com", "co", "org", "net", "gov", "edu", "ac"]);

function apex(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, "").split(".");
  const n = labels.length;
  const take = n >= 3 && labels[n - 1].length === 2 && SECOND_LEVEL.has(labels[n - 2]) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** Το πρώτο custom domain από μια λίστα hosts/URLs, ανηγμένο στο apex του. */
export function customDomain(hosts: (string | null | undefined)[]): string | null {
  for (const raw of hosts) {
    if (!raw) continue;
    const host = raw.replace(/^https?:\/\//, "").split(/[/:]/)[0];
    if (!host.includes(".") || PLATFORM_SUFFIXES.some((s) => host.endsWith(s))) continue;
    return apex(host);
  }
  return null;
}
