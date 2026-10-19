import { useState } from "react";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { Modal, Row, Toggle } from "./Modal";
import { Avatar } from "./Avatar";
import { ModerationModal } from "./ModerationModal";
import { JoinGroupModal } from "./JoinGroupModal";
import { RECOVERY_AVATARS } from "../assets/recovery";
import { GroupAvatar } from "./Avatar";
import { WALLPAPERS } from "../assets/wallpapers";
import { Ban, Copy, Crown, Globe, Lock, LogOut, Trash, Users, Chat } from "./Icons";
import { confirm } from "./Confirm";
import { BackgroundPicker } from "./BackgroundPicker";
import { toast } from "./Toaster";
import { can, hasAnyPerm, isOwner, isStaff, roleOf } from "../lib/rbac";
import { RoleBadge } from "./Badge";
import type { BannedUser, Chat as ChatRecord, JoinRequest } from "../types";

type Tab = "members" | "invites" | "requests" | "settings" | "banned";

export function GroupInfoModal({ chat, onClose }: { chat: ChatRecord; onClose: () => void }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t, lang } = useT();
  const [tab, setTab] = useState<Tab>("members");
  const [mod, setMod] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name);
  const [desc, setDesc] = useState(chat.description);
  const [handle, setHandle] = useState(chat.handle ?? "");
  const [avatarId, setAvatarId] = useState(chat.avatarId);
  const [showAvatars, setShowAvatars] = useState(false);
  const [showWall, setShowWall] = useState(false);
  const [bgPicker, setBgPicker] = useState(false);
  const [joinModal, setJoinModal] = useState(false);

  const staff = isStaff(chat, meId);
  const owner = isOwner(chat, meId);
  const canInvite = can.inviteUsers(chat, meId);
  const online = chat.memberIds.filter((id) => users[id]?.online).length;
  const inviteUrl = (tok: string) => `https://t.me/+/${tok}`;

  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: "members", label: t("membersTab"), count: chat.memberIds.length, show: true },
    { id: "invites", label: t("invitesTab"), count: chat.invites.filter((i) => !i.revoked).length, show: canInvite },
    { id: "requests", label: t("requestsTab"), count: chat.joinRequests.length, show: chat.joinRequests.length > 0 && can.approveJoinRequests(chat, meId) },
    { id: "settings", label: t("settingsTab"), show: hasAnyPerm(chat, meId) },
    { id: "banned", label: t("bannedTab"), count: chat.banned.length, show: can.kickMembers(chat, meId) && chat.banned.length > 0 },
  ];

  return (
    <Modal title={t("groupInfo")} onClose={onClose} size="lg">
      <div className="flex flex-col items-center gap-2 pb-4 pt-6 text-center">
        {editing ? (
          <button onClick={() => setShowAvatars(!showAvatars)} className="relative">
            <GroupAvatar presetId={avatarId} size={80} />
            <span className="absolute -bottom-1 rounded-full bg-tg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
              {t("pickAvatar")}
            </span>
          </button>
        ) : (
          <GroupAvatar presetId={chat.avatarId} size={80} />
        )}

        {showAvatars && (
          <div className="grid w-full grid-cols-8 gap-1.5 rounded-xl bg-black/20 p-2">
            {RECOVERY_AVATARS.map((av) => (
              <button
                key={av.id}
                onClick={() => setAvatarId(av.id)}
                title={lang === "ar" ? av.ar : av.en}
                className={`overflow-hidden rounded-full ${avatarId === av.id ? "ring-2 ring-tg-accent" : ""}`}
              >
                <GroupAvatar presetId={av.id} size={32} />
              </button>
            ))}
          </div>
        )}

        {editing ? (
          <div className="w-full space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-center text-lg font-semibold outline-none"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              className="w-full resize-none rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: t("confirmTitle"),
                    message: t("confirmSaveChanges"),
                    confirmLabel: t("yes"),
                    cancelLabel: t("no"),
                  });
                  if (!ok) return;
                  a.updateGroupInfo(chat.id, { name: name.trim(), description: desc, avatarId });
                  toast(t("save"));
                  setEditing(false);
                  setShowAvatars(false);
                }}
                className="flex-1 rounded-xl bg-tg-accent py-2.5 text-sm font-semibold"
              >
                {t("save")}
              </button>
              <button
                onClick={() => {
                  setName(chat.name);
                  setDesc(chat.description);
                  setAvatarId(chat.avatarId);
                  setEditing(false);
                  setShowAvatars(false);
                }}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-semibold">{chat.name}</h3>
            <p className="text-sm text-tg-muted">
              {chat.memberIds.length} {t("members")} · {online} {t("members_online")}
              {chat.visibility === "public" ? ` · @${chat.handle}` : ` · ${t("inviteOnlyNotice")}`}
            </p>
            {chat.description && <p className="max-w-sm text-sm text-tg-muted">{chat.description}</p>}
            <div className="mt-2 flex gap-2">
              {canInvite && (
                <button
                  onClick={() => {
                    const tok = a.generateInvite(chat.id);
                    if (tok) {
                      setNewLink(tok);
                      toast(t("inviteCreated"));
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-tg-accent px-4 py-2 text-sm font-semibold"
                >
                  <Users className="h-4 w-4" /> {t("shareInvite")}
                </button>
              )}
              <button
                onClick={() => setJoinModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                <Globe className="h-4 w-4" /> {t("findGroups")}
              </button>
            </div>
            {!staff && (
              <p className="mt-2 max-w-sm rounded-xl bg-white/5 p-2.5 text-xs text-tg-muted">
                {t("managementOnly")} · {t("yourRole", { role: t(roleOf(chat, meId) === "owner" ? "roleOwner" : roleOf(chat, meId) === "admin" ? "roleAdmin" : "roleMember") })}
              </p>
            )}
            {!canInvite && (
              <p className="mt-2 max-w-sm rounded-xl bg-white/5 p-2.5 text-xs text-tg-muted">{t("noAddHint")}</p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-white/5 pb-2">
        {tabs
          .filter((x) => x.show)
          .map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                tab === x.id ? "bg-tg-accent text-white" : "bg-white/5 text-tg-muted"
              }`}
            >
              {x.label}
              {x.count !== undefined && ` ${x.count}`}
            </button>
          ))}
      </div>

      <div className="mt-3 max-h-[44vh] space-y-1 overflow-y-auto">
        {tab === "members" && (
          <>
            {chat.founderName && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-amber-400/20 to-amber-500/5 px-3.5 py-3 ring-1 ring-amber-400/30">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#d8a13b,#8a5c14)" }}
                >
                  {chat.founderName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                    {chat.founderName}
                    <RoleBadge role="owner" size="lg" />
                  </p>
                  <p className="text-xs text-tg-muted">{t("owner")} · {t("creator")}</p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "members" &&
          [...new Set(chat.memberIds)]
            .sort((x, y) => {
              const rank = (id: string) => (roleOf(chat, id) === "owner" ? 0 : roleOf(chat, id) === "admin" ? 1 : 2);
              return rank(x) - rank(y);
            })
            .map((id) => {
              const u = users[id];
              if (!u) return null;
              const role = roleOf(chat, id);
              const restricted = chat.restrictions[id];
              return (
                <button
                  key={id}
                  onClick={() => (id === meId ? null : setMod(id))}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start hover:bg-white/5"
                >
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {u.name}
                      <RoleBadge role={role} customTitle={chat.customTitles[id]} />
                    </p>
                    <p className="text-xs text-tg-muted">
                      {u.online
                        ? t("online")
                        : u.hideLastSeen
                          ? t("lastSeenHidden")
                          : new Date(u.lastSeen).toLocaleString(lang === "ar" ? "ar" : "en-GB", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                      {restricted && restricted.until > Date.now() ? ` · ${t("restricted")}` : ""}
                    </p>
                  </div>
                  {id !== meId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        a.openDm(id);
                        onClose();
                      }}
                      className="shrink-0 rounded-full p-1.5 text-tg-accent hover:bg-white/10"
                      title={t("dmFromMenu")}
                    >
                      <Chat className="h-4 w-4" />
                    </button>
                  )}
                  {role === "owner" && <Crown className="h-4 w-4 text-tg-accent" />}
                </button>
              );
            })}

        {tab === "invites" && (
          <div className="space-y-2">
            <button
              onClick={() => {
                const tok = a.generateInvite(chat.id);
                if (tok) {
                  setNewLink(tok);
                  toast(t("inviteCreated"));
                }
              }}
              className="w-full rounded-xl bg-tg-accent py-2.5 text-sm font-semibold"
            >
              {t("createInvite")}
            </button>
            {newLink && (
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-tg-muted">{inviteUrl(newLink)}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteUrl(newLink));
                    toast(t("inviteCopied"));
                  }}
                  className="rounded-lg p-1.5 hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
            {chat.invites
              .filter((i) => !i.revoked)
              .map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{inviteUrl(i.token)}</p>
                    <p className="text-xs text-tg-muted">{t("inviteUses", { n: i.uses })}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: t("confirmTitle"), message: t("confirmRevokeInvite"), confirmLabel: t("yes"), cancelLabel: t("no"), danger: true });
                      if (!ok) return;
                      a.revokeInvite(chat.id, i.id);
                    }}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            {chat.invites.filter((i) => !i.revoked).length === 0 && (
              <p className="py-4 text-center text-sm text-tg-muted">{t("noResults")}</p>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-2">
            {chat.joinRequests.map((r: JoinRequest) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
                <Avatar user={users[r.userId]} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{users[r.userId]?.name}</p>
                  <p className="text-xs text-tg-muted">{t("requestVia", { via: r.via })}</p>
                </div>
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: t("confirmTitle"), message: t("confirmApproveJoin"), confirmLabel: t("yes"), cancelLabel: t("no") });
                    if (!ok) return;
                    a.approveJoin(chat.id, r.id);
                  }}
                  className="rounded-lg bg-tg-accent px-3 py-1.5 text-xs font-semibold"
                >
                  {t("approve")}
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: t("confirmTitle"), message: t("confirmDismissJoin"), confirmLabel: t("yes"), cancelLabel: t("no"), danger: true });
                    if (!ok) return;
                    a.dismissJoin(chat.id, r.id);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-tg-muted hover:bg-white/5"
                >
                  {t("dismiss")}
                </button>
              </div>
            ))}
            {chat.joinRequests.length === 0 && (
              <p className="py-4 text-center text-sm text-tg-muted">{t("noResults")}</p>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-1">
            <Row
              title={t("changeInfo")}
              desc={can.changeGroupInfo(chat, meId) ? t("editInfo") : t("blockedByPolicy")}
              onClick={can.changeGroupInfo(chat, meId) ? () => setEditing(true) : undefined}
              right={<span className="text-tg-muted">›</span>}
            />

            <Row
              title={t("groupBackground")}
              desc={can.changeGroupInfo(chat, meId) ? undefined : t("blockedByPolicy")}
              onClick={can.changeGroupInfo(chat, meId) ? () => setBgPicker(true) : undefined}
              right={<span className="text-tg-muted">›</span>}
            />
            <Row
              title={t("setGroupWallpaper")}
              desc={can.changeGroupInfo(chat, meId) ? t("bgPreset") : t("blockedByPolicy")}
              onClick={can.changeGroupInfo(chat, meId) ? () => setShowWall(true) : undefined}
              right={<span className="text-tg-muted">›</span>}
            />
            {showWall && (
              <div className="grid grid-cols-4 gap-2 px-3.5 pb-2">
                {WALLPAPERS.filter((w) => w.id !== "tg-night" && w.id !== "tg-teal").map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      a.setChatWallpaper(chat.id, w.id);
                      setShowWall(false);
                      toast(t("wallpaperSet"));
                    }}
                    className={`h-14 rounded-xl ${chat.wallpaperId === w.id ? "ring-2 ring-tg-accent" : ""}`}
                    style={{ background: w.css }}
                    title={lang === "ar" ? w.ar : w.en}
                  />
                ))}
              </div>
            )}

            {owner && !chat.official && (
              <Row
                title={chat.visibility === "public" ? t("makePrivate") : t("makePublic")}
                right={
                  <Toggle
                    on={chat.visibility === "public"}
                    onChange={() => a.setVisibility(chat.id, chat.visibility === "public" ? "private" : "public")}
                  />
                }
              />
            )}
            {chat.visibility === "public" && owner && (
              <div className="px-3.5 py-2">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder={t("handle")}
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: t("confirmTitle"), message: t("confirmSaveChanges"), confirmLabel: t("yes"), cancelLabel: t("no") });
                    if (!ok) return;
                    a.updateGroupInfo(chat.id, { handle });
                    toast(t("saved"));
                  }}
                  className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold"
                >
                  {t("save")}
                </button>
              </div>
            )}
            <Row
              title={t("membersCanSend")}
              desc={t("lockChat")}
              right={<Toggle on={chat.membersCanSend} onChange={() => a.toggleMemberSend(chat.id)} disabled={!isOwner(chat, meId)} />}
            />
            <Row
              title={t("approvalMode")}
              right={<Toggle on={chat.approvedMode} onChange={() => a.setApprovedMode(chat.id, !chat.approvedMode)} disabled={!can.changeGroupInfo(chat, meId)} />}
            />
            <div className="px-3.5 py-2">
              <p className="mb-2 text-sm">{t("slowMode")}</p>
              <div className="flex flex-wrap gap-1.5">
                {([0, 10, 30, 60, 300] as const).map((s) => (
                  <button
                    key={s}
                    disabled={!isOwner(chat, meId)}
                    onClick={() => a.setSlowMode(chat.id, s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      chat.slowMode === s ? "bg-tg-accent text-white" : "bg-white/10"
                    }`}
                  >
                    {s === 0 ? t("cancel") : s < 60 ? `${s}s` : s === 60 ? "1m" : "5m"}
                  </button>
                ))}
              </div>
            </div>
            <Row
              title={t("visibility")}
              desc={chat.visibility === "public" ? t("privacyPublic") : t("privacyPrivate")}
              right={chat.visibility === "public" ? <Globe className="h-4 w-4 text-tg-muted" /> : <Lock className="h-4 w-4 text-tg-muted" />}
            />
            {owner && !chat.official ? (
              <Row
                title={t("deleteGroup")}
                danger
                onClick={async () => {
                  const ok = await confirm({ title: t("confirmTitle"), message: t("confirmDeleteGroup"), confirmLabel: t("yes"), cancelLabel: t("no"), danger: true });
                  if (!ok) return;
                  a.deleteGroup(chat.id);
                  onClose();
                }}
                right={<Trash className="h-4 w-4" />}
              />
            ) : (
              !chat.official && !owner && (
                <Row
                  title={t("leaveGroup")}
                  danger
                  onClick={async () => {
                    const ok = await confirm({ title: t("confirmTitle"), message: t("confirmLeave"), confirmLabel: t("yes"), cancelLabel: t("no"), danger: true });
                    if (!ok) return;
                    a.leaveGroup(chat.id);
                    onClose();
                  }}
                  right={<LogOut className="h-4 w-4" />}
                />
              )
            )}
            {chat.official && (
              <p className="px-3.5 py-2 text-center text-xs text-tg-muted">{t("officialPinned")}</p>
            )}
          </div>
        )}

        {tab === "banned" && (
          <div className="space-y-2">
            {chat.banned.map((b: BannedUser) => (
              <div key={b.userId} className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2.5">
                <Ban className="h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{users[b.userId]?.name ?? b.userId}</p>
                  <p className="text-xs text-tg-muted">{b.reason}</p>
                </div>
                <button
                    onClick={async () => {
                      const ok = await confirm({ title: t("confirmTitle"), message: t("confirmUnban", { name: users[b.userId]?.name ?? b.userId }), confirmLabel: t("yes"), cancelLabel: t("no") });
                      if (!ok) return;
                      a.unban(chat.id, b.userId);
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
                  >
                  {t("unban")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {bgPicker && <BackgroundPicker chat={chat} onClose={() => setBgPicker(false)} />}
      {mod && <ModerationModal chat={chat} userId={mod} onClose={() => setMod(null)} />}
      {joinModal && <JoinGroupModal onClose={() => setJoinModal(false)} />}
    </Modal>
  );
}

