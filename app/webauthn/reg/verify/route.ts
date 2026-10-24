import { cookies } from "next/headers";
import { db, savePasskey } from "@/lib/store";
import { verifyRegistration } from "@/lib/webauthn";
import { ISSUER } from "@/lib/keys";

export async function POST(req: Request) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login", 302);

  const body = (await req.json()) as { ceremonyId?: string; credential?: unknown; name?: string };
  const result = await verifyRegistration({
    ceremonyId: body.ceremonyId ?? "",
    credential: body.credential,
  });
  if (!result.ok) return Response.redirect(ISSUER + "/account?passkey=failed", 302);

  savePasskey({
    credential_id: result.credential.id,
    user_id: userId,
    public_key: result.credential.publicKey,
    counter: result.credential.counter,
    transports: result.credential.transports,
    backed_up: result.credential.backed_up,
    name: body.name?.slice(0, 60) || "passkey",
  });
  return Response.redirect(ISSUER + "/account?passkey=added", 302);
}
