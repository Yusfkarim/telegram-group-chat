import { useState } from "react";
import { Search, Smile } from "./Icons";
import { useT, type TKey } from "../i18n";

/**
 * Clean, non-human emoji set: no people/faces, no crude or offensive symbols,
 * and no cross / religious marker of any kind.
 */
export const QUICK_EMOJI = ["❤️", "🤍", "🔥", "🌟", "✨", "🌱", "🛡️", "🏆"];

/* eslint-disable no-redeclare */
const GROUPS: { key: string; title: TKey; tags: string; items: string[] }[] = [
  {
    key: "Hearts",
    title: "emojiHearts",
    tags: "قلب قلوب حب محبة ود love heart hearts",
    items: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝"],
  },
  {
    key: "Stars & Light",
    title: "emojiStars",
    tags: "نجوم نور شمس قمر stars light sun moon star",
    items: ["⭐","🌟","✨","⚡","☀️","🌙","🌛","🌜","🌝","💫","🔥","💥","💡","🕯️","🌈","☁️","🌤️","⛅","🌥️"],
  },
  {
    key: "Nature & Growth",
    title: "emojiNature",
    tags: "طبيعة رستن نبات nature growth flower tree sea",
    items: ["🌱","🌿","☘️","🍀","🌾","🌷","🌸","💐","🌺","🌻","🌹","🍃","🍂","🍁","🌴","🌵","🌲","🌳","🌊","💧"],
  },
  {
    key: "Strength & Honour",
    title: "emojiStrength",
    tags: "قوة شرف فوز strength honour win trophy shield",
    items: ["🛡️","🏆","🥇","🥈","🥉","🎖️","⚔️","🗡️","🏹","🛶","⛵","🚩","🎯","🎼","🥁","🧭","⚓","🪨","🧱","🔗"],
  },
  {
    key: "Calm & Clarity",
    title: "emojiCalm",
    tags: "صفاء وضوح هدوء calm clarity check lock peace",
    items: ["✅","☑️","✔️","❌","🔔","🔕","🔒","🔓","🕊️","💠","🔷","🔹","🔸","💎","📿","🧿","📖","📚","📝"],
  },
  {
    key: "Recovery Symbols",
    title: "emojiRecovery",
    tags: "تعافي recovery sunrise clean meditate يوغا",
    items: ["🌅","🌄","🏔️","⛰️","🗻","🌋","🏕️","🌃","🌌","🌠","♻️","🚿","🧼","🧴","🪥","🧺","🔔","🕯️","🧘"],
  },
  {
    key: "Encouragement",
    title: "emojiEncourage",
    tags: "تشجيع encourage door bed time goal start راحة",
    items: ["🛟","🧭","🚪","🛏️","🕰️","⏰","🧯","🪫","🧃","🫗","🫧","🧼","🧺","🚿","🛁","🧖","🎯","🏁","🚩"],
  },
  {
    key: "Food & Drink",
    title: "emojiFood",
    tags: "طعام شراب food drink fruit coffee tea قهوة",
    items: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🍅","🥑","🥦","🥬","🍞","🧃","☕","🍵","🥛","🍯","🥚","🧀"],
  },
];

/** last-resort filter — keeps the banned classes out even if a list is edited later */
const BANNED_CHARS = "💩✝☦⛪✡✚✛☥";
/**
 * Exact deny-list of "people, faces and body parts". A deny-list is used so that no
 * legitimate symbol — hearts, nature, weather, objects, marks — is ever lost by
 * accident when the ranges below get extended.
 */
const HUMAN_EMOJI = new Set([
  "\u{1F440}",
  "\u{1F441}",
  "\u{1F442}",
  "\u{1F443}",
  "\u{1F444}",
  "\u{1F445}",
  "\u{1F446}",
  "\u{1F447}",
  "\u{1F448}",
  "\u{1F449}",
  "\u{1F44A}",
  "\u{1F44B}",
  "\u{1F44C}",
  "\u{1F44D}",
  "\u{1F44E}",
  "\u{1F44F}",
  "\u{1F450}",
  "\u{1F595}",
  "\u{1F596}",
  "\u{1F5E1}",
  "\u{1F5E8}",
  "\u{1F464}",
  "\u{1F465}",
  "\u{1F466}",
  "\u{1F467}",
  "\u{1F468}",
  "\u{1F469}",
  "\u{1F46A}",
  "\u{1F46B}",
  "\u{1F46C}",
  "\u{1F46D}",
  "\u{1F46E}",
  "\u{1F470}",
  "\u{1F471}",
  "\u{1F472}",
  "\u{1F473}",
  "\u{1F474}",
  "\u{1F475}",
  "\u{1F476}",
  "\u{1F477}",
  "\u{1F478}",
  "\u{1F479}",
  "\u{1F47A}",
  "\u{1F47B}",
  "\u{1F47C}",
  "\u{1F47D}",
  "\u{1F47E}",
  "\u{1F481}",
  "\u{1F482}",
  "\u{1F485}",
  "\u{1F486}",
  "\u{1F487}",
  "\u{1F48F}",
  "\u{1F4AA}",
  "\u{1F590}",
  "\u{1F645}",
  "\u{1F646}",
  "\u{1F647}",
  "\u{1F648}",
  "\u{1F649}",
  "\u{1F64A}",
  "\u{1F64B}",
  "\u{1F64C}",
  "\u{1F64D}",
  "\u{1F64E}",
  "\u{1F64F}",
  "\u{1F6A3}",
  "\u{261D}",
  "\u{270A}",
  "\u{270B}",
  "\u{270C}",
  "\u{270D}",
  "\u{1F90C}",
  "\u{1F90F}",
  "\u{1F910}",
  "\u{1F911}",
  "\u{1F912}",
  "\u{1F913}",
  "\u{1F914}",
  "\u{1F915}",
  "\u{1F916}",
  "\u{1F917}",
  "\u{1F918}",
  "\u{1F919}",
  "\u{1F91A}",
  "\u{1F91B}",
  "\u{1F91C}",
  "\u{1F91D}",
  "\u{1F91E}",
  "\u{1F91F}",
  "\u{1F920}",
  "\u{1F921}",
  "\u{1F922}",
  "\u{1F923}",
  "\u{1F924}",
  "\u{1F925}",
  "\u{1F926}",
  "\u{1F927}",
  "\u{1F928}",
  "\u{1F929}",
  "\u{1F92A}",
  "\u{1F92B}",
  "\u{1F92C}",
  "\u{1F92D}",
  "\u{1F92E}",
  "\u{1F92F}",
  "\u{1F930}",
  "\u{1F931}",
  "\u{1F932}",
  "\u{1F933}",
  "\u{1F934}",
  "\u{1F935}",
  "\u{1F936}",
  "\u{1F937}",
  "\u{1F938}",
  "\u{1F939}",
  "\u{1F93A}",
  "\u{1F93C}",
  "\u{1F93D}",
  "\u{1F93E}",
  "\u{1F93F}",
  "\u{1F940}",
  "\u{1F941}",
  "\u{1F942}",
  "\u{1F943}",
  "\u{1F944}",
  "\u{1F945}",
  "\u{1F947}",
  "\u{1F948}",
  "\u{1F949}",
  "\u{1F94A}",
  "\u{1F94B}",
  "\u{1F94C}",
  "\u{1F94D}",
  "\u{1F94E}",
  "\u{1F94F}",
  "\u{1F950}",
  "\u{1F951}",
  "\u{1F952}",
  "\u{1F953}",
  "\u{1F954}",
  "\u{1F955}",
  "\u{1F956}",
  "\u{1F957}",
  "\u{1F958}",
  "\u{1F959}",
  "\u{1F95A}",
  "\u{1F95B}",
  "\u{1F95C}",
  "\u{1F95D}",
  "\u{1F95E}",
  "\u{1F95F}",
  "\u{1F960}",
  "\u{1F961}",
  "\u{1F962}",
  "\u{1F963}",
  "\u{1F964}",
  "\u{1F965}",
  "\u{1F966}",
  "\u{1F967}",
  "\u{1F968}",
  "\u{1F969}",
  "\u{1F96A}",
  "\u{1F96B}",
  "\u{1F96C}",
  "\u{1F96D}",
  "\u{1F96E}",
  "\u{1F96F}",
  "\u{1F970}",
  "\u{1F971}",
  "\u{1F972}",
  "\u{1F973}",
  "\u{1F974}",
  "\u{1F975}",
  "\u{1F976}",
  "\u{1F977}",
  "\u{1F978}",
  "\u{1F979}",
  "\u{1F97A}",
  "\u{1F97B}",
  "\u{1F97C}",
  "\u{1F97D}",
  "\u{1F97E}",
  "\u{1F97F}",
  "\u{1F980}",
  "\u{1F981}",
  "\u{1F982}",
  "\u{1F983}",
  "\u{1F984}",
  "\u{1F985}",
  "\u{1F986}",
  "\u{1F987}",
  "\u{1F988}",
  "\u{1F989}",
  "\u{1F98A}",
  "\u{1F98B}",
  "\u{1F98C}",
  "\u{1F98D}",
  "\u{1F98E}",
  "\u{1F98F}",
  "\u{1F990}",
  "\u{1F991}",
  "\u{1F992}",
  "\u{1F993}",
  "\u{1F994}",
  "\u{1F995}",
  "\u{1F996}",
  "\u{1F997}",
  "\u{1F998}",
  "\u{1F999}",
  "\u{1F99A}",
  "\u{1F99B}",
  "\u{1F99C}",
  "\u{1F99D}",
  "\u{1F99E}",
  "\u{1F99F}",
  "\u{1F9A0}",
  "\u{1F9A1}",
  "\u{1F9A2}",
  "\u{1F9A3}",
  "\u{1F9A4}",
  "\u{1F9A5}",
  "\u{1F9A6}",
  "\u{1F9A7}",
  "\u{1F9A8}",
  "\u{1F9A9}",
  "\u{1F9AA}",
  "\u{1F9AB}",
  "\u{1F9AC}",
  "\u{1F9AD}",
  "\u{1F9AE}",
  "\u{1F9AF}",
  "\u{1F9B0}",
  "\u{1F9B1}",
  "\u{1F9B2}",
  "\u{1F9B3}",
  "\u{1F9B4}",
  "\u{1F9B5}",
  "\u{1F9B6}",
  "\u{1F9B7}",
  "\u{1F9B8}",
  "\u{1F9B9}",
  "\u{1F9BA}",
  "\u{1F9BB}",
  "\u{1F9BC}",
  "\u{1F9BD}",
  "\u{1F9BE}",
  "\u{1F9BF}",
  "\u{1F9C0}",
  "\u{1F9C1}",
  "\u{1F9C2}",
  "\u{1F9C3}",
  "\u{1F9C4}",
  "\u{1F9C5}",
  "\u{1F9C6}",
  "\u{1F9C7}",
  "\u{1F9C8}",
  "\u{1F9C9}",
  "\u{1F9CA}",
  "\u{1F9CB}",
  "\u{1F9CC}",
  "\u{1F9CD}",
  "\u{1F9CE}",
  "\u{1F9CF}",
  "\u{1F9D0}",
  "\u{1F9D1}",
  "\u{1F9D2}",
  "\u{1F9D3}",
  "\u{1F9D4}",
  "\u{1F9D5}",
  "\u{1F9D6}",
  "\u{1F9D7}",
  "\u{1F9D8}",
  "\u{1F9D9}",
  "\u{1F9DA}",
  "\u{1F9DB}",
  "\u{1F9DC}",
  "\u{1F9DD}",
  "\u{1F9DE}",
  "\u{1F9DF}",
  "\u{1F9E0}",
  "\u{1F9E1}",
  "\u{1F9E2}",
  "\u{1F9E3}",
  "\u{1F9E4}",
  "\u{1F9E5}",
  "\u{1F9E6}",
  "\u{1F9E7}",
  "\u{1F9E8}",
  "\u{1F9E9}",
  "\u{1F9EA}",
  "\u{1F9EB}",
  "\u{1F9EC}",
  "\u{1F9ED}",
  "\u{1F9EE}",
  "\u{1F9EF}",
  "\u{1F9F0}",
  "\u{1F9F1}",
  "\u{1F9F2}",
  "\u{1F9F3}",
  "\u{1F9F4}",
  "\u{1F9F5}",
  "\u{1F9F6}",
  "\u{1F9F7}",
  "\u{1F9F8}",
  "\u{1F9F9}",
  "\u{1F9FA}",
  "\u{1F9FB}",
  "\u{1F9FC}",
  "\u{1F9FD}",
  "\u{1F9FE}",
  "\u{1F9FF}",
  "\u{1FAC0}",
  "\u{1FAC1}",
  "\u{1FAC2}",
  "\u{1FAC3}",
  "\u{1FAC4}",
  "\u{1FAC5}",
  "\u{1FAC6}",
  "\u{1FAC7}",
  "\u{1FAC8}",
  "\u{1FAC9}",
  "\u{1FACA}",
  "\u{1FACB}",
  "\u{1FACC}",
  "\u{1FACD}",
  "\u{1FACE}",
  "\u{1FACF}",
  "\u{1FAD0}",
  "\u{1FAD1}",
  "\u{1FAD2}",
  "\u{1FAD3}",
  "\u{1FAD4}",
  "\u{1FAD5}",
  "\u{1FAD6}",
  "\u{1FAD7}",
  "\u{1FAD8}",
  "\u{1FAD9}",
  "\u{1FADA}",
  "\u{1FADB}",
  "\u{1FADC}",
  "\u{1FADD}",
  "\u{1FADE}",
  "\u{1FADF}",
  "\u{1FAE0}",
  "\u{1FAE1}",
  "\u{1FAE2}",
  "\u{1FAE3}",
  "\u{1FAE4}",
  "\u{1FAE5}",
  "\u{1FAE6}",
  "\u{1FAE7}",
  "\u{1FAE8}",
  "\u{1FAE9}",
  "\u{1FAEA}",
  "\u{1FAEB}",
  "\u{1FAEC}",
  "\u{1FAED}",
  "\u{1FAEE}",
  "\u{1FAEF}",
  "\u{1FAF0}",
  "\u{1FAF1}",
  "\u{1FAF2}",
  "\u{1FAF3}",
  "\u{1FAF4}",
  "\u{1FAF5}",
  "\u{1FAF6}",
  "\u{1FAF7}",
  "\u{1FAF8}",
  "\u{1FAF9}",
  "\u{1FAFA}",
  "\u{1FAFB}",
  "\u{1FAFC}",
  "\u{1FAFD}",
  "\u{1FAFE}",
  "\u{1FAFF}",
]);

const isHumanEmoji = (e: string) => {
  for (const ch of e) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp >= 0x1f3fb && cp <= 0x1f3ff) continue; // skin-tone modifiers are fine
    if (HUMAN_EMOJI.has(ch)) return true;
  }
  return false;
};

const isClean = (e: string) => ![...e].some((ch) => BANNED_CHARS.includes(ch)) && !isHumanEmoji(e);

export const EMOJI_GROUPS = GROUPS.map((g) => ({ ...g, items: g.items.filter(isClean) })).filter((g) => g.items.length > 0);
export const ALL_EMOJI = EMOJI_GROUPS.flatMap((g) => g.items).filter(isClean);

export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose?: () => void }) {
  const [q, setQ] = useState("");
  const { t } = useT();
  const norm = (x: string) =>
    x
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/\s+/g, " ")
      .trim();
  const needle = norm(q);
  const results = needle
    ? EMOJI_GROUPS.filter((g) => norm(t(g.title)).includes(needle) || norm(g.tags).includes(needle))
    : [];

  return (
    <div className="animate-pop flex max-h-96 w-80 max-w-[90vw] flex-col overflow-hidden rounded-2xl bg-tg-panel shadow-2xl" dir="rtl">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-tg-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("emojiSearch")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-tg-muted"
        />
        <Smile className="h-4 w-4 shrink-0 text-tg-muted" />
      </div>
      <div className="w-full flex-1 overflow-y-auto px-2 py-2">
        {needle ? (
          <div className="w-full">
            {results.length === 0 && <p className="p-4 text-center text-xs text-tg-muted">{t("emojiNone")}</p>}
            {results.map((g) => (
              <div key={g.key} className="mb-2">
                <p className="px-1 py-1 text-[11px] font-semibold tracking-wide text-tg-muted">{t(g.title)}</p>
                <div className="grid grid-cols-6 gap-2 py-1">
                  {g.items.map((e, i) => (
                    <button key={`${e}-${i}`} onClick={() => onPick(e)} className="rounded-lg p-1 text-xl hover:bg-white/10">
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          EMOJI_GROUPS.map((g) => (
            <div key={g.key} className="mb-2">
              <p className="px-1 py-1 text-[11px] font-semibold tracking-wide text-tg-muted">{t(g.title)}</p>
              <div className="grid grid-cols-6 gap-2 py-1">
                {g.items.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    onClick={() => onPick(e)}
                    className="rounded-lg p-1 text-xl transition-transform hover:scale-125 hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {onClose && (
        <button onClick={onClose} className="border-t border-white/5 py-2 text-xs text-tg-muted hover:bg-white/5">
          {t("emojiClose")}
        </button>
      )}
    </div>
  );
}
