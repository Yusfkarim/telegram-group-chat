import type { Chat, User } from "../types";
import { useChat } from "../store/chatStore";
import { avatarById } from "../assets/avatars";

/** ── live-server wire protocol (same shape for node & serverless GH-backed backends) ── */

export const SNAPSHOT_TAG = "tgc-live-v1" as const;
/** how long a typing ping stays alive on the wire */
export const TYPING_TTL = 2600;
/** poll cadence for everything except typing */
export const POLL_MS = 1250;
/** minimum gap between flushes (debounce) */
export const FLUSH_DEBOUNCE_MS = 220;
/** typing bumps flush faster so feels live */
export const TYPING_FLUSH_MS = 90;

export interface TypingEntry {
  chatId: string;
  userId: string;
  name: string;
  at: number;
}

export interface LiveSnapshot {
  tag: typeof SNAPSHOT_TAG;
  rev: number;
  savedAt: number;
  users: Record<string, Partial<User>>;
  chats: Chat[];
  invitations: unknown[];
  typing: TypingEntry[];
}

/** stable fingerprint for cheap no-op polls (server may answer "same") */
export const snapFingerprint = (s: LiveSnapshot): string =>
  JSON.stringify(s.chats) + "|" + JSON.stringify(s.typing) + "|" + s.rev;

export function handleFromName(name: string): string {
  const n = (name ?? "").trim();
  if (!n) return "user";
  const latin = n.replace(/[^a-zA-Z0-9]/g, "");
  if (latin.length >= 2) return latin.slice(0, 16).toLowerCase();
  return "user" + n.slice(0, 4).replace(/\s/g, "");
}

/**
 * Live sync engine — pure client, transport-agnostic.
 * - GET  {endpoint}/state          → LiveSnapshot
 * - POST {endpoint}/state {snap}   → merged LiveSnapshot (server owns conflict resolution)
 * The local store stays the source of truth while dirty; otherwise the server wins.
 */
export function startSync(endpoint: string): () => void {
  if (!endpoint) return () => {};
  let stopped = false;
  let timer: number | undefined;
  let pendingFlush: number | undefined;
  let lastSentTick = -1;
  let lastSentTypingTick = -1;
  let lastFlushAt = 0;
  let flushing = false;
  let deleted = new Set<string>();

  const store = useChat;
  const getState = () => useChat.getState();

  const buildSnapshot = (typingOnly = false): LiveSnapshot => {
    const s = getState();
    const now = Date.now();
    const typing: TypingEntry[] = [];
    for (const [chatId, map] of Object.entries(s.typingUsersByChat)) {
      for (const [userId, until] of Object.entries(map)) {
        if (until > now) typing.push({ chatId, userId, name: s.users[userId]?.name ?? "", at: until - TYPING_TTL });
      }
    }
    const chats = typingOnly
      ? s.chats.map((c) => (deleted.has(c.id) ? { ...c, messages: [], memberIds: [] } : c))
      : s.chats.filter((c) => !deleted.has(c.id) || (c.rev ?? 0) > 0);
    return {
      tag: SNAPSHOT_TAG,
      rev: now,
      savedAt: now,
      users: Object.fromEntries(
        Object.values(s.users).map((u) => [
          u.id,
          {
            id: u.id,
            name: u.name,
            username: u.username,
            color: u.color,
            avatarId: avatarById(u.avatarId).id, // collects only valid preset ids; "olive" = default
            online: u.online,
            lastSeen: u.lastSeen,
            hideLastSeen: u.hideLastSeen,
          },
        ])
      ),
      chats,
      invitations: s.invitations,
      typing,
    };
  };

  const scheduleFlush = (typingBoost = false) => {
    if (stopped) return;
    if (pendingFlush !== undefined) {
      if (!typingBoost) return;
      window.clearTimeout(pendingFlush);
    }
    const s = getState();
    if (typingBoost && s.typingTick === lastSentTypingTick) return;
    const gap = Math.max(0, typingBoost ? 0 : FLUSH_DEBOUNCE_MS - (Date.now() - lastFlushAt));
    pendingFlush = window.setTimeout(() => {
      pendingFlush = undefined;
      void flush(typingBoost);
    }, gap);
  };

  const flush = async (typingOnly = false) => {
    if (stopped) return;
    // a slow transport must not swallow fresh events — self-reschedule instead
    if (flushing) {
      const wait = typingOnly ? 250 : FLUSH_DEBOUNCE_MS;
      if (pendingFlush === undefined) {
        pendingFlush = window.setTimeout(() => {
          pendingFlush = undefined;
          void flush(typingOnly);
        }, wait);
      }
      return;
    }
    const s = getState();
    if (!typingOnly && s.dirtyTick === lastSentTick) return;
    flushing = true;
    try {
      const snap = buildSnapshot(typingOnly);
      lastSentTypingTick = s.typingTick;
      if (!typingOnly) lastSentTick = s.dirtyTick;
      const res = await fetch(`${endpoint}/state`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(snap),
      });
      const fresh = (await res.json().catch(() => null)) as LiveSnapshot | null;
      if (fresh && fresh.tag === SNAPSHOT_TAG) {
        // the server echoes the merged snapshot — apply, but never resurrect deleted chats
        if (!typingOnly) {
          const keep = (c: Chat) => !deleted.has(c.id);
          const pruned: LiveSnapshot = {
            ...fresh,
            chats: fresh.chats.filter((c) => keep(c) || deleted.has(c.id) === false),
          };
          pruned.chats = pruned.chats.filter((c) => keep(c));
          store.getState().actions.applyServerSnapshot({ ...fresh, chats: pruned.chats });
          deleted = new Set([...deleted].filter((id) => fresh.chats.some((c) => c.id === id)));
        }
      }
      lastFlushAt = Date.now();
    } catch {
      /* offline — the next poll retries */
    } finally {
      flushing = false;
    }
  };

  let lastFp = "";

  const poll = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`${endpoint}/state`, { headers: { accept: "application/json", ...(lastFp ? { "x-tgc-fp": lastFp } : {}) } });
      const fresh = (await res.json().catch(() => null)) as LiveSnapshot | { tag: string; rev: number; same: true } | null;
      if (fresh && "same" in fresh && fresh.same) {
        /* nothing new */
      } else if (fresh && fresh.tag === SNAPSHOT_TAG) {
        lastFp = snapFingerprint(fresh as LiveSnapshot);
        const s = getState();
        // a client with an empty local world ignores the server's other rooms until it flushes once
        const localHasWorld = s.chats.length > 0;
        if (localHasWorld || s.dirtyTick !== lastSentTick) {
          store.getState().actions.applyServerSnapshot(fresh as LiveSnapshot);
        }
        if (s.dirtyTick !== lastSentTick) scheduleFlush();
      }
    } catch {
      /* offline */
    } finally {
      if (!stopped) timer = window.setTimeout(poll, POLL_MS);
    }
  };

  // presence/identity fix-ups race the first flush; wait a beat for hydration
  void poll();
  // watch the store ticks
  let unsub = store.subscribe((s) => {
    if (s.typingTick !== lastSentTypingTick) scheduleFlush(true);
    else if (s.dirtyTick !== lastSentTick) scheduleFlush();
  });
  const onVis = () => {
    if (document.visibilityState === "visible") {
      window.clearTimeout(timer);
      void poll();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    if (pendingFlush !== undefined) window.clearTimeout(pendingFlush);
    document.removeEventListener("visibilitychange", onVis);
    unsub();
  };
}

export const defaultEndpoint = (): string => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  if (env.VITE_REALTIME_URL) return env.VITE_REALTIME_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (protocol === "http:" && hostname === "localhost") return `${protocol}//${hostname}:8787`;
  }
  return "/api";
};
