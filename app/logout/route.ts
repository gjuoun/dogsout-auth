import { ISSUER } from "@/lib/keys";
import { db, trace } from "@/lib/store";

/** The provider session cookie. HttpOnly: script in the browser can never read it. */
const COOKIE = "op_session";

function cookieValue(header: string | null, name: string): string {
  for (const part of (header ?? "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

// LOGOUT. Ends THIS provider session and nothing else: tokens the browser already
// handed to clients stay alive, because logging out of the provider is not the
// same act as withdrawing a grant (that is /account -> Remove access).
//
// POST only: a GET logout can be triggered by any <img src> on any site.
export async function POST(req: Request) {
  const sid = cookieValue(req.headers.get("cookie"), COOKIE);
  const existed = sid ? db.sessions.delete(sid) : false;

  trace({ channel: "internal", actor: "user", method: "POST", path: "/logout",
    note: existed
      ? "Session ended. The cookie is cleared and its row is gone — it cannot be replayed."
      : "Logout with no live session. Still clears the cookie: an unknown session is not an error.",
    detail: { session: existed ? "deleted" : "absent" } });

  return new Response(null, {
    status: 302,
    headers: {
      location: ISSUER + "/",
      // Max-Age=0 expires it now; the same attributes as when it was set.
      "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
      "Cache-Control": "no-store",
    },
  });
}