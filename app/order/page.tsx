import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/store";

// Session-gated order form. The submit goes to /order/submit, which calls the cloud API.
export default async function Order({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");
  const sp = await searchParams;

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — Order an agent run</div>
      {sp.error && <p className="err">{sp.error}</p>}
      {sp.created && (
        <div className="grant">
          <div>
            <b>Instance {sp.created} is deploying.</b>
            <p className="muted">Activation code, shown ONCE. Copy it now:</p>
            <pre className="json small">{sp.code}</pre>
          </div>
        </div>
      )}
      <form method="POST" action="/order/submit">
        <label>Task<textarea name="task" rows={3} required /></label>
        <fieldset>
          <legend>Scopes</legend>
          <label><input type="checkbox" name="scopes" value="secrets:read" defaultChecked disabled /> secrets:read</label>
        </fieldset>
        <label>Repo (optional)<input name="repo" /></label>
        <label>Worktree (optional)<input name="worktree" /></label>
        <label>Branch (optional)<input name="branch" /></label>
        <button className="primary" type="submit">Create instance</button>
      </form>
    </div>
  );
}
