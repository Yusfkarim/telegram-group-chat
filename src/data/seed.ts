import type { Chat, State, User } from "../types";

export const OFFICIAL_GROUP_NAME = "مجتمع لا أبرح حتى أبلغ";
export const OFFICIAL_ID = "c-official";
export const MASTER_OWNER = "یوسف الکردي";

/**
 * Every id that ever belonged to the removed demo world. Anything still sitting in a
 * browser's localStorage under these ids is fake data and gets purged on startup.
 */
export const FAKE_USER_IDS = ["u0", "u1", "u2", "u3", "u4", "u5", "u6"];
export const FAKE_CHAT_IDS = ["c1", "c2", "c3", "c4", "c5", "dm-u1", "dm-u2"];
/** message ids that shipped with the fake official-group conversation */
export const FAKE_MESSAGE_IDS = ["o1", "o2", "o3"];

const baseChatFields = {
  pinnedIds: [] as string[],
  slowMode: 0 as Chat["slowMode"],
  locked: false,
  invites: [] as Chat["invites"],
  joinRequests: [] as Chat["joinRequests"],
  approvedMode: false,
  banned: [] as Chat["banned"],
  restrictions: {} as Chat["restrictions"],
  membersCanInvite: false,
  typingUntil: undefined,
};

/** The one and only pre-existing group in the whole application. */
const official = (): Chat => ({
  ...baseChatFields,
  id: OFFICIAL_ID,
  kind: "group",
  name: OFFICIAL_GROUP_NAME,
  avatarId: "crescent",
  visibility: "public",
  official: true,
  handle: "la_abreh",
  description: "مجتمع تعافٍ مشترك — مرحباً بكل من يبحث عن طريق للتعافي، والاحترام أساس العضوية.",
  memberIds: [],
  roles: {},
  adminPerms: {},
  customTitles: {},
  founderName: MASTER_OWNER,
  membersCanSend: true,
  /** no pre-generated conversation: the group starts completely empty */
  messages: [],
  unread: 0,
  muted: false,
  lastReadAt: Date.now(),
  pinnedIds: [],
});

export const seed = (): State => {
  const users: Record<string, User> = {};
  return {
    theme: "dark",
    meId: "",
    users,
    chats: [official()],
    invitations: [],
    activeChatId: null,
    replyToId: null,
    editingId: null,
    blockedUserIds: [],
    settings: { lang: "ar", hideLastSeen: false, fontSize: 15 },
    typingUsersByChat: {},
    dirtyTick: 0,
    typingTick: 0,
};
};

/** placeholder kept for signature symmetry — the incoming-message simulator is gone */
export const incomingPool: string[] = [];