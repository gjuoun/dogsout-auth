import { cookies } from "next/headers";
import { db, deleteClient, trace } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

export async function POST(req: Request) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login", 302);

  const form = await req.formData();
  const client_id = String(form.get("client_id") ?? "");
  deleteClient(client_id);
  trace({ channel: "internal", actor: "user", method: "POST", path: "/admin/revoke",
    note: "Agent revoked from the registry: client row, grants and tokens dropped." });
  return Response.redirect(ISSUER + "/admin", 302);
}
