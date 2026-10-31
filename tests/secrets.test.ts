import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { signJwt, TTL } from "../lib/keys";
import { putSecret } from "../lib/secrets";
import { GET } from "../app/api/secrets/[key]/route";

const AUD = "secrets-api";

async function token(scope: string, aud = AUD, ttl: number = TTL.access) {
  return signJwt({ sub: "agent_t", client_id: "agent_t", scope }, aud, ttl);
}

function get(key: string, bearer: string | null) {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  const req = new Request(`http://localhost:3410/api/secrets/${key}`, { headers });
  return GET(req, { params: Promise.resolve({ key }) });
}

putSecret("test.literal", { value: "literal-fixture-value" });

test("secrets read: 200 with the literal value for a secrets:read token", async () => {
  const res = await get("test.literal", await token("secrets:read"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { key: "test.literal", value: "literal-fixture-value" });
});

test("secrets read: 401 for a missing, bad or expired token", async () => {
  assert.equal((await get("test.literal", null)).status, 401);
  assert.equal((await get("test.literal", "garbage")).status, 401);
  assert.equal((await get("test.literal", await token("secrets:read", AUD, -60))).status, 401);
});

test("secrets read: 403 when scope lacks secrets:read or aud is not secrets-api", async () => {
  assert.equal((await get("test.literal", await token("notes:read"))).status, 403);
  assert.equal((await get("test.literal", await token("secrets:read", "notes-api"))).status, 401);
});

test("secrets read: 404 for a key outside the allowlist", async () => {
  assert.equal((await get("not.in.table", await token("secrets:read"))).status, 404);
});
