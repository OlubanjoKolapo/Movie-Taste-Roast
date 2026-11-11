/* Helpers shared by the edge functions. Files starting with "_" are not deployed as routes. */

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

/** Best-effort, per-instance rate limit. Enough to blunt a single noisy client. */
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimited(req: Request, limit: number, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.n++;
  return entry.n > limit;
}

/* ---------- TMDb → Title mapping ---------- */

const GENRES: Record<number, string[]> = {
  28: ["action"], 12: ["adventure"], 16: ["animation"], 35: ["comedy"], 80: ["crime"], 99: ["documentary"],
  18: ["drama"], 10751: ["family"], 14: ["fantasy"], 36: ["drama"], 27: ["horror"], 10402: ["music"],
  9648: ["mystery"], 10749: ["romance"], 878: ["scifi"], 53: ["thriller"], 10752: ["war"], 37: ["western"],
  10759: ["action", "adventure"], 10762: ["family"], 10765: ["scifi", "fantasy"], 10766: ["drama"], 10768: ["war"],
};

interface TmdbItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  genres?: { id: number }[];
  original_language?: string;
  vote_average?: number;
  vote_count?: number;
}

export function toTitle(item: TmdbItem, mediaType: "movie" | "tv") {
  const ids = item.genre_ids ?? item.genres?.map((g) => g.id) ?? [];
  const genres = [...new Set(ids.flatMap((id) => GENRES[id] ?? []))];
  const lang = item.original_language || "en";
  const anime = ids.includes(16) && lang === "ja";
  const votes = item.vote_count ?? 0;
  const pop = mediaType === "movie" ? (votes > 8000 ? 3 : votes > 1500 ? 2 : 1) : votes > 3000 ? 3 : votes > 600 ? 2 : 1;
  const date = item.release_date || item.first_air_date || "";
  return {
    key: `${mediaType === "movie" ? "m" : "t"}${item.id}`,
    kind: anime ? "anime" : mediaType === "movie" ? "film" : "series",
    title: item.title || item.name || "Untitled",
    year: Number(date.slice(0, 4)) || 0,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "",
    genres,
    lang,
    pop,
    acclaim: Math.round(Math.min(95, Math.max(30, (item.vote_average ?? 6.5) * 10 + 2))),
    tags: anime ? ["anime"] : [],
  };
}

export function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const key = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_READ_TOKEN;
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (key && !token) url.searchParams.set("api_key", key);
  return fetch(url, { headers: token ? { authorization: `Bearer ${token}`, accept: "application/json" } : {} });
}

export const tmdbConfigured = () => Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);
