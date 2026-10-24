import { cookies } from "next/headers";
import { db, deletePasskey } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

export async function POST(req: Request) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login", 302);

  const form = await req.formData();
  const credential_id = String(form.get("credential_id") ?? "");
  if (credential_id) deletePasskey(credential_id);
  return Response.redirect(ISSUER + "/account?passkey=removed", 302);
}
