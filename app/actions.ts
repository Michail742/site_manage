"use server";

import { updateTag } from "next/cache";
import { setProjectPaused } from "@/lib/vercel";

export async function setProjectEnabled(projectId: string, enabled: boolean) {
  await setProjectPaused(projectId, !enabled);
  updateTag("projects");
}

export async function scanProjects() {
  updateTag("projects");
}
