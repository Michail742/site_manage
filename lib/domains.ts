import { getSql } from "@/lib/db";

export interface DomainExpiry {
  expiresOn: string; // YYYY-MM-DD
  // Υπολογίζεται στον server, όπως και στα reminders (hydration).
  daysUntil: number;
  source: "rdap" | "manual";
}

const DAY = { revalidate: 86400 };

// Ο επίσημος κατάλογος IANA: TLD → RDAP server του registry. Κάποια ccTLD
// (π.χ. .gr) δεν έχουν RDAP — για αυτά μένει η χειροκίνητη τιμή. (Το rdap.org
// θα έκανε το ίδιο redirect, αλλά μπλοκάρει με 403 requests χωρίς User-Agent.)
async function rdapServer(tld: string): Promise<string | null> {
  const res = await fetch("https://data.iana.org/rdap/dns.json", { next: DAY });
  const data: { services: [string[], string[]][] } = await res.json();
  return data.services.find(([tlds]) => tlds.includes(tld))?.[1][0] ?? null;
}

async function rdapExpiry(domain: string): Promise<string | null> {
  try {
    const server = await rdapServer(domain.split(".").pop()!);
    if (!server) return null;
    const res = await fetch(`${server.replace(/\/?$/, "/")}domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(5000),
      next: DAY,
    });
    if (!res.ok) return null;
    const data: { events?: { eventAction: string; eventDate: string }[] } = await res.json();
    const date = data.events?.find((e) => e.eventAction === "expiration")?.eventDate;
    return date ? date.slice(0, 10) : null;
  } catch {
    return null;
  }
}

function daysUntil(isoDate: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((Date.parse(isoDate) - Date.parse(today)) / 86_400_000);
}

/** Λήξη ανά domain: η χειροκίνητη τιμή υπερισχύει, αλλιώς RDAP. */
export async function getDomainExpiries(
  domains: string[]
): Promise<Record<string, DomainExpiry>> {
  const unique = [...new Set(domains)];
  if (unique.length === 0) return {};

  const sql = getSql();
  const rows = (await sql`
    SELECT domain, to_char(expires_on, 'YYYY-MM-DD') AS expires_on
    FROM domain_expiries
  `) as { domain: string; expires_on: string }[];
  const manual = new Map(rows.map((r) => [r.domain, r.expires_on]));

  const entries = await Promise.all(
    unique.map(async (domain) => {
      const m = manual.get(domain);
      const expiresOn = m ?? (await rdapExpiry(domain));
      if (!expiresOn) return null;
      return [
        domain,
        { expiresOn, daysUntil: daysUntil(expiresOn), source: m ? "manual" : "rdap" },
      ] as const;
    })
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}

/** null σβήνει τη χειροκίνητη τιμή (επιστροφή στο RDAP). */
export async function setDomainExpiry(domain: string, expiresOn: string | null) {
  const sql = getSql();
  if (expiresOn === null) {
    await sql`DELETE FROM domain_expiries WHERE domain = ${domain}`;
    return;
  }
  await sql`
    INSERT INTO domain_expiries (domain, expires_on)
    VALUES (${domain}, ${expiresOn}::date)
    ON CONFLICT (domain) DO UPDATE SET
      expires_on = EXCLUDED.expires_on,
      updated_at = now()
  `;
}
