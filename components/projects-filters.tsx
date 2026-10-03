"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface FiltersState {
  search: string;
  onlineOnly: boolean;
}

export const emptyFilters: FiltersState = {
  search: "",
  onlineOnly: false,
};

export function isFiltersActive(f: FiltersState) {
  return f.search.trim() !== "" || f.onlineOnly;
}

interface ProjectsFiltersProps {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
}

export function ProjectsFilters({ value, onChange }: ProjectsFiltersProps) {
  function set<K extends keyof FiltersState>(key: K, v: FiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  const active = isFiltersActive(value);

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
