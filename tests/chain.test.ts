import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { putSecret } from "../lib/secrets";
import { POST as register } from "../app/api/admin/machine-clients/route";
import { POST as token } from "../app/oauth/token/route";
import { GET as readSecret } from "../app/api/secrets/[key]/route";

const ADMIN = "chain-admin-token-0123456789abcdef";
process.env.AS_ADMIN_TOKEN = ADMIN;

putSecret("chain.literal", { value: "chain-fixture-value" });

async function registerClient(name: string, scopes: string[]) {
  const res = await register(new Request("http://localhost:3410/api/admin/machine-clients", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3410", authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ name, scopes }),
  }));
  assert.equal(res.status, 200);
  return (await res.json()) as { client_id: string; client_secret: string };
}

async function clientCredentials(c: { client_id: string; client_secret: string }, scope: string, resource?: string) {
  const body = new URLSearchParams({ grant_type: "client_credentials", scope });
  if (resource) body.set("resource", resource);
  const res = await token(new Request("http://localhost:3410/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: "Basic " + Buffer.from(`${c.client_id}:${c.client_secret}`).toString("base64") },
    body,
  }));
  return { status: res.status, body: (await res.json()) as { access_token?: string; error?: string } };
}

function read(key: string, bearer: string) {
  return readSecret(new Request(`http://localhost:3410/api/secrets/${key}`, { headers: { authorization: `Bearer ${bearer}` } }), { params: Promise.resolve({ key }) });
}

test("chain: register, mint a secrets-api token, read a literal secret", async () => {
  const c = await registerClient("chain.reader.abcd", ["secrets:read"]);
  const t = await clientCredentials(c, "secrets:read", "secrets-api");
  assert.equal(t.status, 200);
  const res = await read("chain.literal", t.body.access_token!);
  assert.equal(res.status, 200);
  assert.equal((await res.json() as { value: string }).value, "chain-fixture-value");
});

test("chain: a client registered with notes:read only cannot get a secrets token", async () => {
  const c = await registerClient("chain.notes.abcd", ["notes:read"]);
  const t = await clientCredentials(c, "secrets:read", "secrets-api");
  assert.equal(t.status, 400);
  assert.equal(t.body.error, "invalid_scope");
});

test("chain: a wrong bearer token is refused with 401", async () => {
  assert.equal((await read("chain.literal", "wrong-token")).status, 401);
});

test("chain: a repeated client name is refused with 409", async () => {
  await registerClient("chain.repeat.abcd", ["secrets:read"]);
  const res = await register(new Request("http://localhost:3410/api/admin/machine-clients", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3410", authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ name: "chain.repeat.abcd", scopes: ["secrets:read"] }),
  }));
  assert.equal(res.status, 409);
});
