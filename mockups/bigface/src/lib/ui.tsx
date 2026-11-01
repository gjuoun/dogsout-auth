import { useState, type ReactNode } from "react";
import { Badge } from "@gjuoun/bigface-shadcn-ui/components/ui/badge";
import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Label } from "@gjuoun/bigface-shadcn-ui/components/ui/label";
import type { EventType, Status } from "./data";
import { formatTime, sortNewestFirst } from "./format";

// Status colour, one meaning each, all from the bigface palette (the same tokens in light and dark):
// running = green, deploying = yellow (the theme's amber), done = neutral grey, failed = the
// destructive token (burnt orange, the theme's red).
export const STATUS_COLOR: Record<Status, string> = {
  running: "var(--theme-green)",
  deploying: "var(--theme-yellow)",
  done: "var(--theme-fgDim)",
  failed: "var(--destructive)",
};

const EVENT_COLOR: Record<EventType, string> = {
  ordered: "var(--theme-fgDim)",
  activated: "var(--theme-cyan)",
  secret_read: "var(--theme-blue)",
  completed: "var(--theme-green)",
  failed: "var(--destructive)",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className="gap-1.5 border-border">
      <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {status}
    </Badge>
  );
}

export function EventDot({ type, className }: { type: EventType; className?: string }) {
  return <span className={"inline-block size-2.5 rounded-full " + (className ?? "")} style={{ background: EVENT_COLOR[type] }} />;
}

// Key in muted text, value in full ink. One chip per meta field.
export function MetaChip({ k, v }: { k: string; v?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className={v ? "text-foreground" : "text-muted-foreground"}>{v ?? "—"}</span>
    </span>
  );
}

export function Field({ htmlFor, label, children }: { htmlFor: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? "Copied" : label}
    </Button>
  );
}

// Session log slot. With a path: the path, a copy button, and a view entry (placeholder, not wired).
// Without one: "未产生" and nothing else.
export function SessionLog({ path }: { path?: string }) {
  if (!path) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Session log: 未产生
      </div>
    );
  }
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">Session log</div>
      <div className="min-w-0 overflow-x-auto pb-1">
        <code className="block w-max whitespace-nowrap font-mono text-xs text-foreground">{path}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={path} label="Copy path" />
        <Button variant="outline" size="sm" disabled title="占位：查看入口待施工时接线">View log</Button>
      </div>
    </div>
  );
}

// Timeline, newest first. Compact: tight rows (V2). Story: V3 cards on a vertical rail.
// The rail is a 2px bar in muted ink so it reads against the dark card surface.
export function Timeline({ inst, compact, story }: { inst: { events: { type: EventType; message: string; ts: string }[] }; compact?: boolean; story?: boolean }) {
  const events = sortNewestFirst(inst.events);
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No events yet.</p>;
  if (story) {
    return (
      <ol className="relative grid gap-6 pl-8">
        <span className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-muted-foreground/75" aria-hidden />
        {events.map((e, idx) => (
          <li key={idx} className="relative grid gap-2">
            <span className="absolute -left-8 top-4 flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-muted-foreground/75">
              <EventDot type={e.type} className="size-2" />
            </span>
            <div className="grid gap-1 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm">{e.type}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatTime(e.ts)}</span>
              </div>
              <p className="text-sm">{e.message}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="grid">
      {events.map((e, idx) => {
        const last = idx === events.length - 1;
        return (
          <li key={idx} className="grid grid-cols-[14px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <EventDot type={e.type} className="mt-1.5 ring-2 ring-card" />
              {!last && <span className="mt-1 w-0.5 flex-1 bg-muted-foreground/75" aria-hidden />}
            </div>
            <div className={"grid gap-0.5 " + (compact ? "pb-3" : "pb-4")}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs">{e.type}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatTime(e.ts)}</span>
              </div>
              <div className="text-sm">{e.message}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
