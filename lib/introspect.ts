// RFC 7662 token introspection. The caller hands us a token and its own client
// credentials; we answer what the token IS — never whether it was granted to the
// caller. A token belonging to somebody else is simply "not active".

import { jwtVerify, createLocalJWKSet, type JWTPayload } from "jose";
import { keys, ISSUER } from "@/lib/keys";
import { db, findUser, type Client } from "@/lib/store";

/** Scope that lets a registered service client introspect any token (the cloud API holds one). */
export const INTROSPECT_SCOPE = "as:introspect";

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
 * Who may ask about whose token. A client may always introspect its own tokens.
 * A client registered with the as:introspect scope may introspect any token; that
 * is the service client the cloud API uses to verify spawn tokens. The scope is read
 * from the registry row, never from the caller's token, so a caller cannot grant
 * itself the right.
 */
export function mayIntrospect(caller: Pick<Client, "client_id" | "scopes">, tokenClientId: string): boolean {
  if (caller.client_id === tokenClientId) return true;
  return caller.scopes.includes(INTROSPECT_SCOPE);
}

export async function introspectToken(token: string, caller: Pick<Client, "client_id" | "scopes">): Promise<Introspection> {
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
  if (!mayIntrospect(caller, client_id)) return { active: false };

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
