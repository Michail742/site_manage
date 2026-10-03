"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Receipt } from "lucide-react";
import { saveKeziahBalance } from "@/app/actions";
import { type KeziahCredit } from "@/lib/keziah-credit";

interface Props {
  credit: KeziahCredit | { error: string } | null;
}

export function KeziahCreditCard({ credit }: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ok = credit && !("error" in credit) ? credit : null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveKeziahBalance(Number(balance.replace(",", ".")));
        setBalance("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Keziah · υπόλοιπο Anthropic
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {ok?.scansLeft != null
                ? `Περίπου ${ok.scansLeft} τιμολόγια`
                : ok
                  ? "Θα φανεί μετά το πρώτο τιμολόγιο"
                  : "Δεν έχει δηλωθεί υπόλοιπο"}
            </p>
            {ok && (
              <p className="text-xs text-muted-foreground leading-snug">
                Υπόλοιπο ${ok.remainingUsd.toFixed(2)}
                {ok.avgScanUsd !== null && ` · μέσο κόστος $${ok.avgScanUsd.toFixed(3)} ανά τιμολόγιο`}
                {` · ξοδεύτηκαν $${ok.spentUsd.toFixed(2)} από ${new Date(ok.since).toLocaleDateString("el-GR")}`}
              </p>
            )}
            {credit && "error" in credit && (
              <p className="text-xs text-destructive">{credit.error}</p>
            )}
          </div>
          <div className="shrink-0 rounded-lg p-2 bg-amber-500/10">
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <Input
            inputMode="decimal"
            placeholder="Τρέχον υπόλοιπο ($) από console.anthropic.com"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" disabled={pending || !balance}>
            {pending ? "Αποθήκευση…" : "Δήλωση υπολοίπου"}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
