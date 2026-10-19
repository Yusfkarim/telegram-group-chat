import { useT } from "../i18n";

/** Telegram-style verified badge: owner (crown/star) and admin (shield). */
export function RoleBadge({
  role,
  customTitle,
  size = "sm",
}: {
  role: "owner" | "admin" | "member";
  customTitle?: string;
  size?: "sm" | "lg";
}) {
  const { t } = useT();
  if (role === "member" && !customTitle) return null;

  const isOwner = role === "owner";
  const label = customTitle || (isOwner ? t("badgeOwner") : t("badgeAdmin"));
  const w = size === "lg" ? "h-6 px-2 text-[11px]" : "h-4.5 px-1.5 text-[10px]";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold ${w} ${
        isOwner
          ? "bg-gradient-to-r from-amber-400/30 to-amber-500/20 text-amber-300 ring-1 ring-amber-400/40"
          : "bg-gradient-to-r from-sky-400/25 to-blue-500/20 text-sky-300 ring-1 ring-sky-400/35"
      }`}
      title={isOwner ? t("badgeOwner") : t("badgeAdmin")}
    >
      {isOwner ? <CrownGlyph className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} /> : <ShieldGlyph className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />}
      <span className="tracking-wide">{label}</span>
    </span>
  );
}

const CrownGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 8l3.6 3L12 4.5 17.4 11 21 8l-1.6 10.5H4.6L3 8z" />
  </svg>
);

const ShieldGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.5l8 2.8v6.1c0 4.7-3.2 8.7-8 10.1-4.8-1.4-8-5.4-8-10.1V5.3l8-2.8z" />
  </svg>
);

export function VerifiedMark({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#5795f2" />
      <path d="m8 12.4 2.6 2.6L16.4 9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}