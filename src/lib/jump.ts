export const jumpToMessage = (id: string): boolean => {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return false;
  el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  el.classList.remove("msg-flash");
  void el.offsetWidth;
  el.classList.add("msg-flash");
  window.setTimeout(() => el.classList.remove("msg-flash"), 1500);
  return true;
};

export const scrollToBottom = (container: HTMLElement | null) => {
  container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
};

export const haptic = (ms = 12) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
};