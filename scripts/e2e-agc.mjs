// Browser proof for /order and /panel. Needs the app on BASE and the cloud stub on CLOUD_STUB_URL.
//   BASE=http://localhost:3410 node scripts/e2e-agc.mjs
import { chromium } from "playwright";

const B = (process.env.BASE ?? "http://localhost:3410").replace(/\/$/, "");
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

const browser = await chromium.launch({ args: [`--unsafely-treat-insecure-origin-as-secure=${B}`] });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

console.log("\n--- login (passkey, username-first)");
await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
await page.fill('input[name="username"]', "jun");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
await page.click('button[value="allow"]');
await page.waitForTimeout(500);

console.log("\n--- /order");
await page.goto(B + "/order");
check(await page.locator("text=New instance").isVisible(), "order form renders for a signed-in human");
await page.fill('textarea[name="task"]', "e2e task");
await page.fill('input[name="repo"]', "dogsout-auth");
await page.click('button[type="submit"]');
await page.waitForURL("**/order?**");
const shown = await page.locator("pre.json").first().innerText();
check(page.url().includes("created=ws.june.stub-demo.0a1b"), "order redirects with the created instance id");
check(shown.trim() === "stub-activation-once", "activation code is shown once on /order");

console.log("\n--- /panel");
await page.goto(B + "/panel");
check(await page.locator("text=ws.june.stub-demo.0a1b").first().isVisible(), "panel lists the instance from the cloud API");
// Row click selects the instance in the right pane (?selected=). The full timeline is on /panel/:id.
await page.click("text=ws.june.stub-demo.0a1b");
await page.waitForURL("**/panel?selected=**");
await page.click("text=Open detail");
await page.waitForURL("**/panel/**");
const ev = await page.locator("ol li").count();
check(ev === 3, `timeline shows 3 events (saw ${ev})`);
check(await page.locator("text=Session log").first().isVisible(), "detail shows the session log");

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILED`));
await browser.close();
process.exit(failures === 0 ? 0 : 1);
