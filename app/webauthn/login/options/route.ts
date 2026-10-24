import { findUserByUsername, listPasskeys } from "@/lib/store";
import { authenticationOptionsFor, registrationOptionsFor } from "@/lib/webauthn";

/**
 * Username-first ceremony starter. Resolves the human from the typed username,
 * then answers with either an assertion ceremony restricted to that human's
 * credentials, or — when they have none yet — a registration ceremony that
 * doubles as first sign-in.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: string };
  const username = String(body.username ?? "").trim();
  const user = findUserByUsername(username);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });

  const credentialIds = listPasskeys(user.id).map((p) => p.credential_id);
  if (credentialIds.length === 0) {
    const { ceremonyId, options } = await registrationOptionsFor({
      user: { id: user.id, username: user.username, name: user.name },
      excludeCredentialIds: credentialIds,
    });
    return Response.json({ mode: "reg", ceremonyId, options });
  }

  const { ceremonyId, options } = await authenticationOptionsFor(credentialIds, user.id);
  return Response.json({ mode: "auth", ceremonyId, options });
}