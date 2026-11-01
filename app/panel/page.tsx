import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, listInstances, CloudUnavailable } from "@/lib/cloud";
import { formatTime, statusClass } from "@/lib/format";

// Instance list. Pure read of the cloud API; the page keeps no status of its own.
export default async function Panel() {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");

  let rows: Awaited<ReturnType<typeof listInstances>> = [];
  let error = "";
  try {
    rows = await listInstances(cloudConfigFromEnv());
  } catch (err) {
    error = err instanceof CloudUnavailable ? err.message : "could not load instances";
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand">🏛️ YourID — Panel</div>
        {error && <p className="err">{error}</p>}
        {!error && rows.length === 0 && <p className="muted">No instances yet.</p>}
        {!error && rows.length > 0 && (
          <table className="plist">
            <thead>
              <tr><th>Instance</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="id"><Link href={`/panel/${encodeURIComponent(r.id)}`}>{r.id}</Link></td>
                  <td><span className={`status ${statusClass(r.status)}`}>{r.status}</span></td>
                  <td className="time">{formatTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="action"><Link className="btn primary" href="/order">Order a new instance</Link></div>
      </div>
    </div>
  );
}
