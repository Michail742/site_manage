import { getSql } from "@/lib/db";

// Χειροκίνητες πινακίδες framework/database — καμία API δεν τα αναφέρει και
// τα δύο μαζί για όλες τις πηγές (Vercel/Cloudflare/manual), οπότε τα κρατάμε
// εδώ, keyed by DisplayProject.id.
export interface ProjectMeta {
  database: string | null;
  framework: string | null;
}

interface Row {
  id: string;
  database: string | null;
  framework: string | null;
}

export async function getProjectMeta(): Promise<Record<string, ProjectMeta>> {
  const sql = getSql();
  const rows = (await sql`SELECT id, database, framework FROM project_meta`) as Row[];
  const out: Record<string, ProjectMeta> = {};
  for (const r of rows) {
    out[r.id] = { database: r.database, framework: r.framework };
  }
  return out;
}

export interface ProjectMetaInput {
  id: string;
  database: string | null;
  framework: string | null;
}

export async function setProjectMeta(input: ProjectMetaInput) {
  const sql = getSql();
  await sql`
    INSERT INTO project_meta (id, database, framework)
    VALUES (${input.id}, ${input.database}, ${input.framework})
    ON CONFLICT (id) DO UPDATE SET
      database = EXCLUDED.database,
      framework = EXCLUDED.framework,
      updated_at = now()
  `;
}
