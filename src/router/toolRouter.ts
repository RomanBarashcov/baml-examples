import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { b, WeatherTool, MovieTool, MusicTool, SkipTool } from "../../baml_client";
import { fetchEmbedding } from "./embeddings";
import { VectorStore } from "./vectorStore";
import { EXAMPLES } from "./examples";

const EMBEDDINGS_PATH = fileURLToPath(new URL("../../data/embeddings.json", import.meta.url));
const CONFIDENCE_THRESHOLD = 0.35;
export const HIGH_CONFIDENCE_THRESHOLD = 0.55;

interface EmbeddingEntry {
  tool: string;
  example: string;
  embedding: number[];
}

export interface ClassifyResult {
  tool: string;
  score: number;
}

export interface RouteResult {
  result: WeatherTool | MovieTool | MusicTool | SkipTool;
  score: number;
}

export class ToolRouter {
  private readonly store: VectorStore = new VectorStore();

  /**
   * initialize - populates the vector store with labelled embeddings.
   * Loads from a precomputed file at `data/embeddings.json` when available (~5ms).
   * Falls back to live Ollama embedding calls when the file is absent (~3–5s).
   * Must be called once before any calls to `route()`.
   */
  async initialize(): Promise<void> {
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      const entries: EmbeddingEntry[] = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf-8"));
      for (const { tool, example, embedding } of entries) {
        this.store.add(tool, example, embedding);
      }
      console.log(`Tool router ready (loaded ${entries.length} embeddings from disk).`);
      return;
    }

    console.log("Initializing tool router (no precomputed file found, embedding live)...");
    console.log("Run `npm run precompute` to speed up future startups.");

    const tasks: Promise<void>[] = [];
    for (const { tool, phrases } of EXAMPLES) {
      for (const phrase of phrases) {
        tasks.push(
          fetchEmbedding(phrase).then((embedding) => {
            this.store.add(tool, phrase, embedding);
          })
        );
      }
    }

    await Promise.all(tasks);
    console.log("Tool router ready.");
  }

  /**
   * classify - embedding lookup only (no LLM call).
   * Returns the best-matching tool and its similarity score.
   * @param input - raw user message
   * @returns the matched tool name and its similarity score
   */
  async classify(input: string): Promise<ClassifyResult> {
    const queryEmbedding = await fetchEmbedding(input);
    const { tool, score } = this.store.search(queryEmbedding);

    if (score < CONFIDENCE_THRESHOLD) {
      return { tool: "skip_tool_call", score: 0 };
    }

    return { tool, score };
  }

  /**
   * extract - LLM parameter extraction for a given tool.
   * @param tool - the tool name to extract params for
   * @param input - raw user message
   * @returns the structured tool result
   */
  async extract(tool: string, input: string): Promise<WeatherTool | MovieTool | MusicTool | SkipTool> {
    switch (tool) {
      case "weather_request":
        return await b.ExtractWeatherParams(input);
      case "movie_request":
        return await b.ExtractMovieParams(input);
      case "music_request":
        return await b.ExtractMusicParams(input);
      default:
        return { name: "skip_tool_call", action: "skip" };
    }
  }

  /**
   * route - classifies user input and extracts params in one call.
   * Kept for backward compatibility with eval tests.
   * @param input - raw user message
   * @returns the matched tool result and its similarity score
   */
  async route(input: string): Promise<RouteResult> {
    const { tool, score } = await this.classify(input);

    if (tool === "skip_tool_call") {
      return { result: { name: "skip_tool_call", action: "skip" }, score };
    }

    const result = await this.extract(tool, input);
    return { result, score };
  }
}

export const toolRouter = new ToolRouter();
