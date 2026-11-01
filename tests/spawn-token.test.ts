import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { signJwt, TTL } from "../lib/keys";
import { verifySpawnToken } from "../lib/spawn-token";
import { db } from "../lib/store";

const AUD = "secrets-api";

test("spawn token: a fresh token for the right audience verifies with its claims", async () => {
  const t = await signJwt({ sub: "agent_x", client_id: "agent_x", scope: "secrets:read" }, AUD, TTL.access);
  const r = await verifySpawnToken(t, AUD);
  assert.equal(r.ok, true);
  if (r.ok) { assert.equal(r.claims.client_id, "agent_x"); assert.deepEqual(r.claims.scope, ["secrets:read"]); }
});

test("spawn token: missing, malformed and wrong-audience tokens are refused", async () => {
  assert.deepEqual(await verifySpawnToken("", AUD), { ok: false, reason: "missing" });
  assert.deepEqual(await verifySpawnToken("not.a.jwt", AUD), { ok: false, reason: "invalid" });
  const notesTok = await signJwt({ sub: "a", client_id: "a", scope: "notes:read" }, "notes-api", TTL.access);
  assert.deepEqual(await verifySpawnToken(notesTok, AUD), { ok: false, reason: "invalid" });
});

test("spawn token: an expired token is refused as expired", async () => {
  const t = await signJwt({ sub: "a", client_id: "a", scope: "secrets:read" }, AUD, -60);
  assert.deepEqual(await verifySpawnToken(t, AUD), { ok: false, reason: "expired" });
});

test("spawn token: a revoked jti is refused", async () => {
  const t = await signJwt({ sub: "a", client_id: "a", scope: "secrets:read" }, AUD, TTL.access);
  const jti = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).jti;
  db.revokedTokens.add(jti, Date.now() + 60_000);
  assert.deepEqual(await verifySpawnToken(t, AUD), { ok: false, reason: "revoked" });
});
