// Verifies a spawn token (an access token minted by client_credentials) for a resource server.
// The check is local: the RS256 signature against our own published key, then issuer, expiry,
// audience and the revocation list. No network introspection, because we signed the token.

import { jwtVerify, createLocalJWKSet, errors as joseErrors } from "jose";
import { keys, ISSUER } from "@/lib/keys";
import { isTokenRevoked } from "@/lib/introspect";

export type SpawnClaims = { sub: string; client_id: string; scope: string[]; jti: string };
export type SpawnCheck =
  | { ok: true; claims: SpawnClaims }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" };

/** Verify `Authorization: Bearer <token>` for one audience. Every failure says why, for the caller's 401 log. */
export async function verifySpawnToken(token: string, audience: string): Promise<SpawnCheck> {
  if (!token) return { ok: false, reason: "missing" };
  const { publicJwk } = await keys;
  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet({ keys: [publicJwk] }), {
      issuer: ISSUER,
      audience,
      algorithms: ["RS256"],
    });
    const jti = String(payload.jti ?? "");
    if (!jti || isTokenRevoked(jti)) return { ok: false, reason: "revoked" };
    return {
      ok: true,
      claims: {
        sub: String(payload.sub ?? ""),
        client_id: String(payload.client_id ?? ""),
        scope: String(payload.scope ?? "").split(" ").filter(Boolean),
        jti,
      },
    };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { ok: false, reason: "expired" };
    return { ok: false, reason: "invalid" };
  }
}
