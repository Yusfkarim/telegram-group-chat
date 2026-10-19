import { useEffect, useRef, useState } from "react";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { Modal } from "./Modal";
import { confirm } from "./Confirm";
import { toast } from "./Toaster";

/**
 * Point 7 — editing happens in a centred card, never in the bottom composer.
 * The original text is shown for context above an auto-focused textarea.
 */
export function EditMessageModal({
  chatId,
  messageId,
  onClose,
}: {
  chatId: string;
  messageId: string;
  onClose: () => void;
}) {
  const a = useChat((s) => s.actions);
  const users = useChat((s) => s.users);
  const meId = useChat((s) => s.meId);
  const { t } = useT();
  const msg = useChat((s) => s.chats.find((c) => c.id === chatId)?.messages.find((m) => m.id === messageId));
  const [text, setText] = useState(msg?.text ?? "");
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!msg) return;
    setText(msg.text);
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = "auto";
    el.style.height = `${Math.min(240, el.scrollHeight)}px`;
  }, [msg?.id, msg?.text]);

  if (!msg) return null;

  const save = async () => {
    const next = text.trim();
    if (!next) {
      toast(t("emptyMessage"));
      return;
    }
    const ok = await confirm({
      title: t("confirmTitle"),
      message: t("confirmEditMsg"),
      confirmLabel: t("yes"),
      cancelLabel: t("no"),
    });
    if (!ok) return;
    a.editMessage(chatId, msg.id, next);
    toast(t("saved"));
    onClose();
  };

  return (
    <Modal title={`✏️ ${t("editMessageTitle")}`} onClose={onClose} size="md">
      <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: users[msg.senderId]?.color ?? "#5795f2" }}>
          {users[msg.senderId]?.name}
          {msg.senderId === meId && <span className="text-tg-muted">· {t("you")}</span>}
        </p>
        <p className="text-sm text-tg-muted">{msg.text}</p>
      </div>

      <textarea
        ref={area}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(240, e.target.scrollHeight)}px`;
        }}
        rows={3}
        className="msg-input mt-3 w-full resize-none rounded-2xl bg-white/5 px-4 py-3 leading-relaxed outline-none ring-1 ring-white/10 focus:ring-tg-accent/60"
      />

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          className="flex-1 rounded-xl bg-tg-accent py-3 text-sm font-semibold text-white"
        >
          {t("save")}
        </button>
        <button onClick={onClose} className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-semibold">
          {t("cancel")}
        </button>
      </div>
    </Modal>
  );
}