import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime } from "../lib/format";

// One instant, given as epoch milliseconds and as the same instant in ISO 8601.
const MS = Date.UTC(2026, 9, 31, 22, 40, 19);
const ISO = new Date(MS).toISOString();

// The expected text is built from the local clock, so the assertion holds in any timezone.
const local = new Date(MS);
const pad = (n: number) => String(n).padStart(2, "0");
const EXPECTED = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`;

test("formatTime: epoch milliseconds render as YYYY-MM-DD HH:mm", () => {
  assert.equal(formatTime(MS), EXPECTED);
  assert.match(formatTime(MS), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
});

test("formatTime: an ISO string for the same instant renders the same text", () => {
  assert.equal(formatTime(ISO), formatTime(MS));
  assert.equal(formatTime(ISO), EXPECTED);
});

test("formatTime: empty and unparseable values render as a dash, never the raw value", () => {
  assert.equal(formatTime(undefined), "—");
  assert.equal(formatTime(null), "—");
  assert.equal(formatTime(""), "—");
  assert.equal(formatTime("not a date"), "—");
  assert.equal(formatTime(Number.NaN), "—");
});
