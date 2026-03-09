import { WeatherAPI, MovieAPI, MusicAPI, SkipAPICall } from "../../baml_client";
import { fetchEmbedding } from "./embeddings";
import { VectorStore } from "./vectorStore";
import { extractWeatherCity, extractListAction } from "./paramExtractor";

const EXAMPLES: { tool: string; phrases: string[] }[] = [
  {
    tool: "weather_request",
    phrases: [
      "What's the weather in Tokyo?",
      "Is it raining in London?",
      "What's the temperature in New York?",
      "How's the weather in Paris today?",
      "Will it snow in Moscow this week?",
      "Weather forecast for Berlin",
      "Is it sunny in Sydney?",
      "Should I bring an umbrella in Seattle?",
      "What's the weather like in Dubai?",
      "How cold is it in Chicago?",
      "Weather in Miami right now",
      "Is it hot in Phoenix?",
      "Tell me the weather for Toronto",
      "Current weather in Los Angeles",
    ],
  },
  {
    tool: "movie_request",
    phrases: [
      "Show me top movies",
      "What are the best movies right now?",
      "Search for Avatar",
      "Find the movie Inception",
      "Top rated films this year",
      "Look up movies by Christopher Nolan",
      "Popular movies 2026",
      "Trending films right now",
      "Search movies with Tom Hanks",
      "Best action movies",
      "Find movie Zootopia 2",
      "What movies are popular?",
    ],
  },
  {
    tool: "music_request",
    phrases: [
      "What are the top songs?",
      "Search for Taylor Swift",
      "Best albums this year",
      "Find music by Kendrick Lamar",
      "Top hits right now",
      "Search for J. Cole albums",
      "Popular songs 2026",
      "Trending music",
      "Look up music by Drake",
      "Best rap albums",
      "Find songs by The Weeknd",
      "What music is popular?",
    ],
  },
  {
    tool: "skip_api_call",
    phrases: [
      "Tell me a joke",
      "Who are you?",
      "Hello",
      "What can you do?",
      "Help me",
      "How are you?",
      "What is the meaning of life?",
      "Tell me something interesting",
      "What's 2 + 2?",
      "Good morning",
    ],
  },
];

export class ToolRouter {
  private store: VectorStore = new VectorStore();
  private readonly CONFIDENCE_THRESHOLD = 0.35;

  /**
   * initialize - embeds all example phrases concurrently and populates the vector store.
   * Must be called once before any calls to `route()`.
   * Logs progress to stdout. Typically takes 3-5 seconds on first run.
   */
  async initialize(): Promise<void> {
    console.log("Initializing tool router...");
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
   * route - classifies the user input into a typed tool call using vector similarity.
   * Embeds the input, finds the nearest example in the store, then extracts parameters.
   * Falls back to `SkipAPICall` when similarity is below `CONFIDENCE_THRESHOLD`.
   * @param input - raw user message
   * @returns a typed API descriptor ready for the tool switch in main.ts
   * @throws if the Ollama embedding API is unavailable
   */
  async route(input: string): Promise<WeatherAPI | MovieAPI | MusicAPI | SkipAPICall> {
    const queryEmbedding = await fetchEmbedding(input);
    const { tool, score } = this.store.search(queryEmbedding);

    if (score < this.CONFIDENCE_THRESHOLD) {
      return { api_name: "skip_api_call", action: "skip" };
    }

    switch (tool) {
      case "weather_request":
        return { api_name: "weather_request", city: extractWeatherCity(input) };
      case "movie_request":
        return { api_name: "movie_request", action: extractListAction(input) };
      case "music_request":
        return { api_name: "music_request", action: extractListAction(input) };
      default:
        return { api_name: "skip_api_call", action: "skip" };
    }
  }
}

export const toolRouter = new ToolRouter();
