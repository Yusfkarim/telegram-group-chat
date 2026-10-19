import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../store/chatStore";
import { can } from "../lib/rbac";
import { useT } from "../i18n";
import { chatBackgroundCss, themeDefaultWallpaper } from "../assets/wallpapers";
import { jumpToMessage, scrollToBottom } from "../lib/jump";
import { useScrollState } from "../lib/scrollState";
import { MessageBubble } from "./MessageBubble";
import { At, ArrowDown, ChevronDown, ChevronUp, X } from "./Icons";
import { confirm } from "./Confirm";
import { EditMessageModal } from "./EditMessageModal";
import type { Chat } from "../types";

export function MessageList({
  chat,
  search,
  onSearchChange,
}: {
  chat: Chat;
  search: { q: string; index: number; setIndex: (i: number) => void } | null;
  onSearchChange: (s: { q: string } | null) => void;
}) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const localWall = useChat((s) => s.settings.wallpaperId);
  const a = useChat((s) => s.actions);
  const { t } = useT();
  const container = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const scrollState = useScrollState();
  const theme = useChat((st) => st.theme);

  const visible = chat.messages;

  const matches = useMemo(() => {
    if (!search?.q.trim()) return [];
    const q = search.q.toLowerCase();
    return visible.filter((m) => !m.system && m.text.toLowerCase().includes(q)).map((m) => m.id);
  }, [search?.q, visible]);

  const unreadSince = useMemo(
    () => visible.filter((m) => !m.system && m.at > chat.lastReadAt && m.senderId !== meId),
    [visible, chat.lastReadAt, meId]
  );

  /* unseen @-mentions / replies that target me, oldest first */
  const mentionQueue = useMemo(() => {
    const ids = chat.mentionIds ?? [];
    return ids
      .map((id) => visible.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && !m!.deletedForEveryone);
  }, [chat.mentionIds, visible]);

  const jumpToMention = () => {
    const first = mentionQueue[0];
    if (!first) {
      if (mentions > 0) a.clearMentions(chat.id);
      return;
    }
    if (!jumpToMessage(first.id)) {
      a.clearMentions(chat.id);
      return;
    }
    const rest = mentionQueue.slice(1).map((m) => m.id);
    a.clearMentions(chat.id);
    if (rest.length) {
      const cid = chat.id;
      window.setTimeout(() => {
        const live = useChat.getState().chats.find((c) => c.id === cid);
        if (live) useChat.setState({ chats: useChat.getState().chats.map((c) => (c.id === cid ? { ...c, mentionIds: rest } : c)) });
      }, 1600);
    }
  };

  useEffect(() => {
    if (atBottom) bottom.current?.scrollIntoView?.({ behavior: "auto" });
  }, [visible.length, atBottom]);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onScroll = () => {
      if (scrollState) {
        scrollState.isScrolling.current = true;
        scrollState.lastScrollAt.current = Date.now();
        window.clearTimeout((el as HTMLElement & { _t?: number })._t);
        (el as HTMLElement & { _t?: number })._t = window.setTimeout(() => {
          if (scrollState) scrollState.isScrolling.current = false;
        }, 220);
      }
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
      setAtBottom(near);
      if (near && chat.unread > 0) a.openChat(chat.id);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chat.id, chat.unread, a, scrollState]);

  useEffect(() => {
    if (search?.q && matches.length) {
      const id = matches[Math.min(search.index, matches.length - 1)];
      window.setTimeout(() => jumpToMessage(id), 60);
    }
  }, [search?.index, matches, search?.q]);

  const mentions = mentionQueue.length;

  const grouped = (i: number) => {
    const cur = visible[i];
    const prev = visible[i - 1];
    if (!prev || prev.system || cur.system || prev.senderId !== cur.senderId) return false;
    return cur.at - prev.at < 5 * 60_000;
  };

  const canModerate = can.deleteMessages(chat, meId);

  const removeMessage = async (id: string) => {
    const ok = await confirm({
      title: t("confirmTitle"),
      message: t("confirmDeleteMsg"),
      confirmLabel: t("yes"),
      cancelLabel: t("no"),
      danger: true,
    });
    if (ok) a.deleteForEveryone(chat.id, id);
  };

  const doPin = async (id: string) => {
    let notify = true;
    const ok = await confirm({
      title: t("confirmTitle"),
      message: t("confirmPin"),
      confirmLabel: t("yes"),
      cancelLabel: t("no"),
      children: (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            defaultChecked
            onChange={(e) => {
              notify = e.target.checked;
            }}
            className="h-4 w-4 accent-tg-accent"
          />
          {t("pinNotify")}
        </label>
      ),
    });
    if (ok) a.pinMessage(chat.id, id, notify);
  };

  const doUnpin = async (id: string) => {
    const ok = await confirm({
      title: t("confirmTitle"),
      message: t("confirmUnpin"),
      confirmLabel: t("yes"),
      cancelLabel: t("no"),
    });
    if (ok) a.unpinMessage(chat.id, id);
  };
  const wallpaper = chatBackgroundCss(
    chat.kind === "dm" ? { wallpaperId: localWall } : chat,
    themeDefaultWallpaper(theme)
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={{ background: wallpaper }}>
      <div ref={container} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-6">
        {visible.length === 0 && (
          <p className="pt-16 text-center text-sm text-white/70">{t("noMessages")}</p>
        )}

        {visible.map((m, i) => {
          const isMine = m.senderId === meId;
          const isMatch = search?.q ? matches.includes(m.id) : false;
          const prev = visible[i - 1];
          const newDay =
            !prev ||
            prev.system !== m.system ||
            (prev && !m.system && new Date(prev.at).toDateString() !== new Date(m.at).toDateString());

          return (
            <div key={m.id} className={newDay ? "mt-3 first:mt-0" : "mt-0.5"}>
              {newDay && !m.system && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">{dayLabel(m.at, t)}</span>
                </div>
              )}
              {m.system ? (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-black/25 px-3.5 py-1.5 text-center text-[13px] font-medium text-white backdrop-blur-sm">
                    {m.text}
                  </span>
                </div>
              ) : (
                <div className={isMatch ? "rounded-xl ring-2 ring-tg-accent/80" : ""}>
                  <MessageBubble
                    chat={chat}
                    msg={m}
                    sender={users[m.senderId]}
                    isMine={isMine}
                    showSender={!grouped(i)}
                    canModerate={canModerate}
                    meId={meId}
                    actions={{
                      reply: () => a.setReply(m.id),
                      copy: () => {},
                      edit: () => setEditId(m.id),
                      deleteForEveryone: () => void removeMessage(m.id),
                      pin: () => void doPin(m.id),
                      unpin: () => void doUnpin(m.id),
                      react: (emoji) => a.react(chat.id, m.id, emoji),
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        <TypingBubble chat={chat} />
        <div ref={bottom} className="h-2" />
      </div>

      <div className="pointer-events-none absolute right-4 bottom-4 z-10 flex flex-col items-end gap-2">
        {mentions > 0 && (
          <button
            onClick={jumpToMention}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-tg-accent text-white shadow-xl transition-transform hover:scale-110"
            title={t("mentionsYou")}
            aria-label={t("mentionsYou")}
            data-mention-jump
          >
            <At className="h-5 w-5" />
            <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-tg-green px-1 text-[11px] font-bold text-white">
              {mentions}
            </span>
          </button>
        )}
        {!atBottom && (
          <button
            onClick={() => {
              scrollToBottom(container.current);
              setAtBottom(true);
            }}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-tg-panel px-3.5 py-2.5 text-sm font-semibold shadow-xl"
            title={t("scrollDown")}
          >
            <ArrowDown className="h-4 w-4" />
            {unreadSince.length > 0 && (
              <span className="rounded-full bg-tg-accent px-1.5 text-xs text-white">{unreadSince.length}</span>
            )}
          </button>
        )}
      </div>

      {editId && <EditMessageModal chatId={chat.id} messageId={editId} onClose={() => setEditId(null)} />}

      {search && (
        <div className="absolute inset-x-0 top-2 z-20 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-tg-panel px-4 py-2 shadow-2xl">
            <span className="text-sm">
              {matches.length === 0 ? t("noResults") : `${Math.min(search.index + 1, matches.length)} / ${matches.length}`}
            </span>
            <button
              onClick={() => matches.length && search.setIndex((search.index - 1 + matches.length) % matches.length)}
              className="rounded-full p-1 hover:bg-white/10"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => matches.length && search.setIndex((search.index + 1) % matches.length)}
              className="rounded-full p-1 hover:bg-white/10"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button onClick={() => onSearchChange(null)} className="rounded-full p-1 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function dayLabel(at: number, t: (k: "today" | "yesterday") => string) {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t("today");
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString()) return t("yesterday");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

function TypingBubble({ chat }: { chat: Chat }) {
  const meId = useChat((s) => s.meId);
  const users = useChat((s) => s.users);
  const id = chat.memberIds.find(
    (m) => m !== meId && (chat.typingUsers?.[m] ?? 0) > Date.now() - 1600 && users[m] !== undefined
  );
  if (!id) return null;
  return (
    <div className="mt-3 flex items-end gap-2">
      <div className="w-[34px]" />
      <div className="flex items-center gap-2 rounded-full bg-black/25 px-3.5 py-2 text-[13px] font-medium text-white/90 backdrop-blur-sm">
        <div className="flex gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80" />
          <span className="typing-dot h-2 w-2 rounded-full bg-white/80" />
        </div>
        <span className="truncate">{users[id]?.name}</span>
      </div>
    </div>
  );
}