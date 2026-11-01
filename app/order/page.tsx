import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CopyButton from "@/components/CopyButton";

// Session-gated order form. The submit goes to /order/submit, which calls the cloud API.
// After a successful order the form is replaced by the result, so the order is visibly accepted.
export default async function Order({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sid = (await cookies()).get("op_session")?.value;
  const userId = sid ? db.sessions.get(sid) : undefined;
  if (!userId) redirect("/login");
  const sp = await searchParams;
  const created = Boolean(sp.created);

  return (
    <div className="bf mx-auto grid max-w-[1000px] gap-6 py-2 lg:grid-cols-[1fr_300px]">
      {created ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Instance {sp.created} is deploying</CardTitle>
            <CardDescription>The activation code is shown once. Copy it now.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 rounded-lg border border-border bg-background p-4">
              <div className="text-xs text-muted-foreground">Activation code</div>
              <div className="flex items-center justify-between gap-3">
                <pre className="json font-mono text-lg tracking-wider">{sp.code}</pre>
                <CopyButton value={sp.code ?? ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" asChild><a href="/order">Order another</a></Button>
              <Button asChild><a href={`/panel/${encodeURIComponent(sp.created)}`}>View instance</a></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>New instance</CardTitle>
              <CardDescription>Task and target. Optional fields narrow the working copy.</CardDescription>
            </CardHeader>
            <CardContent>
              {sp.error && <p role="alert" className="mb-4 text-sm text-destructive">{sp.error}</p>}
              <form method="POST" action="/order/submit" className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="task">Task</Label>
                  <Textarea id="task" name="task" rows={4} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="repo">Repo</Label>
                    <Input id="repo" name="repo" className="font-mono text-xs" placeholder="owner/name" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="worktree">Worktree</Label>
                    <Input id="worktree" name="worktree" className="font-mono text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="branch">Branch</Label>
                    <Input id="branch" name="branch" className="font-mono text-xs" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <fieldset className="grid gap-2">
                    <legend className="mb-1.5 text-sm font-medium">Scopes</legend>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox defaultChecked disabled />
                      secrets:read <span className="text-muted-foreground">(required)</span>
                    </label>
                  </fieldset>
                  <Button type="submit">Create instance</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row k="agent_type" v="june-agent" />
              <Row k="scopes" v="secrets:read" />
              <Row k="activation" v="issued once, on result" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="font-mono text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-sm">{v}</span>
    </div>
  );
}
