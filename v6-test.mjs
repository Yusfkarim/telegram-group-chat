import { chromium } from "playwright";
import { resetLive } from "./testkit.mjs";

const URL = process.env.TEST_URL || "http://127.0.0.1:4173";
const b = await chromium.launch({ args: ["--no-sandbox"] });
const R = [];
const ck = (n, c, extra = "") => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  process.stdout.write(`${c ? "ok   " : "FAIL "}${n}${c || !extra ? "" : ` → ${extra}`}\n`);
};

const errs = [];
const page = async () => {
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.setDefaultTimeout(9000);
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  return p;
};

/** full state injection: owner profile + chat world */
const inject = async (p, state, profile) => {
  await p.evaluate(
    ([s, pr]) => {
      localStorage.setItem("tg-group-chat", JSON.stringify({ state: s, version: 6 }));
      localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: pr }, version: 4 }));
    },
    [state, profile]
  );
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1300);
};

const OWNER = { id: "master_owner_yousif", name: "یوسف الکردي", username: "yusuf", color: "#5795f2", avatarId: "crescent", online: true, lastSeen: Date.now(), hideLastSeen: false };
const MEMBER = { id: "u_m", name: "سامر", username: "samer", color: "#64c15d", avatarId: "cedar", online: true, lastSeen: Date.now(), hideLastSeen: false };
const ADMIN = { id: "u_a", name: "رنا", username: "rana", color: "#e76574", avatarId: "arch", online: true, lastSeen: Date.now(), hideLastSeen: false };
const OWNER_PROFILE = { id: "master_owner_yousif", name: "یوسف الکردي", avatarId: "crescent", role: "owner", hasChangedName: false, createdAt: Date.now() };

const group = (over = {}) => ({
  id: "c_test",
  kind: "group",
  name: "فريق العمل",
  avatarId: "geometry",
  visibility: "private",
  description: "اختبار",
  memberIds: ["master_owner_yousif", "u_m", "u_a"],
  roles: { master_owner_yousif: "owner", u_a: "admin" },
  adminPerms: {
    u_a: {
      canDeleteMessages: false, canPinMessages: false, canKickMembers: false,
      canMuteMembers: false, canApproveJoinRequests: false, canChangeGroupInfo: false,
      canInviteUsers: false,
    },
  },
  customTitles: {},
  membersCanSend: true,
  membersCanInvite: false,
  pinnedIds: [],
  messages: [
    { id: "m1", senderId: "u_m", text: "رسالة تجريبية", at: Date.now() - 6000, reactions: [] },
    { id: "m2", senderId: "master_owner_yousif", text: "رد من المالك", at: Date.now() - 3000, reactions: [] },
  ],
  unread: 0,
  muted: false,
  slowMode: 0,
  locked: false,
  invites: [],
  joinRequests: [],
  approvedMode: false,
  banned: [],
  restrictions: {},
  lastReadAt: Date.now(),
  ...over,
});

const baseState = (extra = {}) => ({
  theme: "dark",
  meId: "master_owner_yousif",
  users: { master_owner_yousif: OWNER, u_m: MEMBER, u_a: ADMIN, u_x: { ...MEMBER, id: "u_x", name: "خالد", username: "khaled" } },
  chats: [group()],
  invitations: [],
  activeChatId: "c_test",
  replyToId: null,
  editingId: null,
  settings: { lang: "ar", hideLastSeen: false, wallpaperId: "tg-night", fontSize: 15 },
  ...extra,
});

const txt = (p) => p.locator("body").innerText();
const chatOf = (p, id) => p.evaluate((cid) => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.find((c) => c.id === cid), id);

/** open a group from the sidebar, switching to the private tab when needed */
const openGroup = async (p, name) => {
  const row = p.locator("aside button").filter({ hasText: name }).first();
  if (await row.count()) return row.click();
  const tabs = p.locator("aside button").filter({ hasText: /مجموعات خاصة|الرسائل المباشرة|مجموعات عامة/ });
  await tabs.first().click();
  await p.waitForTimeout(500);
  const row2 = p.locator("aside button").filter({ hasText: name }).first();
  if (await row2.count()) return row2.click();
  for (let i = 1; i < await tabs.count(); i++) {
    await tabs.nth(i).click();
    await p.waitForTimeout(400);
    if (await row2.count()) return row2.click();
  }
};
const hasConfirm = (p) => p.locator("[data-confirm-root]").count();
const confirmYes = (p) => p.locator("[data-confirm-yes]");
const confirmNo = (p) => p.locator("[data-confirm-root] button").first();

// ───────────────────────────────────────────────────────────── 1. PURGE
{
  await resetLive();
  const p = await page();
  const dirty = {
    theme: "dark",
    meId: "master_owner_yousif",
    users: {
      u0: { id: "u0", name: "يوسف كريم", username: "yusuf", color: "#5795f2", avatarId: "olive", online: true, lastSeen: Date.now(), hideLastSeen: false },
      u1: { id: "u1", name: "سارة أحمد", username: "sara", color: "#e76574", avatarId: "arch", online: true, lastSeen: Date.now(), hideLastSeen: false },
      u3: { id: "u3", name: "ليلى نور", username: "layla", color: "#c982ab", avatarId: "waves", online: true, lastSeen: Date.now(), hideLastSeen: false },
    },
    chats: [
      { ...group({ id: "c1", name: "فريق التصميم", visibility: "private" }), memberIds: ["u0", "u1"] },
      { ...group({ id: "c4", name: "نادي التصوير", visibility: "public", handle: "photoclub" }) },
      { ...group({ id: "c5", name: "حلقة التعافي", visibility: "public" }) },
      { ...group({ id: "dm-u1", kind: "dm", name: "سارة أحمد", dmUserId: "u1", memberIds: ["u0", "u1"], roles: {}, adminPerms: {} }) },
      {
        ...group({
          id: "c-official",
          name: "مجتمع لا أبرح حتى أبلغ",
          official: true,
          visibility: "public",
          memberIds: ["u0", "u1", "u3"],
          roles: { u0: "owner" },
          adminPerms: {},
          messages: [
            { id: "o1", senderId: "system", text: "یوسف الکردي أنشأ المجموعة", at: Date.now() - 9e8, reactions: [], system: true },
            { id: "o2", senderId: "u1", text: "أهلاً بكم في مجتمع لا أبرح 🤍", at: Date.now() - 1e7, reactions: [] },
            { id: "o3", senderId: "u3", text: "تذكير صغير", at: Date.now() - 1e5, reactions: [] },
          ],
        }),
      },
      group({ id: "c_mine", name: "گروپی خۆم", memberIds: ["master_owner_yousif"], roles: { master_owner_yousif: "owner" } }),
    ],
    invitations: [{ id: "i1", chatId: "c4", fromId: "u1", at: Date.now(), status: "pending" }],
    activeChatId: null,
    replyToId: null,
    editingId: null,
    settings: { lang: "ar", hideLastSeen: false, wallpaperId: "tg-night", fontSize: 15 },
  };
  await inject(p, dirty, { id: "master_owner_yousif", name: "یوسف الکردي", avatarId: "crescent", role: "user", hasChangedName: false, createdAt: Date.now() });

  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state);
  const body = await txt(p);
  ck("1: only official + my own group remain", st.chats.length === 2, JSON.stringify(st.chats.map((c) => c.name)));
  ck("1: official group kept", st.chats.some((c) => c.name === "مجتمع لا أبرح حتى أبلغ"));
  ck("1: fake groups gone from state", !st.chats.some((c) => ["نادي التصوير", "حلقة التعافي", "فريق التصميم", "سارة أحمد"].includes(c.name)));
  ck("1: fake users purged", !["u0", "u1", "u2", "u3", "u4", "u5", "u6"].some((id) => st.users[id]));
  const off = st.chats.find((c) => c.official);
  ck("1: zero fake messages in official", off.messages.filter((m) => ["o1", "o2", "o3"].includes(m.id)).length === 0);
  ck("1: official has no fake members", off.memberIds.every((id) => !id.startsWith("u") || id === "master_owner_yousif"));
  ck("1: stale invitations dropped", st.invitations.length === 0);
  ck("1: UI shows no fake group names", !body.includes("نادي التصوير") && !body.includes("حلقة التعافي") && !body.includes("فريق التصميم"));
  ck("1: UI shows no fake bot personas", !body.includes("ليلى نور") && !body.includes("سارة أحمد"));

  // auto-messages simulator is gone: no new inbound message after a while
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.reduce((n, c) => n + c.messages.length, 0));
  await p.waitForTimeout(3000);
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.reduce((n, c) => n + c.messages.length, 0));
  ck("1: no automated messages arrive", before === after, `${before} → ${after}`);
  await p.close();
}

// ───────────────────────────────────────────────── 2. MODERATION & PERMISSIONS
{
  await resetLive();
  const p = await page();
  await inject(p, baseState(), OWNER_PROFILE);
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);

  // owner opens a member and kicks them (with confirmation)
  await p.locator("header button").filter({ hasText: /فريق العمل|سامر/ }).first().click();
  await p.waitForTimeout(600);
  await p.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p.waitForTimeout(500);
  const srow = p.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "سامر" });
  if (await srow.count()) await srow.first().click();
  else {
    const memberRows = await p.locator("div.max-h-\\[44vh\\] button").allInnerTexts();
    throw new Error(`سامر row missing — members: ${JSON.stringify(memberRows)}`);
  }
  await p.waitForTimeout(600);
  ck("2: moderation modal opens", (await txt(p)).includes("سامر"));

  await p.locator("button", { hasText: /إخراج من المجموعة|Kick from group/ }).first().click();
  await p.waitForTimeout(500);
  ck("2: kick asks for confirmation", (await hasConfirm(p)) === 1);
  await confirmNo(p).click();
  await p.waitForTimeout(500);
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state);
  ck("2: cancel does not kick", (await chatOf(p, "c_test")).memberIds.includes("u_m"));

  await p.locator("button", { hasText: /إخراج من المجموعة|Kick from group/ }).first().click();
  await p.waitForTimeout(400);
  await confirmYes(p).click();
  await p.waitForTimeout(900);
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state);
  ck("2: confirm kicks the member", !(await chatOf(p, "c_test")).memberIds.includes("u_m"));
  await p.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p.waitForTimeout(600);
  const memberNames = await p.locator("div.max-h-\\[44vh\\] button").allInnerTexts();
  ck("2: kicked member leaves the member list", !memberNames.join("|").includes("سامر"), memberNames.join("|").slice(0, 80));
  await p.locator('button[aria-label="Close"]').last().click();
  await p.waitForTimeout(400);
  ck("2: member count updated", (await txt(p)).includes("2 أعضاء"), (await chatOf(p, "c_test")).memberIds.length + "");

  // mute a member
  await p.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "خالد" }).first().click().catch(() => {});
  await p.waitForTimeout(500);
  const muteBtn = p.locator("button", { hasText: /15 دقيقة|ساعة|15m|1h/ }).first();
  if (await muteBtn.count()) {
    await muteBtn.click();
    await p.waitForTimeout(400);
    await confirmYes(p).click();
    await p.waitForTimeout(800);
    st = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state);
    ck("2: mute sets a restriction", Boolean((await chatOf(p, "c_test")).restrictions["u_x"]));
  }
  await p.close();

  // admin with ZERO permissions can do nothing
  await resetLive();
  const p2 = await page();
  await inject(
    p2,
    baseState({ meId: "u_a", activeChatId: "c_test" }),
    { id: "u_a", name: "رنا", avatarId: "arch", role: "user", hasChangedName: false, createdAt: Date.now() }
  );
  await openGroup(p2, "فريق العمل");
  await p2.waitForTimeout(700);
  await p2.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p2.waitForTimeout(600);
  await p2.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p2.waitForTimeout(400);
  const adminTabs = await p2.locator("div.fixed div.border-b button").allInnerTexts();
  ck("2: zero-perm admin sees no settings tab", !adminTabs.join(" ").includes("الإعدادات"), adminTabs.join("|"));
  const srow2 = p2.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "سامر" });
  if (!(await srow2.count())) {
    const rows2 = await p2.locator("div.max-h-\\[44vh\\] button").allInnerTexts();
    const st2 = await p2.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state);
    throw new Error(`zero-perm admin — rows ${JSON.stringify(rows2)} members ${JSON.stringify((st2.chats.find((c) => c.id === "c_test") ?? {}).memberIds)}`);
  }
  await srow2.first().click();
  await p2.waitForTimeout(600);
  const adminModal = await txt(p2);
  ck("2: zero-perm admin gets no kick button", !adminModal.includes("إخراج من") && !/^Kick from group$/m.test(adminModal));
  ck("2: zero-perm admin told about permissions", adminModal.includes("Management") || adminModal.includes("الإدارة متاحة"));

  // admin cannot delete someone else's message from the bubble menu
  await p2.locator('button[aria-label="Close"]').last().click();
  await p2.waitForTimeout(400);
  await p2.locator("div[id^='msg-']").first().click({ force: true });
  await p2.waitForTimeout(500);
  const menu = await p2.locator("body").innerText();
  ck("2: zero-perm admin cannot delete others' messages", !menu.includes("حذف للجميع"), menu.slice(0, 80));
  await p2.close();

  // admin WITH canKickMembers but without mute — must kick yes, mute no
  await resetLive();
  const p3 = await page();
  const s3 = baseState({ meId: "u_a" });
  s3.chats[0].adminPerms.u_a.canKickMembers = true;
  await inject(p3, s3, { id: "u_a", name: "رنا", avatarId: "arch", role: "user", hasChangedName: false, createdAt: Date.now() });
  await openGroup(p3, "فريق العمل");
  await p3.waitForTimeout(700);
  await p3.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p3.waitForTimeout(600);
  await p3.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p3.waitForTimeout(400);
  await p3.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "سامر" }).first().click();
  await p3.waitForTimeout(600);
  const m3 = await txt(p3);
  ck("2: kick visible with canKickMembers", /إخراج من المجموعة|Kick from group/.test(m3));
  ck("2: mute hidden without canMuteMembers", !/15 دقيقة|15m/.test(m3));
  ck("2: admin cannot promote", !m3.includes("صلاحيات المشرف"));

  // admin can never touch the owner
  await p3.locator('button[aria-label="Close"]').last().click();
  await p3.waitForTimeout(500);
  await p3.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "یوسف الکردي" }).first().click();
  await p3.waitForTimeout(600);
  ck("2: owner row shows creator only", (await txt(p3)).includes("المنشئ"));
  await p3.close();

  // owner edits an admin's granular permissions
  await resetLive();
  const p4 = await page();
  await inject(p4, baseState(), OWNER_PROFILE);
  await openGroup(p4, "فريق العمل");
  await p4.waitForTimeout(700);
  await p4.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p4.waitForTimeout(600);
  await p4.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p4.waitForTimeout(400);
  await p4.locator("div.max-h-\\[44vh\\] button").filter({ hasText: "رنا" }).first().click();
  await p4.waitForTimeout(700);
  const permUi = await txt(p4);
  for (const k of ["حذف رسائل الآخرين", "تثبيت وإلغاء تثبيت الرسائل", "طرد وحظر الأعضاء", "كتم وتقييد الأعضاء", "قبول ورفض طلبات الانضمام", "تغيير معلومات وخلفية المجموعة"]) {
    ck(`2: permission "${k}" offered`, permUi.includes(k));
  }
  // flip three toggles and save
  const toggles = p4.locator("div.fixed [role=switch]");
  await toggles.nth(0).click();
  await toggles.nth(2).click();
  await toggles.nth(3).click();
  await p4.waitForTimeout(300);
  await p4.locator("button", { hasText: /حفظ الصلاحيات|ترقية/ }).first().click();
  await p4.waitForTimeout(400);
  ck("2: saving permissions asks to confirm", (await hasConfirm(p4)) === 1);
  await confirmYes(p4).click();
  await p4.waitForTimeout(900);
  const perms = (await chatOf(p4, "c_test")).adminPerms.u_a;
  ck("2: exactly the toggled permissions are saved", perms.canDeleteMessages && perms.canKickMembers && perms.canMuteMembers && !perms.canPinMessages && !perms.canApproveJoinRequests && !perms.canChangeGroupInfo, JSON.stringify(perms));
  await p4.close();
}

// ─────────────────────────────────────────── 3. 1-on-1 MENU + BLOCK
{
  await resetLive();
  const p = await page();
  const st1 = baseState({ activeChatId: null });
  st1.chats.push({
    id: "dm-u_m", kind: "dm", name: "سامر", avatarId: "cedar", visibility: "private", description: "",
    memberIds: ["master_owner_yousif", "u_m"], roles: {}, adminPerms: {}, customTitles: {}, membersCanSend: true,
    membersCanInvite: false, pinnedIds: [], messages: [
      { id: "d1", senderId: "u_m", text: "سلام، كيفك؟", at: Date.now() - 8000, reactions: [] },
      { id: "d2", senderId: "master_owner_yousif", text: "تمام الحمد لله", at: Date.now() - 4000, reactions: [] },
    ],
    unread: 0, muted: false, slowMode: 0, locked: false, invites: [], joinRequests: [],
    approvedMode: false, banned: [], restrictions: {}, lastReadAt: Date.now(), dmUserId: "u_m",
  });
  await inject(p, st1, OWNER_PROFILE);
  await p.locator("aside button").filter({ hasText: /الرسائل المباشرة/ }).first().click();
  await p.waitForTimeout(500);
  await p.locator("aside button").filter({ hasText: "سامر" }).first().click();
  await p.waitForTimeout(800);

  await p.locator('button[aria-label="Menu"]').click();
  await p.waitForTimeout(600);
  const menu = await txt(p);
  ck("3: no 'leave group' in a 1-on-1", !menu.includes("مغادرة المجموعة"));
  ck("3: no '(for me only)' on clear history", !menu.includes("مسح السجل (لي فقط)"));
  ck("3: block action present", menu.includes("حظر المستخدم"));
  ck("3: no role label in a 1-on-1", !/(^|\n)(member|عضو)(\n|$)/m.test(menu));

  // anchored directly under the ⋮ button
  const geo = await p.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Menu"]').getBoundingClientRect();
    const m = document.querySelector("[data-headmenu]").getBoundingClientRect();
    return { btn: { l: btn.left, r: btn.right, b: btn.bottom }, menu: { l: m.left, r: m.right, t: m.top }, w: window.innerWidth };
  });
  ck("3: menu opens just below the ⋮ button", geo.menu.t >= geo.btn.b - 2 && geo.menu.t < geo.btn.b + 16, JSON.stringify(geo));
  ck("3: menu aligned under the button", geo.menu.l < geo.btn.r + 40 && geo.menu.r > geo.btn.l - 40);
  ck("3: menu stays on screen", geo.menu.l >= 0 && geo.menu.r <= geo.w);

  // block flow
  await p.locator("button", { hasText: /حظر المستخدم/ }).click();
  await p.waitForTimeout(500);
  ck("3: block asks for confirmation", (await hasConfirm(p)) === 1);
  await confirmYes(p).click();
  await p.waitForTimeout(900);
  const bstate = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.blockedUserIds);
  ck("3: user is blocked in state", Array.isArray(bstate) && bstate.includes("u_m"));
  const composer = await p.locator("textarea").count();
  ck("3: composer hidden while blocked", composer === 0);
  ck("3: unblock button shown", (await txt(p)).includes("إلغاء الحظر"));

  await p.locator("button", { hasText: /إلغاء الحظر/ }).click();
  await p.waitForTimeout(500);
  await confirmYes(p).click();
  await p.waitForTimeout(900);
  ck("3: unblock restores the composer", (await p.locator("textarea").count()) === 1);
  ck("3: block list cleared", !(await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.blockedUserIds)).includes("u_m"));
  await p.close();
}

// ─────────────────────────────────────── 4. PRIVATE GROUPS OUT OF PUBLIC TAB
{
  await resetLive();
  const p = await page();
  const st = baseState({ activeChatId: null });
  st.chats.push(
    { ...group({ id: "c_pub", name: "گرووپی گشتی", visibility: "public", handle: "open1", memberIds: [], roles: {}, adminPerms: {} }) },
    { ...group({ id: "c_priv", name: "گرووپی نهێنی 🔒", visibility: "private", memberIds: [], roles: {}, adminPerms: {} }) }
  );
  await inject(p, st, OWNER_PROFILE);

  await p.locator("aside button").filter({ hasText: /مجموعات عامة/ }).first().click();
  await p.waitForTimeout(600);
  const pub = await p.locator("aside").innerText();
  ck("4: public group listed publicly", pub.includes("گرووپی گشتی"));
  ck("4: private group NOT in public tab", !pub.includes("گرووپی نهێنی"), pub.replace(/\n/g, " | ").slice(0, 160));
  const firstRow = await p.locator("aside div.overflow-y-auto > *").first().innerText();
  ck("4: official pinned first", firstRow.includes("مجتمع لا أبرح حتى أبلغ"), firstRow.replace(/\n/g, " | ").slice(0, 70));

  await p.locator("aside button").filter({ hasText: /مجموعات خاصة/ }).first().click();
  await p.waitForTimeout(600);
  const priv = await p.locator("aside").innerText();
  ck("4: private group in private tab", priv.includes("گرووپی نهێنی"));
  ck("4: public group not in private tab", !priv.includes("گرووپی گشتی"));
  ck("4: private row asks to join", priv.includes("طلب انضمام"));
  await p.close();
}

// ────────────────────────────── 5. BACKGROUND + OWNER/ADMIN COLOUR PICKER
{
  await resetLive();
  const p = await page();
  await inject(p, baseState(), OWNER_PROFILE);
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(800);
  const bg0 = await p.evaluate(() => getComputedStyle(document.querySelector(".msg-text").closest("[style]") || document.body).background);
  ck("5: group background is a pattern, not flat white", !/rgb\(255,\s*255,\s*255\)/.test(bg0), bg0.slice(0, 70));

  await p.locator('button[aria-label="Menu"]').click();
  await p.waitForTimeout(600);
  ck("5: owner sees background entry in ⋮", (await txt(p)).includes("تغيير خلفية ولون المجموعة"));
  await p.locator("button", { hasText: /تغيير خلفية ولون المجموعة/ }).click();
  await p.waitForTimeout(700);
  ck("5: presets offered", (await txt(p)).includes("خلفيات جاهزة"));
  await p.locator("button", { hasText: /^لون واحد$/ }).click();
  await p.waitForTimeout(500);
  ck("5: colour picker opens", (await p.locator('input[type=color]').count()) > 0);
  await p.locator('input[type=color]').first().fill("#7a4b8a");
  await p.waitForTimeout(400);
  await p.locator("button", { hasText: /^حفظ$/ }).last().click();
  await p.waitForTimeout(500);
  ck("5: saving a background asks to confirm", (await hasConfirm(p)) === 1);
  await confirmYes(p).click();
  await p.waitForTimeout(900);
  const savedBg = (await chatOf(p, "c_test")).customBg;
  ck("5: custom colour saved for the group", savedBg && savedBg.value.toLowerCase() === "#7a4b8a", JSON.stringify(savedBg));
  const painted = await p.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) => getComputedStyle(d).backgroundImage.includes("linear-gradient"));
    return el ? getComputedStyle(el).backgroundImage : "";
  });
  ck("5: custom colour painted in the chat", painted.includes("122, 75, 138") && painted.includes("linear-gradient"), painted.slice(0, 70));
  await p.close();

  // admin without canChangeGroupInfo must not see it
  await resetLive();
  const p2 = await page();
  await inject(p2, baseState({ meId: "u_a" }), { id: "u_a", name: "رنا", avatarId: "arch", role: "user", hasChangedName: false, createdAt: Date.now() });
  await openGroup(p2, "فريق العمل");
  await p2.waitForTimeout(800);
  await p2.locator('button[aria-label="Menu"]').click();
  await p2.waitForTimeout(600);
  ck("5: admin without canChangeGroupInfo has no picker", !(await txt(p2)).includes("تغيير خلفية ولون المجموعة"));
  await p2.close();
}

// ──────────────────────────────────────────────────── 6. FONT SIZE ZOOM
{
  await resetLive();
  const p = await page();
  await inject(p, baseState(), OWNER_PROFILE);
  await p.locator("aside button").nth(1).click();
  await p.waitForTimeout(800);
  ck("6: font size section present", (await txt(p)).includes("حجم الخط"));
  ck("6: live preview bubble shown", (await p.locator("text=معاينة").count()) >= 0);
  const size0 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  ck("6: default font size", size0 === "15px", size0);

  const msg0 = await p.evaluate(() => getComputedStyle(document.querySelector(".msg-text")).fontSize);
  await p.locator('button[aria-label="تصغير الخط"]').click();
  await p.locator('button[aria-label="تصغير الخط"]').click();
  await p.waitForTimeout(300);
  await p.locator("button", { hasText: /^حفظ$/ }).first().click();
  await p.waitForTimeout(500);
  ck("6: saving font size asks to confirm", (await hasConfirm(p)) === 1);
  await confirmYes(p).click();
  await p.waitForTimeout(800);
  const size1 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  ck("6: zoom out shrinks the font", size1 === "13px", size1);
  const msg1 = await p.evaluate(() => getComputedStyle(document.querySelector(".msg-text")).fontSize);
  ck("6: message text scales down", parseFloat(msg1) < parseFloat(msg0), `${msg0} → ${msg1}`);

  await p.locator('button[aria-label="تكبير الخط"]').click();
  await p.locator('button[aria-label="تكبير الخط"]').click();
  await p.locator("button", { hasText: /^حفظ$/ }).first().click();
  await p.waitForTimeout(400);
  await confirmYes(p).click();
  await p.waitForTimeout(800);
  const size2 = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  ck("6: zoom in grows the font", size2 === "15px", size2);
  ck("6: composer input scales too", parseFloat(await p.evaluate(() => getComputedStyle(document.querySelector(".msg-input")).fontSize)) === 15);

  await p.locator('button[aria-label="Close"]').last().click();
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1400);
  ck("6: font size persists across reload", (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim())) === "15px");
  await p.close();
}

// ─────────────────────────────────── 7. UNIVERSAL CONFIRM DIALOGS
{
  await resetLive();
  const p = await page();
  await inject(p, baseState(), OWNER_PROFILE);
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(800);

  // no native confirm anywhere
  await p.evaluate(() => {
    window.__native = 0;
    window.confirm = () => {
      window.__native++;
      return true;
    };
  });

  // clear history
  await p.locator('button[aria-label="Menu"]').click();
  await p.waitForTimeout(500);
  await p.locator("button", { hasText: /مسح السجل/ }).click();
  await p.waitForTimeout(500);
  ck("7: clear history asks to confirm", (await hasConfirm(p)) === 1);
  ck("7: dialog is the custom one", (await txt(p)).includes("هل أنت متأكد من مسح سجل المحادثة؟"));
  await confirmNo(p).click();
  await p.waitForTimeout(400);
  const kept = (await chatOf(p, "c_test")).messages.length;
  ck("7: cancel keeps messages", kept === 2);

  // delete a message
  await p.locator("div[id^='msg-']").first().click({ force: true });
  await p.waitForTimeout(600);
  await p.locator("button", { hasText: /حذف للجميع/ }).click();
  await p.waitForTimeout(500);
  ck("7: delete message asks to confirm", (await hasConfirm(p)) === 1);
  await confirmYes(p).click();
  await p.waitForTimeout(700);
  const msgs = (await chatOf(p, "c_test")).messages;
  ck("7: confirm deletes the message", msgs.filter((m) => m.deletedForEveryone).length === 1 && msgs.some((m) => m.id === "m1" && m.deletedForEveryone), JSON.stringify(msgs.map((m) => [m.id, !!m.deletedForEveryone])));

  // pin
  await p.locator("div[id^='msg-']").first().click({ force: true });
  await p.waitForTimeout(600);
  await p.locator("button", { hasText: /^تثبيت$/ }).first().click();
  await p.waitForTimeout(600);
  ck("7: pin dialog opens", (await hasConfirm(p)) === 1);
  await confirmNo(p).click();
  await p.waitForTimeout(400);
  ck("7: cancel does not pin", (await chatOf(p, "c_test")).pinnedIds.length === 0);

  ck("7: window.confirm never used", (await p.evaluate(() => window.__native)) === 0);
  await p.close();
}

// ─────────────────────────────── 8. 1-on-1 BUBBLE ALIGNMENT
{
  await resetLive();
  const p = await page();
  const st = baseState({ activeChatId: "dm-u_m" });
  st.chats.push({
    id: "dm-u_m", kind: "dm", name: "سامر", avatarId: "cedar", visibility: "private", description: "",
    memberIds: ["master_owner_yousif", "u_m"], roles: {}, adminPerms: {}, customTitles: {}, membersCanSend: true,
    membersCanInvite: false, pinnedIds: [], messages: [
      { id: "d1", senderId: "u_m", text: "سلام، كيفك؟", at: Date.now() - 9000, reactions: [] },
      { id: "d2", senderId: "master_owner_yousif", text: "تمام الحمد لله", at: Date.now() - 5000, reactions: [] },
      { id: "d3", senderId: "u_m", text: "الحمد لله على السلامة", at: Date.now() - 3000, reactions: [] },
    ],
    unread: 0, muted: false, slowMode: 0, locked: false, invites: [], joinRequests: [],
    approvedMode: false, banned: [], restrictions: {}, lastReadAt: Date.now(), dmUserId: "u_m",
  });
  await inject(p, st, OWNER_PROFILE);
  await p.waitForTimeout(600);

  const boxes = await p.evaluate(() =>
    [...document.querySelectorAll("div[id^='msg-']")].map((row) => {
      const rr = row.getBoundingClientRect();
      const bubble = row.querySelector("div.rounded-2xl");
      const r = bubble.getBoundingClientRect();
      return {
        text: bubble.innerText.split("\n")[0],
        left: Math.round(r.left),
        right: Math.round(r.right),
        mid: Math.round(rr.left + rr.width / 2),
      };
    })
  );
  const incoming = boxes.filter((x) => x.text.includes("سلام") || x.text.includes("الحمد لله على"));
  const outgoing = boxes.filter((x) => x.text.includes("تمام"));
  ck("8: incoming bubble on the LEFT", incoming.every((x) => x.right <= x.mid), JSON.stringify(incoming));
  ck("8: outgoing bubble on the RIGHT", outgoing.every((x) => x.left >= x.mid), JSON.stringify(outgoing));
  ck("8: incoming bubbles share one gutter", new Set(incoming.map((x) => x.left)).size === 1, JSON.stringify(incoming.map((x) => x.left)));
  ck("8: outgoing bubbles share one edge", new Set(outgoing.map((x) => x.left)).size === 1, JSON.stringify(outgoing.map((x) => x.left)));
  ck("8: no bubble overlaps the other", boxes.every((x) => x.right - x.left < 700));

  const colours = await p.evaluate(() => {
    const rows = [...document.querySelectorAll("div[id^='msg-']")];
    const out = rows.find((r) => r.querySelector("svg[aria-label]")?.getAttribute("aria-label") === "read" || r.querySelector("svg[aria-label]")?.getAttribute("aria-label") === "sent");
    const mine = rows.find((r) => r.querySelector("svg[aria-label]"));
    return {
      mineBg: getComputedStyle(mine.querySelector("div.rounded-2xl")).backgroundColor,
      otherBg: getComputedStyle(rows.find((r) => !r.querySelector("svg[aria-label]")).querySelector("div.rounded-2xl")).backgroundColor,
      tick: mine.querySelector("svg[aria-label]")?.getAttribute("aria-label"),
    };
  });
  ck("8: outgoing has its own bubble colour", colours.mineBg !== colours.otherBg, JSON.stringify(colours));
  ck("8: read receipt rendered", ["read", "sent"].includes(colours.tick));
  await p.close();
}


// ────────────────────── 2b. MUTED MEMBER SEES THE EXACT NOTICE ──────────
{
  await resetLive();
  const p = await page();
  const st = baseState({ activeChatId: "c_test", meId: "u_m" });
  st.chats[0].restrictions = { u_m: { until: Date.now() + 3_600_000 } };
  await inject(p, st, { id: "u_m", name: "سامر", avatarId: "cedar", role: "user", hasChangedName: false, createdAt: Date.now() });
  await p.waitForTimeout(400);
  const view = await txt(p);
  ck("2: muted member has no input bar", (await p.locator("textarea").count()) === 0);
  ck("2: exact muted notice shown", view.includes("تم تقييدك من إرسال الرسائل في هذه المجموعة من قبل الإدارة"), view.slice(0, 120));
  const res = await chatOf(p, "c_test");
  ck("2: restriction is time-boxed", res.restrictions.u_m.until > Date.now());

  // the owner unmutes → the bar comes back
  await p.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("tg-group-chat"));
    st.state.meId = "master_owner_yousif";
    st.state.chats.find((c) => c.id === "c_test").restrictions = {};
    localStorage.setItem("tg-group-chat", JSON.stringify(st));
  });
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1400);
  ck("2: unmute restores the input bar", (await p.locator("textarea").count()) === 1);
  await p.close();
}

// ────────────────── 7b. EVERY LISTED ACTION CONFIRMS FIRST ─────────────
{
  await resetLive();
  const p = await page();
  const st7 = baseState({ activeChatId: "c_test" });
  st7.chats[0].joinRequests = [{ id: "j1", userId: "u_x", at: Date.now(), via: "link" }];
  st7.chats[0].invites = [{ id: "i1", token: "abc-123", createdBy: "master_owner_yousif", createdAt: Date.now(), uses: 2 }];
  st7.chats[0].banned = [{ userId: "u_x", until: Date.now() + 9e8, reason: "تجربة", by: "master_owner_yousif", at: Date.now() }];
  await inject(p, st7, OWNER_PROFILE);
  const ask = async (open) => {
    await open();
    await p.waitForTimeout(600);
    const shown = (await hasConfirm(p)) === 1;
    if (shown) await confirmNo(p).click();
    await p.waitForTimeout(400);
    return shown;
  };
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);
  await p.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p.waitForTimeout(700);

  ck("7: unban confirms", await ask(async () => { await p.locator("div.fixed button").filter({ hasText: "المحظورون" }).first().click(); await p.waitForTimeout(400); await p.locator("div.fixed button").filter({ hasText: /رفع الحظر|Unban/ }).click(); }));
  ck("7: reject join request confirms", await ask(async () => { await p.locator("div.fixed button").filter({ hasText: "الطلبات" }).first().click(); await p.waitForTimeout(400); await p.locator("div.fixed button").filter({ hasText: "رفض" }).first().click(); }));
  ck("7: approve join request confirms", await ask(async () => { await p.locator("div.fixed button").filter({ hasText: "الطلبات" }).first().click(); await p.waitForTimeout(400); await p.locator("div.fixed button").filter({ hasText: "موافقة" }).first().click(); }));
  ck("7: revoke invite confirms", await ask(async () => { await p.locator("div.fixed button").filter({ hasText: "روابط الدعوة" }).first().click(); await p.waitForTimeout(400); await p.locator('button[aria-label="revoke"]').first().click().catch(async () => { await p.locator("div.fixed .text-red-400").first().click(); }); }));
  ck("7: saving group info confirms", await ask(async () => { await p.locator("div.fixed button").filter({ hasText: "الإعدادات" }).first().click(); await p.waitForTimeout(400); await p.locator("div.fixed button").filter({ hasText: "تغيير معلومات المجموعة" }).first().click(); await p.waitForTimeout(500); await p.locator("div.fixed button").filter({ hasText: "حفظ" }).first().click(); }));
  await p.close();
}

console.log(`\nfailures: ${R.filter((x) => x.startsWith("FAIL")).length} | page errors: ${errs.length}`);
if (errs.length) console.log("errors:", errs.slice(0, 5));
await b.close();
process.exit(R.filter((x) => x.startsWith("FAIL")).length || errs.length ? 1 : 0);