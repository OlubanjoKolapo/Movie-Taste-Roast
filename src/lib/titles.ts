import { BY_KEY, CATALOGUE } from "../data/catalogue";
import type { Kind, Title } from "./types";

/* Titles that came from TMDb search or imports are cached locally so roasts reopen offline. */
const CACHE_KEY = "mr:titles";
const cache = new Map<string, Title>();
try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) (JSON.parse(raw) as Title[]).forEach((t) => cache.set(t.key, t));
} catch {
  /* storage blocked: fine, we just won't remember */
}

export function remember(titles: Title[]) {
  let changed = false;
  for (const t of titles) {
    if (!BY_KEY.has(t.key) && !cache.has(t.key)) {
      cache.set(t.key, t);
      changed = true;
    }
  }
  if (!changed) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...cache.values()].slice(-300)));
  } catch {
    /* ignore */
  }
}

export const getTitle = (key: string): Title | undefined => BY_KEY.get(key) ?? cache.get(key);

/** Resolve keys to titles, asking the TMDb proxy for anything we don't know yet. */
export async function resolveKeys(keys: string[]): Promise<Map<string, Title>> {
  const out = new Map<string, Title>();
  const missing: string[] = [];
  keys.forEach((k) => {
    const t = getTitle(k);
    if (t) out.set(k, t);
    else missing.push(k);
  });
  if (missing.length) {
    try {
      const res = await fetch(`/api/tmdb?keys=${missing.join(",")}`);
      if (res.ok) {
        const data = (await res.json()) as { results: Title[] };
        remember(data.results);
        data.results.forEach((t) => out.set(t.key, t));
      }
    } catch {
      /* offline or no API key: unknown titles are skipped */
    }
  }
  return out;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export type KindFilter = "all" | Kind;

export function searchLocal(q: string, kind: KindFilter = "all"): Title[] {
  const nq = norm(q);
  const pool = kind === "all" ? CATALOGUE : CATALOGUE.filter((t) => t.kind === kind);
  if (!nq) return pool;
  return pool
    .map((t) => {
      const nt = norm(t.title);
      const score = nt.startsWith(nq) ? 0 : nt.includes(` ${nq}`) ? 1 : nt.includes(nq) ? 2 : -1;
      return { t, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || b.t.pop - a.t.pop)
    .map((x) => x.t);
}

let remoteAvailable: boolean | null = null;

/** TMDb search through our proxy. Returns [] when the proxy has no key configured. */
export async function searchRemote(q: string, signal?: AbortSignal): Promise<Title[]> {
  if (remoteAvailable === false || norm(q).length < 2) return [];
  try {
    const res = await fetch(`/api/tmdb?q=${encodeURIComponent(q)}`, { signal });
    if (res.status === 501 || res.status === 404) {
      remoteAvailable = false;
      return [];
    }
    if (!res.ok) return [];
    remoteAvailable = true;
    const data = (await res.json()) as { results: Title[] };
    return data.results.map((t) => BY_KEY.get(t.key) ?? t);
  } catch {
    return [];
  }
}

export function matchByName(name: string, year?: number): Title | undefined {
  const n = norm(name);
  return CATALOGUE.find((t) => norm(t.title) === n && (!year || Math.abs(t.year - year) <= 1));
}
