import { Badge } from "@/components/ui/badge";
import { statusClass } from "@/lib/format";

// Status colour from the bigface palette tokens: running green, deploying amber, done neutral grey,
// failed the destructive token. The dot carries the colour; the word carries the meaning.
const DOT: Record<string, string> = {
  running: "var(--theme-green)",
  deploying: "var(--theme-yellow)",
  done: "var(--theme-fgDim)",
  failed: "var(--destructive)",
};

export function StatusBadge({ status }: { status: string }) {
  const known = statusClass(status) !== "";
  return (
    <Badge variant="outline" className="gap-1.5 border-border" data-status={status}>
      <span
        className="size-2 rounded-full"
        style={{ background: known ? DOT[status] : "var(--theme-fgDim)" }}
      />
      {status}
    </Badge>
  );
}

// Key muted, value in full ink. Missing values read as a dash.
export function MetaChip({ k, v }: { k: string; v?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className={v ? "text-foreground" : "text-muted-foreground"}>{v ?? "—"}</span>
    </span>
  );
}
