// Time for the panel, rendered as YYYY-MM-DD HH:mm in the local timezone of the process that
// renders the page. The panel pages and their components are server components, so the text is
// computed once on the server and sent as HTML; the browser never recomputes it.
//
// Input is either epoch milliseconds (the cloud API's created_at and event ts) or an ISO 8601
// string (the contract stub). Empty or unparseable input renders as an em dash, never as the raw value.

export function formatTime(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "—";
  // Date takes epoch milliseconds or an ISO string directly; both name the same instant.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Status text to a CSS class: deploying, running, done or failed. Unknown values get no colour. */
export function statusClass(status: string): string {
  return ["deploying", "running", "done", "failed"].includes(status) ? status : "";
}
