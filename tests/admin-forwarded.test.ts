import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalhostRequest, isLoopbackHop } from "../lib/admin-auth";

// Real-shape requests. `next start` adds the forwarding chain below to every route handler request,
// so these must pass. A chain with any non-loopback hop must not.
const req = (headers: Record<string, string>, host = "localhost:3410") =>
  new Request("http://localhost:3410/api/admin/machine-clients", { headers: { host, ...headers } });

test("forwarded: next start injected chain (::ffff:127.0.0.1 + x-forwarded-host) is allowed", () => {
  assert.equal(isLocalhostRequest(req({
    "x-forwarded-for": "::ffff:127.0.0.1",
    "x-forwarded-host": "127.0.0.1:3410",
    "x-forwarded-port": "3410",
    "x-forwarded-proto": "http",
  }, "127.0.0.1:3410")), true);
});

test("forwarded: a single non-loopback hop (192.168.1.5) is refused", () => {
  assert.equal(isLocalhostRequest(req({ "x-forwarded-for": "192.168.1.5" })), false);
});

test("forwarded: a mixed chain (127.0.0.1,10.0.0.8) is refused", () => {
  assert.equal(isLocalhostRequest(req({ "x-forwarded-for": "127.0.0.1,10.0.0.8" })), false);
  assert.equal(isLocalhostRequest(req({ "x-forwarded-for": "10.0.0.8,127.0.0.1" })), false);
});

test("forwarded: an all-loopback chain of several hops is allowed", () => {
  assert.equal(isLocalhostRequest(req({ "x-forwarded-for": "127.0.0.1, ::1, ::ffff:127.0.0.2" })), true);
});

test("forwarded: a non-loopback x-forwarded-host is refused even with a loopback chain", () => {
  assert.equal(isLocalhostRequest(req({ "x-forwarded-for": "127.0.0.1", "x-forwarded-host": "auth.example.com" })), false);
});

test("forwarded: x-real-ip and forwarded are refused outright", () => {
  assert.equal(isLocalhostRequest(req({ "x-real-ip": "127.0.0.1" })), false);
  assert.equal(isLocalhostRequest(req({ forwarded: "for=127.0.0.1" })), false);
});

test("forwarded: a bare local request with no proxy header is allowed (unchanged)", () => {
  assert.equal(isLocalhostRequest(req({})), true);
});

test("forwarded: a non-loopback Host is refused (unchanged)", () => {
  assert.equal(isLocalhostRequest(req({}, "auth.example.com")), false);
});

test("forwarded: hop parser accepts loopback forms and rejects others", () => {
  for (const ok of ["127.0.0.1", "127.0.0.1:3410", "::1", "[::1]:3410", "::ffff:127.0.0.1", "localhost", "127.10.0.2"]) {
    assert.equal(isLoopbackHop(ok), true, ok);
  }
  for (const bad of ["192.168.1.5", "10.0.0.8", "::ffff:10.0.0.8", "auth.example.com", "", "128.0.0.1", "::ffff:"]) {
    assert.equal(isLoopbackHop(bad), false, bad);
  }
});
