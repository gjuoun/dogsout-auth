import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, getInstance, listInstances, CloudUnavailable } from "@/lib/cloud";
import { formatTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/instance/status";
import { AppHeader } from "@/components/instance/app-header";
import { SPACING } from "@/lib/spacing";
import { PanelDetail } from "@/components/instance/panel-detail";

// Master-detail: the instance list on the left (sticky header, scrolling body, selected row marked),
// the selected instance on the right. Pure read of the cloud API; the page keeps no status of its own.
export default async function Panel({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");

  const sp = await searchParams;
  let rows: Awaited<ReturnType<typeof listInstances>> = [];
  let error = "";
  try {
    rows = await listInstances(cloudConfigFromEnv());
  } catch (err) {
    error = err instanceof CloudUnavailable ? err.message : "could not load instances";
  }

  // The selected row is the one in the URL, or the first row when none is given.
  const selectedId = sp.selected && rows.some((r) => r.id === sp.selected) ? sp.selected : rows[0]?.id;
  const selected = !error && selectedId ? await loadSelected(selectedId) : null;

  return (
    <div className="bf-shell">
    <AppHeader active="instances" />
    <div className="bf mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Instances</span>
          <span className="text-muted-foreground">{rows.length} total</span>
        </div>
        <Button size="sm" asChild><Link href="/order">New instance</Link></Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!error && rows.length === 0 && (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-10 text-center">
            <p className="font-medium">No instances yet.</p>
            <p className="text-sm text-muted-foreground">Order an agent run to see it here.</p>
            <Button asChild><Link href="/order">Order a new instance</Link></Button>
          </CardContent>
        </Card>
      )}
      {!error && rows.length > 0 && (
        <div className={`grid h-[calc(100vh-190px)] min-h-[560px] w-full ${SPACING.columnGap} lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]`}>
          <Card size="sm" className="min-h-0 gap-0 overflow-hidden p-0">
            <div className={`min-h-0 flex-1 overflow-y-auto ${SPACING.cardPad}`}>
              <table className="plist w-full table-fixed">
                <colgroup>
                  <col />
                  <col className="w-[88px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-border bg-card">
                  <tr>
                    <th className={`min-w-0 text-left ${SPACING.headerGap}`}>Instance</th>
                    <th className={`whitespace-nowrap text-left ${SPACING.headerGap}`}>Status</th>
                    <th className={`whitespace-nowrap pr-4 text-right ${SPACING.headerGap}`}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const on = selectedId === r.id;
                    return (
                      <tr
                        key={r.id}
                        data-selected={on ? "true" : undefined}
                        className={`${SPACING.rowHeight} ${on ? "bg-[color-mix(in_oklab,var(--primary)_22%,var(--card))]" : ""}`}
                      >
                        <td className={`id relative min-w-0 ${SPACING.cellPadY} ${on ? "before:absolute before:inset-y-0 before:-left-4 before:w-[3px] before:bg-primary" : ""}`}>
                          <Link href={`/panel?selected=${encodeURIComponent(r.id)}`} title={r.id} className="block min-w-0 truncate py-0.5 hover:underline underline-offset-4">{r.id}</Link>
                        </td>
                        <td className={SPACING.cellPadY}><StatusBadge status={r.status} /></td>
                        <td className={`time whitespace-nowrap ${SPACING.cellPadY} pr-4 text-right text-xs text-muted-foreground`}>{formatTime(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {selected && <PanelDetail inst={selected} />}
        </div>
      )}
    </div>
    </div>
  );
}

async function loadSelected(id: string) {
  try {
    return await getInstance(cloudConfigFromEnv(), id);
  } catch {
    return null;
  }
}
