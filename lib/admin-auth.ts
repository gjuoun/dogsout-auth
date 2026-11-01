// Gate for the admin registration API. Both checks fail closed:
//   1. the request must come straight from localhost: the Host header is a loopback
//      name and no proxy header says the request was forwarded from elsewhere;
//   2. the bearer token must equal AS_ADMIN_TOKEN, compared in constant time.
// When AS_ADMIN_TOKEN is unset, every request is refused.

import { timingSafeEqual } from "node:crypto";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Headers that carry the forwarding chain. `next start` adds x-forwarded-for, x-forwarded-host,
 * x-forwarded-port and x-forwarded-proto to every route handler request, with the local address as
 * the hop. Those are accepted when every hop is loopback. Headers that name a client IP another way
 * (x-real-ip, forwarded) are refused outright: nothing local sends them.
 */
const HOP_HEADERS = ["x-forwarded-for", "x-forwarded-host"];
const REFUSED_HEADERS = ["x-real-ip", "forwarded"];

/** True when one forwarded hop is a loopback address or name, IPv4 or IPv4-mapped IPv6 included. */
export function isLoopbackHop(raw: string): boolean {
  let h = raw.trim().toLowerCase();
  if (!h) return false;
  // [::1]:port or [::ffff:127.0.0.1]:port
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end < 0) return false;
    h = h.slice(1, end);
  }
  // IPv4-mapped IPv6: ::ffff:127.0.0.1
  if (h.startsWith("::ffff:")) h = h.slice(7);
  if (h === "::1" || h === "localhost") return true;
  // IPv4 loopback is 127.0.0.0/8. A bare host:port (one colon) keeps only the host part.
  const v4 = h.split(":").length === 2 ? h.split(":")[0] : h;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4) && v4.split(".").every((o) => Number(o) <= 255);
}

/** Every value of a comma-separated forwarding header must be a loopback hop. An empty header is not a hop. */
function chainIsLoopback(value: string): boolean {
  const hops = value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  return hops.length > 0 && hops.every(isLoopbackHop);
}

/**
 * True only when the Host is a loopback name and every forwarding hop is loopback too.
 * A single non-loopback hop anywhere in the chain refuses the request.
 */
export function isLocalhostRequest(req: Request): boolean {
  for (const h of REFUSED_HEADERS) if (req.headers.has(h)) return false;
  for (const h of HOP_HEADERS) {
    const v = req.headers.get(h);
    if (v !== null && !chainIsLoopback(v)) return false;
  }
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return LOOPBACK_HOSTS.has(name);
}

/** Constant-time check of the bearer token against AS_ADMIN_TOKEN. Unset env refuses everything. */
export function isAdminRequest(req: Request): boolean {
  const expected = process.env.AS_ADMIN_TOKEN ?? "";
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  return a.length === b.length && timingSafeEqual(a, b);
}
