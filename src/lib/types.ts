export type Kind = "film" | "series" | "anime";
export type Heat = "mild" | "medium" | "savage";

export type Genre =
  | "action" | "adventure" | "animation" | "comedy" | "crime" | "documentary" | "drama" | "family"
  | "fantasy" | "horror" | "mystery" | "romance" | "scifi" | "thriller" | "war" | "western" | "music";

/** A title the roast engine can reason about. Catalogue entries carry hand-written lines. */
export interface Title {
  /** "m{tmdbId}" for films, "t{tmdbId}" for series. */
  key: string;
  kind: Kind;
  title: string;
  year: number;
  /** Full poster URL, or empty when unknown. */
  poster: string;
  genres: Genre[];
  /** ISO 639-1 original language. */
  lang: string;
  /** 3 = everyone has seen it, 2 = popular, 1 = niche. */
  pop: 1 | 2 | 3;
  /** Rough critical and audience standing, 0–100. */
  acclaim: number;
  /** Pattern tags: nolan, mcu, ghibli, comfort, literally, canon, … */
  tags: string[];
  line?: string;
  savage?: string;
}

export interface Pick {
  title: Title;
  /** Out of 10, optional. */
  rating?: number;
}

export interface RoastLine {
  text: string;
  /** Title keys this line is about (for the evidence posters). */
  keys: string[];
}

export interface Criterion {
  id: "range" | "boldness" | "crowd" | "conviction";
  label: string;
  score: number;
  reason: string;
}

export interface Roast {
  score: number;
  type: string;
  typeLine: string;
  verdict: string;
  lines: RoastLine[];
  compliment: string;
  criteria: Criterion[];
  heat: Heat;
  /** "engine" for the local deterministic roast, "ai" when a model wrote the copy. */
  source: "engine" | "ai";
}
