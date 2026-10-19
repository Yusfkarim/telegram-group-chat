import type { ReactNode } from "react";

export interface RecoveryPreset {
  id: string;
  ar: string;
  en: string;
  from: string;
  to: string;
  glyph: ReactNode;
}

/**
 * Curated gallery for "تعافي من الإدمان" — hope, strength, purity and new beginnings.
 * Every symbol is nature / light / resilience themed: no human figures, no faces,
 * and deliberately no cross or any other religious symbol.
 */
export const RECOVERY_AVATARS: RecoveryPreset[] = [
  {
    id: "sprout", ar: "نبتة الأمل والبداية الجديدة", en: "Sprout of Hope", from: "#6b9e4f", to: "#2f5a22",
    glyph: <g stroke="#f2ffe6" strokeWidth="3.4" fill="none" strokeLinecap="round"><path d="M50 80V48" /><path d="M50 54C36 52 28 43 26 26c14-1 24 9 24 24Z" /><path d="M50 58c12-5 18-14 18-28-13 3-19 13-18 28Z" /></g>,
  },
  {
    id: "shield", ar: "درع الصمود والإرادة", en: "Shield of Resolve", from: "#3f7fa8", to: "#1b4763",
    glyph: <g><path d="M50 18l24 9v20c0 18-11 29-24 35-13-6-24-17-24-35V27Z" fill="none" stroke="#eaf6ff" strokeWidth="3.4" strokeLinejoin="round" /><path d="M40 49l8 8 14-16" fill="none" stroke="#eaf6ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>,
  },
  {
    id: "crescent-calm", ar: "هلال السكينة", en: "Crescent of Serenity", from: "#2f4a6d", to: "#141f31",
    glyph: <g><path d="M62 24a28 28 0 1 0 0 52 26 26 0 1 1 0-52Z" fill="#f5e6c8" /><circle cx="66" cy="70" r="3" fill="#f5e6c8" opacity=".7" /></g>,
  },
  {
    id: "dawn", ar: "فجر الحرية والتعافي", en: "Dawn of Freedom", from: "#e2954f", to: "#8c4a2f",
    glyph: <g><circle cx="50" cy="56" r="13" fill="#ffe6b0" /><path d="M14 74h72" stroke="#ffe6b0" strokeWidth="3.4" strokeLinecap="round" /><path d="M24 38l7 7M50 24v9M76 38l-7 7M18 56h9M82 56h-9" stroke="#ffe6b0" strokeWidth="3.4" strokeLinecap="round" /></g>,
  },
  {
    id: "summit", ar: "قمة الإنجاز", en: "Summit of Achievement", from: "#5b7c99", to: "#26394a",
    glyph: <g fill="#eef6fb"><path d="M14 78l24-34 14 20 9-13 25 27Z" /><circle cx="70" cy="28" r="6" fill="#ffe6b0" /></g>,
  },
  {
    id: "compass-path", ar: "بوصلة الطريق الصحيح", en: "Compass of Guidance", from: "#2f5d6d", to: "#123039",
    glyph: <g stroke="#e6f6f7" strokeWidth="3" fill="none"><circle cx="50" cy="50" r="27" /><path d="M50 28l7 22-7 22-7-22Z" fill="#f2fbfc" stroke="none" /><path d="M50 16v6M50 78v6M16 50h6M78 50h6" strokeLinecap="round" /></g>,
  },
  {
    id: "olive-branch", ar: "غصن السلام والنقاء", en: "Branch of Purity", from: "#6b8f3c", to: "#37571f",
    glyph: <g stroke="#f4ffe6" strokeWidth="3.2" fill="none" strokeLinecap="round"><path d="M26 74c10-24 24-36 46-42" /><path d="M40 62c-7-2-11-6-12-13 8-1 14 2 17 8M52 52c-1-8 1-14 8-18 4 7 3 14-3 19M58 57c6-5 13-5 18 0-4 7-12 9-18 6" /></g>,
  },
  {
    id: "flame", ar: "شعلة العزيمة", en: "Flame of Will", from: "#d9773a", to: "#8f3d17",
    glyph: <g><path d="M50 14c14 16 22 26 22 38a22 22 0 1 1-44 0c0-10 6-18 13-25 2 7 5 11 9 13 3-9 3-17 0-26Z" fill="#ffe1a8" /></g>,
  },
  {
    id: "purity-drop", ar: "قطرة الصفاء", en: "Drop of Clarity", from: "#3d90c0", to: "#15537b",
    glyph: <path d="M50 18c13 17 21 27 21 38a21 21 0 1 1-42 0c0-11 8-21 21-38Z" fill="#e4f4ff" />,
  },
  {
    id: "light-book", ar: "نور المعرفة", en: "Light of Knowledge", from: "#8a6a4f", to: "#4b382a",
    glyph: <g stroke="#fdf1dd" strokeWidth="3.2" fill="none" strokeLinejoin="round"><path d="M22 30c10-6 19-5 28 2v46c-9-7-18-8-28-2Z" /><path d="M78 30c-10-6-19-5-28 2v46c9-7 18-8 28-2Z" /><path d="M50 32v46" /></g>,
  },
  {
    id: "trophy", ar: "كأس الانتصار على الإدمان", en: "Trophy of Victory", from: "#c99a3c", to: "#7a5a15",
    glyph: <g fill="#fff3d0"><path d="M34 22h32v16a16 16 0 0 1-32 0Z" /><path d="M34 26h-9a9 9 0 0 0 9 11M66 26h9a9 9 0 0 1-9 11" fill="none" stroke="#fff3d0" strokeWidth="3" /><path d="M46 54h8v14h-8ZM38 70h24l3 8H35Z" /></g>,
  },
  {
    id: "anchor", ar: "مرساة الثبات", en: "Anchor of Steadiness", from: "#3f6f8f", to: "#1c3a52",
    glyph: <g stroke="#e9f3fa" strokeWidth="3.4" fill="none" strokeLinecap="round"><circle cx="50" cy="24" r="6" /><path d="M50 30v42M38 38h24M26 58c0 14 11 22 24 22s24-8 24-22" /><path d="M26 58l-8 4M74 58l8 4" /></g>,
  },
  {
    id: "gem", ar: "جوهرة القيمة الذاتية", en: "Gem of Self-Worth", from: "#8e7cf4", to: "#453a8f",
    glyph: <g fill="#efeaff"><path d="M50 20l24 14-24 34-24-34Z" /><path d="M26 34h48M50 20v48" stroke="#453a8f" strokeWidth="2.2" /></g>,
  },
  {
    id: "oasis", ar: "واحة الطمأنينة", en: "Oasis of Calm", from: "#3f8f6b", to: "#1c5240",
    glyph: <g><path d="M50 16v58" stroke="#e6f7ed" strokeWidth="4" strokeLinecap="round" /><path d="M50 28c-11-8-22-8-31-1M50 28c11-8 22-8 31-1M50 22c-5-10-14-14-23-13M50 22c5-10 14-14 23-13" fill="none" stroke="#e6f7ed" strokeWidth="3" strokeLinecap="round" /><path d="M18 80h64" stroke="#cdeadb" strokeWidth="3.4" strokeLinecap="round" /></g>,
  },
  {
    id: "serene-wave", ar: "موج السكينة", en: "Waves of Serenity", from: "#2f7d8c", to: "#124851",
    glyph: <g stroke="#d7f2f6" strokeWidth="3.4" fill="none" strokeLinecap="round"><path d="M18 46c7-7 14-7 21 0s14 7 21 0 14-7 21 0" /><path d="M18 62c7-7 14-7 21 0s14 7 21 0 14-7 21 0" /><path d="M18 78c7-7 14-7 21 0s14 7 21 0 14-7 21 0" /></g>,
  },
  {
    id: "star-guide", ar: "نجم الطريق", en: "Guiding Star", from: "#b8862f", to: "#6b4a12",
    glyph: <g><path d="M50 14l9 22 22 9-22 9-9 22-9-22-22-9 22-9Z" fill="#fdf3d7" /><circle cx="50" cy="45" r="4" fill="#8a5c14" opacity=".45" /></g>,
  },
  {
    id: "lantern-hope", ar: "فانوس الأمل", en: "Lantern of Hope", from: "#b8862f", to: "#6b4a12",
    glyph: <g stroke="#fdf3d7" strokeWidth="3" fill="none" strokeLinejoin="round"><path d="M50 16v9M34 27h32l6 13v30a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V40Z" /><path d="M40 50h20M50 42v18" strokeLinecap="round" /></g>,
  },
  {
    id: "cloud-clear", ar: "سماء الصفاء", en: "Clear Sky", from: "#6d86a8", to: "#31465e",
    glyph: <g fill="#eaf2fb"><path d="M32 60a13 13 0 0 1 2-26 17 17 0 0 1 32-2 12 12 0 0 1 2 28Z" opacity=".9" /><circle cx="70" cy="32" r="9" fill="#ffe6b0" /></g>,
  },
  {
    id: "oak-strong", ar: "سنديبل الثبات", en: "Oak of Strength", from: "#2f6b4f", to: "#143a2a",
    glyph: <g fill="#dff2e6"><path d="M50 14l13 24h-9l11 19H55l9 17H36l9-17H35l11-19h-9Z" /><path d="M47 72h6v10h-6Z" /></g>,
  },
  {
    id: "rain-hope", ar: "مطر الأمل", en: "Rain of Hope", from: "#4a6d8c", to: "#20374b",
    glyph: <g stroke="#cfe6f5" strokeWidth="3.2" fill="none" strokeLinecap="round"><path d="M30 44a11 11 0 0 1 1-21 15 15 0 0 1 27-4 10 10 0 0 1 3 19" /><path d="M36 54l-4 11M50 54l-4 11M64 54l-4 11" /></g>,
  },
  {
    id: "mountain-path", ar: "درب التعافي", en: "Path of Recovery", from: "#7a6ea8", to: "#38315e",
    glyph: <g fill="#eae6ff"><path d="M22 78l12-16h13l-12 16Z" /><path d="M39 56l12-16h13L51 56Z" /><path d="M56 34l12-16h11L68 34Z" /></g>,
  },
  {
    id: "sunrise-hope", ar: "شروق جديد", en: "New Dawn", from: "#d9a566", to: "#8b5c2a",
    glyph: <g><circle cx="50" cy="52" r="14" fill="#fff0cf" /><path d="M16 72h68" stroke="#fff0cf" strokeWidth="3.4" strokeLinecap="round" /><path d="M22 34l8 8M50 20v10M78 34l-8 8" stroke="#fff0cf" strokeWidth="3.4" strokeLinecap="round" /></g>,
  },
  {
    id: "night-calm", ar: "ليل سكينة", en: "Night of Calm", from: "#2a3358", to: "#111630",
    glyph: <g fill="#fdf6d8"><circle cx="36" cy="34" r="3" /><circle cx="58" cy="26" r="2" /><circle cx="66" cy="48" r="2.4" /><path d="M50 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" /></g>,
  },
  {
    id: "lotus-pure", ar: "زهرة النقاء", en: "Lotus of Purity", from: "#c86fa0", to: "#7a2f5c",
    glyph: <g fill="#fdeaf5"><path d="M50 20c8 10 12 20 12 30a12 12 0 0 1-24 0c0-10 4-20 12-30Z" /><path d="M34 78c6-14 12-22 16-26 4 4 10 12 16 26Z" opacity=".85" /></g>,
  },
];

export const recoveryById = (id?: string) =>
  RECOVERY_AVATARS.find((a) => a.id === id) ?? RECOVERY_AVATARS[0];