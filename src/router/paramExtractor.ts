const WEATHER_STRIP = /\b(what('?s| is) the weather( like)?|how('?s| is) the weather|weather( forecast)?( today| right now)?|is it (raining|snowing|sunny|cloudy|cold|hot|warm)|temperature|forecast|will it rain|should i bring an umbrella)\b\s*/gi;

/**
 * extractWeatherCity - strips weather-intent phrases and prepositions from the input
 * to isolate the city name.
 * @param input - raw user message classified as a weather request
 * @returns the extracted city name, or `"unknown"` if none could be found
 */
export function extractWeatherCity(input: string): string {
  let city = input
    .replace(WEATHER_STRIP, "")
    .replace(/\b(in|at|for|near|around)\b/gi, "")
    .replace(/[?!.,]/g, "")
    .trim();
  return city || "unknown";
}

/**
 * extractListAction - determines whether the user wants a curated top list or a specific search.
 * Detects search intent via keywords like "search", "find", "look up", "by", "for".
 * Defaults to `"top"` when no search keywords are present.
 * @param input - raw user message classified as a movie or music request
 * @returns `"search"` for lookup queries, `"top"` for trending/best-of queries
 */
export function extractListAction(input: string): "search" | "top" {
  if (/\b(search|find|look up|by|for)\b/i.test(input)) return "search";
  return "top";
}
