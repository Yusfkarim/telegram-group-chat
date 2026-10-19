import { useState } from "react";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { Modal, Toggle } from "./Modal";
import { Avatar } from "./Avatar";
import { Ban, Crown, LogOut, VolumeOff, Volume } from "./Icons";
import { toast } from "./Toaster";
import { confirm } from "./Confirm";
import { can, canTarget, isOwner, isStaff, roleOf } from "../lib/rbac";
import { fmtDuration } from "../lib/format";
import type { AdminPermissions, Chat } from "../types";
import { NO_PERMS } from "../types";

/** every permission is toggled individually — nothing is implicit */
type PermLabel =
  | "permDelete" | "permDeleteDesc" | "permPin" | "permPinDesc" | "permKick" | "permKickDesc"
  | "permMute" | "permMuteDesc" | "permApprove" | "permApproveDesc" | "permInfo" | "permInfoDesc"
  | "permInvite" | "permInviteDesc";

const PERM_LABELS: { key: keyof AdminPermissions; label: PermLabel; desc: PermLabel }[] = [
  { key: "canDeleteMessages", label: "permDelete", desc: "permDeleteDesc" },
  { key: "canPinMessages", label: "permPin", desc: "permPinDesc" },
  { key: "canKickMembers", label: "permKick", desc: "permKickDesc" },
  { key: "canMuteMembers", label: "permMute", desc: "permMuteDesc" },
  { key: "canApproveJoinRequests", label: "permApprove", desc: "permApproveDesc" },
  { key: "canChangeGroupInfo", label: "permInfo", desc: "permInfoDesc" },
  { key: "canInviteUsers", label: "permInvite", desc: "permInviteDesc" },
];

export function ModerationModal({ chat, userId, onClose }: { chat: Chat; userId: string; onClose: () => void }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t } = useT();
  const isAdminTarget = roleOf(chat, userId) === "admin";
  const [perms, setPerms] = useState<AdminPermissions>(chat.adminPerms[userId] ?? NO_PERMS);
  const [title, setTitle] = useState(chat.customTitles[userId] ?? "");
  const [banReason, setBanReason] = useState("");
  const [showBan, setShowBan] = useState(false);

  const u = users[userId];
  if (!u) return null;

  const targetIsOwner = isOwner(chat, userId);
  const iAmOwner = isOwner(chat, meId);
  const targetable = canTarget(chat, meId, userId);
  const canMute = can.muteMembers(chat, meId) && targetable;
  const canKick = can.kickMembers(chat, meId) && targetable;
  const restricted = chat.restrictions[userId];
  const durations: { label: string; ms: number }[] = [
    { label: t("restrict15"), ms: 900_000 },
    { label: t("restrict1h"), ms: 3_600_000 },
    { label: t("restrict1d"), ms: 86_400_000 },
    { label: t("restrictForever"), ms: 2_592_000_000 },
  ];

  const ask = (message: string, danger = true) =>
    confirm({ title: t("confirmTitle"), message, confirmLabel: t("yes"), cancelLabel: t("no"), danger });

  return (
    <Modal title={targetIsOwner ? t("owner") : u.name} onClose={onClose} size="md">
      <div className="mb-4 flex items-center gap-3">
        <Avatar user={u} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{u.name}</p>
          <p className="text-sm text-tg-muted">@{u.username}</p>
          <p className="mt-0.5 text-xs text-tg-muted">
            {u.online ? t("online") : u.hideLastSeen ? t("lastSeenHidden") : ""} ·{" "}
            {t(roleOf(chat, userId) === "owner" ? "roleOwner" : isAdminTarget ? "roleAdmin" : "roleMember")}
          </p>
        </div>
      </div>

      {targetIsOwner ? (
        <p className="rounded-xl bg-white/5 p-3 text-sm text-tg-muted">{t("creator")}</p>
      ) : !canMute && !canKick && !iAmOwner ? (
        <div className="space-y-3">
          <button
            onClick={() => {
              a.openDm(userId);
              onClose();
            }}
            className="w-full rounded-xl bg-tg-accent/15 py-2.5 text-sm font-semibold text-tg-accent"
          >
            {t("startDm")}
          </button>
          <p className="rounded-xl bg-white/5 p-3 text-sm text-tg-muted">{t("manageOnly")}</p>
        </div>
      ) : (
        <>
          {/* ── mute / unmute ─────────────────────────────────────────── */}
          {canMute && (
            <section className="mb-4">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("restrict")}</h3>
              {restricted ? (
                <button
                  onClick={async () => {
                    if (!(await ask(t("confirmUnmute", { name: u.name }), false))) return;
                    a.unrestrict(chat.id, userId);
                    toast(t("unmuteDone"));
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-green/15 py-2.5 text-sm font-medium text-tg-green"
                >
                  <Volume className="h-4 w-4" /> {t("unrestrict")}
                  {restricted.until > Date.now() ? ` (${fmtDuration(restricted.until - Date.now())})` : ""}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.label}
                      onClick={async () => {
                        if (!(await ask(t("confirmMute", { name: u.name })))) return;
                        a.restrict(chat.id, userId, Date.now() + d.ms);
                        toast(t("muteDone"));
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 text-sm transition-colors hover:bg-white/10"
                    >
                      <VolumeOff className="h-3.5 w-3.5" /> {d.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── admin permissions — owner only ────────────────────────── */}
          {iAmOwner && (
            <section className="mb-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-tg-muted uppercase">
                <Crown className="h-3.5 w-3.5" /> {t("adminPerms")}
              </h3>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("customTitle")}
                className="mb-2 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none"
              />
              <div className="space-y-1.5">
                {PERM_LABELS.map((p) => (
                  <div key={p.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3.5 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm">{t(p.label)}</span>
                      <span className="block text-[11px] text-tg-muted">{t(p.desc)}</span>
                    </span>
                    <Toggle on={perms[p.key]} onChange={() => setPerms({ ...perms, [p.key]: !perms[p.key] })} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => {
                    const msg = isAdminTarget ? t("confirmEditAdmin", { name: u.name }) : t("confirmAssignAdmin", { name: u.name });
                    if (!(await ask(msg, false))) return;
                    a.promote(chat.id, userId, perms, title);
                    toast(t("promoteToast", { u: u.name }));
                    onClose();
                  }}
                  className="flex-1 rounded-xl bg-tg-accent py-2.5 text-sm font-semibold"
                >
                  {isAdminTarget ? t("savePerms") : t("promote")}
                </button>
                {isAdminTarget && (
                  <button
                    onClick={async () => {
                      if (!(await ask(t("confirmRemoveAdmin", { name: u.name })))) return;
                      a.demote(chat.id, userId);
                      toast(t("demoteToast", { u: u.name }));
                      onClose();
                    }}
                    className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold"
                  >
                    {t("demote")}
                  </button>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!(await ask(t("confirmAssignOwner", { name: u.name })))) return;
                  a.transferOwnership(chat.id, userId);
                  toast(t("transferToast", { u: u.name }));
                  onClose();
                }}
                className="mt-2 w-full rounded-xl bg-white/5 py-2.5 text-sm text-tg-muted hover:bg-white/10"
              >
                {t("transferToast", { u: u.name })}
              </button>
            </section>
          )}

          {/* ── kick & ban ────────────────────────────────────────────── */}
          {canKick && (
            <section className="space-y-2">
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("moderation")}</h3>
              <button
                onClick={async () => {
                  if (!(await ask(t("confirmKick", { name: u.name })))) return;
                  a.kick(chat.id, userId);
                  toast(t("kickDone"));
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" /> {t("kick")}
              </button>
              {showBan ? (
                <div className="rounded-xl bg-white/5 p-3">
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder={t("banReason")}
                    className="mb-2 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!(await ask(t("confirmBan", { name: u.name })))) return;
                      a.ban(chat.id, userId, banReason.trim() || "—");
                      toast(t("banToast", { u: u.name }));
                      onClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-sm font-semibold"
                  >
                    <Ban className="h-4 w-4" /> {t("ban")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBan(true)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Ban className="h-4 w-4" /> {t("ban")}
                </button>
              )}
            </section>
          )}
        </>
      )}

      {chat.kind === "dm" && (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-tg-muted">{t("manageOnly")}</p>
      )}
      {!isStaff(chat, meId) && !canMute && !canKick && chat.kind !== "dm" && (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-tg-muted">{t("noPermission")}</p>
      )}
    </Modal>
  );
}