import "./setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createAgent, listClients } from "../lib/store";
import { POST } from "../app/api/admin/machine-clients/route";

test("machine client: a second registration with the same name is rejected", () => {
  const name = "dup.check.abcd";
  createAgent({ name, redirect_uris: [], scopes: ["secrets:read"] });
  assert.throws(
    () => createAgent({ name, redirect_uris: [], scopes: ["secrets:read"] }),
    (err: unknown) => (err as Error).name === "DuplicateName",
  );
  assert.equal(listClients().filter((c) => c.name === name).length, 1);
});


const ADMIN = "test-admin-token-0123456789abcdef";

function req(body: unknown, opts: { token?: string | null; host?: string; extra?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: opts.host ?? "localhost:3410",
    ...(opts.extra ?? {}),
  };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? ADMIN}`;
  return new Request("http://localhost:3410/api/admin/machine-clients", {
    method: "POST", headers, body: JSON.stringify(body),
  });
}

let seq = 0;
const fresh = () => `agc.test.case${++seq}.abcd`;

beforeEach(() => {
  process.env.AS_ADMIN_TOKEN = ADMIN;
});

test("admin registration: 200 returns client_id and a one-time secret", async () => {
  const name = fresh();
  const res = await POST(req({ name, scopes: ["secrets:read"] }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.client_id, /^agent_/);
  assert.ok(body.client_secret.length > 20);
});

test("admin registration: 400 on a bad body", async () => {
  assert.equal((await POST(req({ name: "Bad Name!", scopes: ["secrets:read"] }))).status, 400);
  assert.equal((await POST(req({ name: fresh(), scopes: [] }))).status, 400);
  assert.equal((await POST(req({ name: fresh(), scopes: ["openid"] }))).status, 400);
});

test("admin registration: 401 on a missing or wrong bearer token", async () => {
  assert.equal((await POST(req({ name: fresh(), scopes: ["secrets:read"] }, { token: null }))).status, 401);
  assert.equal((await POST(req({ name: fresh(), scopes: ["secrets:read"] }, { token: "wrong" }))).status, 401);
});

test("admin registration: 401 when AS_ADMIN_TOKEN is unset (fail closed)", async () => {
  delete process.env.AS_ADMIN_TOKEN;
  const res = await POST(req({ name: fresh(), scopes: ["secrets:read"] }));
  process.env.AS_ADMIN_TOKEN = ADMIN;
  assert.equal(res.status, 401);
});

test("admin registration: 403 from a non-localhost Host or a proxy header", async () => {
  assert.equal((await POST(req({ name: fresh(), scopes: ["secrets:read"] }, { host: "auth.example.com" }))).status, 403);
  assert.equal((await POST(req({ name: fresh(), scopes: ["secrets:read"] }, { extra: { "x-forwarded-for": "203.0.113.9" } }))).status, 403);
});

test("admin registration: 409 when the name is already registered", async () => {
  const name = fresh();
  assert.equal((await POST(req({ name, scopes: ["secrets:read"] }))).status, 200);
  assert.equal((await POST(req({ name, scopes: ["secrets:read"] }))).status, 409);
});
