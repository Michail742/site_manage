"use client";

import { useState, useTransition } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Fingerprint, LogOut } from "lucide-react";
import { logout, passkeyRegister, passkeyRegisterOptions } from "@/app/auth-actions";
import { rememberPasskey } from "@/lib/utils";

// Ετικέτα για να ξεχωρίζουν τα passkeys στη βάση (π.χ. "Windows", "iPhone").
function deviceLabel() {
  const ua = navigator.userAgent;
  return /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Συσκευή";
}

export function AccountActions() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  function handleAddPasskey() {
    setMessage(null);
    startTransition(async () => {
      try {
        const optionsJSON = await passkeyRegisterOptions();
        const response = await startRegistration({ optionsJSON });
        const err = await passkeyRegister(response, deviceLabel());
        if (!err) rememberPasskey(response.id);
        setMessage(err ? { text: err, error: true } : { text: "Έτοιμο — την επόμενη φορά μπαίνεις με το αποτύπωμα", error: false });
      } catch (e) {
        if (e instanceof Error && e.name === "InvalidStateError") {
          setMessage({ text: "Αυτή η συσκευή έχει ήδη passkey", error: false });
        } else if (e instanceof Error && e.name !== "NotAllowedError") {
          setMessage({ text: e.message, error: true });
        }
      }
    });
  }

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
      {message && (
        <span
          className={`order-last basis-full text-right text-xs ${message.error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddPasskey}
        disabled={pending}
        aria-label="Ενεργοποίηση αποτυπώματος"
      >
        <Fingerprint className="h-4 w-4 mr-2" />
        {pending ? "Αναμονή…" : (
          <>
            <span className="sm:hidden">Αποτύπωμα</span>
            <span className="hidden sm:inline">Ενεργοποίηση αποτυπώματος</span>
          </>
        )}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => logout()} aria-label="Έξοδος">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
