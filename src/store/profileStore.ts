import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProfileRole = "owner" | "user";

export interface Profile {
  id: string;
  name: string;
  avatarId: string;
  role: ProfileRole;
  /** the name may be changed exactly once after creation */
  hasChangedName: boolean;
  createdAt: number;
}

/** Master (platform) owner — the only account with supreme ownership. */
export const MASTER_OWNER_NAME = "یوسف الکردي";
export const MASTER_OWNER_PASSWORD = "12345678rk";
/** immutable id of the one true master account — gold everywhere, never duplicated */
export const MASTER_OWNER_ID = "master_owner_yousif";
export const MASTER_OWNER_USERNAME = "yousif";
/** true for any spelling variant of the master owner display name */
export const isMasterUserName = (name: string, id?: string): boolean =>
  (id !== undefined && id === MASTER_OWNER_ID) || isMasterName(name);

/**
 * Arabic/Persian-aware normalisation so «یوسف الکردي» and «يوسف الكردي»
 * (and any keyboard-layout variant) are treated as the same name.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKC")
    // strip Arabic diacritics / harakat / tatweel
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    // unify alef variants
    .replace(/[إأآٱا]/g, "ا")
    // Arabic/Persian yaa → Persian yaa (ی)
    .replace(/[يى]/g, "ی")
    // Arabic/Persian kaf → Persian kaf (ک)
    .replace(/[ك]/g, "ک")
    // Arabic teh marbuta / heh variants
    .replace(/[ةه]/g, "ه")
    // waw variants
    .replace(/[ؤ]/g, "و")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const isMasterName = (name: string) => normalizeName(name) === normalizeName(MASTER_OWNER_NAME);

/**
 * Display form of a name: same clean-up as normalizeName but keeps capitalisation
 * and word order, so "يوسف الكردي" is stored as "یوسف الکردي".
 */
export const canonicalName = (name: string): string =>
  name
    .normalize("NFKC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ؤ/g, "و")
    .replace(/[ى]/g, "ی")
    .replace(/\s+/g, " ")
    .trim();

interface ProfileState {
  profile: Profile | null;
  saveProfile: (name: string, avatarId: string) => Profile;
  changeName: (name: string) => { ok: boolean; error?: "locked" | "short" };
  promoteToOwner: (id?: string, name?: string, avatarId?: string) => void;
  forget: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,

      saveProfile: (name, avatarId) => {
        const clean = canonicalName(name);
        const isMaster = isMasterName(clean);
        const profile: Profile = {
          // the master name can never create a second random account
          id: isMaster ? MASTER_OWNER_ID : `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          name: isMaster ? MASTER_OWNER_NAME : clean,
          avatarId: isMaster ? "crescent" : avatarId,
          role: "user",
          hasChangedName: false,
          createdAt: Date.now(),
        };
        set({ profile });
        return profile;
      },

      changeName: (name) => {
        const p = get().profile;
        if (!p) return { ok: false, error: "short" };
        const clean = canonicalName(name);
        // renaming INTO the master name is identity theft — always refused
        if (!isMasterName(p.name) && isMasterName(clean)) return { ok: false, error: "locked" };
        // the master rename is a spelling-drift no-op: canonical identity stays,
        // timestamps still flip so hasChangedName/lock behave identically
        if (isMasterName(p.name)) {
          set({ profile: { ...p, name: MASTER_OWNER_NAME, hasChangedName: true } });
          return { ok: true };
        }
        // strict: one single rename, ever
        if (p.hasChangedName) return { ok: false, error: "locked" };
        if (clean.length < 2) return { ok: false, error: "short" };
        set({
          profile: {
            ...p,
            name: clean,
            role: p.role === "owner" ? "owner" : "user",
            hasChangedName: true,
          },
        });
        return { ok: true };
      },

      promoteToOwner: (_id, _name, avatarId) => {
        const p = get().profile;
        if (!p) return;
        set({
          profile: {
            ...p,
            // the owner is ALWAYS the one immutable master account
            id: MASTER_OWNER_ID,
            name: MASTER_OWNER_NAME,
            avatarId: avatarId ?? p.avatarId,
            role: "owner",
          },
        });
      },

      forget: () => set({ profile: null }),
    }),
    {
      name: "tg-profile",
      version: 4,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as { profile?: Profile | null };
        const profile = p.profile;
        if (!profile || typeof profile.id !== "string" || typeof profile.name !== "string" || !profile.name.trim()) {
          return { profile: null };
        }
        return {
          profile: {
            ...profile,
            // the owner ALWAYS maps to the single immutable master account
            id: profile.role === "owner" || isMasterName(profile.name) ? MASTER_OWNER_ID : profile.id,
            name: profile.role === "owner" || isMasterName(profile.name) ? MASTER_OWNER_NAME : profile.name,
            avatarId: profile.avatarId ?? "olive",
            role: profile.role === "owner" ? "owner" : "user",
            hasChangedName: Boolean(profile.hasChangedName),
          },
        };
      },
    }
  )
);

/** latin-safe handle derived from the display name (used for @mentions) */
export const handleFromName = (name: string) =>
  name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 12)
    .toLowerCase() || "member";