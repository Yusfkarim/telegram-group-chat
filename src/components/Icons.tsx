type P = { className?: string; style?: React.CSSProperties };

const S = (d: string) => (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? "w-5 h-5"}>
    <path d={d} />
  </svg>
);

const F = (d: string) => (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={p.className ?? "w-5 h-5"}>
    <path d={d} />
  </svg>
);

export const Search = S("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35");
export const Send = F("M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91Z");
export const Paperclip = S("M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48");
export const MoreH = F("M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z");
export const Users = S("M17 12a5 5 0 1 0-10 0 5 5 0 0 0 10 0ZM3 21a7 7 0 0 1 18 0M23 8.5a3.5 3.5 0 0 1-3.5 3.5M16 3.5a3.5 3.5 0 0 1 4.9 4.9");
export const Moon = F("M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z");
export const Sun = S("M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z");
export const Check = S("M20 6 9 17l-5-5");
export const DoubleCheck = S("m6 13 4 4 10-10M6 17l-2-2m6 2 10-10");
export const Bell = S("M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0");
export const BellOff = S("M8.7 5.2A6 6 0 0 1 18 8c0 7 3 9 3 9h-3l-9.3-9.3M13.7 21a2 2 0 0 1-3.4 0M2 2l20 20M1 13s1.13-.66 2.39-3");
export const Pin = F("M16 3l5 5-3 1-3 8-4-4-6 6-1-1 6-6-4-4 8-3 1-3Z");
export const X = S("M18 6 6 18M6 6l12 12");
export const Trash = S("M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m5 5v6");
export const Edit = S("M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-8.5-.5L20.5 2.5l1 1L10.5 14.5l-3 .5.5-3Z");
export const Copy = S("M8 8h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm-3-3h11a1 1 0 0 1 1-1h-11A1 1 0 0 0 4 5");
export const Reply = S("M9 17 4 12l5-5M4 12h9a7 7 0 0 1 7 7v1");
export const Smile = S("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM8.5 8.5h.01M15.5 8.5h.01M8 14.5s1.5 2 4 2 4-2 4-2");
export const Shield = S("M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3ZM9 12l2 2 4-4");
export const ArrowLeft = S("M19 12H5m7-7-7 7 7 7");
export const ArrowDown = S("M12 5v14m7-7-7 7-7-7");
export const ArrowUp = S("M12 19V5m-7 7 7-7 7 7");
export const Plus = S("M12 5v14m-7-7h14");
export const ChevronDown = S("m6 9 6 6 6-6");
export const ChevronUp = S("m18 15-6-6-6 6");
export const ChevronRight = S("m9 6 6 6-6 6");
export const List = S("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01");
export const Lock = S("M7 11V7a5 5 0 0 1 10 0v4M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z");
export const Globe = S("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z");
export const At = S("M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1");
export const Clock = S("M12 7v5l3 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z");
export const Ban = S("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.6 5.6l12.8 12.8");
export const LogOut = S("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9");
export const Crown = F("M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8Z");
export const ZoomIn = S("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35M8 11h6m-3-3v6");
export const File = S("M14 3v5h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z");
export const Inbox = S("M4 13h4l2 3h4l2-3h4M4 13 6 5h12l2 8v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z");
export const Trash2 = Trash;
export const Kick = LogOut;export const VolumeOff = S("M11 5 6 9H2v6h4l5 4V5Zm5 5 5 5m0-5-5 5");
export const Volume = S("M11 5 6 9H2v6h4l5 4V5Zm5 3a5 5 0 0 1 0 8m2.5-10.5a9 9 0 0 1 0 13");
export const Palette = S("M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 5-5c0-3-4-5-9-5Zm-4.5 9.5h.01M8 7.5h.01M12 6.5h.01M16 8.5h.01");
export const Chat = S("M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z");
