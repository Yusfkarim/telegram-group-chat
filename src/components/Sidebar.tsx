import { useMemo, useState } from "react";
import { useChat } from "../store/chatStore";
import type { Chat } from "../types";
import { useT } from "../i18n";
import { GroupAvatar } from "./Avatar";
import { Avatar } from "./Avatar";
import { BellOff, Globe, Lock, Moon, Pin, Plus, Search, Sun, Users } from "./Icons";
import { NewGroupModal } from "./NewGroupModal";
import { JoinGroupModal } from "./JoinGroupModal";
import { SettingsModal } from "./SettingsModal";
import { fmtPreviewTime } from "../lib/format";
import { RoleBadge } from "./Badge";
import { roleOf } from "../lib/rbac";

type Tab = "dms" | "private" | "public";

function ChatListItem({ chat, active, onClick }: { chat: Chat; active: boolean; onClick: () => void }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const { t } = useT();
  const last = [...chat.messages].reverse().find((m) => !m.deletedForEveryone);
  const sender = last ? users[last.senderId] : undefined;
  const mentions = (chat.mentionIds ?? []).length;
  const preview = last
    ? last.system
      ? last.text
      : (sender?.id === meId ? `${t("you")}: ` : chat.kind === "group" && chat.memberIds.length > 2 ? `${sender?.name.split(" ")[0]}: ` : "") +
        last.text
    : "";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
        active ? "bg-tg-active" : "hover:bg-tg-hover"
      }`}
    >
      <GroupAvatar presetId={chat.avatarId} size={48} online={chat.kind === "dm" ? users[chat.dmUserId ?? ""]?.online : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
            {chat.name}
            {chat.kind === "group" && <RoleBadge role={roleOf(chat, meId)} />}
          </span>
          {last && <span className="shrink-0 text-xs text-tg-muted">{fmtPreviewTime(last.at)}</span>}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${chat.unread ? "font-medium" : "text-tg-muted"}`}>{preview}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {chat.kind === "group" &&
              (chat.visibility === "public" ? (
                <Globe className="h-3.5 w-3.5 text-tg-muted" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-tg-muted" />
              ))}
            {chat.muted && <BellOff className="h-3.5 w-3.5 text-tg-muted" />}
            {mentions > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-tg-green px-1 text-[11px] font-bold text-white"
                title={t("mentionsYou")}
                data-mention-badge="list"
              >
                @
              </span>
            )}
            {chat.unread > 0 && (
              <span className="min-w-5 rounded-full bg-tg-accent px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                {chat.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function FeaturedCard({ chat, active }: { chat: Chat; active: boolean }) {
  const openChat = useChat((s) => s.actions.openChat);
  const { t } = useT();
  return (
    <button
      onClick={() => openChat(chat.id)}
      className={`group relative mb-1 w-full overflow-hidden rounded-2xl p-3 text-start transition-transform active:scale-[0.99] ${
        active ? "ring-2 ring-tg-accent" : "ring-1 ring-white/10"
      }`}
      style={{
        background:
          "linear-gradient(135deg, rgba(87,149,242,.28) 0%, rgba(87,149,242,.10) 45%, rgba(14,20,28,.6) 100%)",
        boxShadow: "0 8px 26px -12px rgba(87,149,242,.65)",
      }}
    >
      <span className="pointer-events-none absolute -top-6 -end-6 h-24 w-24 rounded-full bg-tg-accent/25 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <GroupAvatar presetId={chat.avatarId} size={52} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[15px] font-bold">
            <Pin className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            {chat.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-200/90">
            <CrownDot /> {t("featured")}
          </p>
          <p className="truncate text-xs text-tg-muted">{chat.description}</p>
        </div>
      </div>
    </button>
  );
}

const CrownDot = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
    <path d="M3 8l3.6 3L12 4.5 17.4 11 21 8l-1.6 10.5H4.6L3 8z" />
  </svg>
);

export function Sidebar() {
  const chats = useChat((s) => s.chats);
  const active = useChat((s) => s.activeChatId);
  const meId = useChat((s) => s.meId);
  const openChat = useChat((s) => s.actions.openChat);
  const theme = useChat((s) => s.theme);
  const setTheme = useChat((s) => s.actions.setTheme);
  const { t, tab, lang } = useT();
  const [tabKey, setTabKey] = useState<Tab>("public");
  const [q, setQ] = useState("");
  const [newGroup, setNewGroup] = useState(false);
  const [join, setJoin] = useState(false);
  const [settings, setSettings] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const lists = useMemo(() => {
    const mine = chats.filter((c) => c.memberIds.includes(meId));
    const match = (c: Chat) => c.name.toLowerCase().includes(q.trim().toLowerCase());
    const byTime = (x: Chat, y: Chat) => (x.messages.at(-1)?.at ?? 0) - (y.messages.at(-1)?.at ?? 0);

    const dms = mine.filter((c) => c.kind === "dm").filter(match).sort(byTime);
    // private groups are a visible directory for everyone; membership only controls reading
    const priv = chats
      .filter((c) => c.kind === "group" && c.visibility === "private")
      .filter(match)
      .sort((x, y) => Number(y.memberIds.includes(meId)) - Number(x.memberIds.includes(meId)) || byTime(x, y));
    // the public tab is a hard whitelist: open groups only, never a private/locked one
    const isPublic = (c: Chat) => c.kind === "group" && c.visibility === "public";
    const minePublic = mine.filter(isPublic);
    const discover = chats.filter((c) => isPublic(c) && !c.memberIds.includes(meId));
    const pub = [...minePublic, ...discover]
      .filter(match)
      .sort((x, y) => Number(Boolean(y.official)) - Number(Boolean(x.official)) || byTime(x, y));

    return { dms, private: priv, public: pub };
  }, [chats, meId, q]);

  const current = lists[tabKey];
  const official = chats.find((c) => c.official);
  const tabs: { id: Tab; label: string }[] = [
    { id: "dms", label: tab("dms") },
    { id: "private", label: tab("private") },
    { id: "public", label: tab("public") },
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-e border-tg-line bg-tg-bg">
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-tg-input px-3.5 py-2">
          <Search className="h-4 w-4 text-tg-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchChats")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-tg-muted"
          />
        </div>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full p-2 text-tg-muted hover:bg-tg-hover" title={t("settings")}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={() => setSettings(true)} className="rounded-full p-2 text-tg-muted hover:bg-tg-hover" title={t("settings")}>
          <SettingsGlyph />
        </button>
      </div>

      <div className="mx-3 mb-2 flex gap-1 rounded-xl bg-tg-input p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTabKey(x.id)}
            className={`flex-1 truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              tabKey === x.id ? "bg-tg-accent text-white" : "text-tg-muted hover:text-white"
            }`}
          >
            {x.label}
            {x.id === "public" && (
              <span className="ms-1 inline-block h-1.5 w-1.5 rounded-full bg-tg-accent align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
        {tabKey === "public" && official && <FeaturedCard chat={official} active={official.id === active} />}
        {current
          .filter((c) => !c.official)
          .map((c) =>
            c.memberIds.includes(meId) ? (
              <ChatListItem key={c.id} chat={c} active={c.id === active} onClick={() => openChat(c.id)} />
            ) : (
              <DiscoverRow key={c.id} chat={c} privateMode={tabKey === "private"} />
            )
          )}
        {current.length === 0 && <p className="px-4 py-10 text-center text-sm text-tg-muted">{t("noChats")}</p>}
      </div>

      <div className="flex gap-2 p-3">
        <button
          onClick={() => setNewGroup(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-tg-accent px-4 py-3 font-medium text-white shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" /> {t("newGroup")}
        </button>
        <button onClick={() => setJoin(true)} className="rounded-xl bg-white/10 px-4 py-3 text-tg-muted hover:bg-white/15" title={t("findGroups")}>
          <Users className="h-5 w-5" />
        </button>
      </div>

      <p className="px-4 pb-1 text-center text-[10px] text-tg-muted/70">
        v4.1 · {lang === "ar" ? "RTL" : "LTR"} · build 2026-10-18
      </p>

      {newGroup && <NewGroupModal onClose={() => setNewGroup(false)} />}
      {join && <JoinGroupModal onClose={() => setJoin(false)} />}
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {profileId && <ProfilePeek userId={profileId} onClose={() => setProfileId(null)} />}
    </aside>
  );
}

function DiscoverRow({ chat, privateMode = false }: { chat: Chat; privateMode?: boolean }) {
  const joinPublic = useChat((s) => s.actions.joinPublic);
  const requestJoin = useChat((s) => s.actions.requestJoin);
  const openChat = useChat((s) => s.actions.openChat);
  const meId = useChat((s) => s.meId);
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const pending = chat.joinRequests.some((r) => r.userId === meId);

  return (
    <div className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 ${pending ? "opacity-60" : "opacity-90"}`}>
      <GroupAvatar presetId={chat.avatarId} size={48} />
      <button onClick={() => openChat(chat.id)} className="min-w-0 flex-1 text-start">
        <p className="flex items-center gap-1.5 truncate font-medium">
          {chat.visibility === "public" ? (
            <Globe className="h-3.5 w-3.5 shrink-0 text-tg-muted" />
          ) : (
            <Lock className="h-3.5 w-3.5 shrink-0 text-tg-muted" />
          )}
          {chat.name}
        </p>
        <p className="truncate text-sm text-tg-muted">
          {chat.memberIds.length} {t("members")}
          {chat.handle ? ` · @${chat.handle}` : ""}
          {pending ? ` · ${t("pendingRequest")}` : privateMode ? ` · ${t("privateDirNote")}` : ""}
        </p>
      </button>
      <button
        disabled={busy || pending}
        onClick={() => {
          setBusy(true);
          if (privateMode) {
            requestJoin(chat.id, chat.name);
          } else {
            joinPublic(chat.id);
          }
        }}
        className="shrink-0 rounded-full bg-tg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? t("pendingRequest") : privateMode ? t("requestJoin") : t("join")}
      </button>
    </div>
  );
}

function SettingsGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function ProfilePeek({ userId, onClose }: { userId: string; onClose: () => void }) {
  const users = useChat((s) => s.users);
  const chats = useChat((s) => s.chats);
  const openDm = useChat((s) => s.actions.openDm);
  const openChat = useChat((s) => s.actions.openChat);
  const { t, lang } = useT();
  const u = users[userId];
  if (!u) return null;
  const dm = chats.find((c) => c.kind === "dm" && c.dmUserId === userId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-xs rounded-2xl bg-tg-panel p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 w-fit"><Avatar user={u} size={84} /></div>
        <h3 className="text-lg font-semibold">{u.name}</h3>
        <p className="text-sm text-tg-muted">@{u.username}</p>
        <p className="mt-1 text-sm text-tg-muted">
          {u.online
            ? t("online")
            : u.hideLastSeen
              ? t("lastSeenHidden")
              : t("lastSeenAt", {
                  t: new Date(u.lastSeen).toLocaleString(lang === "ar" ? "ar" : "en-GB", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  }),
                })}
        </p>
        {u.bio && <p className="mt-2 text-sm text-tg-muted">{u.bio}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              if (dm) openChat(dm.id);
              else openDm(userId);
              onClose();
            }}
            className="flex-1 rounded-xl bg-tg-accent py-2.5 text-sm font-semibold"
          >
            {dm ? t("open") : t("startDm")}
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-semibold">
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}