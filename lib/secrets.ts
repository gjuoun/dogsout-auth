// The secrets table is the read allowlist: a key with no row is never resolved.
// A row holds a literal value or an op:// reference, never both.

import { getDb } from "@/lib/db";
import { resolveOpRef, type OpResolver } from "@/lib/op-resolver";

export type SecretRow = { key: string; value: string | null; ref: string | null };

export function findSecret(key: string): SecretRow | null {
  const row = getDb().prepare("SELECT key, value, ref FROM secrets WHERE key = ?").get(key) as SecretRow | undefined;
  return row ?? null;
}

export function putSecret(key: string, opts: { value?: string; ref?: string }) {
  if (Boolean(opts.value) === Boolean(opts.ref)) throw new Error("exactly one of value or ref");
  getDb()
    .prepare("INSERT INTO secrets (key, value, ref, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, ref = excluded.ref")
    .run(key, opts.value ?? null, opts.ref ?? null, Date.now());
}

/** Returns the secret value, or null when the key is not in the allowlist. */
export async function readSecret(key: string, resolve: OpResolver = resolveOpRef): Promise<string | null> {
  const row = findSecret(key);
  if (!row) return null;
  if (row.value !== null) return row.value;
  if (row.ref) return resolve(row.ref);
  return null;
}
