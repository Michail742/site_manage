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
import { Badge } from "@/components/ui/badge";
import { BellPlus, Mail, Trash2 } from "lucide-react";
import { type DisplayProject } from "@/lib/types";
import { type ReminderView, reminderStatus } from "@/lib/reminders";
import { saveReminder, removeReminder, confirmReminderSent } from "@/app/actions";

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toInputDate(d: Date) {
  // Τοπική ημερομηνία σε YYYY-MM-DD. Το toISOString() θα γύριζε UTC και
  // θα μετατόπιζε τη μέρα για χρήστες σε θετικό offset.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMailto(project: DisplayProject, form: FormState) {
  const amount = form.amount ? `${form.amount}€` : "το ετήσιο ποσό";
  const subject = `Ανανέωση συνδρομής — ${project.name}`;
  const body = [
    `Γεια σας${form.clientName ? ` ${form.clientName}` : ""},`,
    "",
    `Η ετήσια συνδρομή για το ${project.name} ανανεώνεται στις ${form.renewalDate}.`,
    `Το ποσό είναι ${amount}.`,
    "",
    "Ευχαριστώ πολύ,",
  ].join("\n");

  return `mailto:${encodeURIComponent(form.clientEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

interface FormState {
  clientName: string;
  clientEmail: string;
  amount: string;
  renewalDate: string;
  notes: string;
}

function initialForm(reminder: ReminderView | null): FormState {
  if (reminder) {
    return {
      clientName: reminder.clientName ?? "",
      clientEmail: reminder.clientEmail ?? "",
      amount: reminder.amount === null ? "" : String(reminder.amount),
      renewalDate: reminder.renewalDate,
      notes: reminder.notes ?? "",
    };
  }
  return {
    clientName: "",
    clientEmail: "",
    amount: "",
    // Προεπιλογή: ένας χρόνος από σήμερα, που είναι η συνηθισμένη περίπτωση.
    renewalDate: toInputDate(addYears(new Date(), 1)),
    notes: "",
  };
}

interface ReminderDialogProps {
  project: DisplayProject;
  reminder: ReminderView | null;
  onChanged: () => void;
}

export function ReminderDialog({ project, reminder, onChanged }: ReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => initialForm(reminder));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    // Ξαναχτίζουμε τη φόρμα σε κάθε άνοιγμα ώστε να μη μένουν
    // ημιτελείς αλλαγές από προηγούμενο ακυρωμένο edit.
    if (next) {
      setForm(initialForm(reminder));
      setError(null);
    }
    setOpen(next);
  }

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        onChanged();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = form.amount.trim();
    if (amount !== "" && Number.isNaN(Number(amount))) {
      setError("Το ποσό πρέπει να είναι αριθμός");
      return;
    }

    run(() =>
      saveReminder({
        projectId: project.id,
        clientName: form.clientName.trim() || null,
        clientEmail: form.clientEmail.trim() || null,
        amount: amount === "" ? null : Number(amount),
        renewalDate: form.renewalDate,
        notes: form.notes.trim() || null,
      })
    );
  }

  const status = reminder ? reminderStatus(reminder.daysUntil) : null;
  const canEmail = form.clientEmail.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-label={
              reminder
                ? `Επεξεργασία υπενθύμισης για ${project.name}`
                : `Ορισμός υπενθύμισης για ${project.name}`
            }
          />
        }
      >
        <BellPlus className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Υπενθύμιση ανανέωσης
            <span className="text-muted-foreground font-normal">{project.name}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="renewalDate">Ημερομηνία ανανέωσης *</Label>
            <Input
              id="renewalDate"
              type="date"
              value={form.renewalDate}
              onChange={(e) => set("renewalDate", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Πελάτης</Label>
              <Input
                id="clientName"
                placeholder="Όνομα"
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Ετήσιο ποσό (€)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="350"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">Email πελάτη</Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@example.com"
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Input
              id="notes"
              placeholder="π.χ. τιμολόγιο, τρόπος πληρωμής"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {reminder?.lastNotifiedAt && (
            <p className="text-xs text-muted-foreground">
              Τελευταία ειδοποίηση: {reminder.lastNotifiedAt.slice(0, 10)}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {reminder && status !== "ok" && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={status === "overdue" ? "destructive" : "secondary"}>
                  {status === "overdue" ? "Έληξε" : "Λήγει σύντομα"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Στείλε το email και μετά επιβεβαίωσε — η ημερομηνία πάει +1 έτος.
                </span>
              </div>
              <div className="flex gap-2">
                {canEmail ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    render={<a href={buildMailto(project, form)} />}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Άνοιγμα email
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Λείπει το email
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => confirmReminderSent(project.id))}
                >
                  Στάλθηκε
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {reminder ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() => run(() => removeReminder(project.id))}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Διαγραφή
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Άκυρο
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Αποθήκευση…" : "Αποθήκευση"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
