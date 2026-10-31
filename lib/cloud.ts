// Client for the cloud API (instance orders and panel reads). The provider never stores
// instance state: every value shown on /order and /panel comes from this API.

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export class CloudUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudUnavailable";
  }
}

export type OrderInput = {
  task: string;
  scopes: string[];
  repo?: string;
  worktree?: string;
  branch?: string;
};

export type Created = { id: string; activation_code: string; status: string };

export type InstanceSummary = { id: string; status: string; created_at: string };
export type TimelineEvent = { type: string; message: string; ts: string };
export type InstanceDetail = InstanceSummary & {
  task?: string;
  repo?: string;
  worktree?: string;
  branch?: string;
  session_log_path?: string;
  events: TimelineEvent[];
};

export type CloudConfig = { url: string; token: string; fetch?: Fetch };

/** Reads CLOUD_URL and CLOUD_SERVICE_TOKEN from the environment. Missing values are an error, not a default. */
export function cloudConfigFromEnv(env: Record<string, string | undefined> = process.env, fetchImpl?: Fetch): CloudConfig {
  const url = env.CLOUD_URL ?? "";
  const token = env.CLOUD_SERVICE_TOKEN ?? "";
  if (!url) throw new CloudUnavailable("CLOUD_URL is not set");
  if (!token) throw new CloudUnavailable("CLOUD_SERVICE_TOKEN is not set");
  return { url: url.replace(/\/$/, ""), token, fetch: fetchImpl };
}

async function call(cfg: CloudConfig, path: string, init: RequestInit = {}): Promise<Response> {
  const f = cfg.fetch ?? fetch;
  try {
    return await f(`${cfg.url}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${cfg.token}`, ...(init.headers ?? {}) },
    });
  } catch {
    throw new CloudUnavailable(`cloud API is unreachable at ${cfg.url} (is it running?)`);
  }
}

/** POST /api/instances. The 201 body carries the one-time activation_code; callers show it once. */
export async function createInstance(cfg: CloudConfig, input: OrderInput): Promise<Created> {
  const res = await call(cfg, "/api/instances", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent_type: "june-agent", ...input }),
  });
  if (res.status !== 201) throw new CloudUnavailable(`cloud API refused the order (HTTP ${res.status})`);
  return (await res.json()) as Created;
}

export async function listInstances(cfg: CloudConfig): Promise<InstanceSummary[]> {
  const res = await call(cfg, "/api/instances");
  if (!res.ok) throw new CloudUnavailable(`cloud API list failed (HTTP ${res.status})`);
  return (await res.json()) as InstanceSummary[];
}

export async function getInstance(cfg: CloudConfig, id: string): Promise<InstanceDetail | null> {
  const res = await call(cfg, `/api/instances/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudUnavailable(`cloud API detail failed (HTTP ${res.status})`);
  return (await res.json()) as InstanceDetail;
}
