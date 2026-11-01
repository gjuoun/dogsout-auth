import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, getInstance, CloudUnavailable } from "@/lib/cloud";
import { formatTime, statusClass } from "@/lib/format";

// Timeline of one instance, newest event first, with the meta chips and the session log slot.
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
      <div className="page">
        <div className="card">
          <p className="err">{msg}</p>
          <Link href="/panel">Back to panel</Link>
        </div>
      </div>
    );
  }
  if (!inst) notFound();
  const events = [...(inst.events ?? [])].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const meta: [string, string | undefined][] = [
    ["repo", inst.repo],
    ["worktree", inst.worktree],
    ["branch", inst.branch],
  ];

  return (
    <div className="page">
      <div className="card">
        <div className="brand">🏛️ YourID — {inst.id}</div>
        <span className={`status ${statusClass(inst.status)}`}>{inst.status}</span>
        <span className="muted" style={{ marginLeft: 10 }}>created {formatTime(inst.created_at)}</span>
        <div className="chips">
          {meta.map(([k, v]) => (
            <span key={k} className={v ? "chip" : "chip empty"}>{k}: {v ?? "—"}</span>
          ))}
        </div>
        <h3>Timeline</h3>
        {events.length === 0 && <p className="muted">No events yet.</p>}
        <ol className="tl">
          {events.map((e, i) => (
            <li key={i}>
              <div className="evhead">
                <span className="evtype">{e.type}</span>
                <span className="evtime">{formatTime(e.ts)}</span>
              </div>
              <div className="evmsg">{e.message}</div>
            </li>
          ))}
        </ol>
        <div className="slot">
          Session log: {inst.session_log_path ? <code>{inst.session_log_path}</code> : "未产生"}
        </div>
        <div className="action"><Link className="btn" href="/panel">Back to panel</Link></div>
      </div>
    </div>
  );
}
