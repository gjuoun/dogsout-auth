import { cookies } from "next/headers";
import { db, findUser, rid, savePasskey, trace, updatePasskeyCounter } from "@/lib/store";
import { verifyAuthentication, verifyRegistration } from "@/lib/webauthn";
import { nextStep } from "@/lib/authorize";

/**
 * Finishes a username-first ceremony: assertion (`auth`) or first-login
 * registration (`reg`), then mints the provider session and hands the browser
 * the URL to continue to. Failures are JSON 400 on purpose — the client calls
 * this with `fetch`, which would silently follow a 302 and lose the error.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    ceremonyId?: string;
    mode?: string;
    credential?: { id?: string };
    req?: string;
  };
  const ceremonyId = body.ceremonyId ?? "";
  const reqId = body.req ?? "";

  let userId: string | undefined;

  if (body.mode === "reg") {
    const result = await verifyRegistration({ ceremonyId, credential: body.credential });
    if (!result.ok) {
      trace({ channel: "internal", actor: "provider", method: "POST", path: "/webauthn/login",
        note: "First-login passkey registration REJECTED." });
      return Response.json({ ok: false, error: "registration failed" }, { status: 400 });
    }
    userId = result.userId;
    savePasskey({
      credential_id: result.credential.id,
      user_id: userId,
      public_key: result.credential.publicKey,
      counter: result.credential.counter,
      transports: result.credential.transports,
      backed_up: result.credential.backed_up,
      name: "passkey " + new Date().toISOString().slice(0, 10),
    });
  } else {
    const result = await verifyAuthentication({
      ceremonyId,
      credentialId: body.credential?.id ?? "",
      credential: body.credential,
    });
    if (!result.ok) {
      trace({ channel: "internal", actor: "provider", method: "POST", path: "/webauthn/login",
        note: "Passkey assertion REJECTED." });
      return Response.json({ ok: false, error: "assertion failed" }, { status: 400 });
    }
    userId = result.userId;
    updatePasskeyCounter(body.credential?.id ?? "", result.counter);
  }

  const user = userId ? findUser(userId) : null;
  if (!user) return Response.json({ ok: false, error: "unknown user" }, { status: 400 });

  const sid = rid("sess");
  db.sessions.set(sid, user.id);
  (await cookies()).set("op_session", sid, { httpOnly: true, sameSite: "lax", path: "/" });

  trace({
    channel: "internal", actor: "provider", method: "POST", path: "/webauthn/login",
    note: body.mode === "reg"
      ? "First login: enrolled a passkey and signed in. No password was ever set."
      : "User authenticated with a PASSKEY (username first). No password involved.",
    detail: { user: user.email },
  });

  return Response.json({ ok: true, next: await nextStep(reqId) });
}