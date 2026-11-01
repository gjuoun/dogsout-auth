import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/format";
import type { InstanceDetail } from "@/lib/cloud";
import { MetaChip, StatusBadge } from "@/components/instance/status";
import { Timeline } from "@/components/instance/timeline";
import { SessionLog } from "@/components/instance/session-log";

// Right-hand preview on the panel: meta chips, a compact timeline and the session log slot.
// The full timeline lives on the detail page.
export function PanelDetail({ inst }: { inst: InstanceDetail }) {
  return (
    <Card size="sm" className="min-h-0 overflow-y-auto">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4">
        <div className="grid gap-1">
          <CardTitle className="font-mono text-base">{inst.id}</CardTitle>
          <CardDescription>created {formatTime(inst.created_at)}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={inst.status} />
          <Button variant="outline" size="sm" asChild><Link href={`/panel/${encodeURIComponent(inst.id)}`}>Open detail</Link></Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 px-4">
        <div className="flex flex-wrap gap-2">
          <MetaChip k="repo" v={inst.repo} />
          <MetaChip k="worktree" v={inst.worktree} />
          <MetaChip k="branch" v={inst.branch} />
        </div>
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Timeline</h3>
          <Timeline events={inst.events ?? []} compact />
        </div>
        <SessionLog path={inst.session_log_path} />
      </CardContent>
    </Card>
  );
}
