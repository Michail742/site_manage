import { getSql } from "@/lib/db";

export interface KeziahCredit {
  balanceUsd: number;
  since: string; // ISO
  spentUsd: number;
  remainingUsd: number;
  avgScanUsd: number | null;
  scansLeft: number | null;
  outliers: Scan[]; // πρόσφατα τιμολόγια που ξεπέρασαν τα όρια
}

interface Scan {
  id: number;
  createdAt: string;
  input: number;
  output: number;
  usd: number;
}

interface Usage {
  total: { scans: number; usd: number };
  since: { scans: number; usd: number } | null;
  recent?: Scan[];
}

// Βάση: ~$0,033 ανά τιμολόγιο (είσοδος ~9.800, έξοδος ~1.300 tokens). Πάνω από αυτά = «ξέφυγε».
const MAX_USD = 0.1;
const MAX_INPUT = 20_000;
const MAX_OUTPUT = 6_000;

/**
 * Το Anthropic δεν δίνει το υπόλοιπο credits μέσω API key. Κρατάμε εδώ το υπόλοιπο που δήλωσε ο
 * admin και αφαιρούμε το κόστος των σαρώσεων του keziah (GET /api/admin/usage) από τότε.
 * Επιστρέφει null αν δεν έχει δηλωθεί υπόλοιπο, ή { error } αν το keziah δεν απαντά.
 */
export async function getKeziahCredit(): Promise<KeziahCredit | { error: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT balance_usd, since FROM service_credits WHERE service = 'keziah'
  `) as { balance_usd: string; since: string }[];
  if (!rows[0]) return null;

  const base = process.env.KEZIAH_URL;
  const token = process.env.KEZIAH_ADMIN_TOKEN;
  if (!base || !token) return { error: "Λείπουν KEZIAH_URL / KEZIAH_ADMIN_TOKEN" };

  const since = new Date(rows[0].since).toISOString();
  try {
    const res = await fetch(`${base}/api/admin/usage?since=${encodeURIComponent(since)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { error: `Το keziah απάντησε ${res.status}` };
    const usage = (await res.json()) as Usage;
    const balanceUsd = Number(rows[0].balance_usd);
    const spentUsd = usage.since?.usd ?? 0;
    const remainingUsd = balanceUsd - spentUsd;
    // Μέσο κόστος από όλες τις καταγεγραμμένες σαρώσεις (όχι μόνο από τη δήλωση).
    const avgScanUsd = usage.total.scans ? usage.total.usd / usage.total.scans : null;
    return {
      balanceUsd,
      since,
      spentUsd,
      remainingUsd,
      avgScanUsd,
      scansLeft: avgScanUsd ? Math.max(0, Math.floor(remainingUsd / avgScanUsd)) : null,
      outliers: (usage.recent ?? []).filter((s) => s.usd > MAX_USD || s.input > MAX_INPUT || s.output > MAX_OUTPUT),
    };
  } catch {
    return { error: "Το keziah δεν απαντά" };
  }
}

export async function setKeziahBalance(balanceUsd: number) {
  const sql = getSql();
  await sql`
    INSERT INTO service_credits (service, balance_usd, since)
    VALUES ('keziah', ${balanceUsd}, now())
    ON CONFLICT (service) DO UPDATE SET balance_usd = EXCLUDED.balance_usd, since = now()
  `;
}
