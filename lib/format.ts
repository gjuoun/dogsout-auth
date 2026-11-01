// Human-readable time for the panel. Output is YYYY-MM-DD HH:mm in UTC, built from the ISO string
// so server and browser render the same text (no locale or timezone drift between them).

export function formatTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return m ? `${m[1]} ${m[2]}` : iso;
}

/** Status text to a CSS class: deploying, running, done or failed. Unknown values get no colour. */
export function statusClass(status: string): string {
  return ["deploying", "running", "done", "failed"].includes(status) ? status : "";
}
