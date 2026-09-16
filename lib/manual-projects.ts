import { getSql } from "@/lib/db";
import { type ManualProject } from "@/lib/types";
import { type DeploymentState } from "@/lib/vercel";

interface Row {
  id: string;
  name: string;
  url: string;
  framework: string;
  status: DeploymentState;
  enabled: boolean;
  created_at: string;
}

function toManualProject(row: Row): ManualProject {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    framework: row.framework,
    status: row.status,
    enabled: row.enabled,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function getManualProjects(): Promise<ManualProject[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, url, framework, status, enabled, created_at
    FROM manual_projects
    ORDER BY created_at ASC
  `) as Row[];

  return rows.map(toManualProject);
}

export interface ManualProjectInput {
  id: string;
  name: string;
  url: string;
  framework: string;
  status: DeploymentState;
}

export async function addManualProject(input: ManualProjectInput) {
  const sql = getSql();
  await sql`
    INSERT INTO manual_projects (id, name, url, framework, status)
    VALUES (${input.id}, ${input.name}, ${input.url}, ${input.framework}, ${input.status})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function setManualProjectEnabled(id: string, enabled: boolean) {
  const sql = getSql();
  await sql`UPDATE manual_projects SET enabled = ${enabled} WHERE id = ${id}`;
}
