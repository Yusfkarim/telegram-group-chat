/**
 * Runs before any persisted store is created (imported first in main.tsx).
 * Repairs raw localStorage so zustand hydrates from a shape the current build understands.
 * Without this, data written by an older build (or partially corrupted) can produce
 * a blank screen after an update.
 */
const CHAT_KEY = "tg-group-chat";
const PROFILE_KEY = "tg-profile";

type Json = Record<string, unknown>;

const read = (key: string): Json | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Json) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: Json) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — the app still runs from defaults */
  }
};

const drop = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export function repairStorage(): void {
  // ── chat store ──────────────────────────────────────────────
  const chat = read(CHAT_KEY);
  if (chat) {
    const state = (chat.state ?? {}) as Json;
    const problems: string[] = [];

    if (!Array.isArray(state.chats)) problems.push("chats");
    if (state.settings !== undefined && (typeof state.settings !== "object" || state.settings === null)) {
      problems.push("settings");
    }
    if (state.users !== undefined && (typeof state.users !== "object" || Array.isArray(state.users) || state.users === null)) {
      problems.push("users");
    }
    if (state.invitations !== undefined && !Array.isArray(state.invitations)) problems.push("invitations");

    // drop fields the current build cannot use, keep everything else intact
    if (problems.includes("chats")) delete state.chats;
    if (problems.includes("settings")) delete state.settings;
    if (problems.includes("users")) delete state.users;
    if (problems.includes("invitations")) delete state.invitations;

    if (Array.isArray(state.chats)) {
      state.chats = (state.chats as unknown[]).filter((c) => c && typeof c === "object");
    }
    if (state.activeChatId !== undefined && typeof state.activeChatId !== "string") {
      state.activeChatId = null;
    }
    chat.state = state;
    write(CHAT_KEY, chat);
  }

  // ── profile store ───────────────────────────────────────────
  const profile = read(PROFILE_KEY);
  if (profile) {
    const state = (profile.state ?? {}) as Json;
    const p = state.profile as Json | null | undefined;
    const name = p && typeof (p as Json).name === "string" ? (p as Json).name as string : "";
    if (!p || typeof (p as Json).id !== "string" || !name.trim()) {
      drop(PROFILE_KEY);
    }
  }

  // ── legacy auth store from an older build ───────────────────
  if (localStorage.getItem("tg-auth")) drop("tg-auth");
}
export const ACTIVE_CHAT_KEY = "tg-active-chat";

export const rememberActiveChat = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ACTIVE_CHAT_KEY, id);
    else localStorage.removeItem(ACTIVE_CHAT_KEY);
  } catch {
    /* ignore */
  }
};

export const recallActiveChat = (): string | null => {
  try {
    const v = localStorage.getItem(ACTIVE_CHAT_KEY);
    return v && v.length ? v : null;
  } catch {
    return null;
  }
};

/* ── theme: persisted independently so it survives any store hydration quirk ── */
export const THEME_KEY = "tg-theme";

export const rememberTheme = (t: "dark" | "light") => {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
};

export const recallTheme = (): "dark" | "light" => {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};
