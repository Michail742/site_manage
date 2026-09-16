"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { type DisplayProject } from "@/lib/types";
import { saveProjectMeta } from "@/app/actions";

interface ProjectMetaDialogProps {
  project: DisplayProject;
  onChanged: () => void;
}

export function ProjectMetaDialog({ project, onChanged }: ProjectMetaDialogProps) {
  const [open, setOpen] = useState(false);
  const [framework, setFramework] = useState(project.framework ?? "");
  const [database, setDatabase] = useState(project.database ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setFramework(project.framework ?? "");
      setDatabase(project.database ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveProjectMeta({
          id: project.id,
          framework: framework.trim() || null,
          database: database.trim() || null,
        });
        onChanged();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            aria-label={`Επεξεργασία framework/database για ${project.name}`}
          />
        }
      >
        <Pencil className="h-3 w-3" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Framework &amp; Database
            <span className="text-muted-foreground font-normal">{project.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="framework">Framework</Label>
            <Input
              id="framework"
              placeholder="π.χ. Next.js, vanilla, React"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              placeholder="π.χ. Neon Postgres, Cloudflare D1, —"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Άκυρο
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Αποθήκευση…" : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
