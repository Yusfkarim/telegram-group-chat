import { boot, body, openGroup, chatOf } from "./testkit.mjs";

const { browser, p, errs } = await boot();
const R = [];
let STEP = "";
const ck = (n, c) => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  process.stdout.write(`[${STEP}] ${c ? "ok" : "FAIL"} ${n}\n`);
};

// ── private groups directory ───────────────────────────────────────────
STEP = "dir";
await p.locator("aside button").filter({ hasText: /^مجموعات خاصة$/ }).first().click();
await p.waitForTimeout(500);
const dir = await p.locator("aside").innerText();
ck("1: private groups listed", dir.includes("فريق العمل"));
await openGroup(p, "فريق العمل");
await p.waitForTimeout(700);
ck("1: member count shown", /\d+ أعضاء/.test(await p.locator("header").innerText()));

await openGroup(p, "فريق العمل");
await p.waitForTimeout(800);

// ── DM from a group message ────────────────────────────────────────────
STEP = "dm";
const other = p.locator("div[id^='msg-']").filter({ hasText: "عمر علي" }).first();
if ((await other.count()) === 0) {
  const tape = await p.locator("body").innerText();
  throw new Error(`فريق العمل tape: ${tape.slice(0, 400).replace(/\n+/g, "|")}`);
}
ck("2: found member message", true);
await other.click();
await p.waitForTimeout(500);
ck("2: DM option in menu", (await body(p)).includes("إرسال رسالة خاصة"));
await p.locator("button", { hasText: /^إرسال رسالة خاصة$/ }).first().click();
await p.waitForTimeout(900);
ck("2: DM shows the person", (await body(p)).includes("عمر علي"));
ck("3: DM pane has no join request", !(await body(p)).includes("طلب انضمام"));
ck("3: composer active in DM", (await p.locator("textarea").count()) > 0);

// ── reactions: replace then toggle off ──────────────────────────────────
STEP = "react";
await openGroup(p, "فريق العمل");
await p.waitForTimeout(800);
const msg = p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first();
await msg.click();
await p.waitForTimeout(500);
await p.locator("button").filter({ hasText: /^❤️$/ }).first().click();
await p.waitForTimeout(500);
const after1 = (await chatOf(p, "c_team")).messages.find((m) => m.id === "g1").reactions;
ck("4: reaction added", after1.some((r) => r.emoji === "❤️" && r.userIds.includes("master_owner_yousif")), JSON.stringify(after1));

await msg.click();
await p.waitForTimeout(500);
await p.locator("div.fixed button").filter({ hasText: /^🔥$/ }).first().click();
await p.waitForTimeout(500);
const after2 = (await chatOf(p, "c_team")).messages.find((m) => m.id === "g1").reactions;
ck("4: one reaction per user", after2.length === 1 && after2[0].emoji === "🔥", JSON.stringify(after2));

await msg.click();
await p.waitForTimeout(500);
await p.locator("div.fixed button").filter({ hasText: /^🔥$/ }).first().click();
await p.waitForTimeout(500);
const after3 = (await chatOf(p, "c_team")).messages.find((m) => m.id === "g1").reactions;
ck("4: same emoji toggles off", after3.length === 0, JSON.stringify(after3));

// ── send a message ─────────────────────────────────────────────────────
STEP = "send";
await p.locator("textarea").first().fill("رسالة جديدة من الاختبار");
await p.keyboard.press("Enter");
await p.waitForTimeout(600);
const msgs = (await chatOf(p, "c_team")).messages;
ck("5: message sent", msgs.some((m) => m.text === "رسالة جديدة من الاختبار" && m.senderId === "master_owner_yousif"));

console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
console.log("failures:", R.filter((x) => x.startsWith("FAIL")).length);
await browser.close();
process.exit(R.filter((x) => x.startsWith("FAIL")).length || errs.length ? 1 : 0);