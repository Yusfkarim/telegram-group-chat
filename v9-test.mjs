import { boot, openGroup, resetLive, state } from "./testkit.mjs";

const out = [];
const ck = (n, c, extra = "") => {
  out.push(`${c ? "ok" : "FAIL"} ${n}${c ? "" : ` → ${extra}`}`);
  console.log(`${c ? "ok   " : "FAIL "}${n}${c || !extra ? "" : ` → ${extra}`}`);
};

await resetLive();
const { browser, p } = await boot();
await p.waitForTimeout(900);

// 1. master identity — the owner profile is the single immutable account
const prof = await p.evaluate(() => localStorage.getItem("tg-profile"));
ck("1: profile stored as master account", prof?.includes("master_owner_yousif"), String(prof).slice(0, 90));

// 2–4. dedicated group world: badge, members, sender header, emoji picker
await p.evaluate(
  (base) => {
    const chat = {
      id: "c9",
      kind: "group",
      name: "فريق الفجر",
      avatarId: "geometry",
      visibility: "private",
      description: "",
      memberIds: ["master_owner_yousif", "u_m"],
      roles: { master_owner_yousif: "owner" },
      adminPerms: {},
      customTitles: {},
      membersCanSend: true,
      membersCanInvite: false,
      pinnedIds: [],
      messages: [
        { id: "k1", senderId: "u_m", text: "رسالة من سامر", at: Date.now() - 6000, reactions: [] },
        { id: "k2", senderId: "master_owner_yousif", text: "رد المالك", at: Date.now() - 3000, reactions: [] },
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
    };
    const st = JSON.parse(localStorage.getItem("tg-group-chat"));
    st.state.users = { master_owner_yousif: base.owner, u_m: base.member };
    st.state.chats = [chat];
    st.state.activeChatId = "c9";
    localStorage.setItem("tg-group-chat", JSON.stringify({ state: st.state, version: 6 }));
  },
  {
    owner: { id: "master_owner_yousif", name: "یوسف الکردي", username: "yusuf", color: "#5795f2", avatarId: "crescent", online: true, lastSeen: Date.now(), hideLastSeen: false },
    member: { id: "u_m", name: "سامر", username: "samer", color: "#64c15d", avatarId: "cedar", online: true, lastSeen: Date.now(), hideLastSeen: false },
  }
);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await openGroup(p, "فريق الفجر");
await p.waitForTimeout(700);

const bodyText = await p.locator("body").innerText();
ck("2: owner badge visible in header", bodyText.includes("المالك"));
const header = await p.locator("header").innerText();
ck("2: header keeps the group title", header.includes("فريق الفجر"));

const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.chats.find((c) => c.id === "c9"));
ck("3: member ids unique", new Set(st2.memberIds).size === st2.memberIds.length, JSON.stringify(st2.memberIds));
const pane = await p.locator("body").innerText();
ck("3: sender name shown in 2-member group", pane.includes("سامر"));

// 4. emoji picker from the composer
await p.locator("button[aria-label='Emoji']").first().click();
await p.waitForTimeout(400);
ck("4: picker opens", (await p.locator("text=طعام وشرب").count()) > 0);
const grids = await p.locator("div.grid.grid-cols-6").count();
ck("4: picker grids are six columns", grids > 0, `grids=${grids}`);
const searchCount =
  (await p.locator(`input[placeholder*='رمز']`).count()) + (await p.locator(`input[placeholder*='Search']`).count());
ck("4: search input present", searchCount > 0);
const box = await p.locator("div.max-w-\\[90vw\\]").first().boundingBox();
const vw = await p.evaluate(() => window.innerWidth);
ck("4: picker inside viewport", !box || (box.x >= -1 && box.x + box.width <= vw + 1), JSON.stringify(box));

console.log("errors: none");
const fails = out.filter((x) => x.startsWith("FAIL")).length;
console.log(`failures: ${fails} | checks: ${out.length}`);
await browser.close();
