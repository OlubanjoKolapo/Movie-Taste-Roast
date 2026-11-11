import { json, rateLimited } from "./_shared";

export const config = { runtime: "edge" };

/**
 * POST /api/roast
 * Writes the roast copy (verdict, lines, compliment) with a language model.
 * The client already has the deterministic engine roast and falls back to it on any non-200,
 * so this endpoint can fail, time out or be switched off without breaking anything.
 *
 * Env:
 *   AI_PROVIDER     "gemini" (default) or "xai"
 *   GEMINI_API_KEY  GEMINI_MODEL (default gemini-2.5-flash-lite)
 *   XAI_API_KEY     XAI_MODEL    (default grok-4-fast-non-reasoning)
 */

interface InPick {
  key: string;
  title: string;
  year: number;
  kind: string;
  genres: string[];
  lang: string;
  rating?: number;
}
interface Body {
  heat: "mild" | "medium" | "savage";
  picks: InPick[];
  engine: { score: number; type: string; typeLine: string };
}
interface Copy {
  verdict: string;
  lines: { text: string; keys: string[] }[];
  compliment: string;
}

const SYSTEM = `You are the Concierge at Movie Roast, a dry, sharp, warm film friend after one drink.
You roast a person's movie and TV taste based on the titles they picked. Rules:
- Roast the taste, never the person. Never mention or imply looks, body, age as an insult, identity, race, gender, religion, sexuality, disability, intelligence, money or mental health.
- Every line must name at least one of their titles, a countable pattern ("three Nolan films"), or a rating they gave ("you gave X a 9/10").
- Be specific and true to the actual films: reference well-known scenes, quotes, fandom habits or reputations.
- Short sentences. Second person. Dry wit over loud jokes. British-neutral spelling.
- No emoji, no hashtags, no em dashes, no exclamation marks, no swearing.
- Use curly apostrophes and quotes (’ “ ”). Ratings are written as 9/10.
- The verdict is a headline of 3 to 8 words, sentence case, ending with a full stop.
- The compliment starts with "But honestly: " and says something kind and true about one specific pick.
Heat: mild = gentle teasing; medium = honest and funny; savage = merciless about the taste, still kind to the human.
Return JSON only.`;

const COUNT = { mild: 3, medium: 4, savage: 5 } as const;

/* ---------- sanitising ---------- */

// Checked after title names are removed, so films like Poor Things or Suicide Squad don't trip it.
const BANNED =
  /\b(fat|ugly|stupid|idiot|dumb|moron|retard\w*|gay|lesbian|transgender|black people|white people|asians?|jews?|jewish|muslims?|religio\w*|autis\w*|kill yourself|kys|incel|loser|bald|neckbeard|no friends|single forever|unemployed)\b/i;
const unsafe = (text: string, titles: string[]) =>
  BANNED.test(titles.reduce((t, name) => t.split(name).join(" "), text));

function tidy(s: string, max: number): string {
  return s
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s*(?:[—–]|--)\s*/g, ", ")
    .replace(/\.\.\./g, "…")
    .replace(/!/g, ".")
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/(^|[\s(])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s(])'/g, "$1‘")
    .replace(/'/g, "’")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function clean(raw: Copy, body: Body): Copy | null {
  const valid = new Set(body.picks.map((p) => p.key));
  const titles = body.picks.map((p) => p.title);
  const names = titles.map((t) => t.toLowerCase());
  const lines = (raw.lines ?? [])
    .map((l) => ({ text: tidy(String(l.text ?? ""), 200), keys: (l.keys ?? []).filter((k) => valid.has(k)).slice(0, 3) }))
    .filter((l) => l.text.length > 12 && !unsafe(l.text, titles))
    // A line must point at something real: a key we know, or a title named in the text.
    .filter((l) => l.keys.length || names.some((n) => l.text.toLowerCase().includes(n.slice(0, 18))))
    .slice(0, COUNT[body.heat]);
  const verdict = tidy(String(raw.verdict ?? ""), 70);
  let compliment = tidy(String(raw.compliment ?? ""), 220);
  if (compliment && !compliment.startsWith("But honestly")) compliment = `But honestly: ${compliment}`;
  if (lines.length < 3 || !verdict || !compliment || unsafe(verdict, titles) || unsafe(compliment, titles)) return null;
  return { verdict, lines, compliment };
}

/* ---------- providers ---------- */

const SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING" },
    lines: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: { type: "STRING" }, keys: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["text", "keys"],
      },
    },
    compliment: { type: "STRING" },
  },
  required: ["verdict", "lines", "compliment"],
};

async function gemini(prompt: string, signal: AbortSignal): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 700,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function xai(prompt: string, signal: AbortSignal): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.XAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-4-fast-non-reasoning",
      temperature: 1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM}\nJSON shape: {"verdict": string, "lines": [{"text": string, "keys": string[]}], "compliment": string}` },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`xai ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/* ---------- handler ---------- */

const memo = new Map<string, Copy>();

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const provider = process.env.AI_PROVIDER === "xai" ? "xai" : "gemini";
  const key = provider === "xai" ? process.env.XAI_API_KEY : process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "AI is not configured" }, 503);
  if (rateLimited(req, 8)) return json({ error: "Slow down" }, 429);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }
  if (!body || !["mild", "medium", "savage"].includes(body.heat) || !Array.isArray(body.picks)) return json({ error: "Bad input" }, 400);
  body.picks = body.picks.slice(0, 12).map((p) => ({
    key: String(p.key).slice(0, 12),
    title: String(p.title).slice(0, 120),
    year: Number(p.year) || 0,
    kind: String(p.kind).slice(0, 10),
    genres: (Array.isArray(p.genres) ? p.genres : []).slice(0, 5).map((g) => String(g).slice(0, 14)),
    lang: String(p.lang).slice(0, 5),
    rating: typeof p.rating === "number" ? Math.min(10, Math.max(1, Math.round(p.rating))) : undefined,
  }));
  if (body.picks.length < 3) return json({ error: "Need at least three picks" }, 400);

  const memoKey = `${body.heat}:${body.picks.map((p) => p.key + (p.rating ?? "")).join(",")}`;
  const hit = memo.get(memoKey);
  if (hit) return json(hit);

  const prompt = `Heat: ${body.heat}. Write exactly ${COUNT[body.heat]} roast lines.
Their taste type (already decided): ${String(body.engine?.type).slice(0, 60)}. ${String(body.engine?.typeLine).slice(0, 140)}
Their taste score (already decided): ${Number(body.engine?.score) || 50}/100. Match the verdict's tone to it: high scores get grudging respect.
Their picks (key, title, year, kind, genres, language, their rating):
${body.picks.map((p) => `- ${p.key} | ${p.title} | ${p.year} | ${p.kind} | ${p.genres.join(", ")} | ${p.lang}${p.rating ? ` | ${p.rating}/10` : ""}`).join("\n")}
Each line: 1 to 3 short sentences, under 200 characters, and "keys" lists the key(s) of the titles it is about (empty only for a pure pattern line).
Use at least one pattern line across several titles. If ratings are given, one line should call out a rating choice.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const text = await (provider === "xai" ? xai(prompt, ctrl.signal) : gemini(prompt, ctrl.signal));
    const parsed = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()) as Copy;
    const copy = clean(parsed, body);
    if (!copy) return json({ error: "Unusable output" }, 502);
    if (memo.size > 500) memo.clear();
    memo.set(memoKey, copy);
    return json(copy);
  } catch {
    return json({ error: "Model unavailable" }, 502);
  } finally {
    clearTimeout(timer);
  }
}
