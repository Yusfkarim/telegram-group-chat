import { chromium } from "playwright";

export const URL = process.env.TEST_URL || "http://127.0.0.1:4173";

export const NOW = Date.now();

export const user = (id, name, extra = {}) => ({
  id,
  name,
  username: id.replace(/^u_/, ""),
  color: "#5795f2",
  avatarId: "olive",
  online: true,
  lastSeen: NOW,
  hideLastSeen: false,
  ...extra,
});

/** a realistic, fake-free chat world for the legacy regression suites */
export const group = (over = {}) => ({
  id: "c_team",
  kind: "group",
  name: "فريق العمل",
  avatarId: "geometry",
  visibility: "private",
  description: "مجموعة خاصة للاختبار",
  memberIds: ["master_owner_yousif", "u_a", "u_b"],
  roles: { master_owner_yousif: "owner" },
  adminPerms: {},
  customTitles: {},
  membersCanSend: true,
  membersCanInvite: false,
  pinnedIds: [],
  messages: [
    { id: "g1", senderId: "u_a", text: "رسالة من عضو في المجموعة", at: NOW - 9000, reactions: [] },
    { id: "g2", senderId: "master_owner_yousif", text: "رد مني أنا", at: NOW - 4000, reactions: [] },
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
  lastReadAt: NOW,
  ...over,
});

export const dm = (over = {}) => ({
  id: "dm-u_a",
  kind: "dm",
  name: "عمر علي",
  avatarId: "cedar",
  visibility: "private",
  description: "",
  memberIds: ["master_owner_yousif", "u_a"],
  roles: {},
  adminPerms: {},
  customTitles: {},
  membersCanSend: true,
  membersCanInvite: false,
  pinnedIds: [],
  messages: [
    { id: "x1", senderId: "u_a", text: "هل راجعت الموعد؟", at: NOW - 8000, reactions: [] },
    { id: "x2", senderId: "master_owner_yousif", text: "نعم، شكراً", at: NOW - 4000, reactions: [] },
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
  lastReadAt: NOW,
  dmUserId: "u_a",
  ...over,
});

export const state = (over = {}) => ({
  theme: "dark",
  meId: "master_owner_yousif",
  users: {
    master_owner_yousif: user("master_owner_yousif", "یوسف الکردي", { username: "yousif", avatarId: "crescent" }),
    u_a: user("u_a", "عمر علي", { username: "omar", avatarId: "cedar" }),
    u_b: user("u_b", "ليلى", { username: "layla", avatarId: "waves", color: "#c982ab" }),
  },
  chats: [group(), dm()],
  invitations: [],
  activeChatId: "c_team",
  replyToId: null,
  editingId: null,
  settings: { lang: "ar", hideLastSeen: false, fontSize: 15 },
  ...over,
});

export const ME_PROFILE = { id: "master_owner_yousif", name: "یوسف الکردي", avatarId: "crescent", role: "owner", hasChangedName: false, createdAt: NOW };
export const u = user;

/** boot a page with a clean, injected world (no demo seed data) */
export async function boot(opts = {}) {
  await resetLive();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await browser.newPage({ viewport: opts.viewport ?? { width: 1366, height: 950 }, ...opts.context });
  p.setDefaultTimeout(opts.timeout ?? 9000);
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.evaluate(
    ([s, pr]) => {
      localStorage.clear();
      localStorage.setItem("tg-group-chat", JSON.stringify({ state: s, version: 6 }));
      localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: pr }, version: 4 }));
    },
    [opts.state ?? state(), opts.profile ?? ME_PROFILE]
  );
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1300);
  return { browser, p, errs };
}

export const body = (p) => p.locator("body").innerText();
export const chatOf = (p, id) =>
  p.evaluate((cid) => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.find((c) => c.id === cid), id);
export const openGroup = async (p, name) => {
  const row = p.locator("aside button").filter({ hasText: name }).first();
  if (await row.count()) return row.click();
  await p.locator("aside button").filter({ hasText: /مجموعات خاصة/ }).first().click();
  await p.waitForTimeout(500);
  await p.locator("aside button").filter({ hasText: name }).first().click();
};
/** reset the live server to a pristine world (test isolation between client phases) */
export const resetLive = async (url = "http://localhost:4173") => {
  try {
    await fetch(`${url}/api/reset`, { method: "POST" });
  } catch {}
};
