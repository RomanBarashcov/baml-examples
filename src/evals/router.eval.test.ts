import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import { toolRouter } from "../router/toolRouter";

const ROUTER_REGRESSION_CASES: { label: string; input: string; expectedTool: string }[] = [
  // The exact query that was misrouted to movie_request
  { label: "Music: best albums query (was misrouted to movie)", input: "what is best music albums right now ?", expectedTool: "music_request" },
  // Other ambiguous music-vs-movie boundary cases
  { label: "Music: trending music (vs trending films)", input: "what is trending in music right now?", expectedTool: "music_request" },
  { label: "Music: popular albums", input: "what are the most popular albums this year?", expectedTool: "music_request" },
  { label: "Movie: top movies (must not regress to music)", input: "what are the best movies right now?", expectedTool: "movie_request" },
  { label: "Movie: trending films", input: "what films are trending right now?", expectedTool: "movie_request" },
];

describe("Router regression tests", () => {
  beforeAll(async () => {
    await toolRouter.initialize();
  }, 30_000);

  for (const tc of ROUTER_REGRESSION_CASES) {
    it(tc.label, async () => {
      const result = await toolRouter.route(tc.input);
      expect(result.name).toBe(tc.expectedTool);
    });
  }
});
