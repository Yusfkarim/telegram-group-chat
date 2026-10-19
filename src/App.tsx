import { useEffect, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { LockedChat } from "./components/LockedChat";
import { useProfile, handleFromName } from "./store/profileStore";

import { Sidebar } from "./components/Sidebar";
import { ChatHeader, PinnedBanner } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { Toaster } from "./components/Toaster";
import { ConfirmProvider } from "./components/Confirm";
import { JoinGroupModal } from "./components/JoinGroupModal";
import { useChat } from "./store/chatStore";
import { useT, applyDocumentLang } from "./i18n";
import { ScrollStateContext, useScrollRefs } from "./lib/scrollState";
import { recallActiveChat } from "./store/storagePrep";

export default function App() {
  const chats = useChat((s) => s.chats);
  const activeChatId = useChat((s) => s.activeChatId);
  const openChat = useChat((s) => s.actions.openChat);
  const lang = useChat((s) => s.settings.lang);
  const theme = useChat((s) => s.theme);
  const fontSize = useChat((s) => s.settings.fontSize);
  const { t } = useT();
  const [searchQ, setSearchQ] = useState("");
  const [searchIdx, setSearchIdx] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | undefined>();
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const scrollRefs = useScrollRefs();

  const profile = useProfile((s) => s.profile);
  const meId = useChat((s) => s.meId);
  const adoptAccount = useChat((s) => s.actions.adoptAccount);

  // adopt the chosen identity into the chat world
  useEffect(() => {
    if (!profile) return;
    if (profile.id !== meId || profile.role === "owner") {
      adoptAccount({
        id: profile.id,
        name: profile.name,
        username: handleFromName(profile.name),
        avatarId: profile.avatarId,
        isOwner: profile.role === "owner",
      });
    }
  }, [profile, meId, adoptAccount]);

  const chat = chats.find((c) => c.id === activeChatId);
  // A 1-on-1 DM is never a locked group. Heal any drift so the composer is always live.
  const dmPeerId = chat?.kind === "dm" ? chat.dmUserId : undefined;
  const isDm = Boolean(chat && chat.kind === "dm");
  const canViewChat = Boolean(chat && (isDm || chat.memberIds.includes(meId)));

  useEffect(() => {
    if (!chat || !isDm || !dmPeerId) return;
    if (chat.memberIds.includes(meId) && chat.memberIds.includes(dmPeerId)) return;
    useChat.setState((st) => ({
      chats: st.chats.map((c) =>
        c.id === chat.id
          ? { ...c, kind: "dm", memberIds: [st.meId, dmPeerId], dmUserId: dmPeerId, name: c.name || st.users[dmPeerId]?.name || "", avatarId: c.avatarId || st.users[dmPeerId]?.avatarId || "olive" }
          : c
      ),
    }));
  }, [chat?.id, isDm, dmPeerId, meId]);

  const search = searchQ ? { q: searchQ, index: searchIdx, setIndex: setSearchIdx } : null;

  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme !== "light");
  }, [theme]);

  /* global chat font size — every message and the composer follow it */
  useEffect(() => {
    document.documentElement.style.setProperty("--chat-font-size", `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    if (profile && inviteToken) setInviteOpen(true);
  }, [profile, inviteToken]);

  useEffect(() => {
    setSearchQ("");
    setSearchIdx(0);
    setPinnedOpen(false);
  }, [activeChatId]);

  // Restore the last open chat after hydration (belt & braces: storage shape can differ per build)
  useEffect(() => {
    const restore = () => {
      const id = recallActiveChat();
      if (!id) return;
      const st = useChat.getState();
      if (st.activeChatId === id) return;
      if (st.chats.some((c) => c.id === id)) useChat.setState({ activeChatId: id });
    };
    restore();
    return useChat.persist.onFinishHydration(restore);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (window.matchMedia?.("(max-width: 767px)").matches && useChat.getState().activeChatId) {
      useChat.getState().actions.openChat(null);
    }
  }, []);

  const pane = (c: NonNullable<typeof chat>) => (
    <>
      <ChatHeader
        chat={c}
        onBack={() => openChat(null)}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        pinnedOpen={pinnedOpen}
        setPinnedOpen={setPinnedOpen}
      />
      <PinnedBanner chat={c} onOpenList={() => setPinnedOpen(true)} />
      <MessageList chat={c} search={search} onSearchChange={(s) => (s ? setSearchQ(s.q) : setSearchQ(""))} />
      <Composer chat={c} />
    </>
  );

  return (
    <ScrollStateContext.Provider value={scrollRefs}>
      <ConfirmProvider>
      {!profile ? (
        <Onboarding />
      ) : (
      <div
        className="flex h-[100dvh] w-screen overflow-hidden bg-tg-bg text-tg-text"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className={`${chat ? "hidden md:block" : "block"} w-full shrink-0 md:w-[340px]`}>
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {chat && !canViewChat ? (
            <LockedChat chat={chat} />
          ) : chat ? (
            <div className="flex min-h-0 flex-1 flex-col">{pane(chat)}</div>
          ) : (
            <div className="hidden min-h-0 flex-1 items-center justify-center md:flex">
              <div className="flex flex-col items-center justify-center gap-3 text-tg-muted">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-tg-input text-5xl">💬</div>
                <p className="font-medium">{t("noChats")}</p>
                <p className="max-w-xs text-center text-sm">{t("appName")}</p>
              </div>
            </div>
          )}
        </div>

        <Toaster />
      </div>
      )}
      {inviteOpen && (
        <JoinGroupModal
          initialToken={inviteToken}
          onClose={() => {
            setInviteOpen(false);
            setInviteToken(undefined);
          }}
        />
      )}
      </ConfirmProvider>
    </ScrollStateContext.Provider>
  );
}