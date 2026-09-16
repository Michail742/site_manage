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

// anyweather / anyweather-crm / anyweather-home / yachtshelter ζούσαν εδώ ως
// χειροκίνητα placeholder entries πριν υπάρχει live Cloudflare Pages
// integration (lib/cloudflare.ts) — τώρα έρχονται ζωντανά από το API με το
// ίδιο "name", οπότε το dedup στο projects-view.tsx τα κρύβει μόνο του. Δεν
// τα ξαναγράφουμε εδώ πια.

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

// anyweather-crm / anyweather-home / yachtshelter ζουν κάτω από το anyweather,
// με τα πραγματικά Cloudflare Pages ids (account 7706c7299416c91e5777a6c53c873000).
await sql`
  INSERT INTO project_groups (child_id, parent_id) VALUES
    ('cf_7706c7299416c91e5777a6c53c873000_f9095fd8-b21e-4eea-ba5c-77457ac3b947', 'cf_7706c7299416c91e5777a6c53c873000_3e88cdcf-0da7-460e-a1e0-a248b05a0652'),
    ('cf_7706c7299416c91e5777a6c53c873000_6ed0b0a6-4da1-4cf3-be16-03edd21cad2f', 'cf_7706c7299416c91e5777a6c53c873000_3e88cdcf-0da7-460e-a1e0-a248b05a0652'),
    ('cf_7706c7299416c91e5777a6c53c873000_eb518b2a-6e4b-416f-9b00-2c112a7ca1fe', 'cf_7706c7299416c91e5777a6c53c873000_3e88cdcf-0da7-460e-a1e0-a248b05a0652')
  ON CONFLICT (child_id) DO UPDATE SET parent_id = EXCLUDED.parent_id
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

// Χειροκίνητες πινακίδες framework/database ανά project — καμία API (Vercel ή
// Cloudflare) δεν αναφέρει ποια βάση δεδομένων χρησιμοποιεί ένα project, και
// το Cloudflare Pages δεν αναφέρει ούτε το framework. `id` = ίδιο id με το
// Vercel project, ή `cf_<accountId>_<pagesProjectId>` για Cloudflare, ή το
// manual project id.
await sql`
  CREATE TABLE IF NOT EXISTS project_meta (
    id          TEXT PRIMARY KEY,
    database    TEXT,
    framework   TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

// Ό,τι ξέρουμε ήδη με σιγουριά· τα υπόλοιπα τα συμπληρώνει ο χρήστης από το UI.
// (Η βάση του anyweather-crm δεν χρειάζεται εδώ πια — το lib/cloudflare.ts
// την ανιχνεύει μόνο του από το D1 binding του project.)
await sql`
  INSERT INTO project_meta (id, framework)
  VALUES ('cf_7706c7299416c91e5777a6c53c873000_f9095fd8-b21e-4eea-ba5c-77457ac3b947', 'vanilla (single HTML file)')
  ON CONFLICT (id) DO UPDATE SET framework = EXCLUDED.framework
`;

const [{ count: reminderCount }] = await sql`SELECT count(*)::int AS count FROM project_reminders`;
const [{ count: manualCount }] = await sql`SELECT count(*)::int AS count FROM manual_projects`;
const [{ count: groupCount }] = await sql`SELECT count(*)::int AS count FROM project_groups`;
const [{ count: metaCount }] = await sql`SELECT count(*)::int AS count FROM project_meta`;
console.log(
  `✓ schema έτοιμο — ${reminderCount} reminders, ${manualCount} manual projects, ${groupCount} groups, ${metaCount} meta`
);
