import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstance, listInstances, getInstance, cloudConfigFromEnv, CloudUnavailable, type Fetch } from "../lib/cloud";

const CFG = (fetch: Fetch) => ({ url: "http://localhost:3411", token: "svc-token", fetch });

test("cloud: createInstance posts the order and returns id + activation_code on 201", async () => {
  let seen: { url: string; body: unknown; auth: string | null } = { url: "", body: null, auth: null };
  const fetch: Fetch = async (url, init) => {
    seen = { url, body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") };
    return Response.json({ id: "ws.june.demo.1a2b", activation_code: "ac-123", status: "deploying" }, { status: 201 });
  };
  const out = await createInstance(CFG(fetch), { task: "fix bug", scopes: ["secrets:read"], repo: "r" });
  assert.equal(out.id, "ws.june.demo.1a2b");
  assert.equal(out.activation_code, "ac-123");
  assert.equal(seen.url, "http://localhost:3411/api/instances");
  assert.equal(seen.auth, "Bearer svc-token");
  assert.deepEqual(seen.body, { agent_type: "june-agent", task: "fix bug", scopes: ["secrets:read"], repo: "r" });
});

test("cloud: an unreachable API names CLOUD_URL in the error", async () => {
  const fetch: Fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(createInstance(CFG(fetch), { task: "t", scopes: ["secrets:read"] }), (e: unknown) =>
    e instanceof CloudUnavailable && /http:\/\/localhost:3411/.test((e as Error).message));
});

test("cloud: a non-201 order is refused with the status", async () => {
  const fetch: Fetch = async () => new Response("{}", { status: 500 });
  await assert.rejects(createInstance(CFG(fetch), { task: "t", scopes: ["secrets:read"] }), /HTTP 500/);
});

test("cloud: panel list and detail parse the contract shapes", async () => {
  const fetch: Fetch = async (url) => {
    if (url.endsWith("/api/instances")) return Response.json([{ id: "ws.june.demo.1a2b", status: "running", created_at: "2026-10-31T10:00:00Z" }]);
    if (url.endsWith("/api/instances/ws.june.demo.1a2b")) return Response.json({ id: "ws.june.demo.1a2b", status: "running", created_at: "x", session_log_path: "/tmp/s.jsonl", events: [{ type: "activated", message: "m", ts: "t" }] });
    return new Response(null, { status: 404 });
  };
  const list = await listInstances(CFG(fetch));
  assert.equal(list[0].status, "running");
  const d = await getInstance(CFG(fetch), "ws.june.demo.1a2b");
  assert.equal(d?.session_log_path, "/tmp/s.jsonl");
  assert.equal(d?.events[0].type, "activated");
  assert.equal(await getInstance(CFG(fetch), "missing"), null);
});

test("cloud: config refuses a missing CLOUD_URL or token", () => {
  assert.throws(() => cloudConfigFromEnv({}), /CLOUD_URL is not set/);
  assert.throws(() => cloudConfigFromEnv({ CLOUD_URL: "http://x" }), /CLOUD_SERVICE_TOKEN is not set/);
});
