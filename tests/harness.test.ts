import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TEST_DB } from "./setup.ts";
import { getDb } from "../lib/db.ts";

test("harness: tests use a temp DB, never data/oauth.db", () => {
  assert.ok(!TEST_DB.includes("/data/oauth.db"));
  getDb();
  assert.equal(existsSync(TEST_DB), true);
});
