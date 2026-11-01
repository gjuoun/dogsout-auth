"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Session log slot. With a path: the path on one line (horizontal scroll, never folded), a Copy
// button, and a View log entry that stays disabled until the log viewer exists.
// Without a path: "未产生" and nothing else.
export function SessionLog({ path }: { path?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!path) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Session log: 未产生
      </div>
    );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(path!);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">Session log</div>
      <div className="min-w-0 overflow-x-auto pb-1">
        <code className="block w-max whitespace-nowrap font-mono text-xs text-foreground">{path}</code>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy path"}
        </Button>
        <Button variant="outline" size="sm" disabled title="View log is not wired yet">View log</Button>
      </div>
    </div>
  );
}
