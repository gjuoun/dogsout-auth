import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The provider's SQLite database. Everything the old in-memory demo Map held
 * now lives here, so state survives restarts: users, clients, sessions,
 * authorization requests, codes, refresh tokens, grants, revoked families,
 * and the signing key (in `meta`).
 *
 * Location: $OAUTH_DB, else `<repo>/data/oauth.db`.
 */

const DB_PATH =
  process.env.OAUTH_DB ?? join(process.cwd(), "data", "oauth.db");

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    picture TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    client_secret TEXT NOT NULL,
    name TEXT NOT NULL,
    redirect_uris TEXT NOT NULL,
    scopes TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_requests (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS refresh (
    token TEXT PRIMARY KEY,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS revoked_families (
    family TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS grants (
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    PRIMARY KEY (user_id, client_id)
  );
`;

/** Demo seed. The password hash is argon2id(m=19456, t=2, p=1) of "hunter2". */
const DEMO_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$wts6SH55pRt/rJaqGvefvw$qKFYA/DrKPqqAMH/XQhPEO8Lt+LAinZ7usLWGRxhGyU";

const g = globalThis as unknown as { __oauthsqlite?: Database.Database };

export function getDb(): Database.Database {
  if (g.__oauthsqlite) return g.__oauthsqlite;
  const dir = join(DB_PATH, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seed(db);
  g.__oauthsqlite = db;
  return db;
}

function seed(db: Database.Database) {
  const ORIGIN = process.env.ISSUER ?? "http://localhost:3000";
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, picture)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    "u_1001",
    "jun@example.com",
    DEMO_PASSWORD_HASH,
    "Jun Guo",
    "https://api.dicebear.com/9.x/initials/svg?seed=Jun",
  );
  db.prepare(
    `INSERT OR IGNORE INTO clients (client_id, client_secret, name, redirect_uris, scopes)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    "demo-client",
    "demo-secret-do-not-ship",
    "Acme Notes",
    JSON.stringify([ORIGIN + "/client/callback"]),
    JSON.stringify(["openid", "profile", "email", "notes:read"]),
  );
}

/** Key-value store for durable singletons (today: the signing key). */
export const meta = {
  get(k: string): string | null {
    const row = getDb().prepare("SELECT v FROM meta WHERE k = ?").get(k) as
      | { v: string }
      | undefined;
    return row?.v ?? null;
  },
  set(k: string, v: string) {
    getDb()
      .prepare("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v")
      .run(k, v);
  },
};
