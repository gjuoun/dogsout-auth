import { useState } from "react";
import { Badge } from "@gjuoun/bigface-shadcn-ui/components/ui/badge";
import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@gjuoun/bigface-shadcn-ui/components/ui/table";
import { formatTime } from "../lib/format";
import type { Instance } from "../lib/data";
import { viewHref } from "../lib/link";
import { CopyButton, MetaChip, StatusBadge, Timeline, SessionLog } from "../lib/ui";
import type { ScreenProps } from "../lib/state";

export function PanelScreen({ s, list, current }: ScreenProps) {
  if (s.dir === "v2") return <PanelV2 list={list} s={s} selected={current} />;
  if (s.dir === "v3") return <PanelV3 list={list} s={s} />;
  return <PanelV1 list={list} s={s} />;
}

type P = { list: Instance[]; s: ScreenProps["s"] };

function EmptyList({ s }: { s: ScreenProps["s"] }) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyTitle>No instances yet.</EmptyTitle>
        <EmptyDescription>Order an agent run to see it here.</EmptyDescription>
      </EmptyHeader>
      <Button asChild><a href={viewHref(s, "order")}>Order a new instance</a></Button>
    </Empty>
  );
}

function PanelV1({ list, s }: P) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Instances</CardTitle>
        <CardDescription>Read from the cloud API. Click an id for its timeline.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {list.length === 0 ? (
          <EmptyList s={s} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono">
                      <a className="underline-offset-4 hover:underline" href={viewHref(s, "detail", i.id)}>{i.id}</a>
                    </TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(i.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button asChild><a href={viewHref(s, "order")}>Order a new instance</a></Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// V2: a full-height instance table on the left (sticky header, scrolling body) and the selected
// instance on the right. The selected row has a primary left bar and a primary-tinted background.
// Once the body scrolls, the sticky header gets a divider and a soft shadow so its layer reads apart.
function PanelV2({ list, s, selected }: P & { selected: Instance | undefined }) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">Instances</span>
          <span className="text-muted-foreground">{list.length} total</span>
        </div>
        <Button size="sm" asChild><a href={viewHref(s, "order")}>New instance</a></Button>
      </div>
      {list.length === 0 ? (
        <EmptyList s={s} />
      ) : (
        <div className="grid h-[calc(100vh-190px)] min-h-[560px] gap-4 lg:grid-cols-[400px_1fr]">
          <Card size="sm" className="min-h-0 gap-0 overflow-hidden p-0">
            <div
              className="min-h-0 flex-1 overflow-y-auto"
              onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
            >
              <Table>
                <TableHeader
                  className={
                    "sticky top-0 z-10 border-b border-border bg-card transition-shadow " +
                    (scrolled ? "shadow-[0_6px_10px_-6px_rgba(0,0,0,0.55)]" : "")
                  }
                >
                  <TableRow className="hover:bg-card">
                    <TableHead className="px-4">Instance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((i) => {
                    const on = selected?.id === i.id;
                    return (
                      <TableRow
                        key={i.id}
                        data-selected={on ? "true" : undefined}
                        className={
                          "cursor-pointer border-l-[3px] " +
                          (on
                            ? "border-l-primary bg-[color-mix(in_oklab,var(--primary)_22%,var(--card))]"
                            : "border-l-transparent")
                        }
                      >
                        <TableCell className="px-4 font-mono">
                          <a href={viewHref(s, "panel", i.id)} className="block py-0.5 hover:underline underline-offset-4">{i.id}</a>
                        </TableCell>
                        <TableCell><StatusBadge status={i.status} /></TableCell>
                        <TableCell className="pr-4 text-right text-xs text-muted-foreground">{formatTime(i.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
          {selected && (
            <Card size="sm" className="min-h-0 overflow-y-auto">
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle className="font-mono text-base">{selected.id}</CardTitle>
                  <CardDescription>created {formatTime(selected.created_at)}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <Button variant="outline" size="sm" asChild><a href={viewHref(s, "detail", selected.id)}>Open detail</a></Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div className="flex flex-wrap gap-2">
                  <MetaChip k="repo" v={selected.repo} />
                  <MetaChip k="worktree" v={selected.worktree} />
                  <MetaChip k="branch" v={selected.branch} />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">Timeline</h3>
                  <Timeline inst={selected} compact />
                </div>
                <SessionLog path={selected.session_log_path} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function PanelV3({ list, s }: P) {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <header className="flex items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Activity</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your instances</h1>
        </div>
        <Button variant="outline" asChild><a href={viewHref(s, "order")}>New</a></Button>
      </header>
      {list.length === 0 ? (
        <EmptyList s={s} />
      ) : (
        list.map((i) => (
          <a key={i.id} href={viewHref(s, "detail", i.id)} className="grid gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/30">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-base">{i.id}</span>
              <StatusBadge status={i.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {i.events[i.events.length - 1]?.message ?? "No events yet."}
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{formatTime(i.created_at)}</Badge>
              {i.branch && <Badge variant="outline">{i.branch}</Badge>}
            </div>
          </a>
        ))
      )}
    </div>
  );
}
