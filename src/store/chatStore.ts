import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminPermissions, Chat, ChatBackground, JoinRequest, Message, Role, Settings, State, User, Visibility } from "../types";
import { FULL_PERMS, MAX_FONT, MIN_FONT } from "../types";
import { seed, FAKE_CHAT_IDS, FAKE_MESSAGE_IDS, FAKE_USER_IDS } from "../data/seed";
import { rememberActiveChat, rememberTheme } from "./storagePrep";
import { can, canTarget, isBanned, isOwner, isStaff, migratePerms, slowModeWait } from "../lib/rbac";
import { uid } from "../lib/format";
import { chosenWallpaperId } from "../assets/wallpapers";
import { avatarById } from "../assets/avatars";
import { handleFromName, type LiveSnapshot, SNAPSHOT_TAG, TYPING_TTL } from "../lib/realtime";
import { MASTER_OWNER_ID, MASTER_OWNER_NAME, MASTER_OWNER_USERNAME, isMasterName } from "./profileStore";
import type { Profile } from "./profileStore";

const D = 86_400_000;

interface Actions {
  setTheme: (t: State["theme"]) => void;
  setLang: (l: State["settings"]["lang"]) => void;
  setHideLastSeen: (v: boolean) => void;
  setLocalWallpaper: (id: string) => void;
  setFontSize: (px: number) => void;
  openChat: (id: string | null) => void;
  openDm: (userId: string) => void;

  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;

  sendMessage: (chatId: string, text: string) => { ok: boolean; error?: string };
  editMessage: (chatId: string, id: string, text: string) => void;
  deleteForEveryone: (chatId: string, id: string) => void;
  react: (chatId: string, id: string, emoji: string) => void;
  setReply: (id: string | null) => void;
  startEdit: (id: string | null) => void;

  receiveMessage: (chatId: string, senderId: string, text: string, replyToId?: string) => void;
  setTyping: (chatId: string, userId: string, until: number) => void;
  bump: () => void;
  applyServerSnapshot: (snap: LiveSnapshot) => void;
  setPresence: (userId: string, online: boolean) => void;

  pinMessage: (chatId: string, id: string, notify: boolean) => void;
  unpinMessage: (chatId: string, id: string) => void;

  createGroup: (input: { name: string; avatarId: string; description: string; visibility: Visibility; handle?: string }) => string;
  updateGroupInfo: (chatId: string, patch: Partial<Pick<Chat, "name" | "avatarId" | "description" | "handle">>) => void;
  setVisibility: (chatId: string, v: Visibility) => void;
  setChatWallpaper: (chatId: string, wallpaperId: string) => void;
  setChatBackground: (chatId: string, bg: ChatBackground | null) => void;
  deleteGroup: (chatId: string) => void;
  leaveGroup: (chatId: string) => void;
  clearHistory: (chatId: string) => void;

  toggleMemberSend: (chatId: string) => void;
  toggleMemberInvite: (chatId: string) => void;
  setSlowMode: (chatId: string, s: Chat["slowMode"]) => void;
  setLocked: (chatId: string, v: boolean) => void;
  setApprovedMode: (chatId: string, v: boolean) => void;
  toggleMute: (chatId: string) => void;

  promote: (chatId: string, userId: string, perms: AdminPermissions, title: string) => void;
  demote: (chatId: string, userId: string) => void;
  transferOwnership: (chatId: string, userId: string) => void;
  restrict: (chatId: string, userId: string, until: number) => void;
  unrestrict: (chatId: string, userId: string) => void;
  kick: (chatId: string, userId: string) => void;
  ban: (chatId: string, userId: string, reason: string) => void;
  unban: (chatId: string, userId: string) => void;

  generateInvite: (chatId: string) => string;
  revokeInvite: (chatId: string, inviteId: string) => void;
  requestJoin: (chatId: string, via: string) => void;
  adoptAccount: (input: { id: string; name: string; username: string; avatarId: string; isOwner?: boolean }) => void;
  joinViaInvite: (tok: string) => { chatId: string; status: "joined" | "request" | "banned" | "invalid" };
  joinPublic: (chatId: string) => { ok: boolean; reason?: "request" | string };
  approveJoin: (chatId: string, reqId: string) => void;
  dismissJoin: (chatId: string, reqId: string) => void;
  clearMentions: (chatId: string) => void;
  /** simulates another member talking — used to prove mentions/replies end-to-end */
  simulateIncoming: (chatId: string, senderId: string, text: string, replyToId?: string) => void;
}

export const useChat = create<State & { actions: Actions }>()(
  persist(
    (set, get) => {
      /** every chat mutation carries a monotonic rev (used for live merge) */
      const patchChat = (chatId: string, fn: (c: Chat) => Chat) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId ? { ...fn(c), rev: Math.max(c.rev ?? 0, Date.now()) } : c
          ),
          dirtyTick: s.dirtyTick + 1,
        }));

      const service = (text: string): Message => ({
        id: uid("s"), senderId: "system", text, at: Date.now(), reactions: [], system: true,
      });

      const addService = (chatId: string, text: string) =>
        patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, service(text)] }));

      const me = () => get().users[get().meId];
      const nameOf = (id: string) => get().users[id]?.name ?? id;
      const isBlockedWith = (userId: string) => get().blockedUserIds.includes(userId);

      /** folds Kurdish/Arabic letter variants + spacing so @-tags always match */
      const fold = (x: string) =>
        x
          .normalize("NFKC")
          .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
          .replace(/[يى]/g, "ی")
          .replace(/ك/g, "ک")
          .replace(/[إأآٱ]/g, "ا")
          .replace(/[\u200c\u200f\s]+/g, "")
          .replace(/^@+/, "")
          .toLowerCase();

      /** does this text @-mention me? tolerant to ی/ي, ک/ك, spacing and joiners */
      const mentionsMe = (text: string) => {
        const s = get();
        const meId = s.meId;
        const me = s.users[meId];
        const candidates = [me?.username ?? "", me?.name ?? "", meId].map(fold).filter((c) => c.length >= 2);
        if (!candidates.length) return false;
        const tags = text.split("@").slice(1).map((tag) => fold(tag.split(/\s|[:.,!?،]/)[0] ?? ""));
        return tags.some(
          (tag) => tag.length >= 2 && candidates.some((c) => tag === c || tag.startsWith(c) || c.startsWith(tag))
        );
      };

      /** true when the message is an @-mention of me or a reply to one of my messages */
      const notifiesMe = (msg: Message, chat: Chat, senderId: string, meId: string) => {
        if (senderId === meId || msg.system) return false;
        if (mentionsMe(msg.text)) return true;
        if (msg.replyToId) {
          const target = chat.messages.find((m) => m.id === msg.replyToId);
          if (target && target.senderId === meId) return true;
        }
        return false;
      };

      return {
        ...seed(),
        typingUsersByChat: {},
        dirtyTick: 0,
        typingTick: 0,
        actions: {
          setTheme: (theme) => {
            rememberTheme(theme);
            set({ theme });
          },
          setLang: (lang) => set((s) => ({ settings: { ...s.settings, lang } })),
          setHideLastSeen: (v) =>
            set((s) => ({
              settings: { ...s.settings, hideLastSeen: v },
              users: { ...s.users, [s.meId]: { ...s.users[s.meId], hideLastSeen: v } },
            })),
          setLocalWallpaper: (id) => set((s) => ({ settings: { ...s.settings, wallpaperId: id } })),
          setFontSize: (px) =>
            set((s) => ({ settings: { ...s.settings, fontSize: clamp(Math.round(px), MIN_FONT, MAX_FONT) } })),

          openChat: (id) => {
            rememberActiveChat(id);
            set((s) => ({
              activeChatId: id,
              replyToId: null,
              editingId: null,
              // mentions/replies stay flagged until the user jumps to them (or dismisses the badge)
              chats: s.chats.map((c) => (c.id === id ? { ...c, unread: 0, lastReadAt: Date.now() } : c)),
            }));
          },

          openDm: (userId) => {
            const s = get();
            if (userId === s.meId) return;
            rememberActiveChat(`dm-${userId}`);
            const existing = s.chats.find((c) => c.kind === "dm" && c.dmUserId === userId);
            if (existing) {
              s.actions.openChat(existing.id);
              return;
            }
            const other = s.users[userId];
            const chat: Chat = {
              id: `dm-${userId}`,
              kind: "dm",
              name: other?.name ?? "",
              avatarId: other?.avatarId ?? "olive",
              visibility: "private",
              description: "",
              memberIds: [s.meId, userId],
              roles: {},
              adminPerms: {},
              customTitles: {},
              membersCanSend: true,
              membersCanInvite: false,
              pinnedIds: [],
              messages: [],
              unread: 0,
              muted: false,
              slowMode: 0,
              locked: false,
              invites: [],
              joinRequests: [],
              approvedMode: false,
              banned: [],
              restrictions: {},
              lastReadAt: Date.now(),
              dmUserId: userId,
            };
            set((st) => ({ chats: [chat, ...st.chats], activeChatId: chat.id }));
          },

          blockUser: (userId) =>
            set((s) => ({
              blockedUserIds: s.blockedUserIds.includes(userId)
                ? s.blockedUserIds
                : [...s.blockedUserIds, userId],
            })),

          unblockUser: (userId) =>
            set((s) => ({ blockedUserIds: s.blockedUserIds.filter((u) => u !== userId) })),

          sendMessage: (chatId, text) => {
            const s = get();
            const chat = s.chats.find((c) => c.id === chatId);
            if (!chat) return { ok: false, error: "" };
            if (!text.trim()) return { ok: false, error: "" };
            if (chat.kind === "dm" && chat.dmUserId && isBlockedWith(chat.dmUserId))
              return { ok: false, error: "blockedBanner" };
            if (chat.locked && !isStaff(chat, s.meId)) return { ok: false, error: "onlyAdmins" };
            if (!chat.membersCanSend && !isStaff(chat, s.meId)) return { ok: false, error: "onlyAdmins" };
            const r = chat.restrictions[s.meId];
            if (r && r.until > Date.now()) return { ok: false, error: "restrictedBanner" };
            const last = [...chat.messages].reverse().find((m) => m.senderId === s.meId && !m.system);
            if (slowModeWait(chat, s.meId, last?.at ?? 0) > 0) return { ok: false, error: "slow" };

            const msg: Message = {
              id: uid("m"),
              senderId: s.meId,
              text: text.trim(),
              at: Date.now(),
              reactions: [],
              replyToId: s.replyToId ?? undefined,
            };
            patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, msg] }));
            set({ replyToId: null, editingId: null });
            return { ok: true };
          },

          editMessage: (chatId, id, text) => {
            const s = get();
            const msg = s.chats.find((c) => c.id === chatId)?.messages.find((m) => m.id === id);
            if (!msg || msg.senderId !== s.meId || !text.trim()) return;
            patchChat(chatId, (c) => ({
              ...c,
              messages: c.messages.map((m) => (m.id === id ? { ...m, text: text.trim(), edited: true } : m)),
            }));
            set({ editingId: null });
          },

          deleteForEveryone: (chatId, id) => {
            const s = get();
            const chat = s.chats.find((c) => c.id === chatId);
            if (!chat) return;
            const msg = chat.messages.find((m) => m.id === id);
            if (!msg || msg.system) return;
            const mine = msg.senderId === s.meId;
            if (!mine && !can.deleteMessages(chat, s.meId)) return;
            patchChat(chatId, (c) => ({
              ...c,
              pinnedIds: c.pinnedIds.filter((p) => p !== id),
              messages: c.messages.map((m) =>
                m.id === id ? { ...m, text: "", deletedForEveryone: true, reactions: [] } : m
              ),
            }));
            if (!mine) addService(chatId, `${me()?.name ?? ""} · ${s.users[msg.senderId]?.name ?? ""}`);
          },

          react: (chatId, id, emoji) =>
          patchChat(chatId, (c) => {
            const meId = get().meId;
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== id || m.system) return m;

                // one reaction per user: drop any previous reaction this user placed
                const withoutMe = m.reactions
                  .map((r) => ({ ...r, userIds: r.userIds.filter((u) => u !== meId) }))
                  .filter((r) => r.userIds.length > 0);

                const existing = m.reactions.find((r) => r.emoji === emoji);
                const mine = existing?.userIds.includes(meId) ?? false;

                // same emoji again → toggle off
                if (mine) return { ...m, reactions: withoutMe };

                // different emoji → replace
                const next = withoutMe.filter((r) => r.emoji !== emoji);
                next.push({ emoji, userIds: [meId] });
                return { ...m, reactions: next };
              }),
            };
          }),

        setReply: (id) => set({ replyToId: id, editingId: null }),
        startEdit: (id) => set({ editingId: id, replyToId: null }),

        receiveMessage: (chatId, senderId, text, replyToId) => {
          const s = get();
          const chat = s.chats.find((c) => c.id === chatId);
          if (!chat || !chat.memberIds.includes(senderId)) return;
          if (chat.kind === "dm" && chat.dmUserId && isBlockedWith(chat.dmUserId)) return;
          const msg: Message = { id: uid("m"), senderId, text, at: Date.now(), reactions: [], replyToId };
          const flagsMe = notifiesMe(msg, chat, senderId, s.meId);
          patchChat(chatId, (c) => ({
            ...c,
            typingUntil: undefined,
            unread: c.id === s.activeChatId ? 0 : c.unread + (c.muted ? 0 : 1),
            messages: [...c.messages, msg],
            mentionIds:
              flagsMe && c.id !== s.activeChatId ? [...(c.mentionIds ?? []), msg.id] : c.mentionIds,
          }));
        },

        setTyping: (chatId, userId, until) =>
          set((s) => {
            const cur = s.typingUsersByChat[chatId] ?? {};
            const next = { ...cur };
            if (until > Date.now()) next[userId] = until;
            else delete next[userId];
            return { typingUsersByChat: { ...s.typingUsersByChat, [chatId]: next }, typingTick: s.typingTick + 1 };
          }),

        bump: () => set((s) => ({ dirtyTick: s.dirtyTick + 1 })),

        /** adopt a live-server snapshot — a chat is replaced only when the server copy is newer */
        applyServerSnapshot: (snap) => {
          if (!snap || snap.tag !== SNAPSHOT_TAG || !Array.isArray(snap.chats)) return;
          const s = get();
          const now = Date.now();
          const serverById = new Map(snap.chats.map((c) => [c.id, c]));
          let changed = false;
          const chats: Chat[] = s.chats
            .map((c) => {
              if (c.deletedAt) {
                // tombstone survives until the server tells us the whole chat is gone
                if (!serverById.has(c.id)) changed = true;
                return serverById.has(c.id) ? c : undefined;
              }
              const sc = serverById.get(c.id);
              if (sc && (sc.rev ?? 0) > (c.rev ?? 0)) changed = true;
              return sc && (sc.rev ?? 0) > (c.rev ?? 0) ? sc : c;
            })
            .filter((c): c is Chat => Boolean(c))
            .filter((c) => {
              // tombstoned chats expire once the server has removed them too
              if (c.deletedAt && !serverById.has(c.id)) return false;
              if (c.deletedAt) return true;
              // never silently drop a chat I still belong to
              if (c.memberIds.includes(s.meId)) return true;
              // a chat I have left stays dropped unless the server still carries me
              return false;
            });
          for (const sc of snap.chats) {
            if (!s.chats.some((c) => c.id === sc.id) && !chats.some((c) => c.id === sc.id)) {
              // only novel chats that actually carry my membership (never foreign rooms)
              if (sc.kind === "dm" ? sc.dmUserId === s.meId : sc.memberIds.includes(s.meId)) {
                chats.push(sc);
                changed = true;
              }
            }
          }
          let users: Record<string, User> = s.users;
          for (const u of Object.values(snap.users ?? {})) {
            if (!u || typeof u.id !== "string") continue;
            const mine = users[u.id];
            if (mine && mine.name === u.name && mine.avatarId === u.avatarId) continue;
            users = {
              ...users,
              [u.id]: {
                id: u.id,
                name: u.name ?? mine?.name ?? u.id,
                username: u.username ?? mine?.username ?? handleFromName(u.name ?? u.id),
                color: u.color ?? mine?.color ?? "#5795f2",
                avatarId: u.avatarId && avatarById(u.avatarId).id !== "olive" ? u.avatarId : (mine?.avatarId ?? "olive"),
                online: Boolean(u.online),
                lastSeen: typeof u.lastSeen === "number" ? u.lastSeen : Date.now(),
                hideLastSeen: Boolean(u.hideLastSeen),
              },
            };
            changed = true;
          }
          const typingUsersByChat: Record<string, Record<string, number>> = {};
          for (const t of snap.typing ?? []) {
            if (t.at + TYPING_TTL > now) {
              const cur = typingUsersByChat[t.chatId] ?? {};
              typingUsersByChat[t.chatId] = { ...cur, [t.userId]: Math.max(cur[t.userId] ?? 0, t.at + TYPING_TTL) };
            }
          }
          for (const m of Object.values(s.typingUsersByChat)) {
            for (const [uid, at] of Object.entries(m)) if (at > now) {
              for (const [cid, tm] of Object.entries(s.typingUsersByChat)) {
                if (tm[uid] === at) {
                  typingUsersByChat[cid] = { ...(typingUsersByChat[cid] ?? {}), [uid]: Math.max(typingUsersByChat[cid]?.[uid] ?? 0, at) };
                }
              }
            }
          }
          for (const m of Object.values(typingUsersByChat)) {
            for (const uid of Object.keys(m)) if (m[uid] <= now) delete m[uid];
          }
          set(changed ? { users, chats, typingUsersByChat } : { typingUsersByChat });
        },

        setPresence: (userId, online) =>
          set((s) => {
            const u = s.users[userId];
            if (!u || u.online === online) return {};
            return { users: { ...s.users, [userId]: { ...u, online, lastSeen: online ? Date.now() : u.lastSeen } } };
          }),

        pinMessage: (chatId, id, notify) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.pinMessages(chat, get().meId)) return;
          patchChat(chatId, (c) => ({
            ...c,
            pinnedIds: c.pinnedIds.includes(id) ? c.pinnedIds : [...c.pinnedIds, id],
          }));
          const msg = chat.messages.find((m) => m.id === id);
          if (notify && msg) addService(chatId, `${me()?.name ?? ""} · ${nameOf(msg.senderId)}`);
        },

        unpinMessage: (chatId, id) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.pinMessages(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, pinnedIds: c.pinnedIds.filter((p) => p !== id) }));
        },

        createGroup: (input) => {
          const meId = get().meId;
          const owner = me()?.name ?? "";
          const chat: Chat = {
            id: uid("c"),
            kind: "group",
            name: input.name,
            avatarId: input.avatarId,
            visibility: input.visibility,
            handle: input.visibility === "public" ? input.handle || slug(input.name) : undefined,
            description: input.description,
            memberIds: [meId],
            roles: { [meId]: "owner" },
            adminPerms: {},
            customTitles: {},
            membersCanSend: true,
            membersCanInvite: false,
            pinnedIds: [],
            messages: [service(`${owner} · ${t2("createdGroup")}`)],
            unread: 0,
            muted: false,
            slowMode: 0,
            locked: false,
            invites: [],
            joinRequests: [],
            approvedMode: input.visibility === "private",
            banned: [],
            restrictions: {},
            lastReadAt: Date.now(),
            wallpaperId: "tg-teal",
          };
          rememberActiveChat(chat.id);
          set((s) => ({ chats: [chat, ...s.chats], activeChatId: chat.id }));
          return chat.id;
        },

        updateGroupInfo: (chatId, patch) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm" || !can.changeGroupInfo(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, ...patch }));
          addService(chatId, `${me()?.name ?? ""} · ${t2("editedInfo")}`);
        },

        setVisibility: (chatId, v) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.official || !isOwner(chat, get().meId)) return;
          patchChat(chatId, (c) => ({
            ...c,
            visibility: v,
            handle: v === "public" ? c.handle ?? slug(c.name) : undefined,
          }));
        },

        setChatWallpaper: (chatId, wallpaperId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.changeGroupInfo(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, wallpaperId, customBg: undefined }));
        },

        setChatBackground: (chatId, bg) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.changeGroupInfo(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, customBg: bg ?? undefined }));
        },

        deleteGroup: (chatId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.official || !isOwner(chat, get().meId)) return;
          // tombstone keeps the deletion authoritative until the server snapshot clears it
          set((s) => ({
            chats: s.chats.map((c) => (c.id === chatId ? { ...c, deletedAt: Date.now(), rev: Date.now() } : c)),
            activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
          }));
        },

        leaveGroup: (chatId) => {
          const s = get();
          const chat = s.chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm" || chat.official || isOwner(chat, s.meId)) return;
          set((st) => ({
            chats: st.chats.map((c) =>
              c.id === chatId
                ? { ...c, deletedAt: Date.now(), rev: Date.now(), memberIds: c.memberIds.filter((m) => m !== s.meId) }
                : c
            ),
            activeChatId: st.activeChatId === chatId ? null : st.activeChatId,
          }));
          set((st) => ({
            chats: st.chats.filter((c) => c.memberIds.includes(st.meId) || c.deletedAt),
          }));
        },

        clearHistory: (chatId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat) return;
          if (chat.kind === "group" && !can.deleteMessages(chat, get().meId)) return;
          patchChat(chatId, (c) => ({
            ...c, messages: c.messages.filter((m) => m.system), pinnedIds: [], unread: 0, lastReadAt: Date.now(),
          }));
        },

        toggleMemberSend: (chatId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !isOwner(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, membersCanSend: !c.membersCanSend }));
        },

        toggleMemberInvite: (chatId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !isOwner(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, membersCanInvite: !c.membersCanInvite }));
        },

        setSlowMode: (chatId, v) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !isOwner(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, slowMode: v }));
        },

        setLocked: (chatId, v) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !isOwner(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, locked: v }));
          addService(chatId, `${me()?.name ?? ""} · ${v ? t2("locked") : t2("unlocked")}`);
        },

        setApprovedMode: (chatId, v) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.changeGroupInfo(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, approvedMode: v }));
        },

        toggleMute: (chatId) => patchChat(chatId, (c) => ({ ...c, muted: !c.muted })),

        promote: (chatId, userId, perms, title) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          // ONLY the owner may create or edit admins
          if (!isOwner(chat, get().meId)) return;
          if (!canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => ({
            ...c,
            roles: { ...c.roles, [userId]: "admin" },
            adminPerms: { ...c.adminPerms, [userId]: sanitizePerms(perms) },
            customTitles: { ...c.customTitles, [userId]: title.trim() || "Admin" },
          }));
        },

        demote: (chatId, userId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!isOwner(chat, get().meId) || !canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => {
            const roles = { ...c.roles };
            delete roles[userId];
            const adminPerms = { ...c.adminPerms };
            delete adminPerms[userId];
            const customTitles = { ...c.customTitles };
            delete customTitles[userId];
            return { ...c, roles, adminPerms, customTitles };
          });
        },

        transferOwnership: (chatId, userId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!isOwner(chat, get().meId) || userId === get().meId) return;
          if (!chat.memberIds.includes(userId)) return;
          // the community group is owned exclusively by the platform owner
          if (chat.official) return;
          const previousOwner = Object.entries(chat.roles).find(([, r]) => r === "owner")?.[0];
          patchChat(chatId, (c) => ({
            ...c,
            founderName: nameOf(userId),
            roles: {
              ...c.roles,
              [userId]: "owner" as Role,
              ...(previousOwner && previousOwner !== userId ? { [previousOwner]: "admin" as Role } : {}),
            },
            adminPerms: { ...c.adminPerms, [userId]: { ...FULL_PERMS } },
            customTitles: { ...c.customTitles, [userId]: t2("owner") },
          }));
          addService(chatId, `${nameOf(previousOwner ?? "")} · ${t2("ownershipTransferred")} ${nameOf(userId)}`);
        },

        restrict: (chatId, userId, until) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.muteMembers(chat, get().meId) || !canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => ({ ...c, restrictions: { ...c.restrictions, [userId]: { until } } }));
        },

        unrestrict: (chatId, userId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.muteMembers(chat, get().meId) || !canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => {
            const r = { ...c.restrictions };
            delete r[userId];
            return { ...c, restrictions: r };
          });
        },

        kick: (chatId, userId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.kickMembers(chat, get().meId) || !canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => {
            const roles = { ...c.roles };
            delete roles[userId];
            const adminPerms = { ...c.adminPerms };
            delete adminPerms[userId];
            const joinRequests = c.joinRequests.filter((r) => r.userId !== userId);
            return {
              ...c,
              memberIds: c.memberIds.filter((m) => m !== userId),
              roles,
              adminPerms,
              joinRequests,
              messages: [
                ...c.messages,
                service(`${me()?.name ?? ""} · ${t2("kicked")} ${nameOf(userId)}`),
              ],
            };
          });
        },

        ban: (chatId, userId, reason) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm") return;
          if (!can.kickMembers(chat, get().meId) || !canTarget(chat, get().meId, userId)) return;
          patchChat(chatId, (c) => {
            const roles = { ...c.roles };
            delete roles[userId];
            const adminPerms = { ...c.adminPerms };
            delete adminPerms[userId];
            return {
              ...c,
              memberIds: c.memberIds.filter((m) => m !== userId),
              roles,
              adminPerms,
              joinRequests: c.joinRequests.filter((r) => r.userId !== userId),
              banned: [
                ...c.banned.filter((b) => b.userId !== userId),
                { userId, until: Date.now() + 3650 * D, reason, by: get().meId, at: Date.now() },
              ],
              messages: [...c.messages, service(`${me()?.name ?? ""} · ${t2("banned")} ${nameOf(userId)}`)],
            };
          });
        },

        unban: (chatId, userId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.kickMembers(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, banned: c.banned.filter((b) => b.userId !== userId) }));
        },

        generateInvite: (chatId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || chat.kind === "dm" || !can.inviteUsers(chat, get().meId)) return "";
          const t = `${chat.handle ?? slug(chat.name)}-${Math.random().toString(36).slice(2, 8)}`;
          patchChat(chatId, (c) => ({
            ...c,
            invites: [...c.invites.filter((i) => !i.revoked), { id: uid("i"), token: t, createdBy: get().meId, createdAt: Date.now(), uses: 0 }],
          }));
          return t;
        },

        revokeInvite: (chatId, inviteId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.inviteUsers(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, invites: c.invites.map((i) => (i.id === inviteId ? { ...i, revoked: true } : i)) }));
        },

        requestJoin: (chatId, via) => {
          const s = get();
          const chat = s.chats.find((c) => c.id === chatId);
          if (!chat || chat.memberIds.includes(s.meId)) return;
          if (chat.joinRequests.some((r) => r.userId === s.meId)) return;
          const req: JoinRequest = { id: uid("j"), userId: s.meId, at: Date.now(), via };
          patchChat(chatId, (c) => ({ ...c, joinRequests: [...c.joinRequests, req] }));
        },

        adoptAccount: ({ id, name, username, avatarId, isOwner = false }) =>
          set((s) => {
            const existing = s.users[id];
            const user = {
              id,
              name,
              username,
              avatarId,
              color: existing?.color ?? "#5795f2",
              online: true,
              lastSeen: Date.now(),
              hideLastSeen: s.settings.hideLastSeen,
              bio: existing?.bio,
            };
            // every real account is added to the mandatory community group
            const chats = s.chats.map((c) => {
              if (!c.official || c.memberIds.includes(id)) return c;
              return {
                ...c,
                memberIds: [...c.memberIds, id],
                messages: [
                  ...c.messages,
                  service(`${name} · ${isOwner ? t2("foundedGroup") : t2("joinedGroup")}`),
                ],
              };
            });

            // the platform owner is the sole owner of the official community group
            if (isOwner) {
              return {
                meId: id,
                users: { ...s.users, [id]: user },
                chats: chats.map((c) =>
                  c.official
                    ? {
                        ...c,
                        founderName: name,
                        memberIds: c.memberIds.includes(id) ? c.memberIds : [id, ...c.memberIds],
                        roles: stripOtherOwners({ ...c.roles, [id]: "owner" as Role }, id),
                        adminPerms: { ...c.adminPerms, [id]: { ...FULL_PERMS } },
                        customTitles: { ...c.customTitles, [id]: t2("owner") },
                      }
                    : c
                ),
              };
            }
            return { meId: id, users: { ...s.users, [id]: user }, chats };
          }),

        joinViaInvite: (tok) => {
          const s = get();
          for (const chat of s.chats) {
            const inv = chat.invites.find((i) => i.token === tok && !i.revoked);
            if (!inv) continue;
            if (isBanned(chat, s.meId)) return { chatId: chat.id, status: "banned" as const };
            if (chat.memberIds.includes(s.meId)) return { chatId: chat.id, status: "joined" as const };
            if (chat.approvedMode) {
              const req: JoinRequest = { id: uid("j"), userId: s.meId, at: Date.now(), via: tok };
              patchChat(chat.id, (c) => ({
                ...c,
                joinRequests: [...c.joinRequests, req],
                invites: c.invites.map((i) => (i.id === inv.id ? { ...i, uses: i.uses + 1 } : i)),
              }));
              return { chatId: chat.id, status: "request" as const };
            }
            patchChat(chat.id, (c) => ({
              ...c,
              memberIds: [...c.memberIds, s.meId],
              invites: c.invites.map((i) => (i.id === inv.id ? { ...i, uses: i.uses + 1 } : i)),
              messages: [...c.messages, service(`${me()?.name ?? ""} · ${t2("joinedViaLink")}`)],
            }));
            return { chatId: chat.id, status: "joined" as const };
          }
          return { chatId: "", status: "invalid" as const };
        },

        joinPublic: (chatId) => {
          const s = get();
          const chat = s.chats.find((c) => c.id === chatId);
          if (!chat) return { ok: false, reason: "notFound" };
          if (isBanned(chat, s.meId)) return { ok: false, reason: "banned" };
          if (chat.memberIds.includes(s.meId)) return { ok: false, reason: "already" };
          if (chat.approvedMode) {
            const req: JoinRequest = { id: uid("j"), userId: s.meId, at: Date.now(), via: chat.handle ?? chat.name };
            patchChat(chatId, (c) => ({ ...c, joinRequests: [...c.joinRequests, req] }));
            return { ok: true, reason: "request" };
          }
          patchChat(chatId, (c) => ({
            ...c,
            memberIds: [...c.memberIds, s.meId],
            messages: [...c.messages, service(`${me()?.name ?? ""} · ${t2("joinedGroup")}`)],
          }));
          return { ok: true };
        },

        approveJoin: (chatId, reqId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.approveJoinRequests(chat, get().meId)) return;
          const req = chat.joinRequests.find((r) => r.id === reqId);
          if (!req) return;
          if (isBanned(chat, req.userId)) {
            patchChat(chatId, (c) => ({ ...c, joinRequests: c.joinRequests.filter((r) => r.id !== reqId) }));
            return;
          }
          patchChat(chatId, (c) => ({
            ...c,
            joinRequests: c.joinRequests.filter((r) => r.id !== reqId),
            memberIds: c.memberIds.includes(req.userId) ? c.memberIds : [...c.memberIds, req.userId],
            messages: [...c.messages, service(`${nameOf(req.userId)} · ${t2("joinedGroup")}`)],
          }));
        },

        dismissJoin: (chatId, reqId) => {
          const chat = get().chats.find((c) => c.id === chatId);
          if (!chat || !can.approveJoinRequests(chat, get().meId)) return;
          patchChat(chatId, (c) => ({ ...c, joinRequests: c.joinRequests.filter((r) => r.id !== reqId) }));
        },

        clearMentions: (chatId) =>
          patchChat(chatId, (c) => (c.mentionIds?.length ? { ...c, mentionIds: [] } : c)),

        simulateIncoming: (chatId, senderId, text, replyToId) =>
          get().actions.receiveMessage(chatId, senderId, text, replyToId),
      },
      };
    },
    {
      name: "tg-group-chat",
      /** v6: fake demo groups/messages are dropped from every cached browser */
      version: 6,
      onRehydrateStorage: () => (_state, err) => {
        // a hydration failure would silently reset the app to the seed — surface it
        // (warn, not error: falling back to defaults is the handled path)
        if (err) console.warn("[tg-group-chat] hydration failed, falling back to defaults", err);
      },
      /** runs on EVERY hydration — heals any shape written by an older build */
      merge: (persisted, current) => ({ ...normalizePersisted(persisted ?? current), actions: current.actions }),
      migrate: (persisted) => normalizePersisted(persisted),
    } )
);

/** the official group has exactly one owner, always */
function stripOtherOwners(roles: Record<string, Role>, keep: string) {
  const out: Record<string, Role> = {};
  for (const [id, r] of Object.entries(roles)) out[id] = r === "owner" && id !== keep ? "admin" : r;
  return out;
}

function sanitizePerms(p: AdminPermissions): AdminPermissions { return ({
  canDeleteMessages: p.canDeleteMessages === true,
  canPinMessages: p.canPinMessages === true,
  canKickMembers: p.canKickMembers === true,
  canMuteMembers: p.canMuteMembers === true,
  canApproveJoinRequests: p.canApproveJoinRequests === true,
  canChangeGroupInfo: p.canChangeGroupInfo === true,
  canInviteUsers: p.canInviteUsers === true,
}); }

function clamp(n: number, lo: number, hi: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

/** service-message copy is bilingual-safe because the store never holds a translator */
function t2(k: string) {
  return SERVICE_TEXT[k] ?? k;
}

const SERVICE_TEXT: Record<string, string> = {
  createdGroup: "أنشأ المجموعة",
  editedInfo: "عدّل معلومات المجموعة",
  locked: "قفل المجموعة",
  unlocked: "فتح المجموعة",
  kicked: "طرد",
  banned: "حظر",
  joinedGroup: "انضم إلى المجموعة",
  foundedGroup: "أنشأ المجموعة",
  joinedViaLink: "انضم عبر رابط الدعوة",
  ownershipTransferred: "نقل الملكية إلى",
  owner: "المالك",
};

function normalizePersisted(persisted: unknown): State {
  const base = seed();
  const old = (persisted && typeof persisted === "object" ? persisted : {}) as Partial<State>;

  const settings: Settings = {
    ...base.settings,
    ...(old.settings && typeof old.settings === "object" ? (old.settings as Partial<Settings>) : {}),
    wallpaperId: chosenWallpaperId((old.settings as Partial<Settings> | undefined)?.wallpaperId) ?? base.settings.wallpaperId,
    fontSize: clamp(
      Number((old.settings as Partial<Settings> | undefined)?.fontSize ?? base.settings.fontSize),
      MIN_FONT,
      MAX_FONT
    ),
  };

  const theme = old.theme === "light" || old.theme === "dark" ? old.theme : base.theme;
  const meId = typeof old.meId === "string" ? old.meId : base.meId;
  let users = sanitizeUsers(old.users, meId);

  // ── master-identity fold: the one true owner can never exist twice ──
  const profileStore = ((): { profile: Profile | null } => {
    try {
      return JSON.parse(localStorage.getItem("tg-profile") ?? "{}");
    } catch {
      return { profile: null };
    }
  })();
  const ownerId = MASTER_OWNER_ID;
  const folded = new Map<string, string>(); // oldUserId → canonicalMasterId
  for (const [id, u] of Object.entries(users)) {
    if ((u as User).name && isMasterName((u as User).name) && id !== ownerId) folded.set(id, ownerId);
  }
  if (profileStore.profile && isMasterName(profileStore.profile.name)) {
    if (users[profileStore.profile.id] && profileStore.profile.id !== ownerId) folded.set(profileStore.profile.id, ownerId);
    if (!users[ownerId]) {
      users = {
        ...users,
        [ownerId]: {
          id: ownerId,
          name: MASTER_OWNER_NAME,
          username: MASTER_OWNER_USERNAME,
          color: "#f59e0b",
          avatarId: "crescent",
          online: true,
          lastSeen: Date.now(),
          hideLastSeen: false,
        },
      };
    }
  }
  // drop every folded twin, remap remaining users
  for (const k of folded.keys()) delete users[k];
  users = { ...users };
  const remapIds = (ids: string[]): string[] => dedupe(ids.map((id) => folded.get(id) ?? id));

  if (!Array.isArray(old.chats)) {
    return {
      ...base,
      theme,
      meId: profileStore.profile && isMasterName(profileStore.profile.name) ? ownerId : meId,
      activeChatId: typeof old.activeChatId === "string" ? old.activeChatId : null,
      settings,
      users,
      blockedUserIds: sanitizeBlocked(old.blockedUserIds, users),
    };
  }

  const prevChats = old.chats as Chat[];
  const kept = prevChats.filter((c) => c && typeof c === "object" && !FAKE_CHAT_IDS.includes(c.id));
  const officialPrev = kept.find((c) => c.id === base.chats[0].id);
  const fresh = base.chats[0];

  const chats: Chat[] = kept.map((c) => {
    const n = normalizeChat(c, fresh);
    return {
      ...n,
      memberIds: remapIds(n.memberIds),
      messages: n.messages.map((m) => ({
        ...m,
        senderId: folded.get(m.senderId) ?? m.senderId,
        reactions: (m.reactions ?? []).map((r) => ({ ...r, userIds: remapIds(r.userIds) })),
      })),
      pinnedIds: remapIds(n.pinnedIds),
      banned: n.banned.map((b) => ({ ...b, userId: folded.get(b.userId) ?? b.userId })),
      roles: Object.fromEntries(
        Object.entries(n.roles).map(([k, v]) => [folded.get(k) ?? k, v]) as [string, Role][]
      ) as Chat["roles"],
      adminPerms: Object.fromEntries(
        Object.entries(n.adminPerms).map(([k, v]) => [folded.get(k) ?? k, v])
      ) as Chat["adminPerms"],
      restrictions: Object.fromEntries(
        Object.entries(n.restrictions ?? {}).map(([k, v]) => [folded.get(k) ?? k, v])
      ) as Chat["restrictions"],
      customTitles: Object.fromEntries(
        Object.entries(n.customTitles ?? {}).map(([k, v]) => [folded.get(k) ?? k, v])
      ) as Chat["customTitles"],
    };
  });
  if (!chats.some((c) => c.id === fresh.id)) chats.unshift(fresh);

  // scrub every trace of the shipped demo conversation out of the community group
  const idx = chats.findIndex((c) => c.id === fresh.id);
  if (idx >= 0 && officialPrev) {
    const liveSenders = new Set<string>([meId, ...users ? Object.keys(users) : []]);
    chats[idx] = {
      ...chats[idx],
      messages: chats[idx].messages.filter(
        (m) =>
          m &&
          typeof m === "object" &&
          !FAKE_MESSAGE_IDS.includes(m.id) &&
          !FAKE_USER_IDS.includes(m.senderId) &&
          (m.senderId === "system" || liveSenders.has(m.senderId))
      ),
      memberIds: chats[idx].memberIds.filter((id) => !FAKE_USER_IDS.includes(id)),
      roles: stripOtherOwners(keepOnlyOwners(chats[idx].roles, meId), meId),
      adminPerms: Object.fromEntries(
        Object.entries(chats[idx].adminPerms).filter(([k]) => !FAKE_USER_IDS.includes(k))
      ) as Chat["adminPerms"],
      pinnedIds: chats[idx].pinnedIds.filter((p) => !FAKE_MESSAGE_IDS.includes(p)),
    };
  }
  if (chats[idx]) chats[idx] = { ...chats[idx], memberIds: dedupe(chats[idx].memberIds) };

  // ── pill scrub: kill username-only spam pills and collapse duplicate system rows ──
  for (const c of chats) {
    c.messages = c.messages.filter((m) => {
      if (!m.system) return true;
      const t = m.text.trim();
      // "یوسف · یوسف" or bare display-name pills → garbage, dropped forever
      if (/^یوسف( الکردي)?\s*·\s*یوسف( الکردي)?$/.test(t)) return false;
      const bare = t.replace(/\s*·\s*.*$/, "");
      if (blobName(bare) && blobName(bare) === blobName(MASTER_OWNER_NAME) && t.startsWith(bare + " · " + bare)) return false;
      return true;
    });
    const createMsg = "أنشأ المجموعة";
    const firstCreate = new Map<string, boolean>();
    c.messages = c.messages.filter((m) => {
      if (!m.system || !m.text.includes(createMsg)) return true;
      const key = m.text;
      if (firstCreate.has(key)) return false;
      firstCreate.set(key, true);
      return true;
    });
  }

  const meIdFinal =
    profileStore.profile && isMasterName(profileStore.profile.name) ? ownerId : folded.has(meId) ? ownerId : meId;

  return {
    ...base,
    ...old,
    theme,
    users,
    meId: meIdFinal,
    typingUsersByChat: {},
    dirtyTick: 0,
    typingTick: 0,
    chats,
    invitations: Array.isArray(old.invitations)
      ? old.invitations.filter((i) => i && chats.some((c) => c.id === i.chatId))
      : [],
    settings,
    activeChatId: typeof old.activeChatId === "string" ? old.activeChatId : null,
    replyToId: null,
    editingId: null,
    blockedUserIds: sanitizeBlocked(old.blockedUserIds, users),
  } as State;
}

function keepOnlyOwners(roles: Record<string, Role>, meId: string) {
  const out: Record<string, Role> = {};
  for (const [id, r] of Object.entries(roles ?? {})) {
    if (FAKE_USER_IDS.includes(id)) continue;
    out[id] = r === "owner" && id !== meId ? "admin" : r;
  }
  return out;
}

function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

/** tolerant name fingerprint (same fold rules as @-mentions) */
function blobName(name: string): string {
  return (name ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[\u200c\u200f\s]+/g, "")
    .toLowerCase();
}

function sanitizeBlocked(raw: unknown, users: Record<string, User>) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && Boolean(users[id]));
}

function normalizeChat(c: Chat, fresh: Chat): Chat {
  const p = c as Partial<Chat>;
  const roles: Record<string, Role> = {};
  for (const [id, r] of Object.entries(p.roles ?? {})) {
    if (FAKE_USER_IDS.includes(id)) continue;
    roles[id] = r === "owner" ? "owner" : r === "admin" ? "admin" : "member";
  }
  const adminPerms: Chat["adminPerms"] = {};
  for (const [id, perms] of Object.entries(p.adminPerms ?? {})) {
    if (FAKE_USER_IDS.includes(id)) continue;
    adminPerms[id] = migratePerms(perms);
  }
  return {
    ...fresh,
    ...p,
    id: typeof p.id === "string" ? p.id : fresh.id,
    kind: p.kind === "dm" ? "dm" : "group",
    name: typeof p.name === "string" && p.name ? p.name : fresh.name,
    avatarId: typeof p.avatarId === "string" ? p.avatarId : fresh.avatarId,
    visibility: p.visibility === "public" ? "public" : "private",
    description: typeof p.description === "string" ? p.description : "",
    slowMode: (typeof p.slowMode === "number" ? p.slowMode : 0) as Chat["slowMode"],
    locked: Boolean(p.locked),
    membersCanSend: p.membersCanSend !== false,
    membersCanInvite: Boolean(p.membersCanInvite),
    approvedMode: Boolean(p.approvedMode),
    muted: Boolean(p.muted),
    official: p.official === true,
    // never inherit the official group's founder/handle into a user-created group
    founderName: typeof p.founderName === "string" ? p.founderName : undefined,
    handle: typeof p.handle === "string" ? p.handle : undefined,
    dmUserId: typeof p.dmUserId === "string" ? p.dmUserId : undefined,
    pinnedIds: Array.isArray(p.pinnedIds) ? p.pinnedIds : [],
    invites: Array.isArray(p.invites) ? p.invites : [],
    joinRequests: Array.isArray(p.joinRequests) ? p.joinRequests : [],
    banned: Array.isArray(p.banned) ? p.banned : [],
    restrictions: p.restrictions && typeof p.restrictions === "object" ? p.restrictions : {},
    messages: Array.isArray(p.messages) ? p.messages.filter(Boolean) : [],
    memberIds: dedupe(Array.isArray(p.memberIds) ? p.memberIds : fresh.memberIds),
    roles,
    adminPerms,
    customTitles: p.customTitles && typeof p.customTitles === "object" ? p.customTitles : {},
    unread: typeof p.unread === "number" ? p.unread : 0,
    lastReadAt: typeof p.lastReadAt === "number" ? p.lastReadAt : Date.now(),
    customBg: p.customBg && typeof p.customBg === "object" ? p.customBg : undefined,
    // legacy auto-defaults ("tg-night"/"tg-teal") follow the active theme now
    wallpaperId: chosenWallpaperId(p.wallpaperId),
    // typing is daydream — never persisted, never synced inside chat objects
    typingUsers: undefined,
    typingUntil: undefined,
  } as Chat;
}

function sanitizeUsers(raw: unknown, meId: string): State["users"] {
  const out: State["users"] = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, raw2] of Object.entries(raw as Record<string, Partial<User>>)) {
    // the six demo personas are gone for good
    if (FAKE_USER_IDS.includes(id)) continue;
    const u = raw2;
    if (!u || typeof u !== "object" || typeof u.name !== "string" || !u.name) continue;
    out[id] = {
      id,
      name: u.name,
      username: typeof u.username === "string" && u.username ? u.username : "user",
      color: typeof u.color === "string" ? u.color : "#5795f2",
      avatarId: typeof u.avatarId === "string" ? u.avatarId : "olive",
      online: Boolean(u.online),
      lastSeen: typeof u.lastSeen === "number" ? u.lastSeen : Date.now(),
      hideLastSeen: Boolean(u.hideLastSeen),
      bio: typeof u.bio === "string" ? u.bio : undefined,
    };
  }
  if (!meId) return out;
  return out;
}

function slug(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 24);
}