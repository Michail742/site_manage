import { getSql } from "@/lib/db";

export interface Reminder {
  projectId: string;
  clientName: string | null;
  clientEmail: string | null;
  amount: number | null;
  renewalDate: string; // YYYY-MM-DD
  lastNotifiedAt: string | null;
  notes: string | null;
}

export interface ReminderView extends Reminder {
  // Υπολογίζεται στον server. Αν το υπολόγιζε ο client θα διέφερε από το
  // server render (άλλο "σήμερα" ανά timezone) και θα έσπαγε το hydration.
  daysUntil: number;
}

export type ReminderStatus = "overdue" | "soon" | "ok";

export const SOON_DAYS = 30;

export function reminderStatus(daysUntil: number): ReminderStatus {
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= SOON_DAYS) return "soon";
  return "ok";
}

interface Row {
  project_id: string;
  client_name: string | null;
  client_email: string | null;
  amount: string | null;
  renewal_date: string;
  last_notified_at: string | null;
  notes: string | null;
  days_until: number;
}

function toView(row: Row): ReminderView {
  return {
    projectId: row.project_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    // Το NUMERIC γυρνάει ως string από τον driver για να μη χαθεί ακρίβεια.
    amount: row.amount === null ? null : Number(row.amount),
    renewalDate: row.renewal_date,
    lastNotifiedAt: row.last_notified_at,
    notes: row.notes,
    daysUntil: Number(row.days_until),
  };
}

export async function getReminders(): Promise<Record<string, ReminderView>> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      project_id,
      client_name,
      client_email,
      amount,
      to_char(renewal_date, 'YYYY-MM-DD') AS renewal_date,
      last_notified_at,
      notes,
      (renewal_date - CURRENT_DATE) AS days_until
    FROM project_reminders
  `) as Row[];

  return Object.fromEntries(rows.map((r) => [r.project_id, toView(r)]));
}

export interface ReminderInput {
  projectId: string;
  clientName: string | null;
  clientEmail: string | null;
  amount: number | null;
  renewalDate: string;
  notes: string | null;
}

export async function upsertReminder(input: ReminderInput) {
  const sql = getSql();
  await sql`
    INSERT INTO project_reminders
      (project_id, client_name, client_email, amount, renewal_date, notes)
    VALUES (
      ${input.projectId},
      ${input.clientName},
      ${input.clientEmail},
      ${input.amount},
      ${input.renewalDate}::date,
      ${input.notes}
    )
    ON CONFLICT (project_id) DO UPDATE SET
      client_name   = EXCLUDED.client_name,
      client_email  = EXCLUDED.client_email,
      amount        = EXCLUDED.amount,
      renewal_date  = EXCLUDED.renewal_date,
      notes         = EXCLUDED.notes,
      updated_at    = now()
  `;
}

export async function deleteReminder(projectId: string) {
  const sql = getSql();
  await sql`DELETE FROM project_reminders WHERE project_id = ${projectId}`;
}

/**
 * Καταγράφει ότι στάλθηκε ειδοποίηση και μεταθέτει την ανανέωση κατά ένα έτος.
 */
export async function markNotifiedAndRenew(projectId: string) {
  const sql = getSql();
  await sql`
    UPDATE project_reminders
    SET last_notified_at = now(),
        renewal_date     = renewal_date + INTERVAL '1 year',
        updated_at       = now()
    WHERE project_id = ${projectId}
  `;
}
