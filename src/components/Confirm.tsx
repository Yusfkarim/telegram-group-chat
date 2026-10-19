import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Shield } from "./Icons";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** optional extra content rendered between the message and the buttons */
  children?: ReactNode;
}

type Resolver = (v: boolean) => void;

let request: ((o: ConfirmOptions | null) => void) | null = null;
let resolver: Resolver | null = null;

/**
 * Promise-based Telegram-style confirmation. Never uses window.confirm.
 *   if (await confirm({ title: t("confirm"), message, danger: true })) doThing();
 */
export const confirm = (o: ConfirmOptions) =>
  new Promise<boolean>((res) => {
    resolver = res;
    request?.(o);
  });

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    request = (o) => setOpts(o);
    return () => {
      request = null;
    };
  }, []);

  useEffect(() => {
    if (opts) window.setTimeout(() => firstRef.current?.focus(), 30);
  }, [opts]);

  const done = useCallback((v: boolean) => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setOpts(null);
      resolver?.(v);
      resolver = null;
    }, 90);
  }, []);

  // Escape / backdrop both resolve as "cancel"
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") done(false);
      if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        const btn = document.querySelector<HTMLButtonElement>("[data-confirm-yes]");
        if (btn) {
          e.preventDefault();
          done(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, done]);

  return (
    <>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && done(false)}
          data-confirm-root
        >
          <div className="animate-pop w-full max-w-sm overflow-hidden rounded-2xl bg-tg-panel shadow-2xl" role="alertdialog" aria-modal="true">
            <div className="px-5 pt-6 pb-4 text-center">
              <span
                className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                  opts.danger ? "bg-red-500/15 text-red-400" : "bg-tg-accent/15 text-tg-accent"
                }`}
              >
                <Shield className="h-7 w-7" />
              </span>
              <h3 className="text-lg font-semibold">{opts.title}</h3>
              {opts.message && <p className="mt-2 text-sm leading-relaxed text-tg-muted">{opts.message}</p>}
              {opts.children && <div className="mt-3 text-start">{opts.children}</div>}
            </div>
            <div className="flex border-t border-white/5">
              <button
                ref={firstRef}
                onClick={() => done(false)}
                disabled={busy}
                className="flex-1 border-e border-white/5 py-3.5 text-[15px] font-semibold text-tg-muted transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                {opts.cancelLabel ?? "إلغاء"}
              </button>
              <button
                data-confirm-yes
                onClick={() => done(true)}
                disabled={busy}
                className={`flex-1 py-3.5 text-[15px] font-semibold transition-colors disabled:opacity-50 ${
                  opts.danger ? "text-red-500 hover:bg-red-500/10" : "text-tg-accent hover:bg-white/5"
                }`}
              >
                {opts.confirmLabel ?? "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}