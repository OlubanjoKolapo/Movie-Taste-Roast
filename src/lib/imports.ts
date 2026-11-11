import { BY_KEY } from "../data/catalogue";
import { matchByName, remember, resolveKeys, searchRemote } from "./titles";
import type { Pick, Title } from "./types";

/* Turning profiles and exports into picks. Every importer keeps the highest-rated titles. */

const MAX_PICKS = 8;

export type ProfileSource = { kind: "letterboxd" | "movietonight"; handle: string };

export function parseProfile(input: string): ProfileSource | null {
  const s = input.trim().replace(/^@/, "");
  const lb = /letterboxd\.com\/([a-z0-9_]+)/i.exec(s);
  if (lb) return { kind: "letterboxd", handle: lb[1].toLowerCase() };
  const mt = /movietonight\.ai\/u\/([a-z0-9_.-]+)/i.exec(s);
  if (mt) return { kind: "movietonight", handle: mt[1] };
  if (/^[a-z0-9_]{2,40}$/i.test(s)) return { kind: "letterboxd", handle: s.toLowerCase() };
  return null;
}

const topRated = (picks: Pick[]) =>
  [...picks].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, MAX_PICKS);

export async function importLetterboxd(handle: string): Promise<Pick[]> {
  const res = await fetch(`/api/letterboxd?user=${encodeURIComponent(handle)}`);
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    items?: { key: string; title: string; year: number; rating?: number; poster: string }[];
  };
  if (!res.ok || !data.items) throw new Error(data.error ?? "We couldn’t read that profile. Try picking titles instead.");
  const items = data.items.slice(0, 40);
  const known = await resolveKeys(items.filter((i) => !BY_KEY.has(i.key)).map((i) => i.key));
  const picks = items.map((i): Pick => {
    const title: Title = BY_KEY.get(i.key) ??
      known.get(i.key) ?? {
        key: i.key, kind: "film", title: i.title, year: i.year, poster: i.poster, genres: [], lang: "en", pop: 2, acclaim: 70, tags: [],
      };
    return { title, rating: i.rating };
  });
  remember(picks.map((p) => p.title));
  return topRated(picks);
}

export async function importMovieTonight(handle: string): Promise<Pick[]> {
  const endpoint = import.meta.env.VITE_MOVIETONIGHT_IMPORT_URL as string | undefined;
  if (!endpoint) throw new Error("MovieTonight import is coming soon. For now, paste a Letterboxd profile or pick titles.");
  const res = await fetch(`${endpoint.replace(/\/$/, "")}/${encodeURIComponent(handle)}`);
  if (!res.ok) throw new Error("We couldn’t find that MovieTonight profile.");
  const data = (await res.json()) as { items: { key: string; rating?: number }[] };
  const titles = await resolveKeys(data.items.map((i) => i.key));
  return topRated(data.items.filter((i) => titles.has(i.key)).map((i) => ({ title: titles.get(i.key)!, rating: i.rating })));
}

/* ---------- Letterboxd CSV (ratings.csv, diary.csv or watched.csv) ---------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export async function importCsv(file: File): Promise<Pick[]> {
  const rows = parseCsv(await file.text());
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const iName = header.indexOf("name");
  const iYear = header.indexOf("year");
  const iRating = header.indexOf("rating");
  if (iName < 0) throw new Error("That file doesn’t look like a Letterboxd export. Use ratings.csv.");
  const entries = rows
    .slice(1)
    .map((r) => ({ name: r[iName]?.trim(), year: Number(r[iYear]) || undefined, rating: iRating >= 0 ? Number(r[iRating]) || 0 : 0 }))
    .filter((e) => e.name)
    .sort((a, b) => b.rating - a.rating);

  const picks: Pick[] = [];
  const seen = new Set<string>();
  const push = (title: Title, stars: number) => {
    if (seen.has(title.key)) return;
    seen.add(title.key);
    picks.push({ title, rating: stars ? Math.max(1, Math.round(stars * 2)) : undefined });
  };
  for (const e of entries) {
    if (picks.length >= MAX_PICKS) break;
    const local = matchByName(e.name, e.year);
    if (local) push(local, e.rating);
  }
  // Top up from TMDb search when the catalogue didn't cover enough of their favourites.
  for (const e of entries.slice(0, 20)) {
    if (picks.length >= MAX_PICKS) break;
    if (matchByName(e.name, e.year)) continue;
    const hits = await searchRemote(e.name);
    const hit = hits.find((h) => !e.year || Math.abs(h.year - e.year) <= 1) ?? hits[0];
    if (hit) {
      remember([hit]);
      push(hit, e.rating);
    }
  }
  if (picks.length < 3) throw new Error("We matched too few titles from that file. Pick a few by hand instead.");
  return picks;
}
