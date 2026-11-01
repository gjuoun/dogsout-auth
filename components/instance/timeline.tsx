import { formatTime } from "@/lib/format";
import type { TimelineEvent } from "@/lib/cloud";

// Events newest first. A vertical rail joins the nodes; the rail is muted ink so it reads on the
// dark card. The event type is a small tag, the time is tabular, the message is plain text.
export function Timeline({ events, compact = false }: { events: TimelineEvent[]; compact?: boolean }) {
  const sorted = [...events].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  if (sorted.length === 0) return <p className="text-sm text-muted-foreground">No events yet.</p>;
  return (
    <ol className="grid">
      {sorted.map((e, idx) => {
        const last = idx === sorted.length - 1;
        return (
          <li key={idx} className="grid grid-cols-[14px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 inline-block size-2.5 rounded-full bg-primary ring-2 ring-card" aria-hidden />
              {!last && <span className="mt-1 w-0.5 flex-1 bg-muted-foreground/75" aria-hidden />}
            </div>
            <div className={"grid gap-0.5 " + (compact ? "pb-3" : "pb-4")}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded border border-border px-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{e.type}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatTime(e.ts)}</span>
              </div>
              <div className="text-sm">{e.message}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
