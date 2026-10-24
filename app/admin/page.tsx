import { cookies } from "next/headers";
import { db, listClients } from "@/lib/store";
import { ISSUER } from "@/lib/keys";

// Single-user system: any signed-in human is the admin.
// The secret of a just-created agent is shown exactly once (in-memory flash).
const g = globalThis as unknown as { __agentSecretFlash?: Map<string, string> };
const flash = g.__agentSecretFlash ?? (g.__agentSecretFlash = new Map());

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) {
    return (
      <div className="card narrow">
        <div className="brand">🏛️ YourID — Agents</div>
        <p className="muted">Not signed in. <a href={"/login?next=admin"}>Sign in</a> first.</p>
      </div>
    );
  }

  const clients = listClients();
  const agents = clients.filter((c) => c.kind === "agent");
  const createdSecret = sp.created ? flash.get(userId + sp.created) : undefined;
  if (sp.created && createdSecret) flash.delete(userId + sp.created);

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — Agent registry</div>
      <p className="muted">
        An agent is a machine client with its own credentials. Register it once, hand it
        the secret once, then watch and revoke from here.
      </p>

      {createdSecret && (
        <div className="grant">
          <div>
            <b>Secret for {sp.created} — shown ONCE</b>
            <pre className="json small">{createdSecret}</pre>
          </div>
        </div>
      )}

      {agents.length === 0 && <p className="muted">No agents registered.</p>}
      {agents.map((a) => (
        <div key={a.client_id} className="grant">
          <div>
            <b>{a.name}</b>
            <div className="muted mono">{a.client_id}</div>
            <div className="muted mono">{a.redirect_uris.join(" ")}</div>
          </div>
          <form method="POST" action="/admin/revoke">
            <input type="hidden" name="client_id" value={a.client_id} />
            <button className="danger">Revoke</button>
          </form>
        </div>
      ))}

      <h3>Register an agent</h3>
      <form method="POST" action="/admin/create">
        <label>Name<input name="name" placeholder="shadow" required /></label>
        <label>Redirect URI(s), one per line, exact match
          <textarea name="redirect_uris" rows={2} placeholder={ISSUER + "/client/callback"} required /></label>
        <button className="primary" type="submit">Create agent</button>
      </form>
      <p className="hint">
        Scopes default to openid profile email. The secret appears once after creation —
        store it in the agent&apos;s own secret slot, never in a file.
      </p>
    </div>
  );
}
