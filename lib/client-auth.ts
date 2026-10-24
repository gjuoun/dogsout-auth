// Client authentication on the back channel (RFC 6749 §2.3). A confidential
// client presents client_id + client_secret either as an HTTP Basic header
// (client_secret_basic) or in the form body (client_secret_post) — never both.
// /oauth/token and /oauth/introspect both authenticate through this one function,
// so the two endpoints cannot drift apart.

import { timingSafeEqual } from "node:crypto";
import { findClient, type Client } from "@/lib/store";

export type AuthMethod = "client_secret_basic" | "client_secret_post";

export type ClientAuthResult =
  | { ok: true; client: Client; method: AuthMethod }
  | { ok: false; reason: "invalid_client" | "invalid_request"; viaHeader: boolean };

/** RFC 6749 §2.3.1: each half is form-urlencoded before base64, so decode it back. */
function decodeForm(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s; // a client that did not encode its id/secret: take it literally
  }
}

/** Decode `Authorization: Basic base64(client_id:client_secret)`. Client ids never contain ':'. */
export function parseBasic(header: string | null): { id: string; secret: string } | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !value) return null;
  const decoded = Buffer.from(value, "base64").toString("utf8");
  const cut = decoded.indexOf(":");
  if (cut < 0) return null;
  return { id: decodeForm(decoded.slice(0, cut)), secret: decodeForm(decoded.slice(cut + 1)) };
}

/** Constant-time compare: a secret that differs in length fails without a length oracle. */
function secretMatches(stored: string, presented: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(presented);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateClient(req: Request, form: Record<string, string>): ClientAuthResult {
  const fromHeader = parseBasic(req.headers.get("authorization"));
  const hasBodySecret = Boolean(form.client_id || form.client_secret);

  // §2.3: "The client MUST NOT use more than one authentication method in each request."
  if (fromHeader && hasBodySecret) return { ok: false, reason: "invalid_request", viaHeader: true };
  if (!fromHeader && !hasBodySecret) return { ok: false, reason: "invalid_client", viaHeader: false };

  const viaHeader = fromHeader !== null;
  const id = fromHeader ? fromHeader.id : form.client_id;
  const secret = fromHeader ? fromHeader.secret : (form.client_secret ?? "");

  const client = findClient(id ?? null);
  if (!client || !secretMatches(client.client_secret, secret)) {
    return { ok: false, reason: "invalid_client", viaHeader };
  }
  return { ok: true, client, method: viaHeader ? "client_secret_basic" : "client_secret_post" };
}
