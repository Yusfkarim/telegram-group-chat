import { useEffect, useState } from "react";
import { EmojiPicker, QUICK_EMOJI } from "./EmojiPicker";
import { ChevronDown, Copy, Edit, Pin, Reply, Trash } from "./Icons";

export interface MenuAction {
  id: string;
  label: string;
  icon: typeof Copy;
  danger?: boolean;
  onClick: () => void;
}

export function MessageMenu({
  x,
  y,
  actions,
  onReact,
  onClose,
}: {
  x: number;
  y: number;
  actions: MenuAction[];
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const left = Math.max(8, Math.min(x, window.innerWidth - 288));
  const top = Math.max(8, Math.min(y, window.innerHeight - 340));

  return (
    <div
      className="fixed inset-0 z-[90]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="animate-pop absolute flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl bg-[#1d2530]/85 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
        style={{ left, top, width: 272 }}
      >
        {expanded ? (
          <div className="p-1.5">
            <EmojiPicker
              onPick={(e) => {
                onReact(e);
                onClose();
              }}
              onClose={() => setExpanded(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5 overflow-x-auto border-b border-white/5 px-2 py-1.5">
              {QUICK_EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(e);
                    onClose();
                  }}
                  className="rounded-full px-1.5 py-0.5 text-lg transition-transform hover:scale-125"
                >
                  {e}
                </button>
              ))}
              <button
                onClick={() => setExpanded(true)}
                className="shrink-0 rounded-full p-1 text-tg-muted hover:bg-white/10"
                aria-label="More emojis"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="py-1">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      a.onClick();
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10 ${
                      a.danger ? "text-red-400" : ""
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const menuIcons = { Reply, Copy, Edit, Trash, Pin };