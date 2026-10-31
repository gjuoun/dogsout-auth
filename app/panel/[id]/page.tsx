import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, getInstance, CloudUnavailable } from "@/lib/cloud";

// Timeline view of one instance: events newest first, plus meta chips and the session log path.
export default async function PanelDetail({ params }: { params: Promise<{ id: string }> }) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");
  const { id } = await params;

  let inst: Awaited<ReturnType<typeof getInstance>>;
  try {
    inst = await getInstance(cloudConfigFromEnv(), id);
  } catch (err) {
    const msg = err instanceof CloudUnavailable ? err.message : "could not load the instance";
    return (
      <div className="card narrow">
        <p className="err">{msg}</p>
        <Link href="/panel">Back to panel</Link>
      </div>
    );
  }
  if (!inst) notFound();
  const events = [...inst.events].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const chips = [
    ["repo", inst.repo],
    ["worktree", inst.worktree],
    ["branch", inst.branch],
  ].filter((c): c is [string, string] => Boolean(c[1]));

  return (
    <div className="card narrow">
      <div className="brand">🏛️ YourID — {inst.id}</div>
      <p className="muted">{inst.status} · {inst.created_at}</p>
      <div className="row wrap">
        {chips.map(([k, v]) => (
          <span key={k} className="chip mono">{k}: {v}</span>
        ))}
      </div>
      {inst.session_log_path && (
        <p className="hint">session log: <code>{inst.session_log_path}</code></p>
      )}
      <ol>
        {events.map((e, i) => (
          <li key={i}><b>{e.type}</b> · {e.message} <span className="muted">{e.ts}</span></li>
        ))}
      </ol>
      <Link href="/panel">Back to panel</Link>
    </div>
  );
}
