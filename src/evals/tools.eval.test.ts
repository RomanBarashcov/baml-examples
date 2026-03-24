import "dotenv/config";
import { describe, it, expect } from "vitest";
import { b } from "../../baml_client";

type ToolName = "weather_request" | "movie_request" | "music_request" | "skip_tool_call";

interface EvalCase {
  label: string;
  tool: ToolName;
  input: string;
  expected: object;
}

const EVAL_CASES: EvalCase[] = [
  // WeatherTool
  { label: "Weather: forecast query", tool: "weather_request", input: "Will it snow in Kyiv this week?", expected: { name: "weather_request", city: "Kyiv" } },
  // { label: "Weather: basic city", tool: "weather_request", input: "What is the weather in Tokyo?", expected: { name: "weather_request", city: "Tokyo" } },
  // { label: "Weather: raining query", tool: "weather_request", input: "Is it raining in London right now?", expected: { name: "weather_request", city: "London" } },
  // { label: "Weather: temperature query", tool: "weather_request", input: "What is the temperature in New York?", expected: { name: "weather_request", city: "New York" } },

  // MovieTool
  { label: "Movie: top movies", tool: "movie_request", input: "Show me the top movies right now", expected: { name: "movie_request", action: "top" } },
  // { label: "Movie: search by title", tool: "movie_request", input: "Search for the movie Inception", expected: { name: "movie_request", action: "search" } },
  // { label: "Movie: popular films", tool: "movie_request", input: "What are the most popular films?", expected: { name: "movie_request", action: "top" } },
  // { label: "Movie: search by actor", tool: "movie_request", input: "Find movies with Tom Hanks", expected: { name: "movie_request", action: "search" } },

  // MusicTool
  { label: "Music: top songs", tool: "music_request", input: "What are the top songs right now?", expected: { name: "music_request", action: "top" } },
  // { label: "Music: search artist", tool: "music_request", input: "Search for music by Taylor Swift", expected: { name: "music_request", action: "search" } },
  // { label: "Music: best albums", tool: "music_request", input: "Best albums of 2026", expected: { name: "music_request", action: "top" } },
  // { label: "Music: search album", tool: "music_request", input: "Find J. Cole albums", expected: { name: "music_request", action: "search" } },

  // SkipTool (actual always hardcoded — no Extract function)
  { label: "Skip: greeting", tool: "skip_tool_call", input: "Hello, how are you?", expected: { name: "skip_tool_call", action: "skip" } },
  // { label: "Skip: joke", tool: "skip_tool_call", input: "Tell me a joke", expected: { name: "skip_tool_call", action: "skip" } },
  // { label: "Skip: math", tool: "skip_tool_call", input: "What is 2 + 2?", expected: { name: "skip_tool_call", action: "skip" } },
  // { label: "Skip: identity", tool: "skip_tool_call", input: "Who are you?", expected: { name: "skip_tool_call", action: "skip" } },
];

async function runExtract(tc: EvalCase): Promise<object> {
  switch (tc.tool) {
    case "weather_request": return await b.ExtractWeatherParams(tc.input);
    case "movie_request":   return await b.ExtractMovieParams(tc.input);
    case "music_request":   return await b.ExtractMusicParams(tc.input);
    case "skip_tool_call":  return { name: "skip_tool_call", action: "skip" };
  }
}

describe("Tool call evaluations (LLM-as-judge)", () => {
  for (const tc of EVAL_CASES) {
    it(tc.label, async () => {
      const actual = await runExtract(tc);
      const result = await b.EvaluateToolCall(
        tc.input,
        JSON.stringify(actual),
        JSON.stringify(tc.expected)
      );
      expect(result.passed, result.reasoning).toBe(true);
    });
  }
});
