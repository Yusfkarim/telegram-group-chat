export const fmtTime = (at: number, lang: "ar" | "en" = "ar") =>
  new Date(at).toLocaleTimeString(lang === "ar" ? "ar" : "en-GB", { hour: "2-digit", minute: "2-digit" });

export const fmtDay = (at: number) => {
  const d = new Date(at);
  const today = new Date();
  const yest = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
};

export const fmtPreviewTime = (at: number) => {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(at);
  const yest = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

export const fmtDuration = (ms: number) => {
  if (ms <= 0) return "";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
  return `${Math.floor(h / 24)}d`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export const uid = (p: string) =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const token = () =>
  Array.from({ length: 14 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");

export const mentionsMe = (text: string, me: string) =>
  new RegExp(`(^|\\s)@${me}\\b`, "i").test(text);