import { createAgent, DuplicateName } from "@/lib/store";
import { isAdminRequest, isLocalhostRequest } from "@/lib/admin-auth";

// Machine-client registration for the cloud API. It is a localhost-only, admin-token-gated
// route: a reverse proxy must never expose it (see README). Names are instance ids and unique.

const NAME_RE = /^[a-z0-9][a-z0-9.-]{0,95}$/;
const OIDC_SCOPES = new Set(["openid", "profile", "email"]);

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!isLocalhostRequest(req)) return json(403, { error: "forbidden", error_description: "localhost only" });
  if (!isAdminRequest(req)) return json(401, { error: "unauthorized", error_description: "bad admin token" });

  let body: { name?: unknown; scopes?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_request", error_description: "body must be JSON" });
  }
  const name = typeof body.name === "string" ? body.name : "";
  if (!NAME_RE.test(name)) {
    return json(400, { error: "invalid_request", error_description: "name must match ^[a-z0-9][a-z0-9.-]{0,95}$" });
  }
  const scopes = Array.isArray(body.scopes) && body.scopes.every((s) => typeof s === "string") ? (body.scopes as string[]) : [];
  if (scopes.length === 0) return json(400, { error: "invalid_scope", error_description: "scopes must be a non-empty string array" });
  if (scopes.some((s) => OIDC_SCOPES.has(s))) {
    return json(400, { error: "invalid_scope", error_description: "openid/profile/email describe a human; machine clients cannot hold them" });
  }

  try {
    const { client_id, client_secret } = createAgent({ name, redirect_uris: [], scopes });
    return json(200, { client_id, client_secret });
  } catch (err) {
    if (err instanceof DuplicateName) {
      return json(409, { error: "conflict", error_description: "name already registered" });
    }
    throw err;
  }
}
