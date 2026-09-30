// Υπογεγραμμένα cookies (HMAC-SHA256) — χωρίς πίνακα sessions, αφού υπάρχει
// ένας μόνο χρήστης. Web Crypto ώστε να τρέχει ίδιο και στο proxy.ts.
// ponytail: logout δεν ακυρώνει ήδη εκδομένα cookies — αλλαγή SESSION_SECRET
// τα ακυρώνει όλα. Πίνακας sessions αν χρειαστεί ανάκληση ανά συσκευή.

export const SESSION_COOKIE = "sm_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is not set (min 32 chars)");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** `<payload>.<υπογραφή>` — το payload μπορεί να είναι οτιδήποτε χωρίς τελεία. */
export async function sign(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/** Επιστρέφει το payload αν η υπογραφή είναι έγκυρη, αλλιώς null. */
export async function unsign(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "base64url");
  const ok = await crypto.subtle.verify("HMAC", await key(), sig, enc.encode(payload));
  return ok ? payload : null;
}

/** Session token = υπογεγραμμένη ώρα λήξης (ms). */
export async function createSessionToken(): Promise<string> {
  return sign(String(Date.now() + SESSION_DAYS * 86_400_000));
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const exp = Number(await unsign(token));
  return Number.isFinite(exp) && exp > Date.now();
}
