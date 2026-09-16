import { getSql } from "@/lib/db";

interface Row {
  child_id: string;
  parent_id: string;
}

/** child project id -> parent project id */
export async function getProjectGroups(): Promise<Record<string, string>> {
  const sql = getSql();
  const rows = (await sql`SELECT child_id, parent_id FROM project_groups`) as Row[];
  return Object.fromEntries(rows.map((r) => [r.child_id, r.parent_id]));
}
