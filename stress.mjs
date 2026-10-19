import { chromium } from "playwright";
const URL = process.env.TEST_URL || "https://telegram-group-chat.vercel.app";
const b = await chromium.launch({ args: ["--no-sandbox"] });

const cases = {
  "fresh": () => { localStorage.clear(); },
  "v5-empty-chats": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: "u0", chats: [], users: {}, settings: { lang: "ar", hideLastSeen: false, wallpaperId: "tg-night" } }, version: 6 })); },
  "v5-missing-settings": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: "u0", chats: [] }, version: 6 })); },
  "v5-users-no-fields": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: "zz", users: { zz: { id: "zz", name: "X" } }, chats: [], settings: { lang: "ar", hideLastSeen: false, wallpaperId: "tg-night" } }, version: 6 })); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "zz", name: "X", avatarId: "olive", createdAt: 1 } }, version: 2 })); },
  "v1-legacy": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: "u0", chats: [{ id: "c1", name: "قديمة", memberIds: ["u0"], roles: { u0: "owner" }, messages: [{ id: "m", senderId: "u0", text: "hi", at: 1, reactions: [] }], unread: 0, muted: false }], users: {}, activeChatId: "c1" }, version: 1 })); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "u0", name: "یوسف", avatarId: "olive", createdAt: 1 } }, version: 1 })); },
  "auth-leftovers": () => { localStorage.clear(); localStorage.setItem("tg-auth", JSON.stringify({ state: { accounts: [], session: { userId: "x", token: "t", expiresAt: Date.now() + 1e9 }, registering: false }, version: 1 })); },
  "corrupt-json": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", "{{{bad"); localStorage.setItem("tg-profile", "@@bad@@"); },
  "wrong-types": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: 5, chats: "not-array", users: [], settings: 7 }, version: 6 })); },
  "active-chat-deleted": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { activeChatId: "does-not-exist", chats: [], users: {}, settings: { lang: "ar", hideLastSeen: false, wallpaperId: "tg-night" } }, version: 6 })); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "n1", name: "نور", avatarId: "waves", createdAt: 1 } }, version: 2 })); },
  "english-mode": () => { localStorage.clear(); localStorage.setItem("tg-group-chat", JSON.stringify({ state: { meId: "u0", chats: [], users: {}, settings: { lang: "en", hideLastSeen: true, wallpaperId: "paper" } }, version: 6 })); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "u0", name: "Yusuf", avatarId: "olive", createdAt: 1 } }, version: 2 })); },
  "profile-no-avatar": () => { localStorage.clear(); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "p1", name: "بدون صورة", createdAt: 1 } }, version: 2 })); },
  "profile-empty-name": () => { localStorage.clear(); localStorage.setItem("tg-profile", JSON.stringify({ state: { profile: { id: "p2", name: "", avatarId: "waves", createdAt: 1 } }, version: 2 })); },
};

let bad = 0;
for (const [name, seed] of Object.entries(cases)) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 130)));
  p.on("console", (m) => m.type() === "error" && errs.push("C:" + m.text().slice(0, 110)));
  await p.goto(URL, { waitUntil: "networkidle" }).catch(() => {});
  await p.evaluate(seed).catch(() => {});
  await p.reload({ waitUntil: "networkidle" }).catch(() => {});
  await p.waitForTimeout(1500);
  const rendered = await p.evaluate(() => {
    const root = document.getElementById("root");
    return {
      kids: root ? root.childElementCount : -1,
      text: (document.body.innerText || "").trim().length,
      crashed: (document.body.innerText || "").includes("حدث خطأ"),
    };
  });
  const ok = rendered.kids > 0 && rendered.text > 0 && !rendered.crashed && errs.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name.padEnd(22)} kids=${rendered.kids} text=${rendered.text} crashed=${rendered.crashed} errs=${errs.length ? errs.slice(0,1) : 0}`);
  await p.close();
}
console.log("\nFAILURES:", bad);
await b.close();
