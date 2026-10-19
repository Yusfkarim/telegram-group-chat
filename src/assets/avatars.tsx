import type { ReactNode } from "react";

export interface AvatarPreset {
  id: string;
  ar: string;
  en: string;
  from: string;
  to: string;
  glyph: ReactNode;
}

export const AVATARS: AvatarPreset[] = [
  {
    id: "olive", ar: "غصن الزيتون", en: "Olive Branch", from: "#6b8f3c", to: "#3f5f24",
    glyph: <g stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M28 72c8-22 20-34 44-40" /><path d="M40 60c-6-2-10-6-11-12 7-1 13 2 16 7M52 50c-1-7 1-13 7-17 4 6 3 13-2 18M58 56c6-4 12-4 17 0-4 6-11 8-17 5" /></g>,
  },
  {
    id: "crescent", ar: "الهلال", en: "Crescent", from: "#2f4a6d", to: "#16263c",
    glyph: <path d="M62 26a26 26 0 1 0 0 48 24 24 0 1 1 0-48Z" fill="#f5e6c8" />,
  },
  {
    id: "lantern", ar: "الفانوس", en: "Lantern", from: "#b8862f", to: "#6b4a12",
    glyph: <g stroke="#fdf3d7" strokeWidth="2.6" fill="none"><path d="M50 20v8M34 30h32l6 12v28a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V42Z" /><path d="M42 52h16M50 46v18" /></g>,
  },
  {
    id: "mountains", ar: "الجبال", en: "Mountains", from: "#5b7c99", to: "#2c4358",
    glyph: <g fill="#e8f1f7"><path d="M22 74l20-30 12 18 8-12 18 24Z" /><circle cx="68" cy="32" r="6" fill="#f5e6c8" /></g>,
  },
  {
    id: "waves", ar: "الأمواج", en: "Waves", from: "#2f7d8c", to: "#134a55",
    glyph: <g stroke="#d7f2f6" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M22 48c6-6 12-6 18 0s12 6 18 0 12-6 18 0" /><path d="M22 62c6-6 12-6 18 0s12 6 18 0 12-6 18 0" /><path d="M22 34c6-6 12-6 18 0s12 6 18 0 12-6 18 0" /></g>,
  },
  {
    id: "cedar", ar: "الأرز", en: "Cedar", from: "#2f6b4f", to: "#173a2b",
    glyph: <g fill="#dff2e6"><path d="M50 18l12 22h-8l10 18H54l8 16H38l8-16H36l10-18h-8Z" /></g>,
  },
  {
    id: "sunrise", ar: "الشروق", en: "Sunrise", from: "#e2954f", to: "#8c4a2f",
    glyph: <g><circle cx="50" cy="58" r="12" fill="#ffe6b0" /><path d="M18 74h64" stroke="#ffe6b0" strokeWidth="3" /><path d="M26 40l6 6M50 28v8M74 40l-6 6M20 56h8M72 56h8" stroke="#ffe6b0" strokeWidth="3" strokeLinecap="round" /></g>,
  },
  {
    id: "night", ar: "السماء الليلية", en: "Night Sky", from: "#2a3358", to: "#12172c",
    glyph: <g fill="#fdf6d8"><circle cx="38" cy="36" r="3" /><circle cx="58" cy="28" r="2" /><circle cx="64" cy="48" r="2.4" /><circle cx="44" cy="56" r="1.8" /><path d="M50 42l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" /></g>,
  },
  {
    id: "palm", ar: "النخلة", en: "Palm", from: "#3f8f6b", to: "#1f5540",
    glyph: <g stroke="#dff5e8" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M50 78V46" /><path d="M50 46c-10-8-20-8-28-2M50 46c10-8 20-8 28-2M50 44c-4-10-12-14-20-14M50 44c4-10 12-14 20-14M50 44c0-10 4-16 10-20" /></g>,
  },
  {
    id: "rain", ar: "المطر", en: "Rain", from: "#4a6d8c", to: "#22394d",
    glyph: <g stroke="#cfe6f5" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M30 46a10 10 0 0 1 1-20 14 14 0 0 1 26-4 9 9 0 0 1 3 18" /><path d="M36 56l-4 10M50 56l-4 10M64 56l-4 10" /></g>,
  },
  {
    id: "desert", ar: "الصحراء", en: "Desert", from: "#d9a566", to: "#8d5f2c",
    glyph: <g><circle cx="62" cy="34" r="9" fill="#fff0cf" /><path d="M14 74c10-14 20-16 30-6s16 8 42-10v16Z" fill="#f6e0bd" /><path d="M14 78h72" stroke="#f6e0bd" strokeWidth="2" /></g>,
  },
  {
    id: "river", ar: "النهر", en: "River", from: "#3f7fa8", to: "#1b4763",
    glyph: <g stroke="#d7eefb" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M36 16c-8 12 8 18 0 30s-8 18 0 24M54 16c-8 12 8 18 0 30s-8 18 0 24M66 24c-6 10 6 14 0 24s-6 14 0 20" /></g>,
  },
  {
    id: "cloud", ar: "السحاب", en: "Clouds", from: "#6d86a8", to: "#33475f",
    glyph: <g fill="#eaf2fb"><path d="M34 60a12 12 0 0 1 2-24 16 16 0 0 1 30-2 11 11 0 0 1 2 26Z" /><path d="M40 70a9 9 0 0 1 2-18 12 12 0 0 1 22-1 8 8 0 0 1 2 19Z" opacity=".75" /></g>,
  },
  {
    id: "seed", ar: "البذرة", en: "Seed", from: "#6b9e4f", to: "#37602a",
    glyph: <g stroke="#eefae0" strokeWidth="3" fill="none" strokeLinecap="round"><path d="M50 78V50" /><path d="M50 56c-12-2-20-10-22-24 13-1 21 7 22 20M50 60c10-4 16-12 16-26-12 2-18 11-16 26" /></g>,
  },
  {
    id: "arch", ar: "القوس", en: "Arch", from: "#8a6a4f", to: "#4b382a",
    glyph: <g stroke="#f6e9d8" strokeWidth="3" fill="none"><path d="M28 78V48a22 22 0 0 1 44 0v30" /><path d="M40 78V50a10 10 0 0 1 20 0v28" /></g>,
  },
  {
    id: "moon", ar: "أطوار القمر", en: "Moon Phases", from: "#33456b", to: "#161f36",
    glyph: <g fill="#f3ead0"><circle cx="34" cy="50" r="9" /><circle cx="52" cy="50" r="9" opacity=".7" /><circle cx="68" cy="50" r="9" opacity=".35" /></g>,
  },
  {
    id: "drop", ar: "قطرة الماء", en: "Water Drop", from: "#3d90c0", to: "#175a83",
    glyph: <path d="M50 20c12 16 20 26 20 36a20 20 0 1 1-40 0c0-10 8-20 20-36Z" fill="#e4f4ff" />,
  },
  {
    id: "steps", ar: "الطريق", en: "The Path", from: "#7a6ea8", to: "#3d3663",
    glyph: <g fill="#eae6ff"><path d="M26 74l10-14h12l-10 14Z" /><path d="M40 56l10-14h12L52 56Z" /><path d="M54 38l10-14h10L64 38Z" /></g>,
  },
  {
    id: "star", ar: "النجمة الثمانية", en: "Eight-Point Star", from: "#c99a3c", to: "#7a5a15",
    glyph: <path d="M50 18l8 20 20-8-14 16 14 16-20-8-8 20-8-20-20 8 14-16-14-16 20 8Z" fill="#fff3d0" />,
  },
  {
    id: "honey", ar: "العسل", en: "Honey", from: "#d9a13a", to: "#8a5c14",
    glyph: <g fill="#fff0cf"><path d="M50 20l20 34a20 20 0 1 1-40 0Z" /><path d="M32 56h36l-6 12H38Z" opacity=".7" /></g>,
  },
  {
    id: "geometry", ar: "الزخرفة الهندسية", en: "Geometry", from: "#4b7f8c", to: "#23454f",
    glyph: <g stroke="#e2f4f7" strokeWidth="2.6" fill="none"><path d="M50 18l28 16v32L50 82 22 66V34Z" /><circle cx="50" cy="50" r="12" /><path d="M50 18v64M22 34l56 32M78 34L22 66" /></g>,
  },
  {
    id: "compass", ar: "البوصلة", en: "Compass", from: "#2f5d6d", to: "#123039",
    glyph: <g stroke="#e2f1f4" strokeWidth="2.6" fill="none"><circle cx="50" cy="50" r="26" /><path d="M50 30l6 20-6 20-6-20Z" fill="#f2fbfc" /><path d="M50 18v6M50 76v6M18 50h6M76 50h6" /></g>,
  },
];

export const avatarById = (id?: string) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

export { RECOVERY_AVATARS, recoveryById } from "./recovery";
