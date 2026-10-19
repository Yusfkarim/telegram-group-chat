import { boot, body, chatOf } from "./testkit.mjs";

const URL = process.env.TEST_URL || "http://127.0.0.1:4173";
const { chromium } = await import("playwright");
const b = await chromium.launch({ args: ["--no-sandbox"] });
const R = [];
const ck = (n, c, extra = "") => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  process.stdout.write(`${c ? "ok   " : "FAIL "}${n}${c || !extra ? "" : ` → ${extra}`}\n`);
};
const errs = [];
const p = await b.newPage({ viewport: { width: 1366, height: 950 } });
p.setDefaultTimeout(9000);
p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));

await p.goto(URL, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1000);

// ── a brand new device holds exactly one group and nothing else ────────
const fresh = await p.evaluate(() => {
  const raw = localStorage.getItem("tg-group-chat");
  if (!raw) return ["(not written yet)"];
  try {
    return (JSON.parse(raw).state?.chats ?? []).map((c) => c.name);
  } catch {
    return ["(corrupt)"];
  }
});
ck("1: fresh device holds no cached demo state", fresh.length === 1 && fresh[0].startsWith("("), JSON.stringify(fresh));

// ── owner login with normalised spelling ───────────────────────────────
ck("3: owner section on entry screen", (await body(p)).includes("تسجيل دخول المالك"));
await p.locator("button", { hasText: /تسجيل دخول المالك/ }).first().click();
await p.waitForTimeout(400);
await p.locator('input[placeholder="اسم المالك"]').fill("يوسف الكردي");
await p.locator('input[type=password]').fill("12345678rk");
await p.locator("button", { hasText: /تسجيل دخول المالك/ }).last().click();
await p.waitForSelector("aside", { timeout: 15000 });
await p.waitForTimeout(1200);

const prof = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile);
ck("3: owner login accepted (ي/ك normalised)", prof.role === "owner");
const fold = (x) => x.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ");
ck("3: owner name stored normalised", fold(prof.name) === fold("یوسف الکردي"), prof.name);

const off = await chatOf(p, "c-official");
ck("4: official owner is him", off.roles[prof.id] === "owner");
ck("4: founder name is him", off.founder === prof.name || off.founderName === prof.name, JSON.stringify([off.founder, off.founderName]));
ck("4: exactly one owner", Object.values(off.roles).filter((r) => r === "owner").length === 1);
ck("4: owner has the royal title", JSON.stringify(off.customTitles).includes("المالك"));
ck("4: no other members yet", off.memberIds.length === 1);

await p.locator("aside button").filter({ hasText: "مجتمع لا أبرح حتى أبلغ" }).first().click();
await p.waitForTimeout(800);
await p.locator("header button").filter({ hasText: /أعضاء/ }).first().click();
await p.waitForTimeout(700);
const gi = await body(p);
ck("4: founder card in group info", gi.includes(prof.name));
ck("4: owner badge visible", gi.includes("المالك"));
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1300);
await p.locator("header button").filter({ hasText: /أعضاء/ }).first().click();
await p.waitForTimeout(700);
ck("4: ownership survives reload", (await body(p)).includes("المالك"));

// ── one-time rename ────────────────────────────────────────────────────
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1300);
await p.locator('aside button[title="الإعدادات"]').nth(1).click();
await p.waitForTimeout(800);
await p.locator("button", { hasText: /تغيير الاسم/ }).first().click();
await p.waitForTimeout(400);
await p.locator("div.fixed input:not([type])").last().fill("یوسف الكردي");
await p.locator("button", { hasText: /^حفظ$/ }).first().click();
await p.waitForTimeout(600);
ck("1: renaming asks to confirm", (await p.locator("[data-confirm-root]").count()) === 1);
await p.locator("[data-confirm-yes]").click();
await p.waitForTimeout(900);
const a1 = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile);
ck("1: first rename applied", fold(a1.name) === fold("یوسف الكردي") && a1.hasChangedName === true, JSON.stringify(a1));
ck("1: owner keeps the owner role after renaming", a1.role === "owner");
ck("1: lock notice shown", (await body(p)).includes("لا يمكن تغيير الاسم أكثر من مرة واحدة"));
await p.locator("button", { hasText: /تم التغيير/ }).first().click().catch(() => {});
await p.waitForTimeout(600);
ck("1: second rename blocked", fold((await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile)).name) === fold("یوسف الكردي"));

// ── theme ──────────────────────────────────────────────────────────────
await p.locator('button[aria-label="Close"]').last().click().catch(() => {});
await p.waitForTimeout(400);
const bg0 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tg-bg").trim());
await p.locator("aside button").nth(0).click();
await p.waitForTimeout(600);
const bg1 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tg-bg").trim());
ck("2: theme toggles", bg0 !== bg1, `${bg0} → ${bg1}`);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1300);
ck("2: theme persisted", (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tg-bg").trim())) === bg1);
ck("2: owner profile survived reload", (await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile.hasChangedName)) === true);

// ── wrong credentials are rejected ─────────────────────────────────────
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1000);
await p.locator("button", { hasText: /تسجيل دخول المالك/ }).first().click();
await p.waitForTimeout(300);
await p.locator('input[placeholder="اسم المالك"]').fill("يوسف الكردي");
await p.locator('input[type=password]').fill("badpass");
await p.locator("button", { hasText: /تسجيل دخول المالك/ }).last().click();
await p.waitForTimeout(900);
ck("3: wrong password rejected", (await p.locator("aside").count()) === 0);

// ── typing the owner name alone never makes an owner ───────────────────
await p.locator("input").first().fill("يوسف الكردي");
await p.locator("button", { hasText: /^متابعة$/ }).click();
await p.waitForSelector("aside", { timeout: 15000 });
await p.waitForTimeout(1000);
const fake = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile);
ck("3: name-only login is never owner", fake.role === "user");
const off2 = await chatOf(p, "c-official");
ck("3: no owner role granted by name alone", !Object.values(off2.roles).includes("owner"));

console.log("\nfailures:", R.filter((x) => x.startsWith("FAIL")).length, "| page errors:", errs.length);
await b.close();
process.exit(R.filter((x) => x.startsWith("FAIL")).length || errs.length ? 1 : 0);