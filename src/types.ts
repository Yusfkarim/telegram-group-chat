export type Role = "owner" | "admin" | "member";
export type Visibility = "public" | "private";
export type Lang = "ar" | "en";

/** Granular, owner-assigned admin capabilities. Everything is OFF unless the owner turns it ON. */
export interface AdminPermissions {
  /** حذف رسائل الآخرين */
  canDeleteMessages: boolean;
  /** تثبيت وإلغاء تثبيت الرسائل */
  canPinMessages: boolean;
  /** طرد وحظر الأعضاء */
  canKickMembers: boolean;
  /** كتم وتقييد الأعضاء */
  canMuteMembers: boolean;
  /** قبول ورفض طلبات الانضمام */
  canApproveJoinRequests: boolean;
  /** تغيير معلومات وخلفية المجموعة */
  canChangeGroupInfo: boolean;
  /** إنشاء روابط الدعوة */
  canInviteUsers: boolean;
}

export const PERM_KEYS: (keyof AdminPermissions)[] = [
  "canDeleteMessages",
  "canPinMessages",
  "canKickMembers",
  "canMuteMembers",
  "canApproveJoinRequests",
  "canChangeGroupInfo",
  "canInviteUsers",
];

export const FULL_PERMS: AdminPermissions = {
  canDeleteMessages: true,
  canPinMessages: true,
  canKickMembers: true,
  canMuteMembers: true,
  canApproveJoinRequests: true,
  canChangeGroupInfo: true,
  canInviteUsers: true,
};

export const NO_PERMS: AdminPermissions = {
  canDeleteMessages: false,
  canPinMessages: false,
  canKickMembers: false,
  canMuteMembers: false,
  canApproveJoinRequests: false,
  canChangeGroupInfo: false,
  canInviteUsers: false,
};

/** A group background is either a preset wallpaper or a custom colour / gradient. */
export interface ChatBackground {
  kind: "color" | "gradient";
  /** #rrggbb for kind="color", top colour for kind="gradient" */
  value: string;
  /** bottom colour for kind="gradient" */
  value2?: string;
  /** id of the preset this was derived from, so the pattern overlay stays consistent */
  pattern?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  color: string;
  avatarId: string;
  online: boolean;
  lastSeen: number;
  hideLastSeen: boolean;
  bio?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  at: number;
  edited?: boolean;
  replyToId?: string;
  reactions: Reaction[];
  system?: boolean;
  deletedForEveryone?: boolean;
}

export interface InviteLink {
  id: string;
  token: string;
  createdBy: string;
  createdAt: number;
  revoked?: boolean;
  uses: number;
}

export interface JoinRequest {
  id: string;
  userId: string;
  at: number;
  via: string;
}

export interface Restriction {
  until: number;
  reason?: string;
}

export interface BannedUser {
  userId: string;
  until: number;
  reason?: string;
  by: string;
  at: number;
}

export interface Invitation {
  id: string;
  chatId: string;
  fromId: string;
  at: number;
  status: "pending" | "accepted" | "declined";
}

export interface Chat {
  id: string;
  kind: "group" | "dm";
  name: string;
  avatarId: string;
  visibility: Visibility;
  official?: boolean;
  /** sole founder/owner of the official community group */
  founderName?: string;
  handle?: string;
  description: string;
  memberIds: string[];
  roles: Record<string, Role>;
  adminPerms: Record<string, AdminPermissions>;
  customTitles: Record<string, string>;
  membersCanSend: boolean;
  membersCanInvite: boolean;
  pinnedIds: string[];
  messages: Message[];
  /** ids of messages that @-mention me or reply to me and are still unseen */
  mentionIds?: string[];
  unread: number;
  muted: boolean;
  /** ephemeral: userId → timestamp until which they are typing */
  typingUsers?: Record<string, number>;
  /** monotonic mutation timestamp — the live-sync merge key */
  rev?: number;
  /** tombstone: chat deleted/removed locally — the live engine prunes it server-side */
  deletedAt?: number;
  slowMode: 0 | 10 | 30 | 60 | 300;
  locked: boolean;
  invites: InviteLink[];
  joinRequests: JoinRequest[];
  approvedMode: boolean;
  banned: BannedUser[];
  restrictions: Record<string, Restriction>;
  lastReadAt: number;
  wallpaperId?: string;
  /** owner/admin-picked custom background (overrides wallpaperId) */
  customBg?: ChatBackground;
  dmUserId?: string;
}

export interface Settings {
  lang: Lang;
  hideLastSeen: boolean;
  wallpaperId?: string;
  /** global chat font size in px (13–22) */
  fontSize: number;
}

export const MIN_FONT = 13;
export const MAX_FONT = 22;
export const DEFAULT_FONT = 15;

export interface State {
  theme: "dark" | "light";
  meId: string;
  users: Record<string, User>;
  chats: Chat[];
  invitations: Invitation[];
  activeChatId: string | null;
  replyToId: string | null;
  editingId: string | null;
  /** user ids I have blocked — their chats are read-only until I unblock */
  blockedUserIds: string[];
  settings: Settings;
  /** ephemeral — never persisted, carried only through the live-server snapshot */
  typingUsersByChat: Record<string, Record<string, number>>;
  /** ephemeral — bumped by every local mutating action; the realtime engine watches it */
  dirtyTick: number;
  /** ephemeral — bumped on typing state changes (flushed faster than messages) */
  typingTick: number;
}