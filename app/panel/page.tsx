import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, listInstances, CloudUnavailable } from "@/lib/cloud";

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
    <div className="card narrow">
      <div className="brand">🏛️ YourID — Panel</div>
      {error && <p className="err">{error}</p>}
      {!error && rows.length === 0 && <p className="muted">No instances yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="grant">
          <div>
            <Link href={`/panel/${encodeURIComponent(r.id)}`}><b>{r.id}</b></Link>
            <div className="muted">{r.status} · {r.created_at}</div>
          </div>
        </div>
      ))}
      <p className="hint"><Link href="/order">Order a new instance</Link></p>
    </div>
  );
}
