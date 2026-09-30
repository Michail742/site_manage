"use server";

import { updateTag } from "next/cache";
import { requireSession } from "@/app/auth-actions";
import { setProjectPaused } from "@/lib/vercel";
import {
  upsertReminder,
  deleteReminder,
  markNotifiedAndRenew,
  type ReminderInput,
} from "@/lib/reminders";
import {
  addManualProject as addManualProjectDb,
  setManualProjectEnabled as setManualProjectEnabledDb,
  type ManualProjectInput,
} from "@/lib/manual-projects";
import {
  setProjectMeta as setProjectMetaDb,
  type ProjectMetaInput,
} from "@/lib/project-meta";
import { setDomainExpiry } from "@/lib/domains";

export async function setProjectEnabled(projectId: string, enabled: boolean) {
  await requireSession();
  await setProjectPaused(projectId, !enabled);
  updateTag("projects");
}

export async function addManualProject(input: ManualProjectInput) {
  await requireSession();
  if (!input.name.trim()) throw new Error("Λείπει το όνομα του project");
  await addManualProjectDb(input);
}

export async function setManualProjectEnabled(projectId: string, enabled: boolean) {
  await requireSession();
  await setManualProjectEnabledDb(projectId, enabled);
}

export async function scanProjects() {
  await requireSession();
  updateTag("projects");
}

export async function saveProjectMeta(input: ProjectMetaInput) {
  await requireSession();
  await setProjectMetaDb(input);
}

export async function saveDomainExpiry(domain: string, expiresOn: string | null) {
  await requireSession();
  if (!domain) throw new Error("Λείπει το domain");
  if (expiresOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
    throw new Error("Μη έγκυρη ημερομηνία λήξης");
  }
  await setDomainExpiry(domain, expiresOn);
}

export async function saveReminder(input: ReminderInput) {
  await requireSession();
  if (!input.projectId) throw new Error("Λείπει το project id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.renewalDate)) {
    throw new Error("Μη έγκυρη ημερομηνία ανανέωσης");
  }
  await upsertReminder(input);
}

export async function removeReminder(projectId: string) {
  await requireSession();
  await deleteReminder(projectId);
}

/** Μετά την αποστολή του email: καταγραφή + μετάθεση ένα έτος μπροστά. */
export async function confirmReminderSent(projectId: string) {
  await requireSession();
  await markNotifiedAndRenew(projectId);
}
