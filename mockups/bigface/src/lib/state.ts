import type { Instance } from "./data";

export type Dir = "v1" | "v2" | "v3";
export type Screen = "order" | "result" | "panel" | "detail";
export type Mode = "light" | "dark";

export type MockState = {
  dir: Dir;
  screen: Screen;
  id: string;
  mode: Mode;
  empty: boolean;
};

export type Go = (patch: Partial<MockState>) => void;

export type ScreenProps = {
  s: MockState;
  go: Go;
  list: Instance[];
  current: Instance | undefined;
};

const DIRS: Dir[] = ["v1", "v2", "v3"];
const SCREENS: Screen[] = ["order", "result", "panel", "detail"];

// Defaults: V2 dashboard, dark. A bare URL opens that view. ?mode=light switches the mode.
export function parseHash(hash: string): MockState {
  const [path = "", query = ""] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  const q = new URLSearchParams(query);
  const dir = DIRS.includes(parts[0] as Dir) ? (parts[0] as Dir) : "v2";
  const screen = SCREENS.includes(parts[1] as Screen) ? (parts[1] as Screen) : "order";
  return {
    dir,
    screen,
    id: parts[2] ?? "",
    mode: q.get("mode") === "light" ? "light" : "dark",
    empty: q.get("empty") === "1",
  };
}

export function toHash(s: MockState): string {
  const path = [s.dir, s.screen, ...(s.id ? [s.id] : [])].map((p) => encodeURIComponent(p)).join("/");
  const q = new URLSearchParams({ mode: s.mode });
  if (s.empty) q.set("empty", "1");
  return "#/" + path + "?" + q.toString();
}
