import { useState } from "react";
import { useChat } from "../store/chatStore";
import { WALLPAPERS, chosenWallpaperId } from "../assets/wallpapers";
import { useT } from "../i18n";
import { can } from "../lib/rbac";
import { confirm } from "./Confirm";
import { toast } from "./Toaster";
import type { Chat, ChatBackground } from "../types";

const SOLID_PRESETS = ["#3f6f52", "#2f5d8a", "#7a4b8a", "#8a5340", "#3a3f4a", "#4a7b8c"];
const GRADIENT_PRESETS: [string, string][] = [
  ["#1d2b3d", "#2b5278"],
  ["#2a3624", "#1b2318"],
  ["#1c3c40", "#2b6f77"],
  ["#2b2740", "#4a3f6b"],
  ["#f3ece1", "#e6ded1"],
  ["#eef4f8", "#cfe0ec"],
];

/**
 * Owner / admin (canChangeGroupInfo) background editor.
 * Presets, a solid colour picker and a two-stop gradient picker — all saved globally for the group.
 */
export function BackgroundPicker({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const a = useChat((s) => s.actions);
  const meId = useChat((s) => s.meId);
  const { t, lang } = useT();
  const current = chat.customBg;
  const [mode, setMode] = useState<"preset" | "color" | "gradient">(current?.kind === "gradient" ? "gradient" : current ? "color" : "preset");
  const [solid, setSolid] = useState(current?.kind === "color" ? current.value : "#3f6f52");
  const [from, setFrom] = useState(current?.kind === "gradient" ? current.value : "#1d2b3d");
  const [to, setTo] = useState(current?.kind === "gradient" ? (current.value2 ?? "#2b5278") : "#2b5278");

  if (chat.kind === "dm" || !can.changeGroupInfo(chat, meId)) {
    return (
      <div className="px-1 py-6 text-center text-sm text-tg-muted">{t("noPermission")}</div>
    );
  }

  const draft: ChatBackground | null =
    mode === "color" ? { kind: "color", value: solid } : mode === "gradient" ? { kind: "gradient", value: from, value2: to } : null;

  const save = async () => {
    if (mode !== "preset") {
      const ok = await confirm({ title: t("confirmTitle"), message: t("confirmSetBg"), confirmLabel: t("yes"), cancelLabel: t("no") });
      if (!ok) return;
    }
    a.setChatBackground(chat.id, draft);
    toast(t("saved"));
    onClose();
  };

  return (
    <div className="rounded-2xl bg-black/25 p-3">
      <div className="mb-3 flex gap-1.5">
        {(["preset", "color", "gradient"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              mode === m ? "bg-tg-accent text-white" : "bg-white/10 text-tg-muted"
            }`}
          >
            {m === "preset" ? t("bgPreset") : m === "color" ? t("bgSolid") : t("bgGradient")}
          </button>
        ))}
      </div>

      <div
        className="mb-3 h-24 w-full rounded-xl ring-1 ring-white/10"
        style={{
          background: draft
            ? draft.kind === "color"
              ? `${draft.value}, ${patternSvg("#000000", 0.05)}`
              : `linear-gradient(160deg, ${draft.value} 0%, ${draft.value2 ?? draft.value} 100%), ${patternSvg("#ffffff", 0.06)}`
            : undefined,
        }}
      >
        {!draft && (
          <div className="h-full w-full rounded-xl" style={{ background: WALLPAPERS.find((w) => w.id === (chosenWallpaperId(chat.wallpaperId) ?? "tg-dark"))?.css }} />
        )}
      </div>

      {mode === "preset" && (
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPERS.filter((w) => w.id !== "tg-night" && w.id !== "tg-teal").map((w) => (
            <button
              key={w.id}
              onClick={() => {
                a.setChatWallpaper(chat.id, w.id);
                toast(t("saved"));
                onClose();
              }}
              title={lang === "ar" ? w.ar : w.en}
              className={`h-12 rounded-lg ${!chat.customBg && chat.wallpaperId === w.id ? "ring-2 ring-tg-accent" : "ring-1 ring-white/10"}`}
              style={{ background: w.css }}
            />
          ))}
          <button
            onClick={async () => {
              if (await confirm({ title: t("confirmTitle"), message: t("confirmSetBg"), confirmLabel: t("yes"), cancelLabel: t("no") })) {
                a.setChatBackground(chat.id, null);
                toast(t("saved"));
                onClose();
              }
            }}
            className="col-span-4 rounded-lg bg-white/5 py-2 text-xs font-semibold text-tg-muted hover:bg-white/10"
          >
            {t("bgReset")}
          </button>
        </div>
      )}

      {mode === "color" && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={solid}
              onChange={(e) => setSolid(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-lg bg-transparent"
              aria-label={t("bgColor")}
            />
            <div className="grid flex-1 grid-cols-3 gap-1.5">
              {SOLID_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSolid(c)}
                  className={`h-9 rounded-lg ${solid === c ? "ring-2 ring-white" : "ring-1 ring-white/10"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {mode === "gradient" && (
        <>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-tg-muted">
              <input type="color" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg bg-transparent" aria-label={t("bgColor")} />
            </label>
            <label className="flex items-center gap-2 text-xs text-tg-muted">
              <input type="color" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg bg-transparent" aria-label={t("bgColor2")} />
            </label>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {GRADIENT_PRESETS.map(([a1, b1]) => (
              <button
                key={a1 + b1}
                onClick={() => {
                  setFrom(a1);
                  setTo(b1);
                }}
                className={`h-9 rounded-lg ${from === a1 && to === b1 ? "ring-2 ring-white" : "ring-1 ring-white/10"}`}
                style={{ background: `linear-gradient(160deg, ${a1}, ${b1})` }}
              />
            ))}
          </div>
        </>
      )}

      {mode !== "preset" && (
        <button onClick={save} className="mt-3 w-full rounded-xl bg-tg-accent py-2.5 text-sm font-semibold text-white">
          {t("save")}
        </button>
      )}
    </div>
  );
}

/** the subtle Telegram SVG pattern laid over custom colours */
export const patternSvg = (color: string, opacity = 0.06) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'><g fill='${color}' fill-opacity='${opacity}'><circle cx='45' cy='45' r='4'/><path d='M42 18h6v18h18v6H48v18h-6V42H24v-6h18z'/></g></svg>`
  )}")`;