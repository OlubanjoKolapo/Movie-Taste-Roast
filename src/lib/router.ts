import { useSyncExternalStore } from "react";

/* A tiny history router. Back buttons use real browser history, never a hard "home". */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  if (typeof history.state?.idx !== "number") history.replaceState({ idx: 0 }, "");
  window.addEventListener("popstate", notify);
}

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  const idx = (history.state?.idx ?? 0) + (opts.replace ? 0 : 1);
  history[opts.replace ? "replaceState" : "pushState"]({ idx }, "", to);
  notify();
  if (!opts.keepScroll && !to.includes("#")) window.scrollTo({ top: 0 });
}

export const canGoBack = () => (history.state?.idx ?? 0) > 0;

export function goBack(fallback = "/") {
  if (canGoBack()) history.back();
  else navigate(fallback, { replace: true });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useLocation = () =>
  useSyncExternalStore(subscribe, () => window.location.pathname + window.location.search + window.location.hash);

/** Use on <a> elements so internal links stay in the SPA but still open in new tabs. */
export function linkProps(to: string) {
  return {
    href: to,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    },
  };
}
