import { boot, body, state, group, chatOf } from "./testkit.mjs";

/** a private group the viewer is NOT a member of */
const secret = group({
  id: "c_secret",
  name: "حلقة خاصة 🔒",
  visibility: "private",
  memberIds: ["u_a", "u_b"],
  roles: { u_a: "owner" },
  approvedMode: true,
  messages: [
    { id: "s1", senderId: "u_a", text: "رسالة سرية لا يجب أن تظهر", at: Date.now() - 5000, reactions: [] },
  ],
});

const { browser, p, errs } = await boot({
  state: state({ activeChatId: null, chats: [secret] }),
  profile: { id: "master_owner_yousif", name: "زائر", avatarId: "olive", role: "user", hasChangedName: false, createdAt: Date.now() },
});

const say = (n, c) => process.stdout.write(`${c ? "ok   " : "FAIL "}${n}\n`);
const R = [];
const ck = (n, c) => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  say(n, c);
};

await p.locator("aside button").filter({ hasText: /^مجموعات خاصة$/ }).first().click();
await p.waitForTimeout(500);
await p.locator("aside button").filter({ hasText: "حلقة خاصة" }).first().click();
await p.waitForTimeout(900);

const t = await body(p);
ck("locked screen", t.includes("طلب انضمام"));
ck("locked hint", t.includes("لا يمكنك رؤية الرسائل"));
ck("NO 3-dot menu", (await p.locator('button[aria-label="Menu"]').count()) === 0);
ck("NO messages leaked", !t.includes("رسالة سرية"));
ck("NO composer", (await p.locator("textarea").count()) === 0);

await p.locator("button", { hasText: /طلب انضمام/ }).last().click();
await p.waitForTimeout(700);
ck("after request", (await body(p)).includes("طلبك قيد المراجعة"));
ck("request stored", (await chatOf(p, "c_secret")).joinRequests.some((r) => r.userId === "master_owner_yousif"));

// a locked group never appears in the public tab
await p.locator('button[aria-label="Close"]').last().click().catch(() => {});
await p.locator("header button").first().click().catch(() => {});
await p.waitForTimeout(400);
await p.locator("aside button").filter({ hasText: /^مجموعات عامة$/ }).first().click();
await p.waitForTimeout(500);
ck("locked group not in public tab", !(await p.locator("aside").innerText()).includes("حلقة خاصة"));

console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
console.log("failures:", R.filter((x) => x.startsWith("FAIL")).length);
await browser.close();
process.exit(R.filter((x) => x.startsWith("FAIL")).length || errs.length ? 1 : 0);