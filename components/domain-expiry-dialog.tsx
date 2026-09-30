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
import { type DomainExpiry } from "@/lib/domains";
import { saveDomainExpiry } from "@/app/actions";

interface DomainExpiryDialogProps {
  domain: string;
  expiry: DomainExpiry | null;
  onChanged: () => void;
}

export function DomainExpiryDialog({ domain, expiry, onChanged }: DomainExpiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(expiry?.expiresOn ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(expiry?.expiresOn ?? "");
      setError(null);
    }
    setOpen(next);
  }

  function save(value: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await saveDomainExpiry(domain, value);
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
            aria-label={`Επεξεργασία λήξης domain ${domain}`}
          />
        }
      >
        <Pencil className="h-3 w-3" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Λήξη domain
            <span className="text-muted-foreground font-normal">{domain}</span>
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(date || null);
          }}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="expiresOn">Ημερομηνία λήξης</Label>
            <Input
              id="expiresOn"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {expiry?.source === "rdap"
                ? "Τώρα έρχεται αυτόματα από το RDAP του registry. Μια τιμή εδώ θα το αντικαταστήσει."
                : "Για domains χωρίς δημόσιο RDAP (π.χ. .gr) — δες τη λήξη στον registrar σου."}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between gap-2 pt-2">
            {expiry?.source === "manual" ? (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => save(null)}>
                Αφαίρεση
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Άκυρο
              </Button>
              <Button type="submit" disabled={pending || !date}>
                {pending ? "Αποθήκευση…" : "Αποθήκευση"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
