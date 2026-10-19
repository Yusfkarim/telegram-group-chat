import { useRef, useState } from "react";
import type { Chat, Message, User } from "../types";
import { displayTitle, roleOf } from "../lib/rbac";
import { fmtTime } from "../lib/format";
import { haptic, jumpToMessage } from "../lib/jump";
import { useHoldToAct } from "../lib/useHoldToAct";
import { useSwipeToReply } from "../lib/useSwipeToReply";
import { useScrollState } from "../lib/scrollState";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { Avatar } from "./Avatar";
import { Copy, Edit, Pin, Reply, Trash, Chat as ChatIcon } from "./Icons";
import { MessageMenu, type MenuAction } from "./MessageMenu";
import { toast } from "./Toaster";
import { RoleBadge } from "./Badge";

interface Props {
  chat: Chat;
  msg: Message;
  sender: User;
  isMine: boolean;
  showSender: boolean;
  canModerate: boolean;
  meId: string;
  actions: {
    reply: () => void;
    copy: () => void;
    edit: () => void;
    deleteForEveryone: () => void;
    pin: () => void;
    unpin: () => void;
    react: (emoji: string) => void;
  };
}

/** @mentions get the Telegram accent colour; everything else stays plain */
function renderWithMentions(text: string) {
  const parts = text.split(/(@[\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) =>
    part.startsWith("@") && part.length > 1 ? (
      <span key={i} className="font-semibold text-tg-accent">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** ✓ while sent, ✓✓ once the peer has read it */
function Ticks({ read }: { read: boolean }) {
  return (
    <svg
      viewBox="0 0 30 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-4"
      aria-label={read ? "read" : "sent"}
    >
      {read ? (
        <>
          <path d="m2 13 4 4 10-10" />
          <path d="m11 15 2 2 10-10" />
        </>
      ) : (
        <path d="m2 13 4 4 10-10" />
      )}
    </svg>
  );
}

export function MessageBubble({ chat, msg, sender, isMine, showSender, canModerate, meId, actions }: Props) {
  const users = useChat((s) => s.users);
  const { t, lang } = useT();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const swipeConsumed = useRef(false);
  const scroll = useScrollState();

  const hold = useHoldToAct({
    onHold: (x, y) => setMenu({ x, y }),
    isScrolling: scroll?.isScrolling,
    lastScrollAt: scroll?.lastScrollAt,
  });

  const swipe = useSwipeToReply({
    onReply: () => {
      useChat.getState().actions.setReply(msg.id);
      haptic(10);
    },
    isScrolling: scroll?.isScrolling,
    lastScrollAt: scroll?.lastScrollAt,
  });

  const replied = msg.replyToId ? chat.messages.find((m) => m.id === msg.replyToId) : undefined;
  const repliedSender = replied ? users[replied.senderId] : undefined;
  const title = displayTitle(chat, msg.senderId);
  const isPinned = chat.pinnedIds.includes(msg.id);
  const read = chat.kind === "dm" ? msg.at <= chat.lastReadAt : true;

  if (msg.system) return null;
  if (msg.deletedForEveryone) return null;

  const menuActions: MenuAction[] = [
    { id: "reply", label: t("reply"), icon: Reply, onClick: actions.reply },
    ...(chat.kind === "group" && !isMine
      ? [{ id: "dm", label: t("dmFromMenu"), icon: ChatIcon, onClick: () => useChat.getState().actions.openDm(sender.id) }]
      : []),
    {
      id: "copy",
      label: t("copyText"),
      icon: Copy,
      onClick: () => {
        navigator.clipboard?.writeText(msg.text).then(
          () => toast(t("copied")),
          () => toast(t("copyFailed"))
        );
        actions.copy();
      },
    },
    ...(isMine ? [{ id: "edit", label: t("edit"), icon: Edit, onClick: actions.edit }] : []),
    ...(isPinned
      ? canModerate
        ? [{ id: "unpin", label: t("unpin"), icon: Pin, onClick: actions.unpin }]
        : []
      : canModerate
        ? [{ id: "pin", label: t("pin"), icon: Pin, onClick: actions.pin }]
        : []),
    ...(isMine || canModerate
      ? [{ id: "delAll", label: t("delEveryone"), icon: Trash, danger: true, onClick: actions.deleteForEveryone }]
      : []),
  ];

  return (
    <div
      id={`msg-${msg.id}`}
      /* dir=ltr here makes the row physically ordered: own messages hard-right,
         incoming hard-left — in Arabic and English alike. Text direction is
         restored inside the bubble so Arabic still renders correctly. */
      dir="ltr"
      className="group relative flex w-full items-end gap-2 px-1"
      onContextMenu={(e) => {
        e.preventDefault();
        if (swipe.active) return;
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={(e) => {
        const pointerType = (e.nativeEvent as PointerEvent).pointerType;
        if (pointerType && pointerType !== "mouse") return;
        if (swipe.active || swipeConsumed.current) {
          swipeConsumed.current = false;
          return;
        }
        if ((e.target as HTMLElement).closest("button")) return;
        const r = (e.target as HTMLElement).getBoundingClientRect();
        setMenu({ x: e.clientX || r.left, y: e.clientY || r.top });
      }}
      onTouchStart={(e) => {
        swipe.handlers.onTouchStart(e);
        if (!swipe.active) hold.onTouchStart(e);
      }}
      onTouchMove={(e) => {
        swipe.handlers.onTouchMove(e);
        hold.onTouchMove(e);
      }}
      onTouchEnd={() => {
        if (swipe.handlers.onTouchEnd()) swipeConsumed.current = true;
        hold.onTouchEnd();
      }}
      onTouchCancel={() => {
        swipe.handlers.onTouchCancel();
        hold.onTouchCancel();
      }}
      onPointerDown={swipe.handlers.onPointerDown}
    >
      {/* reply arrow revealed while the bubble is dragged sideways */}
      <span
        className={`pointer-events-none absolute top-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-tg-accent text-white shadow-lg transition-opacity duration-150 ${
          swipe.active ? "opacity-100" : "opacity-0"
        }`}
        style={{
          [swipe.arrowSide]: "-8px",
          transform: `translateY(-50%) scale(${swipe.active ? 1 : 0.5})`,
          zIndex: 0,
        }}
        aria-hidden
      >
        <Reply className="h-5 w-5" style={{ transform: swipe.arrowSide === "left" ? "scaleX(-1)" : undefined }} />
      </span>
      {/* the avatar is decorative: a private chat is only reachable from the
          long-press menu → "إرسال رسالة خاصة" */}
      {!isMine && (showSender ? <Avatar user={sender} size={34} /> : <div className="w-[34px]" />)}

      <div
        className={`relative min-w-0 max-w-[80%] md:max-w-[64%] ${isMine ? "ml-auto" : "mr-auto"}`}
        style={{ ...swipe.style, zIndex: swipe.active ? 1 : undefined }}
      >
        {isPinned && (
          <span className="absolute -top-2 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-tg-accent text-white shadow">
            <Pin className="h-3 w-3" />
          </span>
        )}

        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={`relative rounded-2xl px-3.5 py-2 shadow-md ${
            isMine ? "rounded-tr-md rounded-br-md bg-tg-out text-tg-out-text" : "rounded-tl-md rounded-bl-md bg-tg-in text-tg-text"
          }`}
        >
          {!isMine && chat.kind === "group" && showSender && (
            <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
              <span style={{ color: sender.color }}>{sender.name}</span>
              <RoleBadge role={roleOf(chat, sender.id)} customTitle={title} />
            </p>
          )}
          {isMine && roleOf(chat, meId) !== "member" && (
            <p className="mb-0.5 text-end">
              <RoleBadge role={roleOf(chat, meId)} customTitle={title} />
            </p>
          )}

          {msg.replyToId && (
            <button
              onClick={() => {
                if (!jumpToMessage(msg.replyToId!)) toast(t("deletedMsg"));
              }}
              className={`mb-1.5 block w-full rounded-lg border-s-4 px-2.5 py-1.5 text-start text-[13px] ${
                isMine ? "border-tg-out-text/60 bg-tg-quote-out" : "border-tg-accent bg-tg-quote-in"
              }`}
            >
              <span className="block font-semibold" style={{ color: isMine ? undefined : repliedSender?.color ?? "#3390ec" }}>
                {replied ? repliedSender?.name ?? "—" : t("deletedMsg")}
              </span>
              <span className="line-clamp-1 opacity-80">
                {replied ? (replied.deletedForEveryone ? t("deletedMsg") : replied.text) : t("deletedMsg")}
              </span>
            </button>
          )}

          <p className="msg-text leading-snug break-words whitespace-pre-wrap">
            {renderWithMentions(msg.text)}
          </p>

          <div
            className={`mt-0.5 flex items-center justify-end gap-1.5 text-[11px] leading-none ${
              isMine ? "text-tg-out-meta" : "text-tg-muted"
            }`}
          >
            {msg.edited && <span>{t("edited")}</span>}
            <span>{fmtTime(msg.at, lang)}</span>
            {isMine && <Ticks read={read} />}
          </div>

          {msg.reactions.length > 0 && (
            <div className={`-mb-1 mt-1.5 flex flex-wrap gap-1 ${isMine ? "justify-end" : ""}`}>
              {msg.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => actions.react(r.emoji)}
                  className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
                    r.userIds.includes(meId) ? "bg-tg-accent/40 ring-1 ring-tg-accent" : "bg-tg-quote-in hover:bg-tg-quote-in/70"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold">{r.userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {menu && (
        <MessageMenu
          x={menu.x}
          y={menu.y}
          actions={menuActions}
          onReact={(emoji) => {
            actions.react(emoji);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}