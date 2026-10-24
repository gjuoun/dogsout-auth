import { cookies } from "next/headers";
import { db, findUser, listPasskeys } from "@/lib/store";
import { registrationOptionsFor } from "@/lib/webauthn";

export async function GET() {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.json({ error: "not signed in" }, { status: 401 });
  const user = findUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 401 });

  const { ceremonyId, options } = await registrationOptionsFor({
    user: { id: user.id, username: user.username, name: user.name },
    excludeCredentialIds: listPasskeys(user.id).map((p) => p.credential_id),
  });
  return Response.json({ ceremonyId, options });
}
