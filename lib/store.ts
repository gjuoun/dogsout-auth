// Persistent store (SQLite via lib/db.ts). Keeps the Map/Set-ish surface the
// routes already use, so switching from the old in-memory demo was a drop-in.
// `traces` stays in memory on purpose: it is a capped teaching UI, not state.

import { getDb } from "@/lib/db";
import { argon2Verify } from "hash-wasm";

export type User = {
  id: string;
  email: string;
  username: string;
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
  kind: "demo" | "agent";    // agents are machine clients from the registry
  owner_user_id?: string;
  created_at?: number;
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
    /** End one provider session. Returns whether it existed — logout is idempotent. */
    delete(sid: string): boolean {
      return getDb().prepare("DELETE FROM sessions WHERE sid = ?").run(sid).changes > 0;
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
  /**
   * Access tokens are signed and stateless, so an unexpired one keeps verifying
   * after it is revoked. This table is the exception list: a jti lives here only
   * until the token it names would have expired on its own (RFC 7009 needs no
   * record of a token that is already inert).
   */
  revokedTokens: {
    has(jti: string): boolean {
      return !!getDb().prepare("SELECT 1 FROM revoked_tokens WHERE jti = ?").get(jti);
    },
    add(jti: string, expiresAt: number) {
      const sql = getDb();
      // Prune on write: the table stays bounded by the access-token TTL.
      sql.prepare("DELETE FROM revoked_tokens WHERE expires_at <= ?").run(Date.now());
      sql.prepare("INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)").run(jti, expiresAt);
    },
    clear() {
      getDb().exec("DELETE FROM revoked_tokens");
    },
  },
  traces: mem.traces,
  get seq() {
    return mem.seq;
  },
  set seq(n: number) {
    mem.seq = n;
  },
};

// ---------------------------------------------------------------- users & clients

const CLIENT_COLS =
  "client_id, client_secret, name, redirect_uris, scopes, kind, owner_user_id, created_at";

function rowToClient(row: Record<string, unknown>): Client {
  return {
    client_id: row.client_id as string,
    client_secret: row.client_secret as string,
    name: row.name as string,
    redirect_uris: JSON.parse(row.redirect_uris as string),
    scopes: JSON.parse(row.scopes as string),
    kind: (row.kind as Client["kind"]) ?? "demo",
    owner_user_id: (row.owner_user_id as string | null) ?? undefined,
    created_at: row.created_at as number | undefined,
  };
}

export function findClient(id: string | null): Client | null {
  if (!id) return null;
  const row = getDb()
    .prepare(`SELECT ${CLIENT_COLS} FROM clients WHERE client_id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToClient(row) : null;
}

export function listClients(): Client[] {
  const rows = getDb()
    .prepare(`SELECT ${CLIENT_COLS} FROM clients ORDER BY created_at, client_id`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToClient);
}

/** Register an agent (machine client). The secret is returned ONCE — callers show it, never store it in the clear anywhere else. */
export function createAgent(opts: {
  name: string;
  redirect_uris: string[];
  scopes: string[];
  owner_user_id: string;
}): { client_id: string; client_secret: string } {
  const client_id = rid("agent");
  const client_secret = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  getDb()
    .prepare(
      `INSERT INTO clients (client_id, client_secret, name, redirect_uris, scopes, kind, owner_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'agent', ?, ?)`,
    )
    .run(
      client_id,
      client_secret,
      opts.name,
      JSON.stringify(opts.redirect_uris),
      JSON.stringify(opts.scopes),
      opts.owner_user_id,
      Date.now(),
    );
  return { client_id, client_secret };
}

/** Drop a client and everything granted to it. Demo clients (the teaching app) are protected. */
export function deleteClient(client_id: string) {
  const c = findClient(client_id);
  if (!c || c.kind === "demo") return;
  getDb().prepare("DELETE FROM clients WHERE client_id = ?").run(client_id);
  getDb().prepare("DELETE FROM grants WHERE client_id = ?").run(client_id);
  for (const [k, t] of db.refresh)
    if (t.client_id === client_id) { t.revoked = true; db.refresh.set(k, t); }
}

export function findUser(id: string): User | null {
  const row = getDb()
    .prepare("SELECT id, email, username, password_hash, name, picture FROM users WHERE id = ?")
    .get(id) as User | undefined;
  return row ?? null;
}

export function findUserByEmail(email: string): User | null {
  const row = getDb()
    .prepare("SELECT id, email, username, password_hash, name, picture FROM users WHERE email = ?")
    .get(email) as User | undefined;
  return row ?? null;
}

/**
 * Resolve the human for a username-first login. Case-insensitive; a username
 * match wins, with the email as a tolerant fallback.
 */
export function findUserByUsername(username: string): User | null {
  const q = username.trim().toLowerCase();
  if (!q) return null;
  const cols = "id, email, username, password_hash, name, picture";
  const byName = getDb()
    .prepare(`SELECT ${cols} FROM users WHERE lower(username) = ?`)
    .get(q) as User | undefined;
  if (byName) return byName;
  const byEmail = getDb()
    .prepare(`SELECT ${cols} FROM users WHERE lower(email) = ?`)
    .get(q) as User | undefined;
  return byEmail ?? null;
}

/** argon2id verification against the stored hash. */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: user.password_hash });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- passkeys (webauthn)

export type Passkey = {
  credential_id: string;
  user_id: string;
  counter: number;
  transports?: string[];
  backed_up?: boolean;
  name?: string;
  created_at?: number;
};

export function listPasskeys(user_id: string): Passkey[] {
  const rows = getDb()
    .prepare(
      "SELECT credential_id, user_id, counter, transports, backed_up, name, created_at FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at",
    )
    .all(user_id) as Record<string, unknown>[];
  return rows.map((r) => ({
    credential_id: r.credential_id as string,
    user_id: r.user_id as string,
    counter: r.counter as number,
    transports: r.transports ? JSON.parse(r.transports as string) : undefined,
    backed_up: !!r.backed_up,
    name: (r.name as string | null) ?? undefined,
    created_at: (r.created_at as number | null) ?? undefined,
  }));
}

export function savePasskey(p: {
  credential_id: string;
  user_id: string;
  public_key: string; // base64
  counter: number;
  transports?: string[];
  backed_up: boolean;
  name: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO webauthn_credentials (credential_id, user_id, public_key, counter, transports, backed_up, name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(credential_id) DO UPDATE SET counter = excluded.counter, transports = excluded.transports, backed_up = excluded.backed_up`,
    )
    .run(
      p.credential_id,
      p.user_id,
      p.public_key,
      p.counter,
      p.transports ? JSON.stringify(p.transports) : null,
      p.backed_up ? 1 : 0,
      p.name,
      Date.now(),
    );
}

export function findPasskey(credential_id: string): { user_id: string; public_key: string; counter: number } | null {
  const row = getDb()
    .prepare("SELECT user_id, public_key, counter FROM webauthn_credentials WHERE credential_id = ?")
    .get(credential_id) as { user_id: string; public_key: string; counter: number } | undefined;
  return row ?? null;
}

export function updatePasskeyCounter(credential_id: string, counter: number) {
  getDb()
    .prepare("UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?")
    .run(counter, credential_id);
}

export function deletePasskey(credential_id: string) {
  getDb().prepare("DELETE FROM webauthn_credentials WHERE credential_id = ?").run(credential_id);
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
