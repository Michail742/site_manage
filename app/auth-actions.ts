"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getSql } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  createSessionToken,
  isValidSession,
  sign,
  unsign,
} from "@/lib/session";

const CHALLENGE_COOKIE = "sm_challenge";
const RP_NAME = "Site Manage";
// Ένας μόνο χρήστης — σταθερό user handle για όλα τα passkeys.
const USER_ID = new TextEncoder().encode("site-manage-admin");

const secureCookie = process.env.NODE_ENV === "production";

/** Για κάθε server action που αλλάζει/διαβάζει δεδομένα — το proxy.ts από
 * μόνο του δεν αρκεί (βλ. Next docs, "data-security"). */
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(token))) throw new Error("Μη εξουσιοδοτημένο");
}

async function startSession() {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

// Το RP ID είναι το hostname του site: localhost τοπικά, sitemanage.vercel.app
// στο production. Ένα passkey δουλεύει μόνο στο host όπου γράφτηκε.
async function relyingParty() {
  const h = await headers();
  const host = h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}

async function saveChallenge(challenge: string) {
  (await cookies()).set(CHALLENGE_COOKIE, await sign(`${challenge}:${Date.now() + 5 * 60_000}`), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
}

/** Μίας χρήσης: διαβάζεται και σβήνεται. */
async function takeChallenge(): Promise<string> {
  const jar = await cookies();
  const payload = await unsign(jar.get(CHALLENGE_COOKIE)?.value);
  jar.delete(CHALLENGE_COOKIE);
  const [challenge, exp] = payload?.split(":") ?? [];
  if (!challenge || Number(exp) < Date.now()) throw new Error("Έληξε το αίτημα — δοκίμασε ξανά");
  return challenge;
}

// ── Κωδικός ──────────────────────────────────────────────────────────────

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function loginWithPassword(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "Δεν έχει οριστεί ADMIN_PASSWORD στον server";
  const given = String(formData.get("password") ?? "");
  if (!timingSafeEqual(digest(given), digest(expected))) {
    // ponytail: σταθερή καθυστέρηση αντί για rate limiter — αρκεί με μακρύ
    // τυχαίο κωδικό. Πραγματικό rate limit (π.χ. Upstash) αν γίνει στόχος.
    await new Promise((r) => setTimeout(r, 1000));
    return "Λάθος κωδικός";
  }
  await startSession();
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ── Passkeys (βιομετρικά) ────────────────────────────────────────────────

interface PasskeyRow {
  id: string;
  public_key: string;
  counter: string;
  transports: string[] | null;
}

export async function passkeyLoginOptions() {
  const { rpID } = await relyingParty();
  // Χωρίς allowCredentials: η συσκευή προτείνει μόνη της το αποθηκευμένο passkey.
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  await saveChallenge(options.challenge);
  return options;
}

export async function passkeyLogin(response: AuthenticationResponseJSON): Promise<string | null> {
  const expectedChallenge = await takeChallenge();
  const { rpID, origin } = await relyingParty();
  const sql = getSql();
  const [row] = (await sql`
    SELECT id, public_key, counter, transports FROM passkeys WHERE id = ${response.id}
  `) as PasskeyRow[];
  if (!row) return "Άγνωστο passkey — μπες με κωδικό και πρόσθεσέ το ξανά";

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: row.id,
      publicKey: new Uint8Array(Buffer.from(row.public_key, "base64url")),
      counter: Number(row.counter),
      transports: row.transports ?? undefined,
    },
  });
  if (!verified) return "Η επαλήθευση απέτυχε";

  await sql`
    UPDATE passkeys SET counter = ${authenticationInfo.newCounter}, last_used_at = now()
    WHERE id = ${row.id}
  `;
  await startSession();
  return null;
}

export async function passkeyRegisterOptions() {
  await requireSession();
  const { rpID } = await relyingParty();
  const existing = (await getSql()`SELECT id, transports FROM passkeys`) as PasskeyRow[];
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: "admin",
    userDisplayName: "Site Manage admin",
    userID: USER_ID,
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports ?? undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await saveChallenge(options.challenge);
  return options;
}

export async function passkeyRegister(
  response: RegistrationResponseJSON,
  label: string
): Promise<string | null> {
  await requireSession();
  const expectedChallenge = await takeChallenge();
  const { rpID, origin } = await relyingParty();
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (!verified) return "Η εγγραφή απέτυχε";

  const { credential } = registrationInfo;
  await getSql()`
    INSERT INTO passkeys (id, public_key, counter, transports, label)
    VALUES (
      ${credential.id},
      ${Buffer.from(credential.publicKey).toString("base64url")},
      ${credential.counter},
      ${credential.transports ?? null},
      ${label.slice(0, 100) || null}
    )
  `;
  return null;
}
