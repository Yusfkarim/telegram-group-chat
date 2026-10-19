import { boot, body, chatOf, openGroup } from "./testkit.mjs";

const { browser, p, errs } = await boot();
const R = [];
const ck = (n, c) => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  process.stdout.write(`${c ? "ok   " : "FAIL "}${n}\n`);
};
const side = () => p.locator("aside").innerText();
const tab = (n) => p.locator("button", { hasText: new RegExp("^" + n + "$") }).first();

// ── landing + featured official group ───────────────────────────────────
ck("lands on Public tab", (await side()).includes("مجتمع لا أبرح"));
ck("official group featured", (await body(p)).includes("مجتمع لا أبرح حتى أبلغ"));
ck("featured badge label", (await body(p)).includes("مجموعة مميزة"));
ck("official is empty of fake messages", !(await body(p)).includes("كل يوم خطوة أقرب"));

// ── private lockdown ────────────────────────────────────────────────────
await tab("مجموعات خاصة").click();
await p.waitForTimeout(400);
ck("private groups visible in directory", (await side()).includes("فريق العمل"));

// ── no demo data anywhere ───────────────────────────────────────────────
const all = await body(p);
ck("no fake groups in UI", !all.includes("نادي التصوير") && !all.includes("حلقة التعافي") && !all.includes("فريق التصميم"));
ck("no fake personas in UI", !all.includes("ليلى نور") && !all.includes("سارة أحمد"));

// ── bubble menu permissions ─────────────────────────────────────────────
await openGroup(p, "فريق العمل");
await p.waitForTimeout(800);
const bubble = p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first();
await bubble.click();
await p.waitForTimeout(500);
let menu = await body(p);
ck("no delete-for-me entry", !menu.includes("حذف لي"));
ck("reply + copy offered", menu.includes("رد") && menu.includes("نسخ النص"));
ck("owner sees pin", menu.includes("تثبيت"));
await p.mouse.click(700, 900);
await p.waitForTimeout(300);

// ── owner badges ────────────────────────────────────────────────────────
await p.locator("header button").filter({ hasText: /فريق العمل/ }).first().click();
await p.waitForTimeout(700);
ck("owner badge in member list", (await body(p)).includes("مالك"));
await p.locator('button[aria-label="Close"]').last().click();
await p.waitForTimeout(400);

// ── patterned wallpaper ─────────────────────────────────────────────────
const hasSvg = await p.evaluate(() =>
  [...document.querySelectorAll("div")].some((d) => {
    const r = d.getBoundingClientRect();
    return r.width > 300 && r.height > 300 && getComputedStyle(d).backgroundImage.includes("svg");
  })
);
ck("patterned wallpaper (not flat white)", hasSvg);

// ── persistence ─────────────────────────────────────────────────────────
await p.locator("textarea").first().fill("رسالة قبل إعادة التحميل");
await p.keyboard.press("Enter");
await p.waitForTimeout(500);
await p.reload({ waitUntil: "networkidle" });
await p.waitForSelector("aside", { timeout: 15000 });
await p.waitForTimeout(900);
ck("session survives reload", await p.locator("aside").isVisible());
ck("message survived reload", (await chatOf(p, "c_team")).messages.some((m) => m.text === "رسالة قبل إعادة التحميل"));
ck("chat world survived reload", (await chatOf(p, "c_team")).memberIds.length === 3);
ck("no fake chats resurrected", (await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.length)) === 3, "official + team + dm");

// ── theme toggle ────────────────────────────────────────────────────────
const before = await p.evaluate(() => document.documentElement.classList.contains("dark"));
await p.locator("aside button").nth(0).click();
await p.waitForTimeout(600);
ck("theme toggles", (await p.evaluate(() => document.documentElement.classList.contains("dark"))) !== before);

console.log("errors:", errs.length ? errs.slice(0, 4) : "none");
console.log("failures:", R.filter((x) => x.startsWith("FAIL")).length);
await browser.close();
process.exit(R.filter((x) => x.startsWith("FAIL")).length || errs.length ? 1 : 0);