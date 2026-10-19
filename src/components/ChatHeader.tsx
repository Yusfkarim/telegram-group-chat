import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChat } from "../store/chatStore";
import { ArrowLeft, Ban, Bell, BellOff, List, Lock, MoreH, Palette, Pin, Search, Trash, Users, X } from "./Icons";
import { jumpToMessage } from "../lib/jump";
import { toast } from "./Toaster";
import { Modal } from "./Modal";
import { GroupInfoModal } from "./GroupInfoModal";
import { GroupAvatar } from "./Avatar";
import { useT, presenceText } from "../i18n";
import { can, isOwner, isStaff, roleOf } from "../lib/rbac";
import { confirm } from "./Confirm";
import { BackgroundPicker } from "./BackgroundPicker";
import { RoleBadge } from "./Badge";
import type { Chat } from "../types";

export function ChatHeader({
  chat,
  onBack,
  searchQ,
  setSearchQ,
  pinnedOpen,
  setPinnedOpen,
}: {
  chat: Chat;
  onBack: () => void;
  searchQ: string;
  setSearchQ: (q: string) => void;
  pinnedOpen: boolean;
  setPinnedOpen: (v: boolean) => void;
}) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t, lang } = useT();
  const [dropdown, setDropdown] = useState(false);
  const [bgPicker, setBgPicker] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [info, setInfo] = useState(false);

  const isDm = chat.kind === "dm";
  const blockedUserId = isDm ? chat.dmUserId : undefined;
  const blockedUserIds = useChat((s) => s.blockedUserIds);
  const blocked = Boolean(blockedUserId && blockedUserIds.includes(blockedUserId));
  /* live re-render while peer typing entries are still fresh (they expire after ~1.5s) */
  const [, beat] = useState(0);
  useEffect(() => {
    const any = Object.values(chat.typingUsers ?? {}).some((at) => at > Date.now());
    if (!any) return;
    const iv = window.setInterval(() => beat((x) => x + 1), 400);
    return () => window.clearInterval(iv);
  }, [chat.typingUsers]);
  const typers = Object.entries(chat.typingUsers ?? {})
    .filter(([, at]) => at > Date.now() - 1600)
    .map(([id]) => users[id]?.name ?? "")
    .filter(Boolean);
  const typing = typers.length > 0;
  const staff = chat.kind === "group" && isStaff(chat, meId);
  const owner = chat.kind === "group" && isOwner(chat, meId);
  const dmPeer = chat.kind === "dm" ? users[chat.dmUserId ?? ""] : undefined;
  const online = chat.kind === "dm" ? (dmPeer?.online ? 1 : 0) : chat.memberIds.filter((id) => users[id]?.online).length;
  const subtitle = typing
    ? chat.kind === "dm"
      ? t("typingNow")
      : `${typers.join("، ")} ${t("typingNow")}`
    : chat.kind === "dm"
      ? presenceText(lang, dmPeer, t)
      : `${chat.memberIds.length} ${t("members")} · ${online} ${t("members_online")}`;

  // anchor the dropdown to the button itself, in physical coordinates, so it can
  // never drift to the wrong side of the header in RTL or LTR
  useLayoutEffect(() => {
    if (!dropdown) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const el = menuBtn.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = 256;
      const left = Math.min(Math.max(8, r.left - w / 2 + r.width / 2), window.innerWidth - w - 8);
      setMenuPos({ top: Math.round(r.bottom + 6), left: Math.round(left) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [dropdown]);

  useEffect(() => {
    if (!dropdown) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDropdown(false);
    const onDown = (e: MouseEvent) => {
      if (menuBtn.current?.contains(e.target as Node)) return;
      const menu = document.querySelector("[data-headmenu]");
      if (menu?.contains(e.target as Node)) return;
      setDropdown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [dropdown]);

  const closeSearch = () => {
    setSearching(false);
    setSearchQ("");
  };

  return (
    <header className="relative flex items-center gap-2 border-b border-tg-line bg-tg-bg px-2.5 py-2 md:px-4">
      <button onClick={onBack} className="rounded-full p-1.5 text-tg-muted hover:bg-tg-hover md:hidden">
        <ArrowLeft className="h-5 w-5" />
      </button>

      {searching ? (
        <div className="flex flex-1 items-center gap-2">
          <button onClick={closeSearch} className="rounded-full p-1.5 text-tg-muted hover:bg-tg-hover">
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-tg-input px-3.5 py-2">
            <Search className="h-4 w-4 text-tg-muted" />
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              placeholder={t("searchInGroup")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-tg-muted"
            />
          </div>
        </div>
      ) : (
        <>
          <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setInfo(true)}>
            <GroupAvatar presetId={chat.avatarId} size={40} online={dmPeer?.online} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{chat.name}</span>
                {chat.kind === "group" && staff && <RoleBadge role={roleOf(chat, meId)} customTitle={chat.customTitles[meId]} size="lg" />}
                {chat.muted && <BellOff className="h-3.5 w-3.5 text-tg-muted" />}
                {chat.locked && <Lock className="h-3.5 w-3.5 text-tg-muted" />}
              </p>
              <p className="truncate text-[13px]" style={{ color: "#5795f2" }}>
                {subtitle}
              </p>
            </div>
          </button>

          <button
            onClick={() => setSearching(true)}
            className="shrink-0 rounded-full p-2 text-tg-muted hover:bg-tg-hover"
            aria-label={t("menuSearch")}
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            ref={menuBtn}
            onClick={() => setDropdown((v) => !v)}
            className="shrink-0 rounded-full p-2 text-tg-muted hover:bg-tg-hover"
            aria-label="Menu"
          >
            <MoreH className="h-5 w-5" />
          </button>
        </>
      )}

      {dropdown && menuPos && (
        <div
          data-headmenu
          className="animate-pop fixed z-50 w-64 overflow-hidden rounded-xl bg-tg-panel py-1 text-sm shadow-2xl"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <MenuItem
            icon={<Search className="h-4 w-4" />}
            label={t("menuSearch")}
            onClick={() => {
              setSearching(true);
              setDropdown(false);
            }}
          />
          <MenuItem
            icon={<Pin className="h-4 w-4" />}
            label={`${t("menuPinned")} (${chat.pinnedIds.length})`}
            onClick={() => {
              setPinnedOpen(true);
              setDropdown(false);
            }}
          />
          <MenuItem
            icon={chat.muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            label={chat.muted ? t("menuUnmute") : t("menuMute")}
            onClick={() => {
              a.toggleMute(chat.id);
              toast(chat.muted ? t("unmuted") : t("muted"));
              setDropdown(false);
            }}
          />
          {/* 1-on-1: clear history without the "(for me only)" suffix — the whole
              history is per-account in a private chat */}
          <MenuItem
            icon={<Trash className="h-4 w-4" />}
            label={isDm ? t("menuClearDm") : t("menuClear")}
            onClick={async () => {
              setDropdown(false);
              const ok = await confirm({
                title: t("confirmTitle"),
                message: t("confirmClearHistory"),
                confirmLabel: t("yes"),
                cancelLabel: t("no"),
                danger: true,
              });
              if (ok) {
                a.clearHistory(chat.id);
                toast(t("historyCleared"));
              }
            }}
          />

          {isDm ? (
            /* ── 1-on-1: block / unblock replaces "leave group" ─────────── */
            <MenuItem
              icon={<Ban className="h-4 w-4" />}
              label={blocked ? t("unblockUser") : t("blockUser")}
              danger={!blocked}
              onClick={async () => {
                setDropdown(false);
                const ok = await confirm({
                  title: t("confirmTitle"),
                  message: blocked ? t("confirmUnblockUser") : t("confirmBlockUser"),
                  confirmLabel: t("yes"),
                  cancelLabel: t("no"),
                  danger: !blocked,
                });
                if (!ok || !blockedUserId) return;
                if (blocked) {
                  a.unblockUser(blockedUserId);
                  toast(t("saved"));
                } else {
                  a.blockUser(blockedUserId);
                  toast(t("blockedTitle"));
                }
              }}
            />
          ) : (
            <>
              {!owner && (
                <MenuItem
                  icon={<ArrowLeft className="h-4 w-4" />}
                  label={t("menuLeave")}
                  danger
                  onClick={async () => {
                    setDropdown(false);
                    const ok = await confirm({
                      title: t("confirmTitle"),
                      message: t("confirmLeave"),
                      confirmLabel: t("yes"),
                      cancelLabel: t("no"),
                      danger: true,
                    });
                    if (ok) {
                      a.leaveGroup(chat.id);
                      toast(t("youLeft"));
                    }
                  }}
                />
              )}
              {can.changeGroupInfo(chat, meId) && (
                <MenuItem
                  icon={<Palette className="h-4 w-4" />}
                  label={t("groupBackground")}
                  onClick={() => {
                    setDropdown(false);
                    setBgPicker(true);
                  }}
                />
              )}
              {staff && (
                <MenuItem
                  icon={<Users className="h-4 w-4" />}
                  label={t("menuManage")}
                  onClick={() => {
                    setInfo(true);
                    setDropdown(false);
                  }}
                />
              )}
            </>
          )}

          {/* no role label is ever shown in a 1-on-1 chat */}
          {!isDm && !owner && (
            <p className="px-4 py-2 text-[11px] text-tg-muted">
              {t(roleOf(chat, meId) === "admin" ? "roleAdmin" : "roleMember")}
            </p>
          )}
        </div>
      )}

      {bgPicker && (
        <Modal title={t("groupBackground")} onClose={() => setBgPicker(false)} size="md">
          <BackgroundPicker chat={chat} onClose={() => setBgPicker(false)} />
        </Modal>
      )}
      {info && <GroupInfoModal chat={chat} onClose={() => setInfo(false)} />}
      {pinnedOpen && <PinnedListModal chat={chat} onClose={() => setPinnedOpen(false)} />}
    </header>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 ${
        danger ? "text-red-400" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function PinnedBanner({ chat, onOpenList }: { chat: Chat; onOpenList: () => void }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t } = useT();
  const [idx, setIdx] = useState(0);
  const canPin = can.pinMessages(chat, meId);

  if (chat.pinnedIds.length === 0) return null;

  const id = chat.pinnedIds[Math.min(idx, chat.pinnedIds.length - 1)];
  const msg = chat.messages.find((m) => m.id === id);

  const cycle = () => {
    const next = chat.pinnedIds.length > 1 ? (idx + 1) % chat.pinnedIds.length : 0;
    setIdx(next);
    if (!jumpToMessage(chat.pinnedIds[next])) toast(t("deletedMsg"));
  };

  return (
    <div className="flex items-center gap-2.5 border-b border-tg-line bg-tg-bg px-3 py-2">
      <Pin className="h-4 w-4 shrink-0 text-tg-muted" />
      <button onClick={cycle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">
            {t("menuPinned")}
            {chat.pinnedIds.length > 1 && (
              <span className="ml-1 text-tg-muted">
                {Math.min(idx + 1, chat.pinnedIds.length)}/{chat.pinnedIds.length}
              </span>
            )}
          </p>
          <p className="truncate text-[13px] text-tg-muted">
            {msg && users[msg.senderId] ? `${users[msg.senderId].name}: ` : ""}
            {msg ? msg.text : t("deletedMsg")}
          </p>
        </div>
      </button>
      <button onClick={onOpenList} className="shrink-0 rounded-full p-1.5 text-tg-muted hover:bg-tg-hover">
        <List className="h-4.5 w-4.5" />
      </button>
      {canPin && (
        <button
          onClick={() => {
            a.unpinMessage(chat.id, id);
            toast(t("unpin"));
          }}
          className="shrink-0 rounded-full p-1.5 text-tg-muted hover:bg-tg-hover"
          aria-label="Unpin"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      )}
    </div>
  );
}

function PinnedListModal({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t } = useT();
  const canPin = can.pinMessages(chat, meId);

  return (
    <Modal title={t("menuPinned")} onClose={onClose} size="md">
      {chat.pinnedIds.length === 0 && <p className="py-6 text-center text-sm text-tg-muted">{t("noResults")}</p>}
      <div className="space-y-2">
        {chat.pinnedIds.map((id) => {
          const m = chat.messages.find((x) => x.id === id);
          if (!m || m.deletedForEveryone) return null;
          return (
            <div key={id} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
              <Pin className="mt-0.5 h-4 w-4 shrink-0 text-tg-muted" />
              <button
                onClick={() => {
                  jumpToMessage(id);
                  onClose();
                }}
                className="min-w-0 flex-1 text-left"
              >
                <p className="text-xs font-semibold" style={{ color: users[m.senderId]?.color ?? "#5795f2" }}>
                  {users[m.senderId]?.name}
                </p>
                <p className="mt-0.5 line-clamp-3 text-sm">{m.text}</p>
              </button>
              {canPin && (
                <button
                  onClick={() => a.unpinMessage(chat.id, id)}
                  className="shrink-0 rounded-full p-1.5 text-tg-muted hover:bg-white/10"
                  aria-label="Unpin"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}