import { Sparkles, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLockBody } from "../lib/hooks";
import { cx, iconBtn } from "./ui";

/** Bottom sheet on mobile, centred card on desktop. Escape closes, focus moves in and returns. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLockBody(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus], button, [href], input");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter((el) => !el.hasAttribute("disabled"));
        if (!items.length) return;
        const [a, b] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/85 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "relative max-h-[94dvh] w-full animate-rise overflow-y-auto overscroll-contain rounded-t-3xl border border-white/12 bg-sheet pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_40px_120px_rgba(0,0,0,0.85)] sm:rounded-3xl sm:pb-6",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        <div className="sticky top-0 z-10 flex h-14 items-center gap-3 bg-sheet/95 px-3 backdrop-blur-xl">
          <button type="button" onClick={onClose} aria-label="Close" className={cx(iconBtn, "size-9")}>
            <X className="size-5" />
          </button>
          <h2 className="text-[15px] font-bold text-white">{title}</h2>
        </div>
        <div className="px-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- toast ---------- */

const ToastCtx = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="flex animate-fade-in items-center gap-3 rounded-full border border-white/12 bg-zinc-900 py-1.5 pr-5 pl-1.5 text-[14px] font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <span className="flex size-7 items-center justify-center rounded-full bg-amber-400 text-zinc-950">
              <Sparkles className="size-3.5" />
            </span>
            {toast.message}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
