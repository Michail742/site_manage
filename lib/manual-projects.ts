"use client";

import { useSyncExternalStore } from "react";
import { type ManualProject } from "@/lib/types";
import { SEED_MANUAL_PROJECTS } from "@/lib/seed-projects";

const LS_KEY = "site_manage_manual_projects";

// Σταθερή αναφορά για το server snapshot — αν επιστρέφαμε νέο [] κάθε φορά,
// το useSyncExternalStore θα έμπαινε σε ατέρμονο render loop.
const EMPTY: ManualProject[] = [];

const listeners = new Set<() => void>();
let cache: ManualProject[] | null = null;

function read(): ManualProject[] {
  let stored: ManualProject[] = [];
  try {
    stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    stored = [];
  }

  // Τα seeds μπαίνουν μόνο αν λείπουν — ό,τι είναι ήδη αποθηκευμένο
  // (π.χ. αλλαγμένο on/off) κερδίζει.
  const storedIds = new Set(stored.map((p) => p.id));
  const missing = SEED_MANUAL_PROJECTS.filter((p) => !storedIds.has(p.id));

  return missing.length > 0 ? [...stored, ...missing] : stored;
}

function emit() {
  for (const listener of listeners) listener();
}

function handleStorage(e: StorageEvent) {
  // e.key === null σημαίνει localStorage.clear()
  if (e.key !== null && e.key !== LS_KEY) return;
  cache = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

// Το snapshot πρέπει να είναι referentially stable ανάμεσα σε renders,
// αλλιώς το React θεωρεί ότι ο store άλλαξε σε κάθε render.
function getSnapshot(): ManualProject[] {
  cache ??= read();
  return cache;
}

function getServerSnapshot(): ManualProject[] {
  return EMPTY;
}

export function saveManualProjects(next: ManualProject[]) {
  cache = next;
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  emit();
}

export function useManualProjects(): ManualProject[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
