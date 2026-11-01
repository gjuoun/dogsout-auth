import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gjuoun/bigface-shadcn-ui/components/ui/card";
import { Checkbox } from "@gjuoun/bigface-shadcn-ui/components/ui/checkbox";
import { Input } from "@gjuoun/bigface-shadcn-ui/components/ui/input";
import { Textarea } from "@gjuoun/bigface-shadcn-ui/components/ui/textarea";
import { Field } from "../lib/ui";
import type { ScreenProps } from "../lib/state";

export function OrderScreen({ s }: ScreenProps) {
  if (s.dir === "v2") return <OrderV2 />;
  if (s.dir === "v3") return <OrderV3 />;
  return <OrderV1 />;
}

function Scopes() {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">Scopes</legend>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox defaultChecked disabled />
        secrets:read <span className="text-muted-foreground">(required)</span>
      </label>
    </fieldset>
  );
}

function OrderV1() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Order an agent run</CardTitle>
        <CardDescription>Describe the task. The agent starts in a new instance.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={(e) => e.preventDefault()}>
          <Field htmlFor="task" label="Task">
            <Textarea id="task" rows={3} required placeholder="What should the agent do?" />
          </Field>
          <Scopes />
          <Field htmlFor="repo" label="Repo (optional)">
            <Input id="repo" placeholder="owner/name" />
          </Field>
          <Field htmlFor="worktree" label="Worktree (optional)">
            <Input id="worktree" />
          </Field>
          <Field htmlFor="branch" label="Branch (optional)">
            <Input id="branch" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit">Create instance</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function OrderV2() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader>
          <CardTitle>New instance</CardTitle>
          <CardDescription>Task and target. Optional fields narrow the working copy.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
            <Field htmlFor="task" label="Task">
              <Textarea id="task" rows={4} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field htmlFor="repo" label="Repo">
                <Input id="repo" className="font-mono text-xs" placeholder="owner/name" />
              </Field>
              <Field htmlFor="worktree" label="Worktree">
                <Input id="worktree" className="font-mono text-xs" />
              </Field>
              <Field htmlFor="branch" label="Branch">
                <Input id="branch" className="font-mono text-xs" />
              </Field>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Scopes />
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
          <Row k="repo" v="—" />
          <Row k="activation" v="issued once, on result" />
        </CardContent>
      </Card>
    </div>
  );
}

function OrderV3() {
  return (
    <div className="mx-auto grid max-w-2xl gap-12">
      <section className="grid gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 1 of 3</p>
        <h1 className="text-3xl font-semibold tracking-tight">What should the agent do?</h1>
        <p className="text-muted-foreground">Write the job in plain words. The agent reads this first and keeps it in the timeline.</p>
        <Textarea id="task" rows={4} className="text-base" required />
      </section>
      <section className="grid gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 2 of 3</p>
        <h2 className="text-xl font-semibold tracking-tight">What may it touch?</h2>
        <Scopes />
      </section>
      <section className="grid gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 3 of 3 · optional</p>
        <h2 className="text-xl font-semibold tracking-tight">Where should it work?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input aria-label="repo" placeholder="repo" />
          <Input aria-label="worktree" placeholder="worktree" />
          <Input aria-label="branch" placeholder="branch" />
        </div>
      </section>
      <div className="flex items-center gap-4">
        <Button size="lg" type="submit">Create instance</Button>
        <span className="text-sm text-muted-foreground">Takes a few seconds. You will see one activation code.</span>
      </div>
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
