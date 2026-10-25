// RFC 7009 token revocation. The caller says "this token is mine, kill it" and
// we answer 200 whatever we find — a revocation endpoint that reports whether a
// token existed is an oracle, so "unknown", "not yours" and "already expired"
// look identical from outside while only the middle one is refused.

import { compactVerify, importJWK, type JWK } from "jose";
import { keys, ISSUER } from "@/lib/keys";
import { db } from "@/lib/store";

export type Revocation = "access" | "refresh" | "foreign" | "unknown";

/**
 * Revoke one token on behalf of the client that presented it.
 *
 * `foreign` means the token is real but was issued to a different client: we
 * leave it alone and still answer 200, so one client can neither discover nor
 * kill another client tokens.
 */
export async function revokeToken(token: string, callerClientId: string): Promise<Revocation> {
  if (!token) return "unknown";

  // Refresh tokens are opaque and the row is ours, so ownership is decidable.
  const refresh = db.refresh.get(token);
  if (refresh) {
    if (refresh.client_id !== callerClientId) return "foreign";
    // RFC 7009 2.1: killing a refresh token kills everything derived from it.
    db.revokedFamilies.add(refresh.family);
    for (const [k, t] of db.refresh) {
      if (t.family !== refresh.family || t.revoked) continue;
      t.revoked = true;
      db.refresh.set(k, t);
    }
    return "refresh";
  }

  // Access tokens are signed JWTs. Verify the signature — expiration is
  // irrelevant here: an expired token needs no record, it is inert already.
  const { publicJwk } = await keys;
  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(publicJwk as JWK, "RS256");
    const { payload: bytes } = await compactVerify(token, key);
    payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return "unknown";
  }

  // A token we did not sign, or one from another issuer, is not ours to judge.
  if (payload.iss !== ISSUER) return "unknown";
  const jti = String(payload.jti ?? "");
  const clientId = String(payload.client_id ?? "");
  if (!jti || !clientId) return "unknown";
  if (clientId !== callerClientId) return "foreign";

  const expiresAt = Number(payload.exp ?? 0) * 1000;
  if (expiresAt <= Date.now()) return "unknown";
  db.revokedTokens.add(jti, expiresAt);
  return "access";
}