import { useEffect, useState, type ReactNode } from "react";
import { viewHref } from "./lib/link";
import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { Separator } from "@gjuoun/bigface-shadcn-ui/components/ui/separator";
import { INSTANCES, DEFAULT_RESULT_ID, DEFAULT_SELECTED_ID, type Instance } from "./lib/data";
import { parseHash, toHash, type Dir, type MockState, type Screen } from "./lib/state";
import { OrderScreen } from "./screens/order";
import { ResultScreen } from "./screens/result";
import { PanelScreen } from "./screens/panel";
import { DetailScreen } from "./screens/detail";
import { NavA, NavB, NavC } from "./nav/NavChrome";

const DIRS: { id: Dir; label: string }[] = [
  { id: "v2", label: "V2 仪表盘密度" },
  { id: "v1", label: "V1 极简延续" },
  { id: "v3", label: "V3 叙事卡片" },
];
const SCREENS: { id: Screen; label: string }[] = [
  { id: "order", label: "1 Order" },
  { id: "result", label: "2 Result" },
  { id: "panel", label: "3 Panel" },
  { id: "detail", label: "4 Detail" },
];

export function App() {
  const [s, setS] = useState<MockState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const on = () => setS(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mode = s.mode;
    document.documentElement.style.colorScheme = s.mode;
  }, [s.mode]);

  if (!window.location.hash) window.location.hash = toHash(s);

  const go = (patch: Partial<MockState>) => {
    window.location.hash = toHash({ ...s, ...patch });
  };

  const list: Instance[] = s.empty ? [] : INSTANCES;
  // Result opens the newly ordered instance. Panel and detail open the id in the URL, or the default row.
  const wantedId = s.id || (s.screen === "result" ? DEFAULT_RESULT_ID : DEFAULT_SELECTED_ID);
  const current = INSTANCES.find((i) => i.id === wantedId) ?? INSTANCES[0];

  const screenProps = { s, go, list, current };
  const body: Record<Screen, ReactNode> = {
    order: <OrderScreen {...screenProps} />,
    result: <ResultScreen {...screenProps} />,
    panel: <PanelScreen {...screenProps} />,
    detail: <DetailScreen {...screenProps} />,
  };

  const primary = (
    <a href={viewHref(s, "order")} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">New instance</a>
  );
  const navHref = (id: string) => (id === "instances" ? viewHref(s, "panel") : id === "account" ? viewHref(s, "panel") : "#");
  // Every screen is an instance screen in this round, so Instances is the active nav item.
  const activeNav = "instances" as const;

  if (s.nav !== "none") {
    const page = (
      <main className="mx-auto max-w-[1200px] px-6 py-8 2xl:max-w-[1600px]" data-dir={s.dir} data-screen={s.screen} data-nav={s.nav}>
        {body[s.screen]}
      </main>
    );
    const control = <NavControl s={s} go={go} />;
    if (s.nav === "a") return <div className="min-h-screen bg-background text-foreground"><NavA active={activeNav} href={navHref} primary={primary} />{page}{control}</div>;
    if (s.nav === "b") return <div className="min-h-screen bg-background text-foreground"><NavB active={activeNav} href={navHref} primary={primary} />{page}{control}</div>;
    return <div className="min-h-screen bg-background text-foreground"><NavC active={activeNav} href={navHref} primary={primary}><main className="px-6 py-8" data-dir={s.dir} data-screen={s.screen} data-nav="c">{body[s.screen]}</main></NavC>{control}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3 2xl:max-w-[1600px]">
          <div className="text-sm font-semibold">
            🏛️ YourID <span className="text-muted-foreground">· bigface mock</span>
          </div>
          <Segment label="direction" value={s.dir} options={DIRS} onPick={(dir) => go({ dir })} />
          <Segment label="screen" value={s.screen} options={SCREENS} onPick={(screen) => go({ screen })} />
          <Segment
            label="mode"
            value={s.mode}
            options={[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ]}
            onPick={(mode) => go({ mode })}
          />
          {s.screen === "panel" && (
            <Segment
              label="data"
              value={s.empty ? "empty" : "full"}
              options={[
                { id: "full", label: "6 instances" },
                { id: "empty", label: "empty" },
              ]}
              onPick={(v) => go({ empty: v === "empty" })}
            />
          )}
        </div>
      </header>
      <Separator />
      <main className="mx-auto max-w-[1200px] px-6 py-8 2xl:max-w-[1600px]" data-dir={s.dir} data-screen={s.screen}>
        {body[s.screen]}
      </main>
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
        {options.map((o) => (
          <Button
            key={o.id}
            size="sm"
            variant={o.id === value ? "default" : "ghost"}
            aria-pressed={o.id === value}
            data-value={o.id}
            onClick={() => onPick(o.id)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function NavControl({ s, go }: { s: MockState; go: (p: Partial<MockState>) => void }) {
  return (
    <div className="mx-auto mt-8 flex max-w-[1200px] items-center gap-3 border-t border-border px-6 py-4 text-xs text-muted-foreground">
      <span className="uppercase tracking-wide">nav</span>
      {(["a", "b", "c"] as const).map((n) => (
        <Button key={n} size="sm" variant={s.nav === n ? "default" : "ghost"} aria-pressed={s.nav === n} onClick={() => go({ nav: n })}>
          {n.toUpperCase()}
        </Button>
      ))}
      <Button size="sm" variant={s.nav === "none" ? "default" : "ghost"} aria-pressed={s.nav === "none"} onClick={() => go({ nav: "none" })}>original mock</Button>
    </div>
  );
}
