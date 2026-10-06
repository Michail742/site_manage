import { getSql } from "@/lib/db";

// Projects που έχουν συμφωνία με πελάτη — ανεξάρτητα από το αν υπάρχει υπενθύμιση ανανέωσης.
export async function getDealIds(): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`SELECT project_id FROM project_deals`) as { project_id: string }[];
  return rows.map((r) => r.project_id);
}

export async function setProjectDeal(projectId: string) {
  const sql = getSql();
  await sql`INSERT INTO project_deals (project_id) VALUES (${projectId}) ON CONFLICT DO NOTHING`;
}
