# movieroast.

Pick five films, shows or anime. Get an honest, funny roast of your taste, a score out of 100, a taste type and a share card. Then a path into [MovieTonight](https://movietonight.ai).

React 19 + TypeScript + Vite 8 + Tailwind v4 + lucide-react. Deploys to Vercel as a static SPA with three edge functions.

## Run it

```bash
npm install
cp .env.example .env   # optional: add keys
npm run dev            # app + /api functions on http://localhost:5173
npm run build
```

Everything works with no keys at all. The built-in engine writes every roast, and the picker uses a catalogue of 159 titles.

## How it works

| Piece | Where | Notes |
| --- | --- | --- |
| Roast engine | `src/lib/roast.ts` | Deterministic. Owns the score, the four criteria (Range, Boldness, Crowd taste, Conviction) and the taste type, so numbers are explainable and identical on shared links. |
| Catalogue | `src/data/catalogue.ts` | 159 films, series and anime with checked TMDb posters, tags and a hand-written roast line each. |
| AI copy | `api/roast.ts`, `src/lib/ai.ts` | Optional. A model rewrites the verdict, lines and compliment. Output is cleaned (curly quotes, no emoji, no em dashes) and filtered (lines must reference a real pick, insults about people are dropped). Any failure falls back to the engine. |
| Share links | `src/lib/slug.ts` | `/r/2-mkzp.9-t12s~Tolu` encodes heat, picks, ratings and name. No database needed. |
| Share cards | `src/lib/card.ts` | One canvas renderer for the preview and the 1080px Story (9:16) and Post (1:1) exports. |
| Imports | `api/letterboxd.ts`, `src/lib/imports.ts` | Letterboxd username (public RSS), Letterboxd `ratings.csv`, and a MovieTonight adapter waiting for an endpoint. |
| Search | `api/tmdb.ts` | TMDb search for titles beyond the catalogue. Edge-cached for a day. |
| Mascot | `src/mascot/concierge.js` | `<mt-concierge>` custom element: spring-morphing O / Fold / M shapes, pause and play eyes. |

## Environment

See `.env.example`. Server keys have no `VITE_` prefix and never reach the browser.

- `GEMINI_API_KEY`: turns on AI-written roasts (default model `gemini-2.5-flash-lite`, override with `GEMINI_MODEL`).
- `AI_PROVIDER=xai` + `XAI_API_KEY`: use Grok instead.
- `TMDB_API_KEY` or `TMDB_READ_TOKEN`: search any title, resolve shared links with non-catalogue titles. Free at themoviedb.org.
- `VITE_SITE_URL`: the public domain printed on share cards (default `https://movieroast.ai`).
- `VITE_MOVIETONIGHT_URL`: where the "fix your taste" buttons go (UTM tags are added).
- `VITE_MOVIETONIGHT_IMPORT_URL`: when MovieTonight has a public taste endpoint, `GET {url}/{handle}` → `{ items: [{ key: "m27205", rating?: 9 }] }`.

## Cost and load

- Only the person creating a roast triggers an AI call. People opening a shared link see the engine version, which costs nothing.
- One roast is roughly 700 input and 350 output tokens.
- Results are cached in the browser and per edge instance, and the endpoint has a per-IP rate limit (8 a minute).
- Set a daily request quota on the Generative Language API in Google Cloud as a hard spending cap. The app keeps working when the cap is hit.

## Deploy

1. Push to GitHub and import the repo in Vercel (framework: Vite).
2. Add the environment variables.
3. Point `movieroast.ai` at the project.

`vercel.json` rewrites every non-file route to the SPA.

Data & imagery from TMDb. This product uses the TMDb API but is not endorsed by TMDb.
