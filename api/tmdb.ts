import { json, rateLimited, tmdbConfigured, tmdbFetch, toTitle } from "./_shared";

export const config = { runtime: "edge" };

/**
 * GET /api/tmdb?q=dune          search films and series
 * GET /api/tmdb?keys=m438631,t1396   look up specific titles (used by shared links)
 * Responses are cached at the edge for a day, which keeps TMDb traffic low during spikes.
 */
export default async function handler(req: Request): Promise<Response> {
  if (!tmdbConfigured()) return json({ error: "TMDb is not configured" }, 501);
  if (rateLimited(req, 90)) return json({ error: "Slow down" }, 429);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 80);
  const keys = url.searchParams.get("keys");
  const cache = { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" };

  try {
    if (q) {
      const res = await tmdbFetch("/search/multi", { query: q, include_adult: "false", language: "en-US", page: "1" });
      if (!res.ok) return json({ results: [] }, 502);
      const data = (await res.json()) as { results: Array<{ media_type: string; poster_path?: string | null }> };
      const results = data.results
        .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
        .slice(0, 18)
        .map((r) => toTitle(r as never, r.media_type as "movie" | "tv"));
      return json({ results }, 200, cache);
    }

    if (keys) {
      const list = keys.split(",").filter((k) => /^[mt]\d{1,9}$/.test(k)).slice(0, 12);
      const results = (
        await Promise.all(
          list.map(async (k) => {
            const type = k[0] === "m" ? "movie" : "tv";
            const res = await tmdbFetch(`/${type}/${k.slice(1)}`, { language: "en-US" });
            return res.ok ? toTitle(await res.json(), type) : null;
          }),
        )
      ).filter(Boolean);
      return json({ results }, 200, cache);
    }
  } catch {
    return json({ results: [] }, 502);
  }
  return json({ error: "Pass q or keys" }, 400);
}
