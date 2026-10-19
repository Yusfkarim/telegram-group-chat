import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../store/chatStore";
import { restrictionReason, slowModeWait } from "../lib/rbac";
import { confirm } from "./Confirm";
import { useT } from "../i18n";
import { EmojiPicker } from "./EmojiPicker";
import { ArrowUp, Smile, X } from "./Icons";
import { toast } from "./Toaster";
import type { Chat } from "../types";

export function Composer({ chat }: { chat: Chat }) {
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const replyToId = useChat((s) => s.replyToId);
  const a = useChat((s) => s.actions);
  // peers currently typing (inside this chat, not me) — stable selector, joined string
  const typers = useChat((s): string => {
    const map = s.typingUsersByChat[chat.id] ?? {};
    return Object.entries(map)
      .filter(([id, at]) => id !== s.meId && at > Date.now())
      .map(([id]) => s.users[id]?.name ?? "…")
      .slice(0, 3)
      .join("،");
  });
  const { t } = useT();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [, setTick] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const blocked = restrictionReason(chat, meId);
  const dmPeer = chat.kind === "dm" ? chat.dmUserId : undefined;
  // reactive: subscribing re-renders the composer the instant the block flips
  const blockedUserIds = useChat((s) => s.blockedUserIds);
  const isBlocked = Boolean(dmPeer && blockedUserIds.includes(dmPeer));
  const last = [...chat.messages].reverse().find((m) => m.senderId === meId && !m.system);
  const wait = slowModeWait(chat, meId, last?.at ?? 0);
  const cooldown = Math.ceil(wait / 1000);

  useEffect(() => {
    if (!wait) return;
    const iv = window.setInterval(() => setTick((x) => x + 1), 500);
    return () => window.clearInterval(iv);
  }, [wait]);

  useEffect(() => {
    setText("");
    setEmoji(false);
    setMentionQuery(null);
  }, [chat.id]);

  const replied = replyToId ? chat.messages.find((m) => m.id === replyToId) : undefined;

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [] as string[];
    const needle = mentionQuery.toLowerCase();
    return chat.memberIds
      .map((id) => users[id])
      .filter((u) => u && (u.name.toLowerCase().includes(needle) || u.username.toLowerCase().includes(needle)))
      .slice(0, 5)
      .map((u) => u.id);
  }, [mentionQuery, chat.memberIds, users]);

  /** the first completion for what is currently typed after "@" */
  const mentionPending = useMemo(() => {
    if (mentionQuery === null) return null;
    const id = mentionSuggestions[0];
    return id ? users[id] ?? null : null;
  }, [mentionQuery, users, mentionSuggestions]);

  const submit = () => {
    if (!text.trim()) return;
    a.setTyping(chat.id, meId, 0); // sending clears the typing ping instantly
    const res = a.sendMessage(chat.id, text);
    if (res.ok) {
      setText("");
      setMentionQuery(null);
    }
  };

  const onChange = (v: string) => {
    setText(v);
    const m = /(?:^|\s)@([a-zA-Z0-9_]*)$/.exec(v);
    setMentionQuery(m ? m[1] : null);
    // broadcast my typing to the whole chat (engine pushes it server-side)
    a.setTyping(chat.id, meId, v.trim() ? Date.now() + 1500 : 0);
  };

  const insertMention = (id: string) => {
    const u = users[id];
    setText((x) => x.replace(/(^|\s)@([a-zA-Z0-9_]*)$/, (_, sp: string) => `${sp}@${u.username} `));
    setMentionQuery(null);
    input.current?.focus();
  };

  /* ── blocked 1-on-1: no input bar, only a way to unblock ─────────────── */
  if (isBlocked) {
    return (
      <div className="flex items-center gap-3 border-t border-tg-line px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-tg-muted">{t("blockedBanner")}</p>
        <button
          onClick={async () => {
            const ok = await confirm({
              title: t("confirmTitle"),
              message: t("confirmUnblockUser"),
              confirmLabel: t("yes"),
              cancelLabel: t("no"),
            });
            if (!ok || !dmPeer) return;
            a.unblockUser(dmPeer);
            toast(t("saved"));
          }}
          className="shrink-0 rounded-xl bg-tg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("unblockUser")}
        </button>
      </div>
    );
  }

  if (blocked) {
    return (
      /* exact wording required by the spec for a muted member */
      <div className="border-t border-tg-line px-4 py-4 text-center text-sm font-medium text-tg-muted">
        {t(blocked === "restricted" ? "restrictedBanner" : blocked === "onlyAdmins" ? "onlyAdminsMsg" : "inviteOnlyNotice")}
      </div>
    );
  }

  return (
    <div className="relative border-t border-tg-line bg-tg-bg">
      {replied && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl bg-tg-input px-3 py-2">
          <span className="h-9 w-1 rounded bg-tg-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-tg-accent">
              {t("reply")} · {users[replied.senderId]?.name}
            </p>
            <p className="truncate text-sm text-tg-muted">{replied.text}</p>
          </div>
          <button onClick={() => a.setReply(null)} className="text-tg-muted hover:text-tg-text" aria-label={t("cancel")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* live mention chip — accent coloured, exactly what will be inserted */}
      {mentionPending && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl bg-tg-input px-3 py-1.5">
          <span className="text-xs font-semibold text-tg-muted">{t("mentionsCount")}</span>
          <span className="truncate rounded-lg bg-tg-accent/20 px-2 py-0.5 text-sm font-semibold text-tg-accent">
            @{mentionPending.username}
          </span>
          <span className="truncate text-sm text-tg-muted">{mentionPending.name}</span>
        </div>
      )}

      {mentionQuery !== null && mentionSuggestions.length > 0 && (
        <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-xl bg-tg-panel shadow-2xl">
          {mentionSuggestions.map((id) => (
            <button key={id} onClick={() => insertMention(id)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start hover:bg-white/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: users[id].color }}>
                {users[id].name.slice(0, 1)}
              </span>
              <span className="text-sm">
                {users[id].name} <span className="text-tg-muted">@{users[id].username}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {typers && <div className="mx-3 mb-1 text-xs text-tg-accent">{typers} {t("typingNow")}</div>}
      <div className="flex items-end gap-1.5 px-2.5 py-2.5">
        <button onClick={() => setEmoji(!emoji)} className="shrink-0 rounded-full p-2 text-tg-muted hover:bg-tg-hover" aria-label="Emoji">
          <Smile className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1 rounded-2xl border border-tg-line bg-tg-input px-4 py-2.5">
          <textarea
            ref={input}
            value={text}
            onBlur={() => a.setTyping(chat.id, meId, 0)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") a.setReply(null);
            }}
            rows={1}
            placeholder={t("message")}
            className="msg-input max-h-32 w-full resize-none bg-transparent outline-none placeholder:text-tg-muted"
          />
        </div>
        <button
          onClick={submit}
          disabled={!text.trim() || cooldown > 0}
          className="shrink-0 rounded-full bg-tg-accent p-2.5 text-white transition-all active:scale-90 disabled:opacity-40"
          aria-label={t("sendMessage")}
        >
          {cooldown > 0 ? (
            <span className="text-[11px] font-bold tabular-nums">{cooldown}</span>
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>

      {emoji && (
        <div className="px-3 pb-2">
          <EmojiPicker
            onPick={(e) => {
              setText((x) => x + e);
              input.current?.focus();
            }}
            onClose={() => setEmoji(false)}
          />
        </div>
      )}

      {chat.slowMode > 0 && cooldown > 0 && (
        <p className="pb-2 text-center text-xs text-tg-muted">{t("slowModeWait", { s: chat.slowMode, n: cooldown })}</p>
      )}
    </div>
  );
}