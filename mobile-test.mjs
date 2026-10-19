import { chromium, devices } from "playwright";
import { state, ME_PROFILE, NOW, user } from "./testkit.mjs";
const URL = process.env.TEST_URL || "http://127.0.0.1:4173";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const R = []; const ck = (n, c) => { R.push(`${c ? "PASS" : "FAIL"}  ${n}`); process.stdout.write(`${c ? "ok   " : "FAIL "}${n}\n`); };
const errs = [];
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
p.setDefaultTimeout(10000);
p.on("pageerror", e => errs.push(e.message));
p.on("console", m => m.type() === "error" && errs.push(m.text()));
const body = () => p.locator("body").innerText();

await p.goto(URL, { waitUntil: "networkidle" });
await p.evaluate(
  ([s, pr]) => {
    localStorage.clear();
    localStorage.setItem("tg-group-chat", JSON.stringify({ state: s, version: 6 }));
    localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: pr }, version: 4 }));
  },
  [state({ activeChatId: null }), { ...ME_PROFILE, id: "master_owner_yousif", name: "نور الهدى", role: "user" }]
);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1300);

ck("mobile: RTL", (await p.getAttribute("html", "dir")) === "rtl");
ck("mobile: lands on public tab list", (await p.locator("aside").innerText()).includes("مجتمع لا أبرح"));
await p.locator("aside button").filter({ hasText: /^مجموعات خاصة$/ }).first().click();
await p.waitForTimeout(500);
await p.locator("aside button").filter({ hasText: "فريق العمل" }).first().click();
await p.waitForTimeout(900);
ck("mobile: chat opens", (await body()).includes("فريق العمل"));
ck("mobile: composer present", (await p.locator("textarea").count()) > 0);
const bb = await p.locator("div[id^='msg-']").first().boundingBox();
ck("mobile: bubble inside viewport", bb.x >= 0 && bb.x + bb.width <= 412, JSON.stringify(bb));

const touch = async (hold, pan) => {
  const n = await p.locator("div[id^='msg-']").count();
  const box = await p.locator("div[id^='msg-']").nth(Math.floor(n / 2)).boundingBox();
  await p.evaluate(async ({ x, y, hold, pan }) => {
    const el = document.elementFromPoint(x, y);
    const T = (cx, cy) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy });
    const fire = (t, ts) => el.dispatchEvent(new TouchEvent(t, { bubbles: true, cancelable: true, touches: ts, changedTouches: ts }));
    fire("touchstart", [T(x, y)]);
    if (pan) for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 30)); fire("touchmove", [T(x, y - (i + 1) * 14)]); }
    if (hold) await new Promise(r => setTimeout(r, hold));
    fire("touchend", []);
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2, hold, pan });
};

await touch(0, 6);
await p.waitForTimeout(800);
ck("mobile: scroll does NOT open menu", !(await body()).includes("نسخ النص"));
await touch(650, 0);
await p.waitForTimeout(400);
ck("mobile: hold opens menu", (await body()).includes("نسخ النص"));
ck("mobile: no delete-for-me", !(await body()).includes("حذف لي"));
await p.screenshot({ path: "shot-mobile.png" });
await ctx.close();
console.log(R.join("\n"));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
console.log("failures:", R.filter(x => x.startsWith("FAIL")).length);
await b.close();
