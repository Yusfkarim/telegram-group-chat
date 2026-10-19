import type { AdminPermissions, Chat, Role } from "../types";
import { FULL_PERMS, NO_PERMS, PERM_KEYS } from "../types";

export type PermKey = keyof AdminPermissions;

export const roleOf = (chat: Chat, userId: string): Role => chat.roles[userId] ?? "member";

export const isOwner = (chat: Chat, userId: string) => roleOf(chat, userId) === "owner";

export const isAdmin = (chat: Chat, userId: string) => roleOf(chat, userId) === "admin";

export const isStaff = (chat: Chat, userId: string) =>
  roleOf(chat, userId) === "owner" || roleOf(chat, userId) === "admin";

/**
 * A permission is granted ONLY when the owner's permission object says so.
 * Admins with a missing entry get nothing — never a silent default.
 */
export const adminPerm = (chat: Chat, userId: string, key: PermKey): boolean => {
  if (isOwner(chat, userId)) return true;
  if (!isAdmin(chat, userId)) return false;
  const perms = chat.adminPerms[userId];
  if (!perms) return false;
  return perms[key] === true;
};

/** true when the user is staff AND holds at least one granted permission */
export const hasAnyPerm = (chat: Chat, userId: string) =>
  isOwner(chat, userId) || PERM_KEYS.some((k) => adminPerm(chat, userId, k));

export const can = {
  deleteMessages: (c: Chat, u: string) => adminPerm(c, u, "canDeleteMessages"),
  pinMessages: (c: Chat, u: string) => adminPerm(c, u, "canPinMessages"),
  kickMembers: (c: Chat, u: string) => adminPerm(c, u, "canKickMembers"),
  muteMembers: (c: Chat, u: string) => adminPerm(c, u, "canMuteMembers"),
  approveJoinRequests: (c: Chat, u: string) => adminPerm(c, u, "canApproveJoinRequests"),
  changeGroupInfo: (c: Chat, u: string) => adminPerm(c, u, "canChangeGroupInfo"),
  inviteUsers: (c: Chat, u: string) => adminPerm(c, u, "canInviteUsers"),
  /** only the group owner may create/destroy admins or hand over ownership */
  promoteMembers: (c: Chat, u: string) => isOwner(c, u),
  manageChat: (c: Chat, u: string) => isOwner(c, u),
};

/**
 * Guards every moderation action: nobody — admin or owner — may kick, mute, ban,
 * demote or edit the group owner, and an admin can never touch another admin.
 */
export const canTarget = (chat: Chat, actorId: string, targetId: string): boolean => {
  if (actorId === targetId) return false;
  if (isOwner(chat, targetId)) return false;
  if (isAdmin(chat, targetId) && !isOwner(chat, actorId)) return false;
  return true;
};

export const canSendMessage = (chat: Chat, userId: string, now = Date.now()) => {
  if (!chat.memberIds.includes(userId)) return false;
  if (chat.kind === "dm") return true;
  if (isStaff(chat, userId)) return true;
  if (chat.locked) return false;
  if (!chat.membersCanSend) return false;
  const r = chat.restrictions[userId];
  if (r && r.until > now) return false;
  return true;
};

export type RestrictionReason = "notMember" | "onlyAdmins" | "restricted" | null;

export const restrictionReason = (chat: Chat, userId: string, now = Date.now()): RestrictionReason => {
  if (!chat.memberIds.includes(userId)) return "notMember";
  if (chat.kind === "dm") return null;
  const r = chat.restrictions[userId];
  if (r && r.until > now) return "restricted";
  if (chat.locked && !isStaff(chat, userId)) return "onlyAdmins";
  if (!chat.membersCanSend && !isStaff(chat, userId)) return "onlyAdmins";
  return null;
};

export const slowModeWait = (chat: Chat, userId: string, lastSentAt: number, now = Date.now()) => {
  if (isStaff(chat, userId) || !chat.slowMode) return 0;
  const ready = lastSentAt + chat.slowMode * 1000;
  return Math.max(0, ready - now);
};

export const isBanned = (chat: Chat, userId: string) =>
  chat.banned.some((b) => b.userId === userId && b.until > Date.now());

/** normalises a legacy (v5) permission object into the v6 granular shape */
export const migratePerms = (raw: unknown): AdminPermissions => {
  if (!raw || typeof raw !== "object") return { ...NO_PERMS };
  const p = raw as Partial<AdminPermissions> & Record<string, unknown>;
  const bool = (v: unknown) => v === true;
  return {
    canDeleteMessages: bool(p.canDeleteMessages),
    canPinMessages: bool(p.canPinMessages),
    canKickMembers: bool(p.canKickMembers) || bool(p.canRestrictMembers),
    canMuteMembers: bool(p.canMuteMembers) || bool(p.canRestrictMembers),
    canApproveJoinRequests: bool(p.canApproveJoinRequests) || bool(p.canInviteUsers),
    canChangeGroupInfo: bool(p.canChangeGroupInfo) || bool(p.canChangeInfo),
    canInviteUsers: bool(p.canInviteUsers),
  };
};

export const fullPerms = (): AdminPermissions => ({ ...FULL_PERMS });

export const permKeys = () => PERM_KEYS.slice();

export const displayTitle = (chat: Chat, userId: string) => {
  const t = chat.customTitles[userId];
  return t && t.trim() ? t : undefined;
};