// RFC 7662 token introspection. The caller hands us a token and its own client
// credentials; we answer what the token IS — never whether it was granted to the
// caller. A token belonging to somebody else is simply "not active".

import { jwtVerify, createLocalJWKSet, type JWTPayload } from "jose";
import { keys, ISSUER } from "@/lib/keys";
import { db, findUser } from "@/lib/store";

export type Introspection =
  | { active: false }
  | {
      active: true;
      scope: string;
      client_id: string;
      sub: string;
      aud: string;
      iss: string;
      exp: number;
      iat: number;
      jti: string;
      token_type: "Bearer";
      username?: string;
    };

/**
 * RFC 7009 revocation. Access tokens are stateless, so a revoked-but-unexpired
 * token still verifies; /oauth/revoke records its jti and this is the one check
 * that turns it into "not active". Nothing else about the response changes.
 */
export function isTokenRevoked(jti: string): boolean {
  return db.revokedTokens.has(jti);
}

/**
 * Who may ask about whose token. Equality today: the only introspection clients
 * are the clients themselves. A real resource-server client (one that did not
 * mint the token) widens this — it is the single place that rule lives.
 */
export function mayIntrospect(callerClientId: string, tokenClientId: string): boolean {
  return callerClientId === tokenClientId;
}

export async function introspectToken(token: string, callerClientId: string): Promise<Introspection> {
  const { publicJwk } = await keys;
  let payload: JWTPayload;
  try {
    // No audience check on purpose: the caller asks *about* a token, it is not
    // presenting one for access. Signature, issuer and exp are what matter.
    ({ payload } = await jwtVerify(token, createLocalJWKSet({ keys: [publicJwk] }), { issuer: ISSUER }));
  } catch {
    return { active: false };
  }

  const jti = String(payload.jti ?? "");
  const client_id = String(payload.client_id ?? "");
  if (!jti || !client_id) return { active: false };
  if (isTokenRevoked(jti)) return { active: false };
  if (!mayIntrospect(callerClientId, client_id)) return { active: false };

  const sub = String(payload.sub ?? "");
  const out: Introspection = {
    active: true,
    scope: String(payload.scope ?? ""),
    client_id,
    sub,
    aud: typeof payload.aud === "string" ? payload.aud : (payload.aud ?? []).join(" "),
    iss: String(payload.iss ?? ""),
    exp: Number(payload.exp ?? 0),
    iat: Number(payload.iat ?? 0),
    jti,
    token_type: "Bearer",
  };

  const user = findUser(sub);
  if (user?.username) out.username = user.username;
  return out;
}
