// Δημιουργεί το schema. Τρέξε μία φορά:
//   source <(grep -v '^#' .env.local | sed 's/^/export /') && node scripts/init-db.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — φόρτωσε πρώτα το .env.local");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS project_reminders (
    project_id       TEXT PRIMARY KEY,
    client_name      TEXT,
    client_email     TEXT,
    amount           NUMERIC(10, 2),
    renewal_date     DATE NOT NULL,
    last_notified_at TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// Οι πιο συχνές ερωτήσεις είναι "τι λήγει σύντομα" — ταξινόμηση κατά ημερομηνία.
await sql`
  CREATE INDEX IF NOT EXISTS project_reminders_renewal_date_idx
  ON project_reminders (renewal_date)
`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM project_reminders`;
console.log(`✓ schema έτοιμο — ${count} reminders στον πίνακα`);
