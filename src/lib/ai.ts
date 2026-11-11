import { fingerprint, type RoastInput } from "./roast";
import type { Roast, RoastLine } from "./types";

/**
 * Asks /api/roast for model-written copy and merges it over the engine roast.
 * The engine keeps the numbers. Any failure or timeout returns the engine roast unchanged,
 * so a traffic spike or a provider outage never breaks the experience.
 */
const CACHE = "mr:ai:";

export function cachedAiRoast(input: RoastInput, base: Roast): Roast {
  try {
    const raw = localStorage.getItem(CACHE + fingerprint(input));
    if (raw) return merge(base, JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return base;
}

interface AiCopy {
  verdict: string;
  lines: RoastLine[];
  compliment: string;
}

function merge(base: Roast, copy: AiCopy): Roast {
  return { ...base, verdict: copy.verdict, lines: copy.lines, compliment: copy.compliment, source: "ai" };
}

export async function aiRoast(input: RoastInput, base: Roast, timeoutMs = 7000): Promise<Roast> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/roast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        heat: input.heat,
        picks: input.picks.map(({ title, rating }) => ({
          key: title.key,
          title: title.title,
          year: title.year,
          kind: title.kind,
          genres: title.genres,
          lang: title.lang,
          rating,
        })),
        engine: { score: base.score, type: base.type, typeLine: base.typeLine, criteria: base.criteria },
      }),
    });
    if (!res.ok) return base;
    const copy = (await res.json()) as AiCopy;
    if (!copy?.verdict || !Array.isArray(copy.lines) || copy.lines.length < 3 || !copy.compliment) return base;
    try {
      localStorage.setItem(CACHE + fingerprint(input), JSON.stringify(copy));
    } catch {
      /* ignore */
    }
    return merge(base, copy);
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}
