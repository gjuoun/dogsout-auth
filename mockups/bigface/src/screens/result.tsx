import { Alert, AlertDescription, AlertTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/alert";
import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/card";
import { ACTIVATION_CODES } from "../lib/data";
import { viewHref } from "../lib/link";
import { CopyButton, StatusBadge } from "../lib/ui";
import type { ScreenProps } from "../lib/state";
import type { Status } from "../lib/data";

export function ResultScreen({ s, current }: ScreenProps) {
  const inst = current;
  if (!inst) return null;
  const code = ACTIVATION_CODES[inst.id] ?? "AC-XXXX-XXXX-XXXX";
  if (s.dir === "v2") return <ResultV2 id={inst.id} status={inst.status} code={code} s={s} />;
  if (s.dir === "v3") return <ResultV3 id={inst.id} status={inst.status} code={code} s={s} />;
  return <ResultV1 id={inst.id} status={inst.status} code={code} s={s} />;
}

type R = { id: string; status: Status; code: string; s: ScreenProps["s"] };

function ResultV1({ id, status, code, s }: R) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Instance {id} is deploying</CardTitle>
        <CardDescription>The activation code is shown once. Copy it now.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-sm text-muted-foreground">created just now</span>
        </div>
        <div className="grid gap-2 rounded-lg border border-border bg-background p-4">
          <div className="text-xs text-muted-foreground">Activation code</div>
          <div className="flex items-center justify-between gap-3">
            <pre className="font-mono text-lg tracking-wider">{code}</pre>
            <CopyButton value={code} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" asChild><a href={viewHref(s, "order")}>Order another</a></Button>
        <Button asChild><a href={viewHref(s, "detail", id)}>View instance</a></Button>
      </CardFooter>
    </Card>
  );
}

function ResultV2({ id, status, code, s }: R) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="grid gap-1">
            <CardTitle className="font-mono text-base">{id}</CardTitle>
            <CardDescription>Deploying. Activation code is shown once.</CardDescription>
          </div>
          <StatusBadge status={status} />
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-[120px_1fr] items-center gap-2 rounded-md border border-border p-3">
            <span className="text-xs text-muted-foreground">activation_code</span>
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-sm">{code}</code>
              <CopyButton value={code} />
            </div>
          </div>
          <Alert>
            <AlertTitle>Save it now</AlertTitle>
            <AlertDescription>This code is not shown again after you leave this page.</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" asChild><a href={viewHref(s, "order")}>Order another</a></Button>
          <Button asChild><a href={viewHref(s, "detail", id)}>View instance</a></Button>
        </CardFooter>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle className="text-sm">Next</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>1. Paste the code into the agent activation prompt.</p>
          <p>2. Watch the timeline move from ordered to activated.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultV3({ id, status, code, s }: R) {
  return (
    <div className="mx-auto grid max-w-2xl gap-10">
      <section className="grid gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ordered</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your agent is being prepared.</h1>
        <p className="font-mono text-sm text-muted-foreground">{id} · <StatusBadge status={status} /></p>
      </section>
      <section className="grid gap-3 rounded-2xl border-2 border-yellow bg-card p-6">
        <p className="text-sm font-medium">One-time activation code</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <code className="font-mono text-2xl tracking-wider">{code}</code>
          <CopyButton value={code} />
        </div>
        <p className="text-sm text-muted-foreground">Shown once. Copy it before you leave.</p>
      </section>
      <div className="flex gap-3">
        <Button asChild><a href={viewHref(s, "detail", id)}>Follow this instance</a></Button>
        <Button variant="ghost" asChild><a href={viewHref(s, "order")}>Order another</a></Button>
      </div>
    </div>
  );
}
