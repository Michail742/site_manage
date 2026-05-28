const VERCEL_API = "https://api.vercel.com";

export type DeploymentState =
  | "QUEUED"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED";

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  updatedAt: number;
  latestDeployments: {
    uid: string;
    url: string;
    readyState: DeploymentState;
    createdAt: number;
  }[];
}

interface ProjectsResponse {
  projects: VercelProject[];
  pagination: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export async function getProjects(): Promise<VercelProject[]> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN is not set");

  const all: VercelProject[] = [];
  let until: number | null = null;

  do {
    const url = new URL(`${VERCEL_API}/v9/projects`);
    url.searchParams.set("limit", "100");
    if (until) url.searchParams.set("until", String(until));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Vercel API error ${res.status}: ${body}`);
    }

    const data: ProjectsResponse = await res.json();
    all.push(...data.projects);
    until = data.pagination.next;
  } while (until);

  return all;
}
