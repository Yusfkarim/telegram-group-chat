import type { ReactNode } from "react";
import type { User } from "../types";
import { RECOVERY_AVATARS, recoveryById } from "../assets/recovery";
import { avatarById } from "../assets/avatars";

/**
 * The green presence dot: a thin ring in the surrounding background colour, pinned to
 * the bottom-right corner in the container's own (physical) coordinates.
 */
export function OnlineDot({ size, tone = "bg" }: { size: number; tone?: "bg" | "panel" }) {
  const d = Math.max(8, Math.round(size * 0.26));
  return (
    <span
      className="online-indicator pointer-events-none absolute bottom-0 right-0 block rounded-full"
      style={{
        width: d,
        height: d,
        // 2px ring in the colour behind the avatar → crisp, Telegram-like separation
        boxShadow: `0 0 0 2px var(--tg-${tone})`,
        background: "var(--tg-green)",
        transform: "translate(8%, 8%)",
        zIndex: 2,
      }}
    />
  );
}

/** initials-based user avatar (name circle) */
export function Avatar({ user, size = 44, tone = "bg" }: { user: User; size?: number; tone?: "bg" | "panel" }) {
  const initials = [...(user.name.trim() || "?")][0] ?? "?";
  return (
    <div
      className="relative shrink-0 rounded-full font-semibold text-white select-none ring-1 ring-black/10"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.38 }}
      data-avatar="user"
    >
      <span className="flex h-full w-full items-center justify-center">{initials}</span>
      {user.online && <OnlineDot size={size} tone={tone} />}
    </div>
  );
}

/** gradient badge renderer for both group and recovery symbols */
export function GlyphAvatar({
  preset,
  size,
  online,
  tone = "bg",
  uid,
}: {
  preset: { id: string; from: string; to: string; glyph: ReactNode; en?: string };
  size: number;
  online?: boolean;
  tone?: "bg" | "panel";
  uid: string;
}) {
  return (
    <div className="relative shrink-0 rounded-full ring-1 ring-black/10" style={{ width: size, height: size }} data-avatar={uid}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={preset.en ?? preset.id}>
        <defs>
          <linearGradient id={`r-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={preset.from} />
            <stop offset="100%" stopColor={preset.to} />
          </linearGradient>
          <clipPath id={`rc-${uid}`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <rect width="100" height="100" fill={`url(#r-${uid})`} />
        <g clipPath={`url(#rc-${uid})`}>{preset.glyph}</g>
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2" />
      </svg>
      {online && <OnlineDot size={size} tone={tone} />}
    </div>
  );
}
/** group / recovery badge — resolved from the recovery gallery first, then the legacy set */
export function GroupAvatar({
  presetId,
  size = 48,
  online,
  tone = "bg",
}: {
  presetId?: string;
  size?: number;
  online?: boolean;
  tone?: "bg" | "panel";
}) {
  const preset = recoveryById(presetId) === RECOVERY_AVATARS[0] && presetId && !RECOVERY_AVATARS.some((a) => a.id === presetId)
    ? avatarById(presetId)
    : recoveryById(presetId);
  return <GlyphAvatar preset={preset} size={size} online={online} tone={tone} uid={preset.id} />;
}
