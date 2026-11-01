// UI tour for the PR: login, order form, order result, panel list, panel detail, at 1280px.
// Writes PNGs to SHOTS_DIR. Needs the app on BASE and the cloud stub on 3411.
//   BASE=http://localhost:3410 SHOTS_DIR=/tmp/shots node scripts/ui-tour.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const B = (process.env.BASE ?? "http://localhost:3410").replace(/\/$/, "");
const OUT = process.env.SHOTS_DIR ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (c, m) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

const browser = await chromium.launch({ args: [`--unsafely-treat-insecure-origin-as-secure=${B}`] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
await page.fill('input[name="username"]', "jun");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
await page.click('button[value="allow"]');
await page.waitForTimeout(500);

await page.goto(B + "/order");
await page.fill('textarea[name="task"]', "ui tour task");
await page.fill('input[name="repo"]', "dogsout-auth");
await page.fill('input[name="branch"]', "agc/phase1-as");
await page.screenshot({ path: OUT + "/1-order-form.png", fullPage: true });
await page.click('button[type="submit"]');
await page.waitForURL("**/order?**");
check(await page.locator("pre.json").first().isVisible(), "order result shows the activation code");
await page.screenshot({ path: OUT + "/2-order-result.png", fullPage: true });

await page.goto(B + "/panel");
check(await page.locator("table.plist").isVisible(), "panel renders the instance table");
await page.screenshot({ path: OUT + "/3-panel-list.png", fullPage: true });
await page.click("table.plist a");
await page.waitForURL("**/panel/**");
check(await page.locator("ol.tl li").count() === 3, "detail shows the 3-event timeline");
await page.screenshot({ path: OUT + "/4-panel-detail.png", fullPage: true });

console.log(failures === 0 ? "TOUR OK" : `${failures} FAILED`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
