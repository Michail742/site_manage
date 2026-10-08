import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

// Το στατικό /courier/index.html (Courier Dashboard) δεν μπορεί να καλέσει server action.
// Όταν η καρτέλα δεν είναι ξεκλείδωτη, ή πατηθεί «Έξοδος», σβήνει εδώ το cookie και πάει στο
// /login — ίδια συμπεριφορά με το TabLock και το logout() του app/auth-actions.ts.
export async function GET(request: NextRequest) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url));
}
