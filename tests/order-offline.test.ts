import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createInstance, cloudConfigFromEnv, CloudUnavailable } from "../lib/cloud";

// The /order error path with nothing listening on the cloud port: the message must name CLOUD_URL.
test("order offline: a closed cloud port yields a CLOUD_URL-naming CloudUnavailable", async () => {
  const cfg = cloudConfigFromEnv({ CLOUD_URL: "http://127.0.0.1:1", CLOUD_SERVICE_TOKEN: "t" });
  await assert.rejects(createInstance(cfg, { task: "x", scopes: ["secrets:read"] }), (e: unknown) =>
    e instanceof CloudUnavailable && (e as Error).message.includes("http://127.0.0.1:1"));
});
