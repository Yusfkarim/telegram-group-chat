import { useEffect, useRef, useState } from "react";
import { useChat } from "../store/chatStore";
import { useProfile, handleFromName, isMasterName, MASTER_OWNER_PASSWORD } from "../store/profileStore";
import { useT, applyDocumentLang } from "../i18n";
import { WALLPAPERS } from "../assets/wallpapers";
import { RECOVERY_AVATARS } from "../assets/recovery";
import { Modal, Toggle } from "./Modal";
import { GroupAvatar } from "./Avatar";
import { toast } from "./Toaster";
import { confirm } from "./Confirm";
import { MAX_FONT, MIN_FONT } from "../types";
import { Crown } from "./Icons";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile);
  const changeName = useProfile((s) => s.changeName);
  const promoteToOwner = useProfile((s) => s.promoteToOwner);
  const saveProfile = useProfile((s) => s.saveProfile);
  const adoptAccount = useChat((s) => s.actions.adoptAccount);
  const settings = useChat((s) => s.settings);
  const me = useChat((s) => s.users[s.meId]);
  const setFontSize = useChat((s) => s.actions.setFontSize);
  const { t, lang } = useT();

  const [editingName, setEditingName] = useState(false);
  const nameLocked = Boolean(profile?.hasChangedName);
  const [draftName, setDraftName] = useState("");
  const setLang = useChat((s) => s.actions.setLang);
  const setHide = useChat((s) => s.actions.setHideLastSeen);
  const setWall = useChat((s) => s.actions.setLocalWallpaper);

  /* ── point 6: the font size previews live and reverts unless saved ──── */
  /** the size that was persisted before this dialog opened — the revert target */
  const originalFont = useRef(settings.fontSize);
  const [draftFont, setDraftFont] = useState(originalFont.current);
  const [, setFontTouched] = useState(false);
  const preview = (px: number) => {
    const v = Math.min(MAX_FONT, Math.max(MIN_FONT, px));
    setDraftFont(v);
    setFontTouched(true);
    setFontSize(v); // applied instantly, everywhere, before saving
  };

  /* ── point 8: recovery avatar gallery for the profile ──────────────── */
  const [showAvatars, setShowAvatars] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState(profile?.avatarId ?? RECOVERY_AVATARS[0].id);

  /* ── point 5: owner login from Settings ───────────────────────────── */
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPass, setOwnerPass] = useState("");
  const [ownerErr, setOwnerErr] = useState(false);
  const isOwner = profile?.role === "owner";
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const close = () => {
    // leaving without pressing "حفظ" restores the size that was stored on open
    if (draftFont !== originalFont.current) setFontSize(originalFont.current);
    onClose();
  };

  const signInAsOwner = async () => {
    if (!isMasterName(ownerName) || ownerPass !== MASTER_OWNER_PASSWORD) {
      setOwnerErr(true);
      toast(t("ownerWrong"));
      return;
    }
    const ok = await confirm({
      title: t("confirmTitle"),
      message: t("confirmAssignOwner", { name: ownerName.trim() }),
      confirmLabel: t("yes"),
      cancelLabel: t("no"),
    });
    if (!ok) return;
    const p = saveProfile(ownerName, profile?.avatarId ?? me.avatarId);
    promoteToOwner(p.id, ownerName, profile?.avatarId ?? me.avatarId);
    adoptAccount({
      id: p.id,
      name: p.name,
      username: handleFromName(p.name),
      avatarId: profile?.avatarId ?? me.avatarId,
      isOwner: true,
    });
    setOwnerOpen(false);
    setOwnerErr(false);
    setOwnerPass("");
    toast(t("ownerLoginOk"));
  };

  return (
    <Modal title={t("settings")} onClose={close} size="md">
      {/* ── profile: avatar + one-time name ─────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <button onClick={() => setShowAvatars((v) => !v)} className="relative shrink-0 rounded-full" title={t("changeAvatar")}>
          <GroupAvatar presetId={profile?.avatarId ?? me.avatarId} size={52} />
          <span className="absolute -bottom-1 rounded-full bg-tg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
            {t("changeAvatar")}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{me.name}</p>
          <p className="truncate text-sm text-tg-muted">@{me.username}</p>
        </div>
        <button
          onClick={() => {
            if (nameLocked) {
              toast(t("nameChangeLocked"));
              return;
            }
            setDraftName(me.name);
            setEditingName((v) => !v);
          }}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
            nameLocked ? "cursor-not-allowed bg-white/5 text-tg-muted/70" : "bg-white/10"
          }`}
        >
          {nameLocked ? t("nameChanged") : t("changeName")}
        </button>
      </div>

      {showAvatars && (
        <div className="mt-2 rounded-xl bg-black/20 p-2.5">
          <div className="grid grid-cols-6 gap-2">
            {RECOVERY_AVATARS.map((a) => (
              <button
                key={a.id}
                onClick={() => setDraftAvatar(a.id)}
                title={lang === "ar" ? a.ar : a.en}
                className={`overflow-hidden rounded-full transition-transform hover:scale-110 ${
                  draftAvatar === a.id ? "ring-2 ring-tg-accent ring-offset-2 ring-offset-tg-panel" : ""
                }`}
              >
                <GroupAvatar presetId={a.id} size={38} />
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GroupAvatar presetId={draftAvatar} size={34} />
              <span className="text-xs text-tg-muted">
                {RECOVERY_AVATARS.find((a) => a.id === draftAvatar)?.ar}
              </span>
            </div>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: t("confirmTitle"),
                  message: t("confirmAvatar"),
                  confirmLabel: t("yes"),
                  cancelLabel: t("no"),
                });
                if (!ok) return;
                const cur = useProfile.getState().profile;
                if (cur) {
                  saveProfile(draftAvatar === cur.avatarId ? cur.name : cur.name, draftAvatar);
                }
                adoptAccount({ id: me.id, name: me.name, username: me.username, avatarId: draftAvatar });
                setShowAvatars(false);
                toast(t("avatarSaved"));
              }}
              className="shrink-0 rounded-lg bg-tg-accent px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t("save")}
            </button>
          </div>
        </div>
      )}

      {editingName && (
        <div className="mt-2 flex gap-2">
          <input
            value={draftName}
            disabled={nameLocked}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={40}
            className={`w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none disabled:opacity-50 ${
              nameLocked ? "cursor-not-allowed" : ""
            }`}
          />
          <button
            disabled={nameLocked}
            onClick={async () => {
              const n = draftName.trim();
              const ok = await confirm({
                title: t("confirmTitle"),
                message: t("confirmName"),
                confirmLabel: t("yes"),
                cancelLabel: t("no"),
              });
              if (!ok) return;
              const res = changeName(n);
              if (!res.ok) {
                toast(t(res.error === "locked" ? "nameChangeLocked" : "nameTooShort"));
                return;
              }
              adoptAccount({ id: me.id, name: n, username: handleFromName(n), avatarId: profile?.avatarId ?? me.avatarId });
              setEditingName(false);
              toast(t("saved"));
            }}
            className="shrink-0 rounded-xl bg-tg-accent px-4 text-sm font-semibold disabled:opacity-40"
          >
            {t("save")}
          </button>
        </div>
      )}

      {nameLocked && (
        <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-center text-xs text-amber-300">{t("nameChangeLocked")}</p>
      )}

      {/* ── point 5: owner access ───────────────────────────────────── */}
      <section className="mt-4">
        {isOwner ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-l from-amber-400/25 to-amber-500/5 px-3.5 py-3 ring-1 ring-amber-400/35">
            <Crown className="h-5 w-5 shrink-0 text-amber-300" />
            <p className="text-sm font-semibold text-amber-100">{t("ownerLoggedIn")}</p>
          </div>
        ) : (
          <button
            onClick={() => setOwnerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-500/80 to-amber-700/70 py-3 text-sm font-bold text-white shadow-lg shadow-amber-900/20"
          >
            <Crown className="h-5 w-5" /> {t("ownerLogin")}
          </button>
        )}
      </section>

      {/* ── point 6: font size, live preview then save ───────────────── */}
      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("fontSize")}</h3>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => preview(draftFont - 1)}
              disabled={draftFont <= MIN_FONT}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-bold disabled:opacity-30"
              aria-label={t("fontSmaller")}
            >
              −
            </button>
            <input
              type="range"
              min={MIN_FONT}
              max={MAX_FONT}
              step={1}
              value={draftFont}
              onChange={(e) => preview(Number(e.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-tg-accent"
              aria-label={t("fontSize")}
            />
            <button
              onClick={() => preview(draftFont + 1)}
              disabled={draftFont >= MAX_FONT}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-bold disabled:opacity-30"
              aria-label={t("fontBigger")}
            >
              +
            </button>
            <span className="w-10 shrink-0 text-center text-sm font-bold tabular-nums text-tg-muted">{draftFont}</span>
          </div>

          <div className="mt-3 flex gap-1.5">
            {([
              { px: 14, label: t("fontSmall") },
              { px: 16, label: t("fontMedium") },
              { px: 18, label: t("fontLarge") },
              { px: 21, label: t("fontXLarge") },
            ]).map((p) => (
              <button
                key={p.px}
                onClick={() => preview(p.px)}
                aria-label={p.label}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ${
                  draftFont === p.px ? "bg-tg-accent text-white" : "bg-white/10 text-tg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* live preview bubble at the currently previewed size */}
          <div className="mt-3 flex justify-start rounded-xl bg-tg-bg/60 p-2">
            <div className="rounded-2xl rounded-bl-md bg-tg-panel px-3 py-1.5 shadow" style={{ fontSize: draftFont }}>
              <p className="msg-text leading-snug">{t("fontPreviewMsg")}</p>
            </div>
          </div>

          <button
            onClick={async () => {
              const ok = await confirm({
                title: t("confirmTitle"),
                message: t("confirmSetFont"),
                confirmLabel: t("yes"),
                cancelLabel: t("no"),
              });
              if (!ok) return;
              setFontSize(draftFont);
              setFontTouched(false);
              toast(t("saved"));
            }}
            className="mt-3 w-full rounded-xl bg-tg-accent py-2.5 text-sm font-semibold"
          >
            {t("save")}
          </button>
          <p className="mt-2 text-[11px] text-tg-muted">{t("fontSizeDesc")}</p>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("language")}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLang("ar");
              applyDocumentLang("ar");
              toast(t("languageSwitched"));
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${lang === "ar" ? "bg-tg-accent text-white" : "bg-white/10"}`}
          >
            العربية
          </button>
          <button
            onClick={() => {
              setLang("en");
              applyDocumentLang("en");
              toast(t("languageSwitched"));
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${lang === "en" ? "bg-tg-accent text-white" : "bg-white/10"}`}
          >
            English
          </button>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("privacy")}</h3>
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">{t("hideLastSeen")}</p>
            <p className="mt-0.5 text-xs text-tg-muted">{t("hideLastSeenDesc")}</p>
          </div>
          <Toggle on={settings.hideLastSeen} onChange={() => setHide(!settings.hideLastSeen)} />
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("localWallpaper")}</h3>
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPERS.filter((w) => w.id !== "tg-night" && w.id !== "tg-teal").map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setWall(w.id);
                toast(t("wallpaperSet"));
              }}
              className={`h-14 rounded-xl ring-offset-2 ring-offset-tg-panel transition-transform ${settings.wallpaperId === w.id ? "ring-2 ring-tg-accent" : ""}`}
              style={{ background: w.css }}
              title={lang === "ar" ? w.ar : w.en}
            />
          ))}
        </div>
      </section>

      <button
        onClick={async () => {
          const ok = await confirm({
            title: t("confirmTitle"),
            message: t("clearDataDesc"),
            confirmLabel: t("yes"),
            cancelLabel: t("no"),
            danger: true,
          });
          if (!ok) return;
          window.localStorage.removeItem("tg-group-chat");
          window.location.reload();
        }}
        className="mt-5 w-full rounded-xl bg-red-500/15 py-3 text-sm font-semibold text-red-400"
      >
        {t("clearData")}
      </button>

      {/* ── owner login modal ───────────────────────────────────────── */}
      {ownerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setOwnerOpen(false)}
        >
          <div className="animate-pop w-full max-w-sm overflow-hidden rounded-2xl bg-tg-panel shadow-2xl">
            <div className="px-5 pt-6 pb-4 text-center">
              <Crown className="mx-auto mb-2 h-9 w-9 text-amber-300" />
              <h3 className="text-lg font-semibold">{t("ownerLoginTitle")}</h3>
              <p className="mt-1 text-xs text-tg-muted">{t("ownerLoginHint")}</p>
              <input
                value={ownerName}
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  setOwnerErr(false);
                }}
                placeholder={t("ownerNameField")}
                className="mt-4 w-full rounded-2xl bg-tg-input px-4 py-3 text-center text-sm outline-none ring-1 ring-transparent focus:ring-amber-400/60"
              />
              <input
                type="password"
                value={ownerPass}
                onChange={(e) => {
                  setOwnerPass(e.target.value);
                  setOwnerErr(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && void signInAsOwner()}
                placeholder={t("ownerPasswordField")}
                className={`mt-2 w-full rounded-2xl bg-tg-input px-4 py-3 text-center text-sm outline-none ring-1 focus:ring-amber-400/60 ${
                  ownerErr ? "ring-red-400/70" : "ring-transparent"
                }`}
              />
            </div>
            <div className="flex border-t border-white/5">
              <button
                onClick={() => setOwnerOpen(false)}
                className="flex-1 border-e border-white/5 py-3.5 text-[15px] font-semibold text-tg-muted hover:bg-white/5"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => void signInAsOwner()}
                className="flex-1 py-3.5 text-[15px] font-semibold text-amber-400 hover:bg-white/5"
              >
                {t("ownerLogin")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}