"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { type ManualProject } from "@/lib/types";
import { type DeploymentState } from "@/lib/vercel";

const FRAMEWORKS = ["nextjs", "react", "vue", "nuxt", "astro", "svelte", "remix", "other"];
const STATUSES: { value: DeploymentState; label: string }[] = [
  { value: "READY", label: "Ready" },
  { value: "BUILDING", label: "Building" },
  { value: "ERROR", label: "Error" },
];

interface FormState {
  name: string;
  url: string;
  framework: string;
  status: DeploymentState;
}

const empty: FormState = { name: "", url: "", framework: "", status: "READY" };

interface AddProjectDialogProps {
  onAdd: (project: ManualProject) => void;
}

export function AddProjectDialog({ onAdd }: AddProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    onAdd({
      id: `manual_${Date.now()}`,
      name: form.name.trim(),
      url: form.url.trim(),
      framework: form.framework,
      status: form.status,
      createdAt: Date.now(),
    });

    setForm(empty);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="w-4 h-4" />
        Add Project
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Προσθήκη Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Όνομα *</Label>
            <Input
              id="name"
              placeholder="my-project"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://myproject.com"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Framework</Label>
              <Select
                value={form.framework}
                onValueChange={(v) => set("framework", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επέλεξε…" />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw} value={fw} className="capitalize">
                      {fw}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", (v ?? "READY") as DeploymentState)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Άκυρο
            </Button>
            <Button type="submit">Προσθήκη</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
