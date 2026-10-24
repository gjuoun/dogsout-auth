// Who may receive a token, and for which resource server (RFC 8707). One table,
// one function — a second resource server registers here and nowhere else.

export const DEFAULT_AUDIENCE = "notes-api";

/** scope -> the resource server that scope grants access to. */
const SCOPE_AUDIENCE: Record<string, string> = {
  "notes:read": "notes-api",
  "notes:write": "notes-api",
};

/** Every audience a token may legitimately be minted for. */
export const KNOWN_AUDIENCES = new Set<string>([...Object.values(SCOPE_AUDIENCE), DEFAULT_AUDIENCE]);

export type Audience = { aud: string } | { error: "invalid_target" };

/**
 * Resolve an access token's audience. An explicit `resource` (the RFC 8707
 * parameter a client sends with a grant) is honoured only when it is a
 * registered audience — otherwise a client could mint itself a token that some
 * other API would accept as its own.
 */
export function audienceForScope(scope: string[], resource?: string): Audience {
  if (resource) return KNOWN_AUDIENCES.has(resource) ? { aud: resource } : { error: "invalid_target" };
  for (const s of scope) {
    const aud = SCOPE_AUDIENCE[s];
    if (aud) return { aud };
  }
  return { aud: DEFAULT_AUDIENCE };
}

/** A grant with no `resource` override always resolves — never an error. */
export function audienceOf(scope: string[]): string {
  const a = audienceForScope(scope);
  return "error" in a ? DEFAULT_AUDIENCE : a.aud;
}
