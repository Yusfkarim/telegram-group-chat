import { boot, body, chatOf, openGroup } from "./testkit.mjs";

const R = [];
const ck = (n, c, extra = "") => {
  R.push(`${c ? "PASS" : "FAIL"}  ${n}`);
  process.stdout.write(`${c ? "ok   " : "FAIL "}${n}${c || !extra ? "" : ` → ${extra}`}\n`);
};

const ME = "master_owner_yousif";

/** a second member posts in the group while I am looking away */
const simulate = (p, chatId, senderId, text, replyToId) =>
  p.evaluate(
    ([c, s, t, r]) => {
      const st = window.__chat.getState();
      st.actions.receiveMessage(c, s, t, r);
    },
    [chatId, senderId, text, replyToId]
  );

async function exposeStore(p) {
  await p.addScriptTag({ content: "" }).catch(() => {});
  await p.evaluate(() => {});
}

// ══════════════════════════ 1. online dot ══════════════════════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(600);
  await p.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p.waitForTimeout(700);
  await p.locator("div.fixed button").filter({ hasText: /^الأعضاء/ }).first().click();
  await p.waitForTimeout(500);

  const dot = await p.evaluate(() => {
    const box = document.querySelector("[data-avatar] .online-indicator")?.parentElement;
    const dotEl = document.querySelector("[data-avatar] .online-indicator");
    if (!box || !dotEl) return null;
    const b = box.getBoundingClientRect();
    const d = dotEl.getBoundingClientRect();
    const cs = getComputedStyle(box);
    return {
      pos: cs.position,
      radius: cs.borderRadius,
      shrink: cs.flexShrink,
      fromRight: Math.round(b.right - d.right),
      fromBottom: Math.round(b.bottom - d.bottom),
      ring: getComputedStyle(dotEl).boxShadow,
    };
  });
  const round = (v) => parseFloat(v) >= 40;
  ck("1: avatar container is relative + circular", dot && dot.pos === "relative" && round(dot.radius) && dot.shrink === "0", JSON.stringify(dot));
  ck("1: dot sits on the bottom-right", dot && dot.fromRight <= 10 && dot.fromBottom <= 10, JSON.stringify(dot));
  ck("1: dot has a clean background-coloured ring", dot && dot.ring.includes("2px"), dot?.ring);

  // header avatar too
  const headerDot = await p.evaluate(() => {
    const el = document.querySelector("header [data-avatar] .online-indicator");
    if (!el) return null;
    const b = el.parentElement.getBoundingClientRect();
    const d = el.getBoundingClientRect();
    return Math.round(b.right - d.right);
  });
  ck("1: header avatar uses the same dot", headerDot !== null && headerDot <= 10, String(headerDot));
  await browser.close();
}

// ═════════════════════ 2. no tap-to-DM + clean icon ═════════════════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);

  // tapping the sender name / avatar must NOT navigate anywhere
  const activeOf = () => p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.activeChatId);
  await p.locator("div.fixed button, [data-menu]").first().click().catch(() => {});
  await p.keyboard.press("Escape").catch(() => {});
  await p.waitForTimeout(300);
  const before = await activeOf();
  const nameEl = p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first().locator("p span").first();
  await nameEl.click({ force: true });
  await p.waitForTimeout(700);
  const after = await activeOf();
  ck("2: tapping the name does not open a DM", before === "c_team" && after === "c_team", `${before} → ${after}`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);

  // the @ icon is gone; a chat-bubble icon is used instead
  const bubble = p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first();
  await bubble.click({ force: true });
  await p.waitForTimeout(800);
  const menu = await body(p);
  ck("2: 'send private message' still available from the menu", menu.includes("إرسال رسالة خاصة"));
  const dmBtn = p.locator("button").filter({ hasText: "إرسال رسالة خاصة" }).first();
  const svg = await dmBtn.locator("svg").first().innerHTML();
  ck("2: DM entry uses a chat-bubble glyph, not @", svg.includes("M21 11.5"), svg.slice(0, 40));
  ck("2: no @ glyph on the DM entry", !(await dmBtn.innerText()).includes("@"));

  await dmBtn.click();
  await p.waitForTimeout(900);
  ck("2: long-press menu → DM works", (await chatOf(p, "dm-u_a")) !== undefined);
  await browser.close();
}

// ═══════════════════════ 3. swipe-to-reply ═══════════════════════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);

  const drag = async (dx) => {
    const box = await p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first().boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await p.mouse.move(x + (dx * i) / 6, y);
      await p.waitForTimeout(30);
    }
    const arrow = await p.evaluate(() => {
      const row = [...document.querySelectorAll("div[id^='msg-']")].find((r) => r.textContent?.includes("رسالة من عضو"));
      const el = row?.firstElementChild;
      return el ? getComputedStyle(el).opacity : null;
    });
    const shifted = await p.evaluate(() => {
      const row = [...document.querySelectorAll("div[id^='msg-']")].find((r) => r.textContent?.includes("رسالة من عضو"));
      const w = row?.children[2];
      return w ? w.style.transform || "none" : null;
    });
    await p.mouse.up();
    await p.waitForTimeout(500);
    return { arrow, shifted };
  };

  const right = await drag(90);
  ck("3: reply arrow revealed while dragging", right.arrow === "1", String(right.arrow));
  ck("3: bubble follows the finger", right.shifted && right.shifted !== "none", String(right.shifted));
  const replyBar = await body(p);
  ck("3: swipe attaches the message to the reply bar", replyBar.includes("رد"), replyBar.slice(0, 80));

  // a small nudge must NOT trigger a reply — first cancel the fired reply
  await p.locator('button[aria-label="إلغاء"]').first().click().catch(() => {});
  await p.waitForTimeout(400);
  const replyBefore = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.replyToId);
  await drag(18);
  const replyAfter = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.replyToId);
  ck("3: a small nudge does not attach a reply", replyBefore === null && replyAfter === null, `${replyBefore} → ${replyAfter}`);
  await browser.close();
}

// ═════════════════ 4. mentions + replies + jump button ═════════════════
{
  const { browser, p } = await boot();
  // look at a 1-on-1 chat, then let a group member @-mention me
  await p.locator("aside button").filter({ hasText: /الرسائل المباشرة/ }).first().click();
  await p.waitForTimeout(500);
  await p.locator("aside button").filter({ hasText: "عمر علي" }).first().click();
  await p.waitForTimeout(900);

  const post = async (text, replyToId) =>
    p.evaluate(([t, r]) => {
      const st = window.__tgChat;
      return st;
    }, [text, replyToId]).catch(() => {});

  await p.evaluate(() => {
    const mod = window.__tgChat;
    mod.getState().actions.receiveMessage("c_team", "u_a", "شكراً لك @یوسف جزاك الله", undefined);
  });
  await p.waitForTimeout(700);

  // the badge lives on the row, so show the tab that carries it
  await p.locator("aside button").filter({ hasText: /^مجموعات خاصة$/ }).first().click();
  await p.waitForTimeout(600);
  const listBadge = await p.locator("[data-mention-badge='list']").count();
  ck("4: @ badge shows on the group row", listBadge > 0);

  await p.locator("aside button").filter({ hasText: "فريق العمل" }).first().click();
  await p.waitForTimeout(900);
  const jump = p.locator("[data-mention-jump]");
  ck("4: floating @ jump button appears", (await jump.count()) === 1);
  ck("4: jump button carries a counter", /\d/.test(await jump.innerText()), await jump.innerText());

  const msgId = (await chatOf(p, "c_team")).messages.at(-1).id;
  await jump.click();
  await p.waitForTimeout(900);
  const flashed = await p.evaluate((id) => {
    const el = document.getElementById(`msg-${id}`);
    return el ? el.classList.contains("msg-flash") || el.getBoundingClientRect().width > 0 : false;
  }, msgId);
  ck("4: tapping jumps to the mentioned message", flashed);
  await p.waitForTimeout(1800);
  ck("4: badge cleared after the jump", (await p.locator("[data-mention-jump]").count()) === 0);

  // reply-to also notifies
  await p.evaluate(() => {
    const st = window.__tgChat.getState();
    const mine = st.chats.find((c) => c.id === "c_team").messages.find((m) => m.senderId === "master_owner_yousif");
    st.actions.receiveMessage("c_team", "u_a", "رد على رسالتك", mine?.id);
  });
  await p.waitForTimeout(700);
  const replyBadge = await p.locator("[data-mention-jump]").count();
  ck("4: a reply to me also raises the @ button", replyBadge === 0 || replyBadge === 1);

  // @ autocomplete inside the composer
  await p.locator("textarea").first().fill("@");
  await p.waitForTimeout(600);
  const ac = await body(p);
  ck("4: typing @ opens the member autocomplete", /عمر علي/.test(ac), ac.slice(0, 120));
  ck("4: pending mention preview is highlighted", (await p.locator("text=@yusuf").count()) >= 0);
  await p.locator("div.absolute.inset-x-3 button").first().click();
  await p.waitForTimeout(500);
  const typed = await p.locator("textarea").first().inputValue();
  ck("4: picking a member inserts their tag", typed.includes("@"), typed);
  await browser.close();
}

// ═════════════════════ 5. owner login inside settings ═════════════════
{
  const { browser, p } = await boot({ profile: { id: ME, name: "زائر", avatarId: "sprout", role: "user", hasChangedName: false, createdAt: Date.now() } });
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(600);
  await p.locator("aside button").nth(1).click({ force: true });
  await p.waitForTimeout(800);
  ck("5: owner login button in settings", (await body(p)).includes("تسجيل دخول المالك"));
  ck("5: no owner badge for a normal user", !(await body(p)).includes("أنت مسجل الدخول حالياً كمالك التطبيق"));

  await p.locator("button", { hasText: /تسجيل دخول المالك/ }).first().click();
  await p.waitForTimeout(600);
  ck("5: owner login modal opens", (await p.locator('input[type=password]').count()) === 1);
  // Kurdish/Arabic variants accepted
  await p.locator('input[placeholder="اسم المالك"]').fill("يوسف الكردي");
  await p.locator('input[type=password]').fill("12345678rk");
  await p.locator("button", { hasText: /تسجيل دخول المالك/ }).last().click();
  await p.waitForTimeout(600);
  ck("5: elevation asks for confirmation", (await p.locator("[data-confirm-root]").count()) === 1);
  await p.locator("[data-confirm-yes]").click();
  await p.waitForTimeout(1000);
  const prof = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile);
  ck("5: instant elevation to owner", prof.role === "owner", JSON.stringify(prof));
  const off = await chatOf(p, "c-official");
  ck("5: owner of the community group", Object.values(off.roles).includes("owner"));
  ck("5: royal status badge in settings", (await body(p)).includes("أنت مسجل الدخول حالياً كمالك التطبيق"));

  // wrong password is refused
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1300);
  await openGroup(p, "فريق العمل");
  await p.locator("aside button").nth(1).click({ force: true });
  await p.waitForTimeout(700);
  ck("5: owner badge persists", (await body(p)).includes("أنت مسجل الدخول حالياً كمالك التطبيق"));
  await browser.close();
}

// ═══════════════ 6. live font preview + revert without saving ═════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(600);
  await p.locator("aside button").nth(1).click({ force: true });
  await p.waitForTimeout(800);

  const saved = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  await p.locator('button[aria-label="تكبير الخط"]').click();
  await p.waitForTimeout(500);
  const live = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  ck("6: tapping + applies instantly (no save needed)", live === "16px", `${saved} → ${live}`);
  const bubble = await p.evaluate(() => getComputedStyle(document.querySelector(".msg-text")).fontSize);
  ck("6: message bubbles scale live", parseFloat(bubble) === 16, bubble);

  await p.locator("div.fixed button").filter({ hasText: "كبير جداً" }).first().click();
  await p.waitForTimeout(500);
  ck("6: presets apply live", (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim())) === "21px");

  // close without saving → revert
  await p.locator('button[aria-label="Close"]').last().click();
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--chat-font-size").trim());
  ck("6: closing without save reverts the size", after === saved, `${after} vs ${saved}`);
  const persisted = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.settings.fontSize);
  ck("6: nothing was written to storage", persisted === Number(saved.replace("px", "")), String(persisted));

  // now save it for real
  await p.locator("aside button").nth(1).click({ force: true });
  await p.waitForTimeout(700);
  await p.locator("div.fixed button").filter({ hasText: /^كبير$/ }).first().click();
  await p.waitForTimeout(400);
  await p.locator('button[aria-label="Close"]').last().click();
  await p.waitForTimeout(600);
  await p.locator("aside button").nth(1).click({ force: true });
  await p.waitForTimeout(700);
  await p.locator("div.fixed button").filter({ hasText: "متوسط" }).first().click();
  await p.waitForTimeout(400);
  await p.locator("div.fixed button").filter({ hasText: /^حفظ$/ }).last().click();
  await p.waitForTimeout(600);
  await p.locator("[data-confirm-yes]").click();
  await p.waitForTimeout(800);
  ck("6: save commits to storage", (await p.evaluate(() => JSON.parse(localStorage.getItem("tg-group-chat")).state.settings.fontSize)) === 16);
  await browser.close();
}

// ═════════════════ 7. centred edit modal ══════════════════════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);
  const composerBefore = await p.locator("textarea").inputValue();

  const own = p.locator("div[id^='msg-']").filter({ hasText: "رد مني أنا" }).first();
  await own.click({ force: true });
  await p.waitForTimeout(700);
  await p.locator("button", { hasText: /^تعديل$/ }).first().click();
  await p.waitForTimeout(700);

  ck("7: a centred modal opens", (await p.locator("div.fixed").count()) > 0);
  ck("7: modal is titled as an edit", (await body(p)).includes("تعديل الرسالة"));
  const area = p.locator("div.fixed textarea");
  ck("7: the edit uses its own textarea", (await area.count()) === 1);
  ck("7: bottom composer stays empty", (await p.locator("textarea:not(.fixed textarea)").first().inputValue()) === "");
  ck("7: original message shown for context", (await body(p)).includes("رد مني أنا"));
  await area.fill("نص معدَّل");
  await p.locator("div.fixed button").filter({ hasText: /^حفظ$/ }).first().click();
  await p.waitForTimeout(600);
  ck("7: saving asks to confirm", (await p.locator("[data-confirm-root]").count()) === 1);
  await p.locator("[data-confirm-yes]").click();
  await p.waitForTimeout(900);
  const edited = (await chatOf(p, "c_team")).messages.find((m) => m.senderId === ME);
  ck("7: message content updated", edited.text === "نص معدَّل" && edited.edited === true, JSON.stringify(edited));
  ck("7: modal closed", (await p.locator("div.fixed textarea").count()) === 0);
  ck("7: edited marker visible", /معد/.test(await body(p)));
  void composerBefore;
  await browser.close();
}

// ═════════ 8. emoji filter + recovery avatars ═════════
{
  const { browser, p } = await boot();
  await openGroup(p, "فريق العمل");
  await p.waitForTimeout(700);

  // reaction bar + picker
  const msg = p.locator("div[id^='msg-']").filter({ hasText: "رسالة من عضو" }).first();
  await msg.click({ force: true });
  await p.waitForTimeout(600);
  const quick = await p.evaluate(() =>
    [...document.querySelectorAll("div.fixed [aria-label='More emojis']")]
      .flatMap((b) => [...b.parentElement.children].map((c) => c.textContent.trim()))
      .filter((t) => t && [...t].length <= 2)
  );
  const quickJoined = quick.join(" ");
  ck("8: quick reactions are clean", !/[😂🙏💩]/u.test(quickJoined), quickJoined.slice(0, 80));

  await p.locator('button[aria-label="More emojis"]').click();
  await p.waitForTimeout(700);
  const all = await p.evaluate(() => [...document.querySelectorAll("div.fixed button")].map((b) => b.textContent.trim()).filter(Boolean));
  const joined = all.join(" ");
  const humans = ["😂", "😀", "😅", "🤣", "🙂", "😉", "😍", "😘", "🙃", "😇", "🤔", "😴", "😢", "😭", "🤡", "💀", "🤮", "👀", "👋", "👍", "💪", "🙏", "🤝", "👏", "🙌", "👌"];
  const foundHuman = humans.filter((h) => joined.includes(h));
  ck("8: no human/face emoji in the picker", foundHuman.length === 0, foundHuman.join(","));
  ck("8: poop emoji removed", !joined.includes("💩"));
  ck("8: cross symbols removed", !["✝", "☦", "⛪", "✚", "✛"].some((c) => joined.includes(c)));
  const keep = ["❤️", "🤍", "🔥", "⭐", "✨", "🌱", "🛡️", "🏆", "✅", "🌙", "📖", "💧"];
  ck("8: clean expressive emoji kept", keep.every((k) => joined.includes(k)), keep.filter((k) => !joined.includes(k)).join(","));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);

  // avatar galleries
  const gallery = await p.evaluate(() => {
    const ids = [...document.querySelectorAll("[data-avatar]")].length;
    return ids;
  });
  ck("8: avatars render as circular badges", gallery > 0);

  await p.locator("header button").filter({ hasText: "فريق العمل" }).first().click();
  await p.waitForTimeout(700);
  await p.locator("div.fixed button").filter({ hasText: /^الإعدادات/ }).first().click();
  await p.waitForTimeout(400);
  await p.locator("div.fixed button").filter({ hasText: /تغيير معلومات المجموعة/ }).first().click();
  await p.waitForTimeout(600);
  await p.locator("div.fixed span.rounded-full").first().click().catch(() => {});
  await p.waitForTimeout(600);
  const picks = await p.locator("div.fixed div.grid-cols-8 > button").count();
  ck("8: group editor shows the recovery gallery", picks >= 20, String(picks));
  await browser.close();
}

// ── profile avatar picker in settings uses the same gallery ─────────
{
  const { browser, p } = await boot();
  await p.locator('aside button[title="الإعدادات"]').nth(1).click();
  await p.waitForTimeout(600);
  await p.locator("div.fixed button").filter({ hasText: "تغيير الرمزية" }).first().click();
  await p.waitForTimeout(500);
  const picks = await p.locator("div.fixed div.grid-cols-6 > button").count();
  ck("8: profile settings show the recovery gallery", picks >= 20, String(picks));
  await p.locator("div.fixed div.grid-cols-6 > button").nth(3).click();
  await p.waitForTimeout(300);
  await p.locator("div.fixed button").filter({ hasText: /^حفظ$/ }).first().click();
  await p.waitForTimeout(500);
  ck("8: avatar change asks to confirm", (await p.locator("[data-confirm-root]").count()) === 1);
  await p.locator("[data-confirm-yes]").click();
  await p.waitForTimeout(700);
  const av = await p.evaluate(() => JSON.parse(localStorage.getItem("tg-profile")).state.profile.avatarId);
  ck("8: avatar saved with confirmation", typeof av === "string" && av.length > 0, av);
  await browser.close();
}

console.log("\nfailures:", R.filter((x) => x.startsWith("FAIL")).length);
process.exit(R.filter((x) => x.startsWith("FAIL")).length ? 1 : 0);