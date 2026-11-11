import type { Heat } from "./types";

/**
 * Share slugs hold the whole input, so a roast link works with no backend:
 *   2-mlb1.9-t12s-m4c.a~Tolu
 * heat digit, then items: m/t prefix + base36 TMDb id + optional "." rating (1–9, "a" = 10),
 * then an optional "~name".
 */
const HEATS: Heat[] = ["mild", "medium", "savage"];

export interface SlugItem {
  key: string;
  rating?: number;
}
export interface SlugData {
  heat: Heat;
  items: SlugItem[];
  name?: string;
}

export function encodeSlug({ heat, items, name }: SlugData): string {
  const body = items
    .map(({ key, rating }) => {
      const id = Number(key.slice(1));
      const r = rating ? `.${rating === 10 ? "a" : rating}` : "";
      return `${key[0]}${id.toString(36)}${r}`;
    })
    .join("-");
  const who = name?.trim() ? `~${encodeURIComponent(name.trim().slice(0, 24))}` : "";
  return `${HEATS.indexOf(heat) + 1}-${body}${who}`;
}

export function decodeSlug(slug: string): SlugData | null {
  try {
    const [main, rawName] = decodeURIComponent(slug).split("~");
    const [h, ...parts] = main.split("-");
    const heat = HEATS[Number(h) - 1];
    if (!heat) return null;
    const items = parts
      .map((p) => {
        const m = /^([mt])([0-9a-z]+)(?:\.([1-9a]))?$/.exec(p);
        if (!m) return null;
        const item: SlugItem = { key: `${m[1]}${parseInt(m[2], 36)}` };
        if (m[3]) item.rating = m[3] === "a" ? 10 : Number(m[3]);
        return item;
      })
      .filter((x): x is SlugItem => !!x)
      .slice(0, 12);
    if (items.length < 3) return null;
    return { heat, items, name: rawName?.trim().slice(0, 24) || undefined };
  } catch {
    return null;
  }
}

/** Public site address used on share cards and links. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || "https://movieroast.ai";
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
/** Links we hand out: the configured site in production, the current origin while developing. */
export const shareBase = () => (import.meta.env.PROD ? SITE_URL : window.location.origin);
export const roastUrl = (slug: string) => `${shareBase()}/r/${slug}`;
