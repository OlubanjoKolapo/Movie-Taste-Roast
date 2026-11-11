import type { Pick } from "../lib/types";
import { BY_KEY } from "./catalogue";

/* Sample tastes for the landing page demo. Ratings are chosen to show off rating call-outs. */
const RAW: { id: string; label: string; picks: [string, number?][] }[] = [
  { id: "nolan", label: "The Nolan disciple", picks: [["m27205", 9], ["m157336", 10], ["m155", 10], ["m1124", 8], ["m577922", 9]] },
  { id: "marvel", label: "The Marvel loyalist", picks: [["m299534", 10], ["m284053", 9], ["m24428", 9], ["m118340", 9], ["m496243", 7]] },
  { id: "comfort", label: "The comfort rewatcher", picks: [["t2316", 10], ["t1668", 9], ["t48891", 9], ["m8363", 8], ["m10625", 9]] },
  { id: "anime", label: "The anime purist", picks: [["t1429", 10], ["t65930", 10], ["t85937", 9], ["m129", 9], ["t209867", 7]] },
  { id: "prestige", label: "The prestige tourist", picks: [["m278", 10], ["m238", 10], ["m680", 9], ["m13", 9], ["m603", 9]] },
  { id: "classic", label: "The old soul", picks: [["m62", 9], ["m346", 10], ["m103", 9], ["m694", 8], ["m348", 9]] },
];

export const PERSONAS = RAW.map((p) => ({
  id: p.id,
  label: p.label,
  picks: p.picks.map(([key, rating]) => ({ title: BY_KEY.get(key)!, rating })).filter((x) => x.title) as Pick[],
}));
