// Gate for the admin registration API. Both checks fail closed:
//   1. the request must come straight from localhost: the Host header is a loopback
//      name and no proxy header says the request was forwarded from elsewhere;
//   2. the bearer token must equal AS_ADMIN_TOKEN, compared in constant time.
// When AS_ADMIN_TOKEN is unset, every request is refused.

import { timingSafeEqual } from "node:crypto";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const PROXY_HEADERS = ["x-forwarded-for", "x-real-ip", "forwarded"];

/** True only for a request whose Host is loopback and that carries no proxy header. */
export function isLocalhostRequest(req: Request): boolean {
  for (const h of PROXY_HEADERS) if (req.headers.has(h)) return false;
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
