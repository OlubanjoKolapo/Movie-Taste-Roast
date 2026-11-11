import { json, rateLimited } from "./_shared";

export const config = { runtime: "edge" };

/**
 * GET /api/letterboxd?user=handle
 * Reads the public Letterboxd RSS feed (recent diary entries). Each entry carries a TMDb id,
 * so titles map straight onto our catalogue or the TMDb proxy. Ratings come out of 5, we double them.
 */
const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
};
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#039;|&apos;/g, "’").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export default async function handler(req: Request): Promise<Response> {
  if (rateLimited(req, 20)) return json({ error: "Slow down" }, 429);
  const user = new URL(req.url).searchParams.get("user")?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9_]{2,40}$/.test(user)) return json({ error: "That doesn’t look like a Letterboxd username." }, 400);

  try {
    const res = await fetch(`https://letterboxd.com/${user}/rss/`, {
      headers: { "user-agent": "MovieRoast/1.0 (+https://movieroast.ai)", accept: "application/rss+xml" },
    });
    if (res.status === 404) return json({ error: "We couldn’t find that Letterboxd profile." }, 404);
    if (!res.ok) return json({ error: "Letterboxd didn’t answer. Try picking titles instead." }, 502);
    const xml = await res.text();
    const seen = new Set<string>();
    const items = xml
      .split("<item>")
      .slice(1)
      .map((chunk) => {
        const tmdbId = tag(chunk, "tmdb:movieId");
        const rating = Number(tag(chunk, "letterboxd:memberRating")) || undefined;
        const img = /<img src="([^"]+)"/.exec(chunk)?.[1] ?? "";
        return {
          key: tmdbId ? `m${tmdbId}` : "",
          title: decode(tag(chunk, "letterboxd:filmTitle")),
          year: Number(tag(chunk, "letterboxd:filmYear")) || 0,
          rating: rating ? Math.max(1, Math.round(rating * 2)) : undefined,
          poster: img,
        };
      })
      .filter((i) => i.key && i.title && !seen.has(i.key) && seen.add(i.key));
    if (!items.length) return json({ error: "That profile has no public diary entries yet." }, 404);
    return json({ items }, 200, { "cache-control": "public, s-maxage=900" });
  } catch {
    return json({ error: "Letterboxd didn’t answer. Try picking titles instead." }, 502);
  }
}
