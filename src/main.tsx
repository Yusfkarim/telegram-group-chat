import { repairStorage, recallTheme, rememberTheme } from "./store/storagePrep";
import { startSync, defaultEndpoint } from "./lib/realtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useChat } from "./store/chatStore";
import { applyDocumentLang } from "./i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const { settings, theme } = useChat.getState();
const bootTheme = theme === "light" || theme === "dark" ? theme : recallTheme();
const safeSettings = settings ?? { lang: "ar" as const, hideLastSeen: false, wallpaperId: "tg-night" };
document.documentElement.classList.toggle("dark", bootTheme !== "light");
rememberTheme(bootTheme);
document.documentElement.style.setProperty("--chat-font-size", `${useChat.getState().settings.fontSize}px`);
if (useChat.getState().theme !== bootTheme) useChat.setState({ theme: bootTheme });
applyDocumentLang(safeSettings.lang);

useChat.subscribe((s, prev) => {
  if (s.theme !== prev.theme) {
    document.documentElement.classList.toggle("dark", s.theme !== "light");
    rememberTheme(s.theme);
  }
});

(window as unknown as { __BUILD__: string }).__BUILD__ = "v4.1-2026-10-18";
// handy handle for diagnostics and end-to-end checks
(window as unknown as { __tgChat: typeof useChat }).__tgChat = useChat;

// repair legacy/corrupted localStorage before any store hydrates
repairStorage();

// tell the boot watchdog the app is alive
(window as unknown as { __APP_BOOTED__?: () => void }).__APP_BOOTED__?.();

/* live sync starts once the local profile exists and never depends on a specific view */
type ProfileDefault = { id: string; name: string; role?: string };
const readProfile = (): ProfileDefault | null => {
  try {
    // zustand-persist wraps records as { state: {...}, version }
    const wrapper = JSON.parse(localStorage.getItem("tg-profile") ?? "null") as
      | { state?: { profile?: ProfileDefault | null } }
      | ProfileDefault
      | null;
    if (wrapper && typeof wrapper === "object" && "state" in (wrapper as Record<string, unknown>)) {
      return (wrapper as { state?: { profile?: ProfileDefault | null } }).state?.profile ?? null;
    }
    return (wrapper as ProfileDefault | null) ?? null;
  } catch {
    return null;
  }
};
let lastSyncKey = "";
const syncOnce = () => {
  const profile = readProfile();
  if (!profile?.id) return;
  if (lastSyncKey === profile.id) return;
  lastSyncKey = profile.id;
  startSync(defaultEndpoint());
};
syncOnce();
window.addEventListener("storage", syncOnce);

const mount = document.getElementById("root");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
