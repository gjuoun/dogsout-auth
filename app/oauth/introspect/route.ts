import { trace } from "@/lib/store";
import { authenticateClient } from "@/lib/client-auth";
import { introspectToken } from "@/lib/introspect";

const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

// RFC 7662. A resource server (or the client that holds the token) asks: is this
// token live, and what does it authorise? The answer is the whole response — for
// anything we cannot vouch for it is a bare {"active": false}, never an error.
export async function POST(req: Request) {
  let form: Record<string, string>;
  try {
    form = Object.fromEntries(await req.formData()) as Record<string, string>;
  } catch {
    return Response.json(
      { error: "invalid_request", error_description: "introspection takes a form-encoded body" },
      { status: 400, headers: NO_STORE },
    );
  }

  const auth = authenticateClient(req, form);
  if (!auth.ok) {
    trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/introspect",
      note: "REJECTED: introspection needs client credentials of its own." });
    return Response.json(
      { error: "invalid_client", error_description: "Introspection requires client authentication" },
      { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": 'Basic realm="dogsout-auth"' } },
    );
  }

  if (!form.token) {
    return Response.json(
      { error: "invalid_request", error_description: "token is required" },
      { status: 400, headers: NO_STORE },
    );
  }

  // A client may only ask about its own tokens; anyone else's answers active:false.
  const body = await introspectToken(form.token, auth.client.client_id);
  trace({ channel: "back", actor: "client", method: "POST", path: "/oauth/introspect",
    note: body.active
      ? "Token verified. Returning its claims — active:true."
      : "Not a token we can vouch for. Bare {active:false}: never leak why.",
    detail: { client_id: auth.client.client_id, active: body.active } });

  return Response.json(body, { headers: NO_STORE });
}
