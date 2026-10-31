import { verifySpawnToken } from "@/lib/spawn-token";
import { SECRETS_AUDIENCE } from "@/lib/audience";
import { readSecret } from "@/lib/secrets";

// Read one secret. The caller presents a spawn token minted for secrets-api with scope secrets:read.
// Order of checks: token (401), scope (403), allowlist (404), value (200).
const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const check = await verifySpawnToken(token, SECRETS_AUDIENCE);
  if (!check.ok) return json(401, { error: "invalid_token", error_description: check.reason });
  if (!check.claims.scope.includes("secrets:read")) {
    return json(403, { error: "insufficient_scope", error_description: "secrets:read required" });
  }

  const { key } = await params;
  let value: string | null;
  try {
    value = await readSecret(key);
  } catch {
    return json(503, { error: "resolver_unavailable", error_description: "could not resolve the secret reference" });
  }
  if (value === null) return json(404, { error: "not_found" });
  return json(200, { key, value });
}
