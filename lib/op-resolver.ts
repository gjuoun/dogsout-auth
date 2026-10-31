// Resolves op:// references in process through @1password/sdk (WASM over HTTPS).
// No `op` CLI and no child process: the CLI prompts for macOS TCC access on every start.
// The service-account token comes from OP_SERVICE_ACCOUNT_TOKEN, else ~/.config/op/sa-token.
// Mirrors the opk reference implementation (serviceAccountToken / sdkClient).

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@1password/sdk";

export type OpResolver = (ref: string) => Promise<string>;

export function serviceAccountToken(): string | undefined {
  const fromEnv = process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    return readFileSync(join(homedir(), ".config/op/sa-token"), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

// One SDK client per process: createClient costs about a second of WASM init.
let clientPromise: Promise<Client> | undefined;
function sdkClient(token: string): Promise<Client> {
  clientPromise ??= createClient({ auth: token, integrationName: "dogsout-auth", integrationVersion: "0.1.0" });
  return clientPromise;
}

/** Production resolver. Throws when no token is configured, so the caller can answer 503. */
export const resolveOpRef: OpResolver = async (ref) => {
  const token = serviceAccountToken();
  if (!token) throw new Error("no 1Password service account token (OP_SERVICE_ACCOUNT_TOKEN or ~/.config/op/sa-token)");
  const client = await sdkClient(token);
  return client.secrets.resolve(ref);
};
