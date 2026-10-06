"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReminderDialog } from "@/components/reminder-dialog";
import { type DisplayProject } from "@/lib/types";
import { markProjectDeal, markProjectPersonal } from "@/app/actions";

interface NewProjectPromptProps {
  /** Το project που δεν έχει ταξινομηθεί ακόμα (ή null αν δεν υπάρχει). */
  project: DisplayProject | null;
  /** Καλείται για να μη ξαναρωτήσει στην ίδια συνεδρία (Αργότερα / ακύρωση). */
  onSkip: (id: string) => void;
  onChanged: () => void;
}

export function NewProjectPrompt({ project, onSkip, onChanged }: NewProjectPromptProps) {
  const [dealOpen, setDealOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!project) return null;

  function handlePersonal() {
    if (!project) return;
    const id = project.id;
    setError(null);
    startTransition(async () => {
      try {
        await markProjectPersonal(id);
        onSkip(id);
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
      }
    });
  }

  // Η συμφωνία αποθηκεύεται αμέσως· η υπενθύμιση ανανέωσης (ReminderDialog)
  // είναι προαιρετική, οπότε η ακύρωσή της δεν ξαναφέρνει την ερώτηση.
  function handleDeal() {
    if (!project) return;
    const id = project.id;
    setError(null);
    startTransition(async () => {
      try {
        await markProjectDeal(id);
        setDealOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
      }
    });
  }

  if (dealOpen) {
    return (
      <ReminderDialog
        key={project.id}
        project={project}
        reminder={null}
        hideTrigger
        open
        onOpenChange={(next) => {
          if (next) return;
          setDealOpen(false);
          onSkip(project.id);
          onChanged();
        }}
        onChanged={onChanged}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onSkip(project.id)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Νέο project: {project.name}</DialogTitle>
          <DialogDescription>
            Το project είναι προσωπικό ή έχει κλείσει συμφωνία με πελάτη;
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" disabled={pending} onClick={() => onSkip(project.id)}>
            Αργότερα
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={handlePersonal}>
              Προσωπικό
            </Button>
            <Button disabled={pending} onClick={handleDeal}>
              Έχει συμφωνία
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
