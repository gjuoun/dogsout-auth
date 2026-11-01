import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Badge } from "@gjuoun/bigface-shadcn-ui/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/card";
import { formatTime } from "../lib/format";
import type { Instance } from "../lib/data";
import { viewHref } from "../lib/link";
import { MetaChip, SessionLog, StatusBadge, Timeline } from "../lib/ui";
import type { ScreenProps } from "../lib/state";

export function DetailScreen({ s, current }: ScreenProps) {
  const inst = current;
  if (!inst) return null;
  if (s.dir === "v2") return <DetailV2 inst={inst} s={s} />;
  if (s.dir === "v3") return <DetailV3 inst={inst} s={s} />;
  return <DetailV1 inst={inst} s={s} />;
}

type D = { inst: Instance; s: ScreenProps["s"] };

function Meta({ inst }: { inst: Instance }) {
  return (
    <>
      <MetaChip k="repo" v={inst.repo} />
      <MetaChip k="worktree" v={inst.worktree} />
      <MetaChip k="branch" v={inst.branch} />
    </>
  );
}

function DetailV1({ inst, s }: D) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="font-mono">{inst.id}</CardTitle>
          <StatusBadge status={inst.status} />
        </div>
        <CardDescription>created {formatTime(inst.created_at)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap gap-2"><Meta inst={inst} /></div>
        <Timeline inst={inst} />
        <SessionLog path={inst.session_log_path} />
        <div className="flex justify-end">
          <Button variant="outline" asChild><a href={viewHref(s, "panel")}>Back to panel</a></Button>
        </div>
      </CardContent>
    </Card>
  );
}

// V2 detail: a header strip, then the timeline filling the remaining height beside the session log.
function DetailV2({ inst, s }: D) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="font-mono text-sm font-medium">{inst.id}</span>
        <StatusBadge status={inst.status} />
        <span className="text-xs text-muted-foreground">created {formatTime(inst.created_at)}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Meta inst={inst} />
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
            <CardDescription>{inst.events.length} events, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline inst={inst} />
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <Card size="sm">
            <CardHeader><CardTitle className="text-sm">Session log</CardTitle></CardHeader>
            <CardContent><SessionLog path={inst.session_log_path} /></CardContent>
          </Card>
          <Button variant="outline" asChild><a href={viewHref(s, "panel")}>Back to panel</a></Button>
        </div>
      </div>
    </div>
  );
}

function DetailV3({ inst, s }: D) {
  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <a href={viewHref(s, "panel")} className="text-sm text-muted-foreground hover:text-foreground">← All instances</a>
      <header className="grid gap-3">
        <p className="font-mono text-sm text-muted-foreground">{inst.id}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{inst.branch ?? inst.repo ?? "Instance"}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <StatusBadge status={inst.status} />
          <span>created {formatTime(inst.created_at)}</span>
        </div>
      </header>
      <div className="flex flex-wrap gap-2"><Meta inst={inst} /></div>
      <Timeline inst={inst} story />
      <SessionLog path={inst.session_log_path} />
    </div>
  );
}
