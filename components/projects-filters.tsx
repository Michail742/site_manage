"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { type DeploymentState } from "@/lib/vercel";

export type StatusFilter = DeploymentState | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Όλα τα status" },
  { value: "READY", label: "Ready" },
  { value: "BUILDING", label: "Building" },
  { value: "QUEUED", label: "Queued" },
  { value: "ERROR", label: "Error" },
  { value: "CANCELED", label: "Canceled" },
];

export interface FiltersState {
  search: string;
  status: StatusFilter;
  framework: string;
  onlineOnly: boolean;
}

export const emptyFilters: FiltersState = {
  search: "",
  status: "all",
  framework: "all",
  onlineOnly: false,
};

export function isFiltersActive(f: FiltersState) {
  return (
    f.search.trim() !== "" ||
    f.status !== "all" ||
    f.framework !== "all" ||
    f.onlineOnly
  );
}

interface ProjectsFiltersProps {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  frameworks: string[];
}

export function ProjectsFilters({ value, onChange, frameworks }: ProjectsFiltersProps) {
  function set<K extends keyof FiltersState>(key: K, v: FiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  const active = isFiltersActive(value);

  // Το `items` δίνει στο <SelectValue /> το label του επιλεγμένου item —
  // χωρίς αυτό ο trigger δείχνει το raw value (π.χ. "all").
  const frameworkOptions = [
    { value: "all", label: "Όλα τα frameworks" },
    ...frameworks.map((fw) => ({ value: fw, label: fw })),
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Αναζήτηση project…"
          className="pl-8"
          aria-label="Αναζήτηση project"
        />
      </div>

      <Select
        items={STATUS_OPTIONS}
        value={value.status}
        onValueChange={(v) => set("status", (v ?? "all") as StatusFilter)}
      >
        <SelectTrigger className="h-9 w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(({ value: v, label }) => (
            <SelectItem key={v} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={frameworkOptions}
        value={value.framework}
        onValueChange={(v) => set("framework", v ?? "all")}
      >
        <SelectTrigger className="h-9 w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {frameworkOptions.map(({ value: v, label }) => (
            <SelectItem key={v} value={v} className={v === "all" ? "" : "capitalize"}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={value.onlineOnly ? "default" : "outline"}
        size="sm"
        className="h-9"
        aria-pressed={value.onlineOnly}
        onClick={() => set("onlineOnly", !value.onlineOnly)}
      >
        <span
          className={`mr-2 inline-block h-2 w-2 rounded-full ${
            value.onlineOnly ? "bg-current" : "bg-green-500"
          }`}
        />
        Online only
      </Button>

      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() => onChange(emptyFilters)}
        >
          <X className="h-4 w-4 mr-1" />
          Καθαρισμός
        </Button>
      )}
    </div>
  );
}
