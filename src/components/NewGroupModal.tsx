import { useState } from "react";
import { useChat } from "../store/chatStore";
import { useT } from "../i18n";
import { RECOVERY_AVATARS } from "../assets/recovery";
import { GroupAvatar } from "./Avatar";
import { Modal } from "./Modal";
import { Globe, Lock, Users } from "./Icons";
import { toast } from "./Toaster";
import type { Visibility } from "../types";

export function NewGroupModal({ onClose }: { onClose: () => void }) {
  const createChat = useChat((s) => s.actions.createGroup);
  const { t, lang } = useT();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [handle, setHandle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [avatarId, setAvatarId] = useState(RECOVERY_AVATARS[0].id);

  const submit = () => {
    if (!name.trim()) return;
    createChat({ name: name.trim(), avatarId, description: description.trim(), visibility, handle: handle.trim() || undefined });
    toast(t("groupCreatedToast"));
    onClose();
  };

  return (
    <Modal title={t("newGroup")} onClose={onClose} size="md">
      <div className="flex items-center gap-4">
        <GroupAvatar presetId={avatarId} size={64} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("groupNamePlaceholder")}
          autoFocus
          className="w-full border-b-2 border-tg-accent bg-transparent py-2 text-base outline-none placeholder:text-tg-muted"
        />
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-tg-muted uppercase">{t("pickAvatar")}</p>
      <div className="grid grid-cols-6 gap-2">
        {RECOVERY_AVATARS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAvatarId(a.id)}
            title={lang === "ar" ? a.ar : a.en}
            className={`overflow-hidden rounded-full transition-transform hover:scale-110 ${
              avatarId === a.id ? "ring-2 ring-tg-accent ring-offset-2 ring-offset-tg-panel" : ""
            }`}
          >
            <GroupAvatar presetId={a.id} size={40} />
          </button>
        ))}
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("descriptionPlaceholder")}
        rows={2}
        className="mt-4 w-full resize-none rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none placeholder:text-tg-muted"
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setVisibility("private")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
            visibility === "private" ? "bg-tg-accent/25 ring-1 ring-tg-accent" : "bg-white/5"
          }`}
        >
          <Lock className="h-4 w-4" /> {t("privacyPrivate")}
        </button>
        <button
          onClick={() => setVisibility("public")}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
            visibility === "public" ? "bg-tg-accent/25 ring-1 ring-tg-accent" : "bg-white/5"
          }`}
        >
          <Globe className="h-4 w-4" /> {t("privacyPublic")}
        </button>
      </div>

      {visibility === "public" && (
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
          placeholder={t("handle")}
          className="mt-2 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm outline-none"
        />
      )}

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-tg-accent/10 p-3 text-xs text-tg-muted">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-tg-accent" />
        {t("noAddHint")}
      </p>

      <button
        onClick={submit}
        disabled={!name.trim()}
        className="mt-4 w-full rounded-xl bg-tg-accent py-3 font-semibold text-white transition-opacity disabled:opacity-40"
      >
        {t("newGroup")}
      </button>
    </Modal>
  );
}