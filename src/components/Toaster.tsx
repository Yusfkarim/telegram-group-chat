import { useEffect, useState } from "react";

interface Toast {
  id: number;
  text: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

export const toast = (text: string) => {
  const t = { id: nextId++, text };
  toasts = [...toasts, t];
  listeners.forEach((l) => l());
  window.setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l());
  }, 2600);
};

export function Toaster() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast pointer-events-auto rounded-2xl bg-[#21262d]/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur-md"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}