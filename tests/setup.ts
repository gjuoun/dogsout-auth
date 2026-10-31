import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Import this first in every test file. It must run before anything imports lib/db,
// because lib/db reads OAUTH_DB once at module load.
if (!process.env.OAUTH_DB) {
  process.env.OAUTH_DB = join(mkdtempSync(join(tmpdir(), "oauth-test-")), "oauth.db");
}
export const TEST_DB = process.env.OAUTH_DB!;
