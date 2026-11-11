/* Links back into MovieTonight. UTM tags let MovieTonight measure what the roast sends over. */
const base = ((import.meta.env.VITE_MOVIETONIGHT_URL as string | undefined) || "https://movietonight.ai/").replace(/\/?$/, "/");

const utm = (content: string) =>
  `utm_source=movieroast&utm_medium=referral&utm_campaign=taste_roast&utm_content=${encodeURIComponent(content)}`;

export const MOVIETONIGHT_URL = `${base}?${utm("footer")}`;
export const movieTonightFix = (typeLabel: string) => `${base}?${utm(typeLabel.toLowerCase().replace(/[^a-z]+/g, "-"))}`;
export const movieTonightProfile = (handle: string) => `${base}u/${encodeURIComponent(handle)}`;
