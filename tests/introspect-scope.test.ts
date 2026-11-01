import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as register } from "../app/api/admin/machine-clients/route";
import { POST as token } from "../app/oauth/token/route";
import { POST as introspect } from "../app/oauth/introspect/route";

const ADMIN = "introspect-admin-token-0123456789abcdef";
process.env.AS_ADMIN_TOKEN = ADMIN;

let seq = 0;
const fresh = (tag: string) => `isc.${tag}.n${++seq}.abcd`;

async function registerClient(name: string, scopes: string[]) {
  const res = await register(new Request("http://localhost:3410/api/admin/machine-clients", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3410", authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ name, scopes }),
  }));
  assert.equal(res.status, 200);
  return (await res.json()) as { client_id: string; client_secret: string };
}

function basic(c: { client_id: string; client_secret: string }) {
  return "Basic " + Buffer.from(`${c.client_id}:${c.client_secret}`).toString("base64");
}

async function mintToken(c: { client_id: string; client_secret: string }, scope: string, resource?: string) {
  const body = new URLSearchParams({ grant_type: "client_credentials", scope });
  if (resource) body.set("resource", resource);
  const res = await token(new Request("http://localhost:3410/oauth/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", authorization: basic(c) }, body,
  }));
  assert.equal(res.status, 200);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Call /oauth/introspect as `caller` (client credentials) about `target`. */
async function ask(caller: { client_id: string; client_secret: string }, target: string) {
  const body = new URLSearchParams({ token: target });
  const res = await introspect(new Request("http://localhost:3410/oauth/introspect", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", authorization: basic(caller) }, body,
  }));
  return (await res.json()) as { active: boolean; client_id?: string };
}

test("introspect scope a: a service client with as:introspect sees a spawn token as active", async () => {
  const svc = await registerClient(fresh("svc"), ["as:introspect"]);
  const spawn = await registerClient(fresh("spawn"), ["secrets:read"]);
  const svcToken = await mintToken(svc, "as:introspect");
  const spawnToken = await mintToken(spawn, "secrets:read", "secrets-api");
  const seen = await ask(svc, spawnToken);
  assert.equal(seen.active, true);
  assert.equal(seen.client_id, spawn.client_id);
  assert.ok(svcToken.length > 20);
});

test("introspect scope b: a plain client gets active:false for another client's token", async () => {
  const plain = await registerClient(fresh("plain"), ["notes:read"]);
  const spawn = await registerClient(fresh("spawn2"), ["secrets:read"]);
  const spawnToken = await mintToken(spawn, "secrets:read", "secrets-api");
  const seen = await ask(plain, spawnToken);
  assert.deepEqual(seen, { active: false });
});

test("introspect scope b2: a plain client still sees its own token as active", async () => {
  const plain = await registerClient(fresh("self"), ["notes:read"]);
  const own = await mintToken(plain, "notes:read", "notes-api");
  const seen = await ask(plain, own);
  assert.equal(seen.active, true);
  assert.equal(seen.client_id, plain.client_id);
});
