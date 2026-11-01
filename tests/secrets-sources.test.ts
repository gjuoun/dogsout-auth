import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { putSecret, readSecret } from "../lib/secrets";

// Literal source: a value stored in the secrets table, no network.
putSecret("src.literal", { value: "literal-src-value" });
test("source: literal value is returned as stored", async () => {
  assert.equal(await readSecret("src.literal"), "literal-src-value");
});

// op:// source: the reference comes from OP_TEST_REF (a non-sensitive URL-valued field).
// Only the URL shape is asserted and printed. The resolved value itself is never logged.
const ref = process.env.OP_TEST_REF ?? "";
const opTest = ref ? test : test.skip;
opTest("source: op:// reference resolves through the SDK to an http(s) URL", async () => {
  putSecret("src.op", { ref });
  const v = await readSecret("src.op");
  const isUrl = typeof v === "string" && /^https?:\/\//.test(v);
  console.log(`op ok url_shape=${isUrl}`);
  assert.equal(isUrl, true);
});

test("source: a key outside the table is never resolved, even if an SDK exists", async () => {
  assert.equal(await readSecret("src.not-in-table"), null);
});

if (!ref) console.log("skipped (OP_TEST_REF unset): op:// source case not run");
