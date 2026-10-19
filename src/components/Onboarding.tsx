import { useState } from "react";
import { useProfile, isMasterName, MASTER_OWNER_PASSWORD } from "../store/profileStore";
import { toast } from "./Toaster";
import { useT } from "../i18n";
import { RECOVERY_AVATARS } from "../assets/recovery";
import { GroupAvatar } from "./Avatar";
import { ArrowLeft, Check } from "./Icons";

/**
 * First screen: the person simply writes their full name.
 * No passwords, no usernames — beauty and speed only.
 */
const CrownMini = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M3 8l3.6 3L12 4.5 17.4 11 21 8l-1.6 10.5H4.6L3 8z" />
  </svg>
);

export function Onboarding({ compact = false }: { compact?: boolean }) {
  const saveProfile = useProfile((s) => s.saveProfile);
  const promoteToOwner = useProfile((s) => s.promoteToOwner);
  const { t, lang, isRTL } = useT();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState(RECOVERY_AVATARS[0].id);
  const [picking, setPicking] = useState(false);
  const [touched, setTouched] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPass, setOwnerPass] = useState("");
  const [ownerErr, setOwnerErr] = useState(false);

  const valid = name.trim().length >= 2;
  const showError = touched && !valid;

  const submitOwner = () => {
    if (!isMasterName(ownerName) || ownerPass !== MASTER_OWNER_PASSWORD) {
      setOwnerErr(true);
      toast(t("ownerWrong"));
      return;
    }
    const canonical = ownerName.trim();
    const p = saveProfile(canonical, RECOVERY_AVATARS[0].id);
    promoteToOwner(p.id, canonical, RECOVERY_AVATARS[0].id);
    toast(t("ownerWelcome"));
  };

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    saveProfile(name, avatarId);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-tg-bg p-5">
      {/* ambient background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(90% 70% at 50% -10%, rgba(87,149,242,.28) 0%, rgba(87,149,242,.06) 45%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-tg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="animate-pop relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-tg-panel/90 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="relative px-7 pt-8 pb-6 text-center">
            <span className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-tg-accent/60 to-transparent" />

            <div className="mx-auto mb-5 w-fit">
              <button
                onClick={() => setPicking((v) => !v)}
                className="group relative rounded-full transition-transform hover:scale-105"
                aria-label={t("pickAvatar")}
              >
                <span className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-tg-accent/50 to-emerald-400/30 opacity-70 blur-md transition-opacity group-hover:opacity-100" />
                <span className="relative block rounded-full ring-2 ring-white/10">
                  <GroupAvatar presetId={avatarId} size={92} />
                </span>
              </button>
            </div>

            <h1 className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-2xl font-bold text-transparent">
              {t("welcome")}
            </h1>
            <p className="mt-1.5 text-sm text-tg-muted">{t("pickNameHint")}</p>

            {picking && (
              <div className="animate-pop mt-4 grid grid-cols-8 gap-1.5 rounded-2xl bg-black/25 p-2.5">
                {RECOVERY_AVATARS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAvatarId(a.id)}
                    title={lang === "ar" ? a.ar : a.en}
                    className={`overflow-hidden rounded-full transition-transform hover:scale-110 ${
                      avatarId === a.id ? "ring-2 ring-tg-accent ring-offset-2 ring-offset-tg-panel" : ""
                    }`}
                  >
                    <GroupAvatar presetId={a.id} size={30} />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t("fullNamePlaceholder")}
                maxLength={40}
                autoFocus
                className={`w-full rounded-2xl bg-tg-input px-5 py-4 text-center text-lg font-medium outline-none transition-colors placeholder:text-tg-muted/70 ${
                  showError ? "ring-1 ring-red-400/60" : "ring-1 ring-transparent focus:ring-tg-accent/60"
                }`}
              />
              {showError && <p className="mt-2 text-xs text-red-400">{t("nameTooShort")}</p>}
            </div>

            <button
              onClick={submit}
              disabled={!valid}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-tg-accent to-sky-400 py-4 text-base font-bold text-white shadow-lg shadow-tg-accent/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              {t("continue")}
              <Check className="h-5 w-5" />
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-tg-muted/80">
              <Check className="h-3.5 w-3.5 text-tg-green" />
              {lang === "ar" ? "يُحفظ اسمك على هذا الجهاز فقط" : "Your name is stored only on this device"}
            </p>

            <div className="mt-5 border-t border-white/8 pt-5">
              {!ownerOpen ? (
                <button
                  onClick={() => {
                    setOwnerOpen(true);
                    setOwnerName("");
                    setOwnerPass("");
                    setOwnerErr(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400/25 to-amber-600/15 px-4 py-3 text-sm font-bold text-amber-200 ring-1 ring-amber-400/35 transition-transform active:scale-[0.98]"
                >
                  <CrownMini /> {t("ownerLogin")}
                </button>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-center text-[11px] text-amber-200/80">{t("ownerLoginHint")}</p>
                  <input
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      setOwnerErr(false);
                    }}
                    placeholder={lang === "ar" ? "اسم المالك" : "Owner name"}
                    className="w-full rounded-2xl bg-tg-input px-4 py-3 text-center text-sm outline-none ring-1 ring-transparent focus:ring-amber-400/60"
                  />
                  <input
                    type="password"
                    value={ownerPass}
                    onChange={(e) => {
                      setOwnerPass(e.target.value);
                      setOwnerErr(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && submitOwner()}
                    placeholder={t("ownerPassword")}
                    className={`w-full rounded-2xl bg-tg-input px-4 py-3 text-center text-sm outline-none ring-1 focus:ring-amber-400/60 ${ownerErr ? "ring-red-400/70" : "ring-transparent"}`}
                  />
                  <button
                    onClick={submitOwner}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-bold text-black active:scale-[0.98]"
                  >
                    {t("ownerLogin")}
                  </button>
                  <button onClick={() => setOwnerOpen(false)} className="w-full text-xs text-tg-muted">
                    {t("cancel")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!compact && (
          <p className="mt-5 text-center text-xs text-tg-muted/70">
            {isRTL ? "تعافي من الإدمان · مجتمع لا أبرح" : "Recovery · مجتمع لا أبرح"}
          </p>
        )}
        {void ArrowLeft}
      </div>
    </div>
  );
}