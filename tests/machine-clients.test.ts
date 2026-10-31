import "./setup.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgent, listClients } from "../lib/store";

test("machine client: a second registration with the same name is rejected", () => {
  const name = "dup.check.abcd";
  createAgent({ name, redirect_uris: [], scopes: ["secrets:read"] });
  assert.throws(
    () => createAgent({ name, redirect_uris: [], scopes: ["secrets:read"] }),
    (err: unknown) => (err as Error).name === "DuplicateName",
  );
  assert.equal(listClients().filter((c) => c.name === name).length, 1);
});
