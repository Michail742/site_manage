"use client";

import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Layers } from "lucide-react";
import { loginWithPassword, passkeyLogin, passkeyLoginOptions } from "@/app/auth-actions";
import { markTabUnlocked, rememberPasskey, rememberedPasskey } from "@/lib/utils";

const noSubscribe = () => () => {};

export default function LoginPage() {
  const router = useRouter();
  const [pwError, pwAction, pwPending] = useActionState(loginWithPassword, null);
  const [pkError, setPkError] = useState<string | null>(null);
  const [pkPending, startPk] = useTransition();
  // null στο server render (δεν υπάρχει localStorage), η τιμή μετά το hydration.
  const deviceKey = useSyncExternalStore(noSubscribe, rememberedPasskey, () => null);

  function handlePasskey() {
    setPkError(null);
    startPk(async () => {
      try {
        const optionsJSON = await passkeyLoginOptions(deviceKey ?? undefined);
        const response = await startAuthentication({ optionsJSON });
        const err = await passkeyLogin(response);
        if (err) return setPkError(err);
        rememberPasskey(response.id);
        markTabUnlocked();
        router.replace("/");
      } catch (e) {
        // Ακύρωση από τον χρήστη (NotAllowedError) δεν είναι λάθος να δείξουμε.
        if (e instanceof Error && e.name !== "NotAllowedError") setPkError(e.message);
      }
    });
  }

  const passwordForm = (
    <form action={pwAction} onSubmit={markTabUnlocked} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="password">Κωδικός</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {pwError && <p className="text-sm text-destructive">{pwError}</p>}
      <Button type="submit" variant={deviceKey ? "outline" : "default"} className="w-full" disabled={pwPending}>
        {pwPending ? "Σύνδεση…" : "Σύνδεση με κωδικό"}
      </Button>
    </form>
  );

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
          {deviceKey ? (
            <>
              <div className="space-y-2">
                <Button className="w-full h-12" onClick={handlePasskey} disabled={pkPending}>
                  <Fingerprint className="w-5 h-5 mr-2" />
                  {pkPending ? "Ακούμπησε τον αισθητήρα…" : "Σύνδεση με αποτύπωμα"}
                </Button>
                {pkError && <p className="text-sm text-destructive">{pkError}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />ή<div className="h-px flex-1 bg-border" />
              </div>
              {passwordForm}
            </>
          ) : (
            <>
              {passwordForm}
              <p className="text-xs text-center text-muted-foreground">
                Μετά τη σύνδεση, πάτα το κουμπί με το αποτύπωμα πάνω δεξιά για να μπαίνεις
                από αυτή τη συσκευή χωρίς κωδικό.
              </p>
              <div className="space-y-2 text-center">
                <button
                  type="button"
                  onClick={handlePasskey}
                  disabled={pkPending}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Έχω ήδη ενεργοποιήσει αποτύπωμα
                </button>
                {pkError && <p className="text-sm text-destructive">{pkError}</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
