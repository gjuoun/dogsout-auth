// Falsifiable layout checks for the instance pages, at 1280px, against a running app.
// Each check prints PASS or FAIL with the measured value, and the process exits 1 on any FAIL.
//   BASE=http://localhost:3410 node scripts/ui-measure.mjs
import { chromium } from "playwright";

const B = (process.env.BASE ?? "http://localhost:3410").replace(/\/$/, "");
const VIEWPORT = 1280;
const INSTANCE = process.env.INSTANCE ?? "ws.june.stub-demo.0a1b";
let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log((ok ? "PASS" : "FAIL") + "  " + msg); };

const browser = await chromium.launch({ args: ["--unsafely-treat-insecure-origin-as-secure=" + B] });
const page = await browser.newPage({ viewport: { width: VIEWPORT, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

// Sign in once through the real flow (requires a fresh OAUTH_DB).
await page.goto(B + "/client");
await page.click("text=Sign in with YourID");
await page.waitForURL("**/login**");
await page.fill('input[name="username"]', "jun");
await page.click('button[type="submit"]');
await page.waitForURL("**/consent**");
await page.click('button[value="allow"]');
await page.waitForTimeout(400);

// 1. Master-detail geometry on /panel, per the approved design: a 400px list card, a gap, and a
// detail pane that takes the rest of the row.
//   a) list card width is 400 +/- 2px
//   b) detail pane left edge sits 8-24px right of the list card's right edge
//   c) detail pane width is the content row width (.bf root) minus list width minus gap, +/- 4px
await page.goto(B + "/panel");
const geo = await page.evaluate(() => {
  const list = document.querySelector("table.plist")?.closest("[data-slot=card]");
  const detail = list?.nextElementSibling;
  const root = document.querySelector(".bf");
  const l = list?.getBoundingClientRect();
  const d = detail?.getBoundingClientRect();
  const rootW = root ? Math.round(root.getBoundingClientRect().width) : null;
  return { listW: l ? Math.round(l.width) : null, listRight: l ? Math.round(l.right) : null, detailX: d ? Math.round(d.x) : null, detailW: d ? Math.round(d.width) : null, rootW };
});
check(geo.listW !== null && Math.abs(geo.listW - 400) <= 2,
  `1a. list card is 400 +/- 2px (measured ${geo.listW}px)`);
const gap = geo.detailX !== null && geo.listRight !== null ? geo.detailX - geo.listRight : null;
check(gap !== null && gap >= 8 && gap <= 24,
  `1b. gap between list and detail is 8-24px (measured ${gap}px)`);
const expectDetailW = gap !== null && geo.listW !== null && geo.rootW !== null ? geo.rootW - geo.listW - gap : null;
check(geo.detailW !== null && expectDetailW !== null && Math.abs(geo.detailW - expectDetailW) <= 4,
  `1c. detail pane is root - list - gap +/- 4px (root=${geo.rootW}px, measured ${geo.detailW}px, expected ${expectDetailW}px)`);

// 2. Timeline events on /panel/:id: same x, increasing y.
await page.goto(B + "/panel/" + INSTANCE);
const tl = await page.evaluate(() => {
  const items = [...document.querySelectorAll("ol > li")].map((li) => li.getBoundingClientRect());
  return items.map((r) => ({ x: Math.round(r.x), y: Math.round(r.y) }));
});
const xs = new Set(tl.map((t) => t.x));
const ys = tl.map((t) => t.y);
const yIncreasing = ys.every((y, i) => i === 0 || y > ys[i - 1]);
check(tl.length >= 2 && xs.size === 1,
  `2. timeline events share one x (events=${tl.length}, distinct x=${[...xs].join(",") || "none"})`);
check(tl.length >= 2 && yIncreasing,
  `2. timeline events stack downward (y=${ys.join(",") || "none"})`);

// 3. No element overflows its box unless it is a scroll container.
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || el.clientWidth === 0) continue;
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "auto" && cs.overflowX !== "scroll" && cs.overflowX !== "hidden") {
      bad.push(el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + " scroll=" + el.scrollWidth + " client=" + el.clientWidth);
    }
  }
  return bad;
});
check(overflow.length === 0, `3. no element overflows its box on /panel/:id (offenders: ${overflow.length ? overflow.slice(0, 5).join("; ") : "none"})`);

// 4. Session log path is a single line of meaningful length.
const path = await page.evaluate(() => {
  const code = [...document.querySelectorAll("code")].find((c) => c.textContent.includes("/"));
  if (!code) return null;
  const cs = getComputedStyle(code);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  return { text: code.textContent, len: code.textContent.length, height: Math.round(code.getBoundingClientRect().height), lineHeight: Math.round(lh), whiteSpace: cs.whiteSpace };
});
check(path !== null && path.len > 10, `4. session log path rendered, length > 10 (len=${path?.len ?? 0})`);
check(path !== null && path.whiteSpace === "nowrap" && path.height <= path.lineHeight * 1.6,
  `4. session log path is one line (white-space=${path?.whiteSpace}, height=${path?.height}px, one line=${path?.lineHeight}px)`);

console.log(failures === 0 ? "ALL LAYOUT CHECKS PASSED" : failures + " FAILED");
await browser.close();
process.exit(failures === 0 ? 0 : 1);
