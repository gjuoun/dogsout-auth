// End-to-end proof of the whole OAuth flow, driven through a real browser.
//   bunx playwright install chromium   (once)
//   node scripts/e2e.mjs
import { chromium } from "playwright";

const B = process.env.BASE ?? "http://localhost:3100";
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
let failures = 0;
const check = (c, m) => { if (!c) failures++; ok(c, m); };

// WebAuthn needs a secure context. localhost already is one; this allow-lists the origin so
// the same script can also be pointed at a plain-http LAN origin (test-only flag).
const base = process.env.BASE ?? "http://localhost:3100";
const origin = base.replace(/\/$/, "");
const browser = await chromium.launch({
  args: [`--unsafely-treat-insecure-origin-as-secure=${origin}`],
});
const page = await browser.newPage();

// A virtual authenticator from the start: Phase 2 now registers the first
// passkey, so the ceremony needs one installed before the first login.
const cdp = await page.context().newCDPSession(page);
await cdp.send("WebAuthn.enable");
const addVirtualAuthenticator = async () => {
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2", transport: "internal",
      hasResidentKey: true, hasUserVerification: true, isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return authenticatorId;
};
let authenticatorId = await addVirtualAuthenticator();

console.log("\n--- Phase 1: discovery + keys");
const disco = await (await page.request.get(B + "/.well-known/openid-configuration")).json();
check(disco.issuer === B, "discovery document advertises the issuer");
check(disco.code_challenge_methods_supported.includes("S256"), "discovery advertises PKCE S256");
const jwks = await (await page.request.get(B + "/.well-known/jwks.json")).json();
check(jwks.keys.length === 1 && !("d" in jwks.keys[0]), "JWKS exposes public key only (no private 'd')");

console.log("\n--- Phase 2: authorization code + PKCE through the browser (first login registers a passkey)");
// Clear any prior session/grant so the suite is self-contained and always
// exercises the login + consent screens.
await page.goto(B + "/");
await page.click("text=Reset all demo state");
await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
check(page.url().includes("/login"), "unauthenticated /authorize redirects to the provider's login");

// Username-first: a human with no passkey yet is walked straight into create().
await page.fill('input[name="username"]', "jun");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
check(page.url().includes("/consent"), "first login (username -> create) registers a passkey and lands on consent");
check(await page.locator("text=See your email address").isVisible(), "consent lists scopes in human language");

await page.click('button[value="allow"]');
await page.waitForURL("**/client");
const body = await page.textContent("body");
check(body.includes("access_token"), "client received an access_token");
check(body.includes("refresh_token"), "client received a refresh_token");
check(body.includes("jun@example.com"), "/userinfo returned the email claim");
check(body.includes("Jun Guo"), "verified id_token carries the profile claims");

console.log("\n--- Phase 3: refresh reissues the whole token set");
const fingerprints = async () => {
  const cells = await page.locator("table.tok tr td:nth-child(2)").allTextContents();
  return { access: cells[0].trim(), id: cells[1].trim(), refresh: cells[2].trim() };
};
const beforeRefresh = await fingerprints();
await page.goto(B + "/client/refresh");
await page.waitForURL("**/client");
const afterRefresh = await fingerprints();
check(afterRefresh.access !== beforeRefresh.access, "refresh issues a NEW access_token (distinct jti)");
check(afterRefresh.id !== beforeRefresh.id, "refresh issues a NEW id_token (distinct jti)");
check(afterRefresh.refresh !== beforeRefresh.refresh, "refresh rotates the refresh_token itself");
check(await page.locator("table.tok .badge").count() === 3,
  "all three token rows are flagged as changed in the UI");

console.log("\n--- Phase 4: attacks must fail");
await page.goto(B + "/client/replay-code");
await page.waitForURL("**/client");
check((await page.textContent("body")).includes("code replay"), "replaying a used authorization code is rejected");

await page.goto(B + "/client/refresh");          // rotate once
await page.waitForURL("**/client");
await page.goto(B + "/client/refresh?replay=1"); // present the retired token
await page.waitForURL("**/client");
check((await page.textContent("body")).includes("reuse"), "reusing a rotated refresh token revokes the family");

console.log("\n--- Phase 5: direct endpoint checks");
const badRedirect = await page.request.get(
  B + "/oauth/authorize?response_type=code&client_id=demo-client" +
  "&redirect_uri=http://evil.example.com/steal&scope=openid&state=x" +
  "&code_challenge=abc&code_challenge_method=S256");
check(badRedirect.status() === 400, "unregistered redirect_uri is rejected (no open redirect)");

const noPkce = await page.request.get(
  B + "/oauth/authorize?response_type=code&client_id=demo-client" +
  "&redirect_uri=" + encodeURIComponent(B + "/client/callback") + "&scope=openid&state=x");
check(noPkce.status() === 400, "authorize without PKCE is rejected");

const badToken = await page.request.get(B + "/oauth/userinfo", {
  headers: { authorization: "Bearer not.a.real.token" }, failOnStatusCode: false });
check(badToken.status() === 401, "/userinfo rejects a forged bearer token");

console.log("\n--- Phase 6: passkey enrollment + returning username + passkey login (virtual authenticator)");
// Enroll a second passkey while signed in (session from Phase 2). A create()
// ceremony excludes the credentials the human already holds, and the
// authenticator that owns them refuses to re-register ("previously registered"),
// so swap in a fresh virtual authenticator (same CDP session) for this ceremony.
await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
authenticatorId = await addVirtualAuthenticator();
await page.goto(B + "/account");
await page.click("text=Add a passkey");
await page.waitForURL("**/account?passkey=added");
check(await page.locator("text=Passkey added.").isVisible(), "passkey enrollment succeeds and lists on /account");
check((await page.locator(".grant", { hasText: "passkey" }).count()) >= 1, "the enrolled passkey appears in the list");

// Wipe the session (and grants) — passkeys survive, they are the human's credentials.
await page.goto(B + "/");
await page.click("text=Reset all demo state");
await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
check(await page.locator('input[name="username"]').isVisible(), "login asks for a username");
check(await page.locator('input[name="password"]').count() === 0, "the login page has no password input");

await page.fill('input[name="username"]', "jun");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
check(page.url().includes("/consent"), "username + passkey assertion signs the user in (no password) and reaches consent");
await page.click('button[value="allow"]');
await page.waitForURL("**/client");
check((await page.textContent("body")).includes("access_token"), "the full OAuth flow completes on username + passkey alone");

console.log("\n--- Phase 7: agent registry");
await page.goto(B + "/admin");
await page.fill('input[name="name"]', "e2e-agent");
await page.fill('textarea[name="redirect_uris"]', B + "/client/callback");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin?created=**");
const secretShown = await page.locator("text=shown ONCE").isVisible();
check(secretShown, "agent creation shows the secret exactly once");
const agentId = page.url().match(/created=(agent_[a-f0-9]+)/)?.[1] ?? "";
check(agentId.startsWith("agent_"), "the created agent got an agent_* client_id");
check((await page.locator(".grant", { hasText: "e2e-agent" }).count()) === 1, "the agent appears in the registry");

// The agent is a real OAuth client: authorize must accept its client_id + redirect.
const agentAuth = B + "/oauth/authorize?response_type=code&client_id=" + agentId +
  "&redirect_uri=" + encodeURIComponent(B + "/client/callback") +
  "&scope=openid&state=x&code_challenge=abc&code_challenge_method=S256";
await page.goto(agentAuth);
await page.waitForURL("**/consent**");
check(page.url().includes("/consent"), "authorize accepts the registered agent and reaches consent (session + no grant)");

await page.goto(B + "/admin");
await page.locator(".grant", { hasText: agentId }).locator("button.danger").click();
await page.waitForURL("**/admin");
check((await page.locator(".grant", { hasText: "e2e-agent" }).count()) === 0, "revoking removes the agent from the registry");
const gone = await page.request.get(agentAuth, { failOnStatusCode: false });
check(gone.status() === 400, "authorize rejects the revoked agent (unknown client_id)");

await browser.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);