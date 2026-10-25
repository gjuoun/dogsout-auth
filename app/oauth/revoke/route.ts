import { trace } from "@/lib/store";
import { authenticateClient } from "@/lib/client-auth";
import { revokeToken } from "@/lib/revoke";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

// RFC 7009. The client says "this token is mine, kill it". Success is 200 for
// anything we cannot act on: telling a caller whether a token existed, whose it
// was, or whether it had already expired would make this an oracle. Only a bad
// client credential is an error (2.2.1), because that is about the caller.
export async function POST(req: Request) {
  let form: Record<string, string>;
  try {
    form = Object.fromEntries(await req.formData()) as Record<string, string>;
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "revocation takes a form-encoded body" },
      { status: 400, headers: NO_STORE },
    );
  }

  const auth = authenticateClient(req, form);
  if (!auth.ok) {
    trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/revoke",
      note: "REJECTED: revocation needs the client credentials of the token owner." });
    return Response.json(
      { error: "invalid_client", error_description: "Revocation requires client authentication" },
      { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": 'Basic realm="dogsout-auth"' } },
    );
  }

  if (!form.token) {
    return Response.json(
      { error: "invalid_request", error_description: "token is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  // token_type_hint is a hint: RFC 7009 lets the server ignore it, and we do.
  const outcome = await revokeToken(form.token, auth.client.client_id);
  trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/revoke",
    note: outcome === "access"
      ? "Access token revoked: its jti is on the revocation list until the token expires."
      : outcome === "refresh"
        ? "Refresh token revoked with its whole family: rotation is dead from here."
        : outcome === "foreign"
          ? "Token belongs to another client. Left untouched, still answering 200: never an oracle."
          : "Token not one we can act on. Still 200, with an empty body: never an oracle.",
    detail: { client_id: auth.client.client_id, outcome } });

  return new Response(null, { status: 200, headers: NO_STORE });
}