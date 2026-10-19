import { useEffect, type ReactNode } from "react";
import { X } from "./Icons";

export function Modal({
  title,
  onClose,
  children,
  size = "sm",
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = size === "lg" ? "max-w-2xl" : size === "md" ? "max-w-md" : "max-w-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`animate-pop flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-tg-panel shadow-2xl ${width}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-tg-muted transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-white/5 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-tg-accent" : "bg-white/20"
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function Row({
  title,
  desc,
  right,
  onClick,
  danger,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left ${
        onClick ? "transition-colors hover:bg-white/5" : ""
      } ${danger ? "text-red-400" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {desc && <p className="mt-0.5 text-xs text-tg-muted">{desc}</p>}
      </div>
      {right}
    </Tag>
  );
}