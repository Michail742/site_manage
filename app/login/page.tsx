"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Layers } from "lucide-react";
import { loginWithPassword, passkeyLogin, passkeyLoginOptions } from "@/app/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const [pwError, pwAction, pwPending] = useActionState(loginWithPassword, null);
  const [pkError, setPkError] = useState<string | null>(null);
  const [pkPending, startPk] = useTransition();

  function handlePasskey() {
    setPkError(null);
    startPk(async () => {
      try {
        const optionsJSON = await passkeyLoginOptions();
        const response = await startAuthentication({ optionsJSON });
        const err = await passkeyLogin(response);
        if (err) return setPkError(err);
        router.replace("/");
      } catch (e) {
        // Ακύρωση από τον χρήστη (NotAllowedError) δεν είναι λάθος να δείξουμε.
        if (e instanceof Error && e.name !== "NotAllowedError") setPkError(e.message);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto p-2 rounded-lg bg-primary/10 w-fit">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="pt-2">Admin Dashboard</CardTitle>
          <CardDescription>Σύνδεση για να συνεχίσεις</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Button className="w-full" onClick={handlePasskey} disabled={pkPending}>
              <Fingerprint className="w-4 h-4 mr-2" />
              {pkPending ? "Αναμονή για επιβεβαίωση…" : "Σύνδεση με βιομετρικά"}
            </Button>
            {pkError && <p className="text-sm text-destructive">{pkError}</p>}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />ή<div className="h-px flex-1 bg-border" />
          </div>

          <form action={pwAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Κωδικός</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={pwPending}>
              {pwPending ? "Σύνδεση…" : "Σύνδεση με κωδικό"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
