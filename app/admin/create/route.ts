import { cookies } from "next/headers";
import { createAgent, db } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

const g = globalThis as unknown as { __agentSecretFlash?: Map<string, string> };

export async function POST(req: Request) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login", 302);

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const redirect_uris = String(form.get("redirect_uris") ?? "")
    .split(/\s*\n\s*/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
  if (!name || redirect_uris.length === 0) {
    return Response.redirect(ISSUER + "/admin?error=invalid", 302);
  }

  const { client_id, client_secret } = createAgent({
    name,
    redirect_uris,
    scopes: ["openid", "profile", "email"],
    owner_user_id: userId,
  });

  // Show-once flash, keyed to this user.
  const flash = g.__agentSecretFlash ?? (g.__agentSecretFlash = new Map());
  flash.set(userId + client_id, client_secret);

  return Response.redirect(ISSUER + "/admin?created=" + client_id, 302);
}
