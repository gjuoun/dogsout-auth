import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/store";
import { cloudConfigFromEnv, getInstance, CloudUnavailable } from "@/lib/cloud";
import { formatTime } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaChip, StatusBadge } from "@/components/instance/status";
import { Timeline } from "@/components/instance/timeline";
import { SessionLog } from "@/components/instance/session-log";

// One instance: the full timeline on the left, the session log and the meta chips on the right.
// The columns top-align; the timeline card is as tall as its events, nothing more.
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
      <div className="bf mx-auto max-w-[1000px]">
        <Card>
          <CardContent className="grid gap-3">
            <p role="alert" className="text-sm text-destructive">{msg}</p>
            <Button variant="outline" className="w-fit" asChild><Link href="/panel">Back to panel</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!inst) notFound();

  return (
    <div className="bf mx-auto flex max-w-[1200px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="font-mono text-sm font-medium">{inst.id}</span>
        <StatusBadge status={inst.status} />
        <span className="text-xs text-muted-foreground">created {formatTime(inst.created_at)}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <MetaChip k="repo" v={inst.repo} />
          <MetaChip k="worktree" v={inst.worktree} />
          <MetaChip k="branch" v={inst.branch} />
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
            <CardDescription>{(inst.events ?? []).length} events, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline events={inst.events ?? []} />
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <Card size="sm">
            <CardHeader><CardTitle className="text-sm">Session log</CardTitle></CardHeader>
            <CardContent><SessionLog path={inst.session_log_path} /></CardContent>
          </Card>
          <Button variant="outline" asChild className="w-fit"><Link href="/panel">Back to panel</Link></Button>
        </div>
      </div>
    </div>
  );
}
