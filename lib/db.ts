import { neon } from "@neondatabase/serverless";

function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

// Lazy init: το top-level module code αποτιμάται και στο build, όπου το
// DATABASE_URL μπορεί να μην υπάρχει ακόμα — ένα neon() στη ρίζα θα έριχνε
// το `next build`.
let sql: ReturnType<typeof createSql> | null = null;

export function getSql() {
  sql ??= createSql();
  return sql;
}
