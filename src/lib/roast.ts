/**
 * Deterministic roast engine. Same picks, ratings and heat always give the same roast.
 *
 * The engine always owns the numbers (score, criteria, type) so they stay explainable and
 * identical on shared links. A language model can replace the copy (verdict, lines,
 * compliment) later: see `api/roast.ts` and `src/lib/ai.ts`, which merge model output on top.
 */
import type { Criterion, Genre, Heat, Pick, Roast, RoastLine, Title } from "./types";

/* ---------- seeded randomness ---------- */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo = 0, hi = 100) => Math.round(Math.min(hi, Math.max(lo, v)));
const byHeat = <T,>(heat: Heat, [mild, medium, savage]: [T, T, T]) =>
  heat === "mild" ? mild : heat === "savage" ? savage : medium;

/* ---------- features ---------- */

const GENRE_WORD: Record<Genre, string> = {
  action: "action", adventure: "adventure", animation: "animation", comedy: "comedy", crime: "crime",
  documentary: "documentary", drama: "drama", family: "family", fantasy: "fantasy", horror: "horror",
  mystery: "mystery", romance: "romance", scifi: "sci-fi", thriller: "thriller", war: "war",
  western: "western", music: "music",
};

function features(picks: Pick[]) {
  const titles = picks.map((p) => p.title);
  const n = titles.length;
  const tag = (t: string) => titles.filter((x) => x.tags.includes(t));
  const genreCount = new Map<Genre, number>();
  titles.forEach((t) => t.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["drama", 0];
  const years = titles.map((t) => t.year).filter(Boolean);
  const isAnime = (t: Title) => t.kind === "anime" || t.tags.includes("anime");
  const rated = picks.filter((p) => typeof p.rating === "number") as Required<Pick>[];
  return {
    titles,
    n,
    tag,
    genreCount,
    topGenre: topGenre[0],
    topGenreCount: topGenre[1],
    kinds: new Set(titles.map((t) => t.kind)).size,
    decades: new Set(years.map((y) => Math.floor(y / 10))).size,
    langs: new Set(titles.map((t) => t.lang)).size,
    avgYear: years.length ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : 2010,
    minYear: years.length ? Math.min(...years) : 2010,
    anime: titles.filter(isAnime),
    series: titles.filter((t) => t.kind === "series"),
    world: titles.filter((t) => t.lang !== "en" && !isAnime(t)),
    nonEnglish: titles.filter((t) => t.lang !== "en"),
    genre: (g: Genre) => titles.filter((t) => t.genres.includes(g)),
    avgAcclaim: titles.reduce((a, t) => a + t.acclaim, 0) / Math.max(1, n),
    avgPop: titles.reduce((a, t) => a + t.pop, 0) / Math.max(1, n),
    rated,
  };
}
type F = ReturnType<typeof features>;

/* ---------- criteria ---------- */

function criteria(f: F, rand: () => number): Criterion[] {
  const gEff = f.genreCount.size * Math.sqrt(5 / Math.max(5, f.n));
  const share = f.topGenreCount / Math.max(1, f.n);
  const range = clamp(18 + gEff * 5 + (f.kinds - 1) * 9 + (f.decades - 1) * 7 + (f.langs - 1) * 8 - (share - 0.5) * 40, 5, 98);
  const popScore = f.titles.reduce((a, t) => a + ({ 1: 88, 2: 62, 3: 30 } as const)[t.pop], 0) / Math.max(1, f.n);
  const old = f.titles.filter((t) => t.year < 1980).length;
  const boldness = clamp(popScore + Math.min(18, f.nonEnglish.length * 6) + Math.min(15, old * 5) - f.tag("franchise").length * 4, 5, 98);
  const crowd = clamp(((f.avgAcclaim - 60) / 32) * 90 + 8, 5, 98);

  let conviction = 42;
  let convictionReason = "No ratings given. Commitment issues, noted.";
  if (f.rated.length >= 3) {
    const rs = f.rated.map((p) => p.rating);
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((a, r) => a + (r - mean) ** 2, 0) / rs.length);
    const spread = Math.max(...rs) - Math.min(...rs);
    const allHigh = rs.every((r) => r >= 9);
    conviction = clamp(30 + sd * 28 + (spread >= 4 ? 8 : 0) - (allHigh ? 15 : 0) + rand() * 6, 5, 98);
    convictionReason = allHigh
      ? "Everything is a 9 or a 10. That’s applause, not judgement."
      : conviction >= 70
        ? "You use the whole scale. Decisive."
        : conviction >= 45
          ? "Some range in your ratings. Some."
          : "Everything gets roughly the same score. Commit.";
  }

  const topWord = GENRE_WORD[f.topGenre];
  const niche = f.titles.filter((t) => t.pop === 1).length;
  const boldWhy =
    old >= 2 && old >= niche
      ? `${Num(old)} picks from before 1980. Brave, or just old.`
      : f.nonEnglish.length >= 2 && f.nonEnglish.length >= niche
        ? `${Num(f.nonEnglish.length)} picks not in English. Brave.`
        : `${Num(Math.max(1, niche))} pick${niche === 1 ? "" : "s"} most people haven’t seen. Brave.`;
  return [
    {
      id: "range",
      label: "Range",
      score: range,
      reason:
        range >= 70
          ? `${f.genreCount.size} genres across ${f.decades} decade${f.decades === 1 ? "" : "s"}. You get around.`
          : range >= 45
            ? `Some variety. Mostly ${topWord}, though.`
            : `${f.topGenreCount === f.n ? `All ${num(f.n)}` : `${Num(f.topGenreCount)} of ${num(f.n)}`} picks are ${topWord}. That’s a lane, not a range.`,
    },
    {
      id: "boldness",
      label: "Boldness",
      score: boldness,
      reason:
        boldness >= 65
          ? boldWhy
          : boldness >= 42
            ? "A few left turns. Mostly the main road."
            : "Everyone has seen everything here. Everyone.",
    },
    {
      id: "crowd",
      label: "Crowd taste",
      score: crowd,
      reason:
        crowd >= 72
          ? "Critics and crowds agree with you. Annoying, but true."
          : crowd >= 50
            ? "Mostly well liked. One or two raised eyebrows."
            : "Crowds liked these more than critics did. You are the crowd.",
    },
    { id: "conviction", label: "Conviction", score: conviction, reason: convictionReason },
  ];
}

/* ---------- taste type ---------- */

interface TasteType {
  id: string;
  label: string;
  line: string;
  verdict: [string, string, string];
  weight: (f: F) => number;
}

const n = (f: F, tag: string) => f.tag(tag).length;

const TYPES: TasteType[] = [
  { id: "nolan", label: "The Timeline Explainer", line: "Loud, long, slightly confusing. Then a twenty-minute explanation.",
    verdict: ["You like a film with homework.", "Your taste needs a timeline diagram.", "Your taste is one long Nolan interview."],
    weight: (f) => (n(f, "nolan") >= 2 ? n(f, "nolan") * 3 : 0) },
  { id: "mcu", label: "Marvel Loyalist in Denial", line: "You say you’re tired of superhero films. Your list disagrees.",
    verdict: ["Loyal. Very, very loyal.", "Your taste has a post-credits scene.", "Your taste is a Disney+ subscription."],
    weight: (f) => (n(f, "mcu") >= 2 ? n(f, "mcu") * 3 : 0) },
  { id: "tarantino", label: "Tarantino Apologist", line: "You like your dialogue long and your timelines out of order.",
    verdict: ["You like dialogue. A lot of it.", "Your taste is out of chronological order.", "Your taste talks for twenty minutes before anything happens."],
    weight: (f) => (n(f, "tarantino") >= 2 ? n(f, "tarantino") * 3 : 0) },
  { id: "ghibli", label: "Cottagecore Daydreamer", line: "You want a quiet life in a field. You’d last a week.",
    verdict: ["Soft taste. Lovely taste.", "Your taste lives in a cottage.", "Your taste is a screensaver with feelings."],
    weight: (f) => (n(f, "ghibli") >= 2 ? n(f, "ghibli") * 2.8 : 0) },
  { id: "shonen", label: "Main Character Energy", line: "Power-ups, friendship speeches and a training arc. Every time.",
    verdict: ["Big feelings, bigger fights.", "Your taste is still in its training arc.", "Your taste screams for three episodes before doing anything."],
    weight: (f) => (n(f, "shonen") >= 2 ? n(f, "shonen") * 2.6 : 0) },
  { id: "anime", label: "Subtitles Purist", line: "Sub over dub. Always. You will bring it up.",
    verdict: ["Sub over dub. Respect.", "Your taste needs subtitles.", "Your taste is an anime opening on loop."],
    weight: (f) => (f.anime.length >= 3 ? f.anime.length * 2.4 : 0) },
  { id: "comfort", label: "Comfort Loop Champion", line: "Why risk a new show when you know every line of the old one?",
    verdict: ["Your taste is a warm blanket.", "Your taste is on its eleventh rewatch.", "Your taste stopped trying in 2013."],
    weight: (f) => (n(f, "sitcom") + n(f, "comfort") >= 3 || n(f, "sitcom") >= 2 ? n(f, "sitcom") * 3 + n(f, "comfort") : 0) },
  { id: "literally", label: "Literally Me Collector", line: "Lonely men in coats, staring at cities. You relate.",
    verdict: ["You like a brooding lead.", "Your taste is a man staring out of a window.", "Your taste is a sigma edit with no music."],
    weight: (f) => (n(f, "literally") >= 2 ? n(f, "literally") * 2.7 : 0) },
  { id: "pixar", label: "Pixar Emotional Support Viewer", line: "You cry at animated lamps and call it craft.",
    verdict: ["Your taste has a big heart.", "Your taste cries at lamps.", "Your taste is a children’s menu with feelings."],
    weight: (f) => (n(f, "pixar") + n(f, "disney") >= 2 ? (n(f, "pixar") + n(f, "disney")) * 2.5 : 0) },
  { id: "indie", label: "Letterboxd Lead Critic", line: "You choose films by the distributor logo and the font.",
    verdict: ["Discerning. Very discerning.", "Your taste has a tote bag.", "Your taste is a festival lanyard you never take off."],
    weight: (f) => { const c = n(f, "a24") + n(f, "indie") + n(f, "arthouse"); return c >= 3 ? c * 2.2 : 0; } },
  { id: "world", label: "Subtitle Snob (Affectionate)", line: "You’ve said “the one-inch barrier” in casual conversation.",
    verdict: ["Your taste has a passport.", "Your taste reads subtitles at parties.", "Your taste won’t stop saying “the original is better”."],
    weight: (f) => (f.world.length >= 2 ? f.world.length * 2.4 : 0) },
  { id: "gangster", label: "Wannabe Made Man", line: "You quote gangster films to people who have never threatened anyone.",
    verdict: ["You like a slow-burn crime story.", "Your taste wears a pinstripe suit.", "Your taste quotes Scarface at brunch."],
    weight: (f) => { const c = new Set([...f.tag("gangster"), ...f.tag("scorsese")]).size; return c >= 2 ? c * 2.5 : 0; } },
  { id: "romance", label: "Hopeless Romantic, Hopeful Viewer", line: "Your standards were set by people who don’t exist.",
    verdict: ["Your taste believes in love.", "Your taste has unrealistic standards.", "Your taste is waiting in the rain for someone fictional."],
    weight: (f) => (n(f, "romance") >= 2 ? n(f, "romance") * 2.3 : 0) },
  { id: "horror", label: "Jump Scare Sommelier", line: "You relax by being frightened. Interesting choice.",
    verdict: ["Your taste likes a fright.", "Your taste sleeps with the light on.", "Your taste screams at the screen and calls it relaxing."],
    weight: (f) => (f.genre("horror").length >= 2 ? f.genre("horror").length * 2.3 : 0) },
  { id: "sad", label: "Professional Crier", line: "You pick films the way other people pick sad playlists.",
    verdict: ["Your taste feels things deeply.", "Your taste needs a hug.", "Your taste is a crying playlist with a runtime."],
    weight: (f) => (n(f, "sad") >= 3 ? n(f, "sad") * 2 : 0) },
  { id: "old", label: "Born in the Wrong Decade", line: "Your taste has a pension and strong opinions about modern cinema.",
    verdict: ["Classic taste. Very classic.", "Your taste peaked before you were born.", "Your taste still calls it “the pictures”."],
    weight: (f) => (f.avgYear < 1993 ? 9 + (1993 - f.avgYear) / 4 : 0) },
  { id: "trend", label: "Trending Tab Tenant", line: "If it isn’t in the top ten this week, it doesn’t exist.",
    verdict: ["You’re very up to date.", "Your taste is this week’s top ten.", "Your taste has the attention span of a trailer."],
    weight: (f) => (f.minYear >= 2019 ? 8 : 0) },
  { id: "franchise", label: "Franchise Season Ticket Holder", line: "You don’t watch films. You keep up with them.",
    verdict: ["You like a reliable universe.", "Your taste comes with sequels.", "Your taste is a release schedule."],
    weight: (f) => (n(f, "franchise") >= 3 ? n(f, "franchise") * 2 : 0) },
  { id: "canon", label: "The Prestige Tourist", line: "You’ve seen the greats. The famous greats. Only the famous greats.",
    verdict: ["You’ve done the reading.", "Your taste is a top 250 list.", "Your taste copied the homework. Neatly."],
    weight: (f) => (n(f, "canon") >= 3 && f.avgAcclaim >= 84 ? n(f, "canon") * 2.2 : 0) },
];

const ALGO: TasteType = { id: "algo", label: "The Algorithm’s Favourite Child", line: "Every pick is the one the homepage showed you first.",
  verdict: ["Easy to please. That’s nice.", "The algorithm picked these, didn’t it?", "Your taste is the homepage."], weight: () => 1 };
const CHAOS: TasteType = { id: "chaos", label: "Chaotic Neutral Viewer", line: "No pattern. No plan. Somehow it works.",
  verdict: ["Wide range. Bold range.", "Your taste is a group project.", "Your taste was picked by a shuffle button."], weight: () => 1 };

function tasteType(f: F): TasteType {
  const best = TYPES.map((t) => ({ t, w: t.weight(f) })).sort((a, b) => b.w - a.w)[0];
  if (best && best.w > 0) return best.t;
  return f.avgPop >= 2.6 ? ALGO : CHAOS;
}

/* ---------- roast lines ---------- */

const list = (ts: Title[]) => ts.map((t) => t.title);
const and = (names: string[]) =>
  names.length <= 1 ? names[0] ?? "" : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
const num = (k: number) => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][k] ?? String(k);
const an = (r: number) => (r === 8 || r === 11 || r === 18 ? `an ${r}/10` : `a ${r}/10`);
const Num = (k: number) => num(k).charAt(0).toUpperCase() + num(k).slice(1);

interface Candidate extends RoastLine {
  weight: number;
}

/** Lines about patterns across picks. Each one names titles or a countable pattern. */
function patternLines(f: F, heat: Heat): Candidate[] {
  const out: Candidate[] = [];
  const add = (weight: number, ts: Title[], text: [string, string, string]) =>
    out.push({ weight, keys: ts.map((t) => t.key), text: byHeat(heat, text) });

  const nolan = f.tag("nolan");
  if (nolan.length >= 2)
    add(nolan.length * 3, nolan, [
      `${Num(nolan.length)} Nolan films. You like a film you need to explain afterwards.`,
      `${Num(nolan.length)} Nolan films. You’ve drawn a timeline on a napkin at least once.`,
      `${Num(nolan.length)} Nolan films${f.nonEnglish.length ? "" : " and zero subtitles"}. That’s not taste. That’s a fan club.`,
    ]);
  const mcu = f.tag("mcu");
  if (mcu.length >= 2)
    add(mcu.length * 3, mcu, [
      `${Num(mcu.length)} Marvel films. You like knowing what happens next.`,
      `${Num(mcu.length)} Marvel films in one list. You don’t have taste. You have a subscription.`,
      `${Num(mcu.length)} Marvel films. Disney thanks you for your continued support.`,
    ]);
  const tara = f.tag("tarantino");
  if (tara.length >= 2)
    add(tara.length * 2.8, tara, [
      `${and(list(tara))}. You like a long conversation before the violence.`,
      `${Num(tara.length)} Tarantino films. You’ve said “but the dialogue though” this month.`,
      `${Num(tara.length)} Tarantino films. You’ve explained the chapters to someone on a first date.`,
    ]);
  const ghibli = f.tag("ghibli");
  if (ghibli.length >= 2)
    add(ghibli.length * 2.6, ghibli, [
      `${Num(ghibli.length)} Ghibli films. Your taste smells like fresh bread.`,
      `${Num(ghibli.length)} Ghibli films. You want a cottage you’d leave within a week.`,
      `${Num(ghibli.length)} Ghibli films. You’ve bought a linen shirt because of a cartoon.`,
    ]);
  const shonen = f.tag("shonen");
  if (shonen.length >= 2)
    add(shonen.length * 2.5, shonen.slice(0, 2), [
      `${and(list(shonen.slice(0, 2)))}. You like a good training arc.`,
      `${and(list(shonen.slice(0, 2)))}. Your taste powers up for three episodes before doing anything.`,
      `${and(list(shonen.slice(0, 2)))}. Your taste is a five-episode scream with a friendship speech at the end.`,
    ]);
  else if (f.anime.length >= 3)
    add(f.anime.length * 2.2, f.anime.slice(0, 3), [
      `${Num(f.anime.length)} anime picks. Sub over dub, we assume.`,
      `${Num(f.anime.length)} anime picks. You say “the sub is better” before anyone asks.`,
      `${Num(f.anime.length)} anime picks, and you still call it “a phase”. It’s not a phase.`,
    ]);
  const sitcom = f.tag("sitcom");
  if (sitcom.length >= 2)
    add(sitcom.length * 3, sitcom, [
      `${and(list(sitcom))}. You like knowing how it ends.`,
      `${and(list(sitcom))}. Your rewatch loop is longer than most people’s watchlist.`,
      `${and(list(sitcom))}. You don’t watch TV. You keep it on for company.`,
    ]);
  const lit = f.tag("literally");
  if (lit.length >= 2)
    add(lit.length * 2.6, lit.slice(0, 2), [
      `${and(list(lit.slice(0, 2)))}. You like a man with a quiet stare.`,
      `${and(list(lit.slice(0, 2)))}. A “literally me” starter pack. It isn’t you. It’s a man in a coat.`,
      `${and(list(lit.slice(0, 2)))}. Your list is a sigma edit with no music.`,
    ]);
  const pix = [...f.tag("pixar"), ...f.tag("disney")];
  if (pix.length >= 2)
    add(pix.length * 2.3, pix.slice(0, 2), [
      `${and(list(pix.slice(0, 2)))}. Big heart. Lovely.`,
      `${and(list(pix.slice(0, 2)))}. You cry at animated films and call it “craft”.`,
      `${and(list(pix.slice(0, 2)))}. Your favourite films come with a kids’ meal.`,
    ]);
  const indie = [...new Set([...f.tag("a24"), ...f.tag("indie"), ...f.tag("arthouse")])];
  if (indie.length >= 2)
    add(indie.length * 2, indie.slice(0, 2), [
      `${and(list(indie.slice(0, 2)))}. A discerning eye.`,
      `${and(list(indie.slice(0, 2)))}. You pick films by the distributor logo.`,
      `${and(list(indie.slice(0, 2)))}. Your taste owns a tote bag and isn’t afraid to use it.`,
    ]);
  const romance = f.tag("romance");
  if (romance.length >= 2)
    add(romance.length * 2.2, romance.slice(0, 2), [
      `${and(list(romance.slice(0, 2)))}. You believe in love. Sweet.`,
      `${and(list(romance.slice(0, 2)))}. Your standards are fictional. Literally.`,
      `${and(list(romance.slice(0, 2)))}. No real person has ever stood a chance.`,
    ]);
  const horror = f.genre("horror");
  if (horror.length >= 2)
    add(horror.length * 2, horror.slice(0, 2), [
      `${and(list(horror.slice(0, 2)))}. You like a fright before bed.`,
      `${Num(horror.length)} horror picks. You relax by being frightened. Interesting.`,
      `${Num(horror.length)} horror picks. Your idea of a cosy night is a cursed house.`,
    ]);
  const sad = f.tag("sad");
  if (sad.length >= 3)
    add(sad.length * 1.8, sad.slice(0, 3), [
      `${Num(sad.length)} films built to make you cry. Feeling things is healthy.`,
      `${Num(sad.length)} films built to make you cry. Tissues are part of your watchlist.`,
      `${Num(sad.length)} films built to make you cry. This isn’t a watchlist. It’s a support group.`,
    ]);
  const franchise = f.tag("franchise").filter((t) => !t.tags.includes("mcu"));
  if (franchise.length >= 3)
    add(franchise.length * 1.6, franchise.slice(0, 3), [
      `${and(list(franchise.slice(0, 3)))}. You like a reliable universe.`,
      `${Num(franchise.length)} franchise entries. You don’t pick films. You subscribe to them.`,
      `${Num(franchise.length)} franchise entries. Your taste comes with a release schedule.`,
    ]);
  const canon = f.tag("canon");
  if (canon.length >= 4 && f.avgAcclaim >= 84)
    add(canon.length * 1.5, canon.slice(0, 3), [
      `${and(list(canon.slice(0, 3)))}. All certified classics. Safe hands.`,
      `${and(list(canon.slice(0, 3)))}. You didn’t pick these. You copied the homework.`,
      `${and(list(canon.slice(0, 3)))}. This is the IMDb Top 250 with the serial numbers filed off.`,
    ]);
  if (f.avgYear < 1993)
    add(9, [], [
      `Your average pick is from ${f.avgYear}. Classic taste. Very classic.`,
      `Your average pick is from ${f.avgYear}. Your taste has a pension and opinions about parking.`,
      `Your average pick is from ${f.avgYear}. Your taste still has a landline.`,
    ]);
  else if (f.minYear >= 2017 && f.n >= 5)
    add(7, [], [
      `Nothing older than ${f.minYear}. You like things fresh.`,
      `Nothing older than ${f.minYear}. Film history started when you got a streaming login.`,
      `Nothing older than ${f.minYear}. You think black and white is a filter.`,
    ]);
  if (f.nonEnglish.length === 0 && f.n >= 5 && nolan.length < 2)
    add(5, [], [
      `Not one subtitle across ${num(f.n)} picks. Plenty of time for that.`,
      `Zero subtitles across ${num(f.n)} picks. The one-inch barrier is still standing.`,
      `Zero subtitles across ${num(f.n)} picks. Bong Joon Ho is disappointed in you, specifically.`,
    ]);
  if (f.series.length >= 3)
    add(4, f.series.slice(0, 3), [
      `${Num(f.series.length)} TV shows in a film roast. You’re a binger. That’s fine.`,
      `${Num(f.series.length)} TV shows in a film roast. You walked into the wrong screen and sat down anyway.`,
      `${Num(f.series.length)} TV shows. Your attention span needs a “next episode” button.`,
    ]);
  if (f.topGenreCount >= Math.max(4, Math.ceil(f.n * 0.8)) && !(f.topGenre === "animation" && f.anime.length >= 3)) {
    const lead = f.topGenreCount === f.n ? `All ${num(f.n)} picks are ${GENRE_WORD[f.topGenre]}` : `${Num(f.topGenreCount)} of ${num(f.n)} picks are ${GENRE_WORD[f.topGenre]}`;
    add(6, [], [`${lead}. You know what you like.`, `${lead}. That’s not a taste. That’s a rut.`, `${lead}. Have you tried, at any point, anything else?`]);
  }
  return out;
}

function ratingLine(f: F, heat: Heat): Candidate | null {
  const r = f.rated;
  if (r.length < 3) return null;
  const rs = r.map((p) => p.rating);
  if (rs.every((x) => x === rs[0]))
    return { weight: 20, keys: [], text: byHeat(heat, [
      `You rated everything ${rs[0]}/10. Consistent, at least.`,
      `You rated everything ${rs[0]}/10. That’s not a rating system. That’s a shrug.`,
      `Everything gets ${rs[0]}/10. You’re not a critic. You’re a stamp.`,
    ]) };
  // Find the boldest disagreement: a lower-regarded title rated above a better-regarded one.
  let best: { a: Required<Pick>; b: Required<Pick>; gap: number } | null = null;
  for (const a of r)
    for (const b of r)
      if (a.rating > b.rating && a.title.acclaim + 5 < b.title.acclaim) {
        const gap = a.rating - b.rating + (b.title.acclaim - a.title.acclaim) / 10;
        if (!best || gap > best.gap) best = { a, b, gap };
      }
  if (best && best.a.rating - best.b.rating >= 1)
    return { weight: 25, keys: [best.a.title.key, best.b.title.key], text: byHeat(heat, [
      `You gave ${best.a.title.title} ${an(best.a.rating)} and ${best.b.title.title} ${an(best.b.rating)}. Interesting maths.`,
      `You gave ${best.a.title.title} ${an(best.a.rating)} and ${best.b.title.title} ${an(best.b.rating)}. Bold. Wrong, but bold.`,
      `You gave ${best.a.title.title} ${an(best.a.rating)} and ${best.b.title.title} ${an(best.b.rating)}. That’s not a hot take. That’s a typo.`,
    ]) };
  if (rs.every((x) => x >= 9))
    return { weight: 18, keys: [], text: byHeat(heat, [
      "Every rating is a 9 or a 10. Generous. We like that.",
      "Every rating is a 9 or a 10. You’re not a critic. You’re a hype man.",
      "Every rating is a 9 or a 10. Your scale goes from “great” to “greatest of all time”.",
    ]) };
  const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
  if (avg <= 6)
    return { weight: 15, keys: [], text: byHeat(heat, [
      `Your favourites average ${avg.toFixed(1)}/10. A careful critic.`,
      `Your favourites average ${avg.toFixed(1)}/10. You’re a tough crowd for your own taste.`,
      `Your favourites average ${avg.toFixed(1)}/10. Even you aren’t convinced by your taste.`,
    ]) };
  return null;
}

/** A line for any single title. Hand-written when we have one, templated otherwise. */
function titleLine(t: Title, heat: Heat, rand: () => number): string {
  if (heat === "savage" && t.savage) return t.savage;
  if (t.line) return t.line;
  const name = t.title;
  const options: string[] = [];
  const anime = t.kind === "anime" || t.tags.includes("anime");
  if (anime) options.push(`${name}. You’ve described it as “not like other anime”. It is like other anime.`);
  if (t.year && t.year < 1980) options.push(`${name}, from ${t.year}. You’ve seen it. Or you’ve seen the poster in a café.`);
  if (t.genres.includes("horror")) options.push(`${name}. You watched it with the lights on. Respectfully.`);
  if (t.genres.includes("romance")) options.push(`${name}. Your standards were set here. That explains a lot.`);
  if (t.genres.includes("comedy")) options.push(`${name}. You quote it constantly, to people who haven’t seen it.`);
  if (t.genres.includes("action")) options.push(`${name}. Two hours of explosions. You call it “the story”.`);
  if (t.kind === "series") options.push(`${name}. You call it a favourite. You also skipped every intro.`);
  if (t.pop === 1) options.push(`${name}. A deep cut. You want credit for finding it, and fair enough.`);
  if (t.pop === 3 && t.acclaim < 70) options.push(`${name}. A crowd-pleaser. You were the crowd.`);
  options.push(`${name}. A choice. A confident choice. We’ll leave it there.`);
  return options[Math.floor(rand() * options.length)];
}

function compliment(f: F, rangeScore: number, rand: () => number): string {
  const gems = f.titles.filter((t) => t.pop <= 2 && t.acclaim >= 84);
  const best = [...f.titles].sort((a, b) => b.acclaim - a.acclaim)[0];
  const thing = (t: Title) => (t.kind === "film" ? "film" : "show");
  const options: string[] = [];
  if (gems.length) {
    const g = gems[Math.floor(rand() * gems.length)];
    options.push(`But honestly: ${g.title} is a proper pick. Whoever put you onto it deserves a drink.`);
  }
  const mainstream = f.titles.find((t) => t.pop === 3);
  if (rangeScore >= 70 && mainstream) {
    options.push(`But honestly: your range is wider than most. You just hide it behind ${mainstream.title}.`);
  }
  const animeBest = [...f.anime].sort((a, b) => b.acclaim - a.acclaim)[0];
  if (animeBest && animeBest.acclaim >= 85)
    options.push(`But honestly: ${animeBest.title} is great storytelling. Sub or dub, you got that one right.`);
  if (best && best.acclaim >= 84)
    options.push(`But honestly: ${best.title} is a great ${thing(best)}, and you clearly know why.`);
  if (best) options.push(`But honestly: loving ${best.title} out loud is a good look. Keep doing that.`);
  return options[Math.floor(rand() * Math.min(2, options.length))] ?? "But honestly: you care about what you watch. That’s most of it.";
}

const HIGH_VERDICT: [string, string, string] = [
  "Annoyingly good.",
  "We came to roast. Fine. It’s good.",
  "We hate to say it. It’s good.",
];
const LOW_VERDICT: [string, string, string] = [
  "Room to grow. Lots of room.",
  "Your watchlist needs supervision.",
  "Somebody had to say it.",
];

/* ---------- public API ---------- */

export interface RoastInput {
  picks: Pick[];
  heat: Heat;
}

/** Stable fingerprint of an input. Used as the seed and as a cache key. */
export function fingerprint({ picks, heat }: RoastInput): string {
  return `${heat}:${picks.map((p) => `${p.title.key}${p.rating ?? ""}`).join(",")}`;
}

export function roast(input: RoastInput): Roast {
  const { picks, heat } = input;
  const rand = rng(hash(fingerprint(input)));
  const f = features(picks);
  const crit = criteria(f, rand);
  const w = { range: 0.25, boldness: 0.2, crowd: 0.35, conviction: 0.2 } as const;
  const base = crit.reduce((a, c) => a + c.score * w[c.id], 0);
  const score = clamp(base + (rand() * 6 - 3), 8, 98);
  const type = tasteType(f);

  const target = heat === "mild" ? 3 : heat === "savage" ? 5 : 4;
  const chosen: RoastLine[] = [];
  const used = new Set<string>();
  const take = (c: RoastLine) => {
    chosen.push({ text: c.text, keys: c.keys });
    c.keys.forEach((k) => used.add(k));
  };

  const rl = ratingLine(f, heat);
  if (rl) take(rl);
  const patterns = patternLines(f, heat).sort((a, b) => b.weight - a.weight);
  for (const p of patterns.slice(0, heat === "mild" ? 1 : 2)) {
    if (chosen.length >= target) break;
    take(p);
  }
  // Fill with single-title lines, hand-written first, avoiding titles already roasted.
  const remaining = picks
    .map((p) => p.title)
    .filter((t) => !used.has(t.key))
    .sort((a, b) => Number(!!b.line) - Number(!!a.line) || hash(a.key + heat) - hash(b.key + heat));
  for (const t of remaining) {
    if (chosen.length >= target) break;
    take({ text: titleLine(t, heat, rand), keys: [t.key] });
  }
  // Patterns can cover every title; give hand-written titles their own line too.
  const lined = new Set(chosen.filter((c) => c.keys.length === 1).map((c) => c.keys[0]));
  for (const t of picks.map((p) => p.title).filter((t) => t.line && !lined.has(t.key))) {
    if (chosen.length >= target) break;
    take({ text: titleLine(t, heat, rand), keys: [t.key] });
  }
  // Very short lists: fall back to any leftover pattern lines.
  for (const p of patterns) {
    if (chosen.length >= Math.min(3, target)) break;
    if (!chosen.some((c) => c.text === p.text)) take(p);
  }

  const range = crit.find((c) => c.id === "range")!.score;
  const verdict = score >= 85 ? byHeat(heat, HIGH_VERDICT) : score < 32 ? byHeat(heat, LOW_VERDICT) : byHeat(heat, type.verdict);

  return {
    score,
    type: type.label,
    typeLine: type.line,
    verdict,
    lines: chosen,
    compliment: compliment(f, range, rand),
    criteria: crit,
    heat,
    source: "engine",
  };
}

export const HEAT_COPY: Record<Heat, { label: string; hint: string }> = {
  mild: { label: "Mild", hint: "Gentle teasing. Safe for the family group chat." },
  medium: { label: "Medium", hint: "Honest and funny. The one most people pick." },
  savage: { label: "Savage", hint: "No mercy for your taste. Still kind to you." },
};
