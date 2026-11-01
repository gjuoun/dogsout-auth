// DEV ONLY. Seeds six instances through the public cloud API so /panel has a realistic list.
// Every call is a real endpoint: order, activate, and the agent reports (events, complete).
// Nothing is written to a database directly. Tokens and client secrets are never printed.
//
//   set -a; . ./.env; set +a
//   CLOUD_URL=http://127.0.0.1:3411 AS_URL=http://127.0.0.1:3410 node scripts/seed-dev.mjs
//
// Run on a fresh cloud database: each run orders six new instances.

const env = process.env;
const CLOUD = (env.CLOUD_URL ?? "").replace(/\/$/, "");
const TOKEN = env.CLOUD_SERVICE_TOKEN ?? "";
const AS = (env.AS_URL ?? "").replace(/\/$/, "");

for (const [k, v] of Object.entries({ CLOUD_URL: CLOUD, CLOUD_SERVICE_TOKEN: TOKEN, AS_URL: AS })) {
  if (!v) {
    console.error("seed-dev: missing " + k);
    process.exit(2);
  }
}

const say = (msg) => console.log("seed-dev: " + msg);

async function call(path, { method = "GET", body, bearer = TOKEN } = {}) {
  const res = await fetch(CLOUD + path, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), authorization: "Bearer " + bearer },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty or non-JSON body */ }
  return { status: res.status, json };
}

function expect(res, codes, what) {
  if (!codes.includes(res.status)) {
    console.error("seed-dev: " + what + " failed with HTTP " + res.status);
    process.exit(1);
  }
  return res.json;
}

async function order(topic, task) {
  const res = await call("/api/instances", {
    method: "POST",
    body: { agent_type: "june-agent", task, scopes: ["secrets:read"], repo: "dogsout-auth", branch: "agc/phase1-as", topic },
  });
  const d = expect(res, [201], "order " + topic);
  return { id: d.id, code: d.activation_code };
}

async function activate(inst) {
  const res = await call("/api/instances/" + encodeURIComponent(inst.id) + "/activate", {
    method: "POST", body: { activation_code: inst.code },
  });
  const d = expect(res, [200], "activate " + inst.id);
  return { client_id: d.client_id, client_secret: d.client_secret };
}

// client_credentials at the AS, with the instance's own machine client (HTTP Basic).
async function mintSpawnToken(client) {
  const basic = Buffer.from(client.client_id + ":" + client.client_secret).toString("base64");
  const res = await fetch(AS + "/oauth/token", {
    method: "POST",
    headers: { authorization: "Basic " + basic, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "secrets:read" }),
  });
  const d = await res.json().catch(() => null);
  if (res.status !== 200 || !d || !d.access_token) {
    console.error("seed-dev: token mint failed with HTTP " + res.status);
    process.exit(1);
  }
  return d.access_token;
}

async function report(id, token, type, message) {
  const res = await call("/api/instances/" + encodeURIComponent(id) + "/events", {
    method: "POST", body: { type, message }, bearer: token,
  });
  expect(res, [201], "event " + type + " for " + id);
}

async function complete(id, token, status, result) {
  const res = await call("/api/instances/" + encodeURIComponent(id) + "/complete", {
    method: "POST", body: { result, status }, bearer: token,
  });
  expect(res, [200], "complete " + status + " for " + id);
}

// Six instances: deploying, running x2, failed, done x2.
const PLAN = [
  { topic: "deploy-queue", task: "Queue a deploy of the blackboard site", end: "deploying" },
  { topic: "billing-sync", task: "Sync billing exports to the ledger", end: "running" },
  { topic: "repo-audit", task: "Audit repo permissions across the org", end: "running" },
  { topic: "migrate-db", task: "Migrate the staging database schema", end: "failed" },
  { topic: "lint-sweep", task: "Fix lint warnings in the sites monorepo", end: "done" },
  { topic: "doc-refresh", task: "Refresh the operations runbook", end: "done" },
];

for (const p of PLAN) {
  const inst = await order(p.topic, p.task);
  say("ordered  " + inst.id + " -> " + p.end);
  if (p.end === "deploying") continue;
  const client = await activate(inst);
  const token = await mintSpawnToken(client);
  await report(inst.id, token, "secret_read", "Read 1 secret under scope secrets:read.");
  if (p.end === "running") continue;
  if (p.end === "failed") {
    await complete(inst.id, token, "failed", "Migration aborted: schema drift detected.");
  } else {
    await complete(inst.id, token, "done", "Task finished. Result posted, instance closed.");
  }
}

say("seeded " + PLAN.length + " instances");
