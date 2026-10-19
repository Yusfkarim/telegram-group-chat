export interface Wallpaper {
  id: string;
  ar: string;
  en: string;
  dark: boolean;
  css: string;
}

const svg = (inner: string, color: string, size = 90, opacity = 0.055) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><g fill='${color}' fill-opacity='${opacity}'>${inner}</g></svg>`
  )}")`;

const D = "#ffffff";
const L = "#1f2a37";

const STAR = `<path d='M45 12l7 16 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2z'/>`;
const HEART = `<path d='M45 70C26 57 14 47 14 34a14 14 0 0126-7 14 14 0 0126 7c0 13-12 23-31 36z'/>`;
const PLUS = `<path d='M42 20h6v22h22v6H48v22h-6V48H20v-6h22z'/>`;
const DOT = `<circle cx='45' cy='45' r='5'/>`;
const RING = `<path d='M45 26a19 19 0 110 38 19 19 0 010-38zm0 8a11 11 0 100 22 11 11 0 000-22z'/>`;
const BUBBLE = `<path d='M22 24h52a8 8 0 018 8v22a8 8 0 01-8 8H48L32 74V62h-10a8 8 0 01-8-8V32a8 8 0 018-8z'/>`;
const WAVES = `<path d='M0 52c10-10 20-10 30 0s20 10 30 0 20-10 30 0v6c-10-10-20-10-30 0s-20 10-30 0-20-10-30 0z'/><path d='M0 70c10-10 20-10 30 0s20 10 30 0 20-10 30 0v6c-10-10-20-10-30 0s-20 10-30 0-20-10-30 0z'/>`;
const MOUNTAIN = `<path d='M6 68l18-26 10 15 6-9 14 20z'/>`;
const CLOUD = `<path d='M26 58a13 13 0 01-2-26 18 18 0 0134-2 12 12 0 01-2 28z'/>`;
const ARCH = `<path d='M24 66V44a21 21 0 0142 0v22h-8V44a13 13 0 00-26 0v22z'/>`;
const LEAF = `<path d='M60 22C36 24 24 36 24 52c0 8 4 14 10 16-2-14 4-26 18-32-10 8-16 18-16 30 16 2 26-12 24-44z'/>`;

/** ids that were only ever auto-defaults: they now follow the active theme */
const LEGACY_AUTO = new Set(["tg-night", "tg-teal"]);

/** the theme's own chat wallpaper — light gets a bright sage with a visible pattern */
export const themeDefaultWallpaper = (theme?: string): string => (theme === "light" ? "tg-sage" : "tg-dark");

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "tg-night", ar: "تيليجرام ليلي", en: "Telegram Night", dark: true,
    css: `radial-gradient(120% 90% at 15% 0%, #1d2b3d 0%, #17212b 55%, #0f1620 100%), ${svg(STAR, D, 110, 0.05)}`,
  },
  {
    id: "tg-doodle", ar: "رسومات", en: "Doodles", dark: true,
    css: `linear-gradient(165deg, #1a2430 0%, #141d27 100%), ${svg(
      `${HEART}${STAR}${PLUS}${BUBBLE}${DOT}${RING}`.replace(/(<[^>]+>)/g, (m, i) => m + `<g transform='translate(${(i % 2) * 45},${Math.floor(i / 2) * 45})'></g>`),
      D,
      100,
      0.05
    )}`,
  },
  {
    id: "tg-olive", ar: "زيتوني", en: "Olive", dark: true,
    css: `radial-gradient(110% 85% at 80% 0%, #2a3624 0%, #1b2318 60%, #101610 100%), ${svg(LEAF, D, 120, 0.05)}`,
  },
  {
    id: "tg-teal", ar: "تركوازي", en: "Deep Teal", dark: true,
    css: `radial-gradient(110% 85% at 20% 0%, #1c3c40 0%, #16262b 60%, #0e181c 100%), ${svg(WAVES, D, 120, 0.06)}`,
  },
  {
    id: "tg-dusk", ar: "غسق بنفسجي", en: "Violet Dusk", dark: true,
    css: `linear-gradient(160deg, #2b2740 0%, #1d2033 45%, #131722 100%), ${svg(DOT, D, 60, 0.07)}`,
  },
  {
    id: "tg-mountains", ar: "جبال", en: "Mountains", dark: true,
    css: `radial-gradient(120% 80% at 50% 100%, #2a4258 0%, #1a2733 60%, #121a22 100%), ${svg(MOUNTAIN, D, 130, 0.05)}`,
  },
  {
    id: "tg-dark", ar: "تيليجرام ليلي", en: "Telegram Night", dark: true,
    css: `radial-gradient(120% 90% at 15% 0%, #1d2b3d 0%, #17212b 55%, #0f1620 100%), ${svg(STAR, D, 110, 0.05)}`,
  },
  {
    id: "tg-sage", ar: "ميرمية فاتحة", en: "Light Sage", dark: false,
    css: `linear-gradient(165deg, #eaf3ec 0%, #dfeadf 55%, #d3e3d6 100%), ${svg(LEAF, L, 120, 0.08)}`,
  },
  {
    id: "paper", ar: "ورقي", en: "Paper", dark: false,
    css: `linear-gradient(180deg, #f4f6f8 0%, #e9edf0 100%), ${svg(DOT, L, 70, 0.05)}`,
  },
  {
    id: "tg-sand", ar: "رملي", en: "Sand", dark: false,
    css: `linear-gradient(160deg, #f3ece1 0%, #e6ded1 100%), ${svg(ARCH, L, 120, 0.035)}`,
  },
  {
    id: "tg-sky", ar: "سماوي فاتح", en: "Light Sky", dark: false,
    css: `linear-gradient(160deg, #eef4f8 0%, #dee8ef 100%), ${svg(CLOUD, L, 130, 0.04)}`,
  },
  {
    id: "tg-mint", ar: "نعناعي فاتح", en: "Light Mint", dark: false,
    css: `linear-gradient(160deg, #eef6f2 0%, #dfeae4 100%), ${svg(LEAF, L, 130, 0.035)}`,
  },
];

export const wallpaperById = (id?: string) => WALLPAPERS.find((w) => w.id === id);

/** a wallpaper actually offered in the picker (legacy auto-ids fall through) */
export const chosenWallpaperId = (id?: string): string | undefined =>
  id && !LEGACY_AUTO.has(id) && wallpaperById(id) ? id : undefined;

export const wallpaperCss = (id?: string, fallback = WALLPAPERS.find((w) => w.id === "tg-dark")?.css ?? WALLPAPERS[0].css) =>
  wallpaperById(id)?.css ?? fallback;

/** the subtle Telegram doodle pattern laid over a custom colour / gradient */
const PATTERN = (color: string, opacity: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'><g fill='${color}' fill-opacity='${opacity}'><circle cx='45' cy='45' r='4'/><path d='M42 18h6v18h18v6H48v18h-6V42H24v-6h18z'/><path d='M22 24h52a8 8 0 018 8v22a8 8 0 01-8 8H48L32 74V62h-10a8 8 0 01-8-8V32a8 8 0 018-8z'/></g></svg>`
  )}")`;

const isHex = (v?: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

const readableOn = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1f2a37" : "#ffffff";
};

/**
 * Background for a chat: a custom owner/admin colour or gradient (with the Telegram
 * pattern overlay) when one is set, otherwise the preset wallpaper.
 */
export const chatBackgroundCss = (chat: { customBg?: ChatBackgroundLike; wallpaperId?: string }, fallbackId?: string) => {
  const bg = chat.customBg;
  if (bg && isHex(bg.value)) {
    if (bg.kind === "gradient") {
      const v2 = isHex(bg.value2) ? bg.value2 : bg.value;
      return `linear-gradient(160deg, ${bg.value} 0%, ${v2} 100%), ${PATTERN(readableOn(bg.value), 0.07)}`;
    }
    return `linear-gradient(160deg, ${bg.value} 0%, ${shade(bg.value)} 100%), ${PATTERN(readableOn(bg.value), 0.07)}`;
  }
  return wallpaperCss(chosenWallpaperId(chat.wallpaperId) ?? chosenWallpaperId(fallbackId));
};

/** slightly darker sibling of a hex colour, for the second gradient stop */
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * 0.78));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * 0.78));
  const b = Math.max(0, Math.round((n & 255) * 0.78));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

type ChatBackgroundLike = { kind: "color" | "gradient"; value: string; value2?: string };