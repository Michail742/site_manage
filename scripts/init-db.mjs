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

await sql`
  CREATE TABLE IF NOT EXISTS manual_projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    url         TEXT NOT NULL DEFAULT '',
    framework   TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'READY',
    enabled     BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// Projects εκτός Vercel που θέλουμε να υπάρχουν πάντα στη λίστα — πρώην
// lib/seed-projects.ts. Ένθετο εδώ, ώστε να τρέχει σε plain Node χωρίς
// TypeScript loader. ON CONFLICT DO NOTHING ώστε να τρέχει ξανά με ασφάλεια.
await sql`
  INSERT INTO manual_projects (id, name, url, framework, status, created_at)
  VALUES ('seed_anyweather', 'anyweather', 'https://anyweather.pages.dev/', 'other', 'READY', to_timestamp(0))
  ON CONFLICT (id) DO NOTHING
`;

// anyweather-crm, anyweather-home και yachtshelter είναι δικά της (Cloudflare
// Pages, όχι Vercel) — μπαίνουν χειροκίνητα όπως το anyweather και ομαδοποιούνται
// κάτω από αυτό παρακάτω.
await sql`
  INSERT INTO manual_projects (id, name, url, framework, status) VALUES
    ('seed_anyweather_crm', 'anyweather-crm', 'https://anyweather-crm.pages.dev', 'other', 'READY'),
    ('seed_anyweather_home', 'anyweather-home', 'https://home.anyweather.gr', 'react', 'READY'),
    ('seed_yachtshelter', 'yachtshelter', 'https://yachtshelter.pages.dev', 'other', 'READY')
  ON CONFLICT (id) DO NOTHING
`;

await sql`
  CREATE TABLE IF NOT EXISTS project_groups (
    child_id   TEXT PRIMARY KEY,
    parent_id  TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// onomazooprama / tictactoe / crossword είναι mini-games που ζουν κάτω από
// το gamehub — εμφανίζονται φωλιασμένα στο dashboard αντί για ξεχωριστές
// γραμμές στο top level.
await sql`
  INSERT INTO project_groups (child_id, parent_id) VALUES
    ('prj_KfaSo73u9D4BFPhwZR55lJwIV272', 'prj_mAhPlaeEZV1k0c6vz3kk1sde2Rj6'),
    ('prj_tkJb0Zmovv3XF0cbDODNfXOKydiD', 'prj_mAhPlaeEZV1k0c6vz3kk1sde2Rj6'),
    ('prj_0lC0KvUF1QO5gcreGsJzCo447iCN', 'prj_mAhPlaeEZV1k0c6vz3kk1sde2Rj6')
  ON CONFLICT (child_id) DO NOTHING
`;

// anyweather-crm / anyweather-home / yachtshelter ζουν κάτω από το anyweather.
await sql`
  INSERT INTO project_groups (child_id, parent_id) VALUES
    ('seed_anyweather_crm', 'seed_anyweather'),
    ('seed_anyweather_home', 'seed_anyweather'),
    ('seed_yachtshelter', 'seed_anyweather')
  ON CONFLICT (child_id) DO NOTHING
`;

// Όλα τα υπόλοιπα (εκτός anyweather, που έχει ήδη τη δική του ομάδα) είναι
// προσωπικά projects — μαζεύονται κάτω από ένα ψευδο-project χωρίς δική του
// γραμμή στο manual_projects/Vercel (βλ. VIRTUAL_GROUPS στο projects-table.tsx).
await sql`
  INSERT INTO project_groups (child_id, parent_id) VALUES
    ('prj_ygAw0ewKBFL9naAQBdHZmoOwVJXi', 'virtual_personal'),
    ('prj_mAhPlaeEZV1k0c6vz3kk1sde2Rj6', 'virtual_personal'),
    ('prj_dfAhv4UlBwFjFmObsV3OxGxgnLH1', 'virtual_personal'),
    ('prj_QI3invNex4N2P88lar8BVTerCJIM', 'virtual_personal'),
    ('prj_a13PshSU7sX9MqlNm4U8iy0qMxcQ', 'virtual_personal'),
    ('prj_r2uzDsDxYHtSS3cWVwsRG38nXO0K', 'virtual_personal'),
    ('prj_VGv4ATAV5hp0jFOBA2XzmHXdQ0bZ', 'virtual_personal')
  ON CONFLICT (child_id) DO NOTHING
`;

const [{ count: reminderCount }] = await sql`SELECT count(*)::int AS count FROM project_reminders`;
const [{ count: manualCount }] = await sql`SELECT count(*)::int AS count FROM manual_projects`;
const [{ count: groupCount }] = await sql`SELECT count(*)::int AS count FROM project_groups`;
console.log(`✓ schema έτοιμο — ${reminderCount} reminders, ${manualCount} manual projects, ${groupCount} groups`);
