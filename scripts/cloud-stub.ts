// Dev-only contract stub for the cloud API. Fixed JSON on the contract's routes, so the
// /order and /panel pages can be walked end to end without the real service. The app never
// starts this process.

const PORT = Number(process.env.CLOUD_STUB_PORT ?? 3411);

const instance = {
  id: "ws.june.stub-demo.0a1b",
  status: "running",
  created_at: "2026-10-31T10:00:00Z",
  task: "stub task",
  repo: "dogsout-auth",
  branch: "agc/phase1-as",
  session_log_path: "~/.jun/sessions/stub-demo.jsonl",
  events: [
    { type: "ordered", message: "order received", ts: "2026-10-31T10:00:00Z" },
    { type: "activated", message: "activation code consumed", ts: "2026-10-31T10:00:05Z" },
    { type: "secret_read", message: "read one secret", ts: "2026-10-31T10:00:09Z" },
  ],
};

Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/api/instances") {
      return Response.json({ id: "ws.june.stub-demo.0a1b", activation_code: "stub-activation-once", status: "deploying" }, { status: 201 });
    }
    if (req.method === "GET" && url.pathname === "/api/instances") {
      return Response.json([{ id: instance.id, status: instance.status, created_at: instance.created_at }]);
    }
    if (req.method === "GET" && url.pathname === `/api/instances/${instance.id}`) {
      return Response.json(instance);
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
  },
});

console.log(`cloud stub listening on http://127.0.0.1:${PORT}`);
