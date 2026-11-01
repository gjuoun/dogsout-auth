// Same rule as the real panel: YYYY-MM-DD HH:mm built from the ISO string, no locale drift.
export function formatTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] + " " + m[2] : iso;
}

export function sortNewestFirst<T extends { ts: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => (a.ts < b.ts ? 1 : -1));
}
