// Fixture data shaped like the real cloud API: GET /api/instances and GET /api/instances/:id.

export type EventType = "ordered" | "activated" | "secret_read" | "completed" | "failed";
export type Status = "deploying" | "running" | "done" | "failed";

export type TimelineEvent = { type: EventType; message: string; ts: string };

export type Instance = {
  id: string;
  status: Status;
  created_at: string;
  repo?: string;
  worktree?: string;
  branch?: string;
  session_log_path?: string;
  events: TimelineEvent[];
};

const ORDERED = "Order accepted. Instance reserved, waiting for activation.";
const ACTIVATED = "Activation code redeemed. Agent connected.";
const SECRET = "Read 1 secret under scope secrets:read.";

// Newest first, the order the panel lists them. Events are stored oldest first.
export const INSTANCES: Instance[] = [
  {
    id: "inst_7Q2KZ1",
    status: "deploying",
    created_at: "2026-11-01T01:12:04Z",
    repo: "gjuoun/dogsout-auth",
    worktree: "agc-p1-ui",
    branch: "jw-337-ui-mock",
    events: [{ type: "ordered", message: ORDERED, ts: "2026-11-01T01:12:04Z" }],
  },
  {
    id: "inst_4HM9Lc",
    status: "running",
    created_at: "2026-10-31T22:40:19Z",
    repo: "gjuoun/dogsout-auth",
    worktree: "agc-p1",
    branch: "jw-285-phase1",
    session_log_path: "/var/log/agent/inst_4HM9Lc/session.jsonl",
    events: [
      { type: "ordered", message: ORDERED, ts: "2026-10-31T22:40:19Z" },
      { type: "activated", message: ACTIVATED, ts: "2026-10-31T22:43:10Z" },
      { type: "secret_read", message: SECRET, ts: "2026-10-31T22:44:52Z" },
    ],
  },
  {
    id: "inst_5RX1mo",
    status: "running",
    created_at: "2026-10-31T09:15:42Z",
    repo: "gjuoun/dogsout-auth",
    worktree: "agc-p2",
    branch: "jw-341-scope-audit",
    session_log_path: "/var/log/agent/inst_5RX1mo/session.jsonl",
    events: [
      { type: "ordered", message: ORDERED, ts: "2026-10-31T09:15:42Z" },
      { type: "activated", message: ACTIVATED, ts: "2026-10-31T09:18:01Z" },
      { type: "secret_read", message: SECRET, ts: "2026-10-31T09:19:37Z" },
    ],
  },
  {
    id: "inst_3XW6qe",
    status: "failed",
    created_at: "2026-10-30T14:02:27Z",
    repo: "gjuoun/dogsout-auth",
    branch: "jw-337-ui-mock-spike",
    session_log_path: "/var/log/agent/inst_3XW6qe/session.jsonl",
    events: [
      { type: "ordered", message: ORDERED, ts: "2026-10-30T14:02:27Z" },
      { type: "activated", message: ACTIVATED, ts: "2026-10-30T14:04:50Z" },
      { type: "failed", message: "Secret read denied: scope secrets:read not granted to this token.", ts: "2026-10-30T14:05:12Z" },
    ],
  },
  {
    id: "inst_9TB3xa",
    status: "done",
    created_at: "2026-10-29T09:03:51Z",
    repo: "gjuoun/dogsout-auth",
    branch: "main",
    session_log_path: "/var/log/agent/inst_9TB3xa/session.jsonl",
    events: [
      { type: "ordered", message: ORDERED, ts: "2026-10-29T09:03:51Z" },
      { type: "activated", message: ACTIVATED, ts: "2026-10-29T09:06:02Z" },
      { type: "secret_read", message: SECRET, ts: "2026-10-29T09:09:30Z" },
      { type: "completed", message: "Task finished. Result posted, instance closed.", ts: "2026-10-29T10:41:08Z" },
    ],
  },
  {
    id: "inst_2NK7ce",
    status: "done",
    created_at: "2026-10-27T17:44:10Z",
    repo: "gjuoun/bigface",
    branch: "main",
    events: [
      { type: "ordered", message: ORDERED, ts: "2026-10-27T17:44:10Z" },
      { type: "completed", message: "Task finished. Result posted, instance closed.", ts: "2026-10-27T18:02:55Z" },
    ],
  },
];

// Activation codes are shown once, on the result screen. Keyed by instance id.
export const ACTIVATION_CODES: Record<string, string> = {
  inst_7Q2KZ1: "AC-7F3K-QW2P-9LMX",
};

export const DEFAULT_RESULT_ID = "inst_7Q2KZ1";
// Selected row on the V2 panel, and the instance the detail screen opens with when no id is given.
export const DEFAULT_SELECTED_ID = "inst_4HM9Lc";
