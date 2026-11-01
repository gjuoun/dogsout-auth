import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/store";
import CopyButton from "@/components/CopyButton";

// Session-gated order form. The submit goes to /order/submit, which calls the cloud API.
// After a successful order the form is replaced by the result, so it is clear the order went through.
export default async function Order({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");
  const sp = await searchParams;
  const created = Boolean(sp.created);

  return (
    <div className="page">
      <div className="card">
        <div className="brand">🏛️ YourID — Order an agent run</div>
        {sp.error && <p className="err">{sp.error}</p>}
        {created ? (
          <div>
            <h2>Instance {sp.created} is deploying</h2>
            <p className="muted">The activation code is shown once. Copy it now.</p>
            <div className="codebox">
              <pre className="json small">{sp.code}</pre>
              <CopyButton value={sp.code ?? ""} />
            </div>
            <div className="row">
              <a className="btn" href="/order">Order another</a>
              <a className="btn primary" href={`/panel/${encodeURIComponent(sp.created)}`}>View instance</a>
            </div>
          </div>
        ) : (
          <form method="POST" action="/order/submit">
            <label>Task<textarea name="task" rows={3} required /></label>
            <fieldset>
              <legend>Scopes</legend>
              <label className="check"><input type="checkbox" name="scopes" value="secrets:read" defaultChecked disabled /> secrets:read</label>
            </fieldset>
            <label>Repo (optional)<input name="repo" /></label>
            <label>Worktree (optional)<input name="worktree" /></label>
            <label>Branch (optional)<input name="branch" /></label>
            <div className="action"><button className="primary" type="submit">Create instance</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
