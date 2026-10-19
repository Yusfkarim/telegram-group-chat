import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { GroupAvatar } from "./Avatar";
import { ArrowLeft, Lock, Send } from "./Icons";
import { toast } from "./Toaster";
import type { Chat } from "../types";

/**
 * Lockdown screen for any chat the current user cannot read.
 * Private groups expose exactly one action: a formal join request.
 * Nothing about messages, members, pins or history is reachable.
 */
export function LockedChat({ chat }: { chat: Chat }) {
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t } = useT();
  const pending = chat.joinRequests.some((r) => r.userId === meId);
  const isPublic = chat.visibility === "public";

  const submit = () => {
    if (isPublic) {
      const r = a.joinPublic(chat.id);
      toast(r.reason === "request" ? t("joinRequestSent") : t("joined"));
      return;
    }
    a.requestJoin(chat.id, chat.handle ?? chat.name);
    toast(t("joinRequestSent"));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-tg-bg">
      {/* minimal chrome: back + identity only */}
      <header className="flex items-center gap-3 border-b border-tg-line px-3 py-2.5">
        <button
          onClick={() => a.openChat(null)}
          className="rounded-full p-1.5 text-tg-muted hover:bg-tg-hover md:hidden"
          aria-label={t("cancel")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <GroupAvatar presetId={chat.avatarId} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{chat.name}</p>
          <p className="flex items-center gap-1 text-[13px] text-tg-muted">
            <Lock className="h-3.5 w-3.5" />
            {chat.memberIds.length} {t("members")}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <GroupAvatar presetId={chat.avatarId} size={104} />

        <div>
          <h2 className="text-xl font-bold">{chat.name}</h2>
          <p className="mt-1.5 text-sm text-tg-muted">
            {chat.memberIds.length} {t("members")}
            {chat.handle ? ` · @${chat.handle}` : ""}
          </p>
        </div>

        <p className="max-w-xs rounded-2xl bg-white/5 p-3.5 text-sm leading-relaxed text-tg-muted">
          {t("lockedDesc")}
        </p>

        <button
          onClick={submit}
          disabled={pending}
          className="flex items-center gap-2 rounded-2xl bg-tg-accent px-7 py-3.5 font-semibold text-white shadow-lg shadow-tg-accent/20 transition-all active:scale-[0.98] disabled:bg-white/10 disabled:text-tg-muted disabled:shadow-none"
        >
          <Send className="h-4 w-4" />
          {pending ? t("pendingRequest") : isPublic ? t("joinGroup") : t("requestJoin")}
        </button>
      </div>
    </div>
  );
}