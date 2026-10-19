import { useState } from "react";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { GroupAvatar } from "./Avatar";
import { Modal } from "./Modal";
import { toast } from "./Toaster";
import type { Chat } from "../types";

const isBanned = (chat: Chat, userId: string) =>
  chat.banned.some((b) => b.userId === userId && b.until > Date.now());

export function JoinGroupModal({ onClose, initialToken }: { onClose: () => void; initialToken?: string }) {
  const chats = useChat((s) => s.chats);
  const meId = useChat((s) => s.meId);
  const a = useChat((s) => s.actions);
  const { t, tab } = useT();
  const [token, setToken] = useState(initialToken ?? "");
  const [preview, setPreview] = useState<Chat | null>(() => {
    const clean = (initialToken ?? "").trim();
    if (!clean) return null;
    return (
      chats.find(
        (c) => c.invites.some((i) => i.token === clean && !i.revoked) ||
          (c.visibility === "public" && c.handle === clean.replace(/^@/, ""))
      ) ?? null
    );
  });

  const lookup = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    const found = chats.find(
      (c) => c.invites.some((i) => i.token === clean && !i.revoked) ||
        (c.visibility === "public" && c.handle === clean.replace(/^@/, ""))
    );
    if (!found) {
      toast(t("notFound"));
      return;
    }
    setPreview(found);
  };

  const join = (chat: Chat) => {
    // private groups: formal join request, never a direct add
    if (chat.visibility === "private") {
      if (chat.memberIds.includes(meId)) {
        toast(t("alreadyMember"));
      } else {
        a.requestJoin(chat.id, token.trim() || chat.name);
        toast(t("joinRequestSent"));
      }
      onClose();
      return;
    }

    const inv = chat.invites.find((i) => i.token === token.trim());
    if (inv) {
      const res = a.joinViaInvite(inv.token);
      if (res.status === "banned") toast(t("bannedFromGroup"));
      else if (res.status === "request") {
        toast(t("requestSent"));
        a.openChat(chat.id);
      } else if (res.status === "joined") {
        toast(t("joined"));
        a.openChat(chat.id);
      } else toast(t("notFound"));
      onClose();
      return;
    }
    const r = a.joinPublic(chat.id);
    if (r.reason === "request") toast(t("requestSent"));
    else if (r.reason === "banned") toast(t("bannedFromGroup"));
    else if (r.reason === "already") toast(t("alreadyMember"));
    else if (!r.ok) toast(t("notFound"));
    else {
      toast(t("joined"));
      a.openChat(chat.id);
    }
    onClose();
  };

  return (
    <Modal title={preview ? preview.name : t("findGroups")} onClose={onClose} size="md">
      {!preview ? (
        <>
          <p className="mb-3 text-sm text-tg-muted">{t("noAddHint")}</p>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup(token)}
            placeholder={t("inviteCode")}
            autoFocus
            className="mb-3 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none"
          />
          <button onClick={() => lookup(token)} className="w-full rounded-xl bg-tg-accent py-2.5 text-sm font-semibold">
            {t("search")}
          </button>

          <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{tab("public")}</p>
          <div className="space-y-1">
            {chats
              .filter((c) => c.kind === "group" && c.visibility === "public" && !c.memberIds.includes(meId))
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => join(c)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start hover:bg-white/5"
                >
                  <GroupAvatar presetId={c.avatarId} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-tg-muted">
                      @{c.handle} · {c.memberIds.length} {t("members")}
                    </p>
                  </div>
                  <span className="rounded-full bg-tg-accent px-3 py-1.5 text-xs font-semibold text-white">
                    {c.approvedMode ? t("joinRequest") : t("join")}
                  </span>
                </button>
              ))}
            {chats.filter((c) => c.kind === "group" && c.visibility === "public" && !c.memberIds.includes(meId)).length === 0 && (
              <p className="py-4 text-center text-sm text-tg-muted">{t("noResults")}</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-3 w-fit">
            <GroupAvatar presetId={preview.avatarId} size={80} />
          </div>
          <h3 className="text-lg font-semibold">{preview.name}</h3>
          <p className="text-sm text-tg-muted">
            {preview.memberIds.length} {t("members")} · {preview.visibility === "public" ? t("privacyPublic") : t("privacyPrivate")}
          </p>
          {preview.description && <p className="mt-2 text-sm text-tg-muted">{preview.description}</p>}
          {isBanned(preview, meId) ? (
            <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{t("bannedFromGroup")}</p>
          ) : preview.memberIds.includes(meId) ? (
            <p className="mt-4 text-sm text-tg-muted">{t("alreadyMember")}</p>
          ) : (
            <button onClick={() => join(preview)} className="mt-4 w-full rounded-xl bg-tg-accent py-3 font-semibold">
              {preview.visibility === "private" || preview.approvedMode ? t("joinRequest") : t("joinGroup")}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}