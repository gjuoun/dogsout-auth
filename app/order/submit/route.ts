import { cookies } from "next/headers";
import { db } from "@/lib/store";
import { ISSUER } from "@/lib/keys";
import { cloudConfigFromEnv, createInstance, CloudUnavailable } from "@/lib/cloud";

// Posts the order to the cloud API. The activation_code travels back in the redirect once and is
// never stored on this side; the redirect shows it one time.
export async function POST(req: Request) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) return Response.redirect(ISSUER + "/login", 302);

  const form = await req.formData();
  const task = String(form.get("task") ?? "").trim();
  if (!task) return Response.redirect(ISSUER + "/order?error=" + encodeURIComponent("task is required"), 302);
  const opt = (k: string) => (String(form.get(k) ?? "").trim() || undefined);

  try {
    const cfg = cloudConfigFromEnv();
    const made = await createInstance(cfg, {
      task,
      scopes: ["secrets:read"],
      repo: opt("repo"), worktree: opt("worktree"), branch: opt("branch"),
    });
    const q = new URLSearchParams({ created: made.id, code: made.activation_code });
    return Response.redirect(ISSUER + "/order?" + q.toString(), 302);
  } catch (err) {
    const msg = err instanceof CloudUnavailable ? err.message : "order failed";
    return Response.redirect(ISSUER + "/order?error=" + encodeURIComponent(msg), 302);
  }
}
