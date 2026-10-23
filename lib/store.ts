// Persistent store (SQLite via lib/db.ts). Keeps the Map/Set-ish surface the
// routes already use, so switching from the old in-memory demo was a drop-in.
// `traces` stays in memory on purpose: it is a capped teaching UI, not state.

import { getDb } from "@/lib/db";
import { argon2Verify } from "hash-wasm";

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  picture: string;
};
export type Client = {
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];   // EXACT match. No wildcards. Ever.
  scopes: string[];
};
export type AuthRequest = {
  id: string;
  client_id: string;
  redirect_uri: string;
  scope: string[];
  state: string;
  nonce?: string;
  code_challenge: string;
  code_challenge_method: string;
  createdAt: number;
};
export type AuthCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  user_id: string;
  scope: string[];
  nonce?: string;
  code_challenge: string;
  expiresAt: number;
  used: boolean;
};
export type RefreshToken = {
  token: string;
  family: string;      // rotation family — reuse of any old member kills the family
  client_id: string;
  user_id: string;
  scope: string[];
  revoked: boolean;
  expiresAt: number;
};
export type Grant = { user_id: string; client_id: string; scope: string[] };
export type Trace = {
  seq: number; at: number; channel: "front" | "back" | "internal";
  actor: string; method: string; path: string; note: string; detail?: Record<string, unknown>;
};

// ---------------------------------------------------------------- traces (memory)

const g = globalThis as unknown as {
  __oauthtrace?: { traces: Trace[]; seq: number };
};
const mem = g.__oauthtrace ?? (g.__oauthtrace = { traces: [], seq: 0 });

// ---------------------------------------------------------------- sql-backed containers

/** Map-shaped view over a (key TEXT PRIMARY KEY, json TEXT) table. */
class SqliteMap<T extends object> {
  constructor(
    private table: string,
    private keyCol: string,
  ) {}

  get(key: string): T | undefined {
    const row = getDb()
      .prepare(`SELECT json FROM ${this.table} WHERE ${this.keyCol} = ?`)
      .get(key) as { json: string } | undefined;
    return row ? (JSON.parse(row.json) as T) : undefined;
  }

  set(key: string, value: T) {
    getDb()
      .prepare(
        `INSERT INTO ${this.table} (${this.keyCol}, json) VALUES (?, ?)
         ON CONFLICT(${this.keyCol}) DO UPDATE SET json = excluded.json`,
      )
      .run(key, JSON.stringify(value));
  }

  delete(key: string) {
    getDb().prepare(`DELETE FROM ${this.table} WHERE ${this.keyCol} = ?`).run(key);
  }

  clear() {
    getDb().exec(`DELETE FROM ${this.table}`);
  }

  entries(): [string, T][] {
    const rows = getDb()
      .prepare(`SELECT ${this.keyCol} AS k, json FROM ${this.table}`)
      .all() as { k: string; json: string }[];
    return rows.map((r) => [r.k, JSON.parse(r.json) as T]);
  }

  values(): T[] {
    return this.entries().map((e) => e[1]);
  }

  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
}

/** Set-shaped view over a single-column table. */
class SqliteSet {
  constructor(private table: string, private col: string) {}

  has(v: string): boolean {
    return !!getDb().prepare(`SELECT 1 FROM ${this.table} WHERE ${this.col} = ?`).get(v);
  }

  add(v: string) {
    getDb()
      .prepare(`INSERT OR IGNORE INTO ${this.table} (${this.col}) VALUES (?)`)
      .run(v);
  }

  clear() {
    getDb().exec(`DELETE FROM ${this.table}`);
  }
}

// ---------------------------------------------------------------- the store

export const db = {
  sessions: {
    get(sid: string): string | undefined {
      const row = getDb().prepare("SELECT user_id FROM sessions WHERE sid = ?").get(sid) as
        | { user_id: string }
        | undefined;
      return row?.user_id;
    },
    set(sid: string, userId: string) {
      getDb()
        .prepare("INSERT INTO sessions (sid, user_id) VALUES (?, ?) ON CONFLICT(sid) DO UPDATE SET user_id = excluded.user_id")
        .run(sid, userId);
    },
    clear() {
      getDb().exec("DELETE FROM sessions");
    },
  },
  authRequests: new SqliteMap<AuthRequest>("auth_requests", "id"),
  codes: new SqliteMap<AuthCode>("codes", "code"),
  refresh: new SqliteMap<RefreshToken>("refresh", "token"),
  revokedFamilies: new SqliteSet("revoked_families", "family"),
  traces: mem.traces,
  get seq() {
    return mem.seq;
  },
  set seq(n: number) {
    mem.seq = n;
  },
};

// ---------------------------------------------------------------- users & clients

export function findClient(id: string | null): Client | null {
  if (!id) return null;
  const row = getDb()
    .prepare("SELECT client_id, client_secret, name, redirect_uris, scopes FROM clients WHERE client_id = ?")
    .get(id) as
    | { client_id: string; client_secret: string; name: string; redirect_uris: string; scopes: string }
    | undefined;
  if (!row) return null;
  return {
    client_id: row.client_id,
    client_secret: row.client_secret,
    name: row.name,
    redirect_uris: JSON.parse(row.redirect_uris),
    scopes: JSON.parse(row.scopes),
  };
}

export function findUser(id: string): User | null {
  const row = getDb()
    .prepare("SELECT id, email, password_hash, name, picture FROM users WHERE id = ?")
    .get(id) as User | undefined;
  return row ?? null;
}

export function findUserByEmail(email: string): User | null {
  const row = getDb()
    .prepare("SELECT id, email, password_hash, name, picture FROM users WHERE email = ?")
    .get(email) as User | undefined;
  return row ?? null;
}

/** argon2id verification against the stored hash. */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: user.password_hash });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- grants

export function grantFor(user_id: string, client_id: string): Grant | null {
  const row = getDb()
    .prepare("SELECT user_id, client_id, scope FROM grants WHERE user_id = ? AND client_id = ?")
    .get(user_id, client_id) as { user_id: string; client_id: string; scope: string } | undefined;
  return row ? { ...row, scope: JSON.parse(row.scope) } : null;
}

export function saveGrant(user_id: string, client_id: string, scope: string[]) {
  const existing = grantFor(user_id, client_id);
  const merged = Array.from(new Set([...(existing?.scope ?? []), ...scope]));
  getDb()
    .prepare(
      `INSERT INTO grants (user_id, client_id, scope) VALUES (?, ?, ?)
       ON CONFLICT(user_id, client_id) DO UPDATE SET scope = excluded.scope`,
    )
    .run(user_id, client_id, JSON.stringify(merged));
}

export function grantsFor(user_id: string): Grant[] {
  const rows = getDb()
    .prepare("SELECT user_id, client_id, scope FROM grants WHERE user_id = ?")
    .all(user_id) as { user_id: string; client_id: string; scope: string }[];
  return rows.map((r) => ({ ...r, scope: JSON.parse(r.scope) }));
}

/** Drop one user×client grant (account page "Remove access"). */
export function removeGrant(user_id: string, client_id: string) {
  getDb().prepare("DELETE FROM grants WHERE user_id = ? AND client_id = ?").run(user_id, client_id);
}

export function clearGrants() {
  getDb().exec("DELETE FROM grants");
}

// ---------------------------------------------------------------- misc

export function trace(t: Omit<Trace, "seq" | "at">) {
  mem.seq += 1;
  mem.traces.push({ ...t, seq: mem.seq, at: Date.now() });
  if (mem.traces.length > 200) mem.traces.shift();
}

export function rid(prefix: string) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
