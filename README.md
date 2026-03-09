# awesome-baml-framework

A simple demonstration of how to build an AI assistant with **function calling** (tool use) using [BAML](https://docs.boundaryml.com/) (Basically, A Made-Up Language).

## What This Shows

BAML lets you define LLM functions with typed inputs/outputs in `.baml` files. This project demonstrates:

- **Hybrid tool routing** — vector similarity selects the tool (~50ms), then a BAML LLM function extracts typed parameters
- **Typed outputs** — BAML enforces structured responses (typed classes for each tool)
- **Streaming** — real-time streamed assistant responses
- **Conversation history** — rolling window of the last 10 messages
- **Session management** — isolated session state with UUID, message history, and tool call log
- **Fallback clients** — automatic failover from OpenAI to local model

### Tools Available

| Tool | Trigger example |
|---|---|
| `WeatherTool` | "What's the weather in Tokyo?" |
| `MovieTool` | "Show me top movies" / "Search for movies" |
| `MusicTool` | "What are the top albums?" / "Search music" |
| `SkipTool` | Any unrelated input — gracefully skipped |

### How It Works

```
User input
    │
    ▼
toolRouter.route(input)
    ├─ fetchEmbedding(input)           ~50ms  Ollama embeddings
    ├─ VectorStore.search()            ~1ms   cosine similarity → tool name
    └─ b.ExtractWeatherParams(input)   ~LLM   BAML extracts typed params
         / b.ExtractMovieParams(input)
         / b.ExtractMusicParams(input)
    │
    ▼
WeatherTool | MovieTool | MusicTool | SkipTool  (typed, validated)
    │
    ▼
Handler runs (mock API call), ToolCall logged to session
    │
    ▼
Chat(messages) → BAML streams a natural language response
    │
    ▼
Response printed, added to history
```

---

## Hybrid Router

The active routing strategy combines two techniques for the best of both worlds:

| Stage | Technique | Latency |
|---|---|---|
| Tool selection | Vector similarity (`nomic-embed-text`) | ~50–150 ms |
| Param extraction | BAML LLM function (`LFModel`) | ~500–2000 ms |

**Why hybrid?**

- Pure vector routing is fast but can't reliably extract structured parameters (e.g. city names, action types) from free-form text
- Pure LLM routing is flexible but adds 4–6 s of latency just for tool selection
- Splitting the two tasks gives fast routing + accurate typed param extraction

### How It Works

```
Startup (once, ~3-5s)
    │
    ├─ Embed ~48 example phrases (14 weather + 12 movie + 12 music + 10 skip)
    └─ Store vectors in-memory

Per query
    │
    ├─ fetchEmbedding(userInput)          ~50ms   Ollama API call
    ├─ VectorStore.search()               ~1ms    cosine similarity → tool name
    └─ b.ExtractWeatherParams(input)      ~LLM    BAML typed extraction
         / b.ExtractMovieParams(input)
         / b.ExtractMusicParams(input)
```

### Example: Adding a New Tool

1. **Add example phrases** to the `EXAMPLES` array in `src/router/toolRouter.ts`:

```typescript
{
  tool: "news_request",
  phrases: [
    "What's in the news today?",
    "Latest headlines",
    "Show me top news stories",
    "What happened today?",
  ],
},
```

2. **Add a BAML extraction function** in `baml_src/assistant.baml`:

```baml
class NewsTool {
    name "news_request"
    category string
}

function ExtractNewsParams(user_input: string) -> NewsTool {
    client "LFModel"
    prompt #"
        Extract the news category from this request.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}
```

3. **Add the route case** in `ToolRouter.route()`:

```typescript
case "news_request":
  return await b.ExtractNewsParams(input);
```

### Confidence Threshold

The router falls back to `SkipTool` when the best similarity score is below `0.35` (configured in `ToolRouter`). Raise this value to make routing stricter; lower it to be more permissive.

## Quick Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Ollama](https://ollama.com/) running locally (default) **or** an OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the LLM

**Option A — Local model via Ollama (default)**

Pull both models — one for the embedding router, one for the chat/streaming responses:

```bash
ollama pull lfm2.5-thinking      # chat + history summarization
ollama pull nomic-embed-text     # vector router (fast embeddings)
```

Ollama must be running at `http://localhost:11434`.

**Option B — OpenAI**

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-...
```

Then update `baml_src/clients.baml` to change the `ExtractWeatherParams`, `ExtractMovieParams`, `ExtractMusicParams`, `Chat`, and `SummarizeHistory` functions to use `CustomGPT5` (or `OpenaiFallback` for automatic failover to the local model) instead of `LFModel`.

### 3. Generate the BAML client

```bash
npm run baml-generate
```

This reads `baml_src/` and generates the TypeScript client into `baml_client/`.

### 4. Build and run

```bash
npm start
```

You'll see an interactive prompt:

```
Enter your message (or 'quit' to exit): What's the weather in Berlin?
Fetching weather for Berlin...
Assistant: Right now in Berlin it's +6°C...

Enter your message (or 'quit' to exit): quit
Exiting...
```

## Project Structure

```
awesome-baml-framework/
├── baml_src/
│   ├── assistant.baml   # BAML types + functions: ExtractWeatherParams, ExtractMovieParams,
│   │                    #   ExtractMusicParams, Chat, SummarizeHistory
│   ├── clients.baml     # LLM client config (Ollama, OpenAI, fallback, retry policies)
│   └── generators.baml  # TypeScript code generation config
├── baml_client/         # Auto-generated TypeScript client (do not edit)
├── src/
│   ├── main.ts              # Main assistant loop with tool handlers
│   ├── state/
│   │   ├── session.ts       # Session class (UUID + messages + toolCalls log)
│   │   └── toolCall.ts      # ToolCall record (id, name, args, result)
│   └── router/
│       ├── toolRouter.ts    # Hybrid router — initialize() + route()
│       ├── vectorStore.ts   # In-memory cosine similarity store
│       └── embeddings.ts    # Ollama embeddings API client
└── package.json
```

## BAML Concepts Highlighted

**Typed tool classes** (`assistant.baml`):
```baml
class WeatherTool {
    name "weather_request"
    city string
}

class MovieTool {
    name "movie_request"
    action "search" | "top"
}
```

**Dedicated extraction functions per tool**:
```baml
function ExtractWeatherParams(user_input: string) -> WeatherTool {
    client "LFModel"
    prompt #"
        Extract the city name from this weather request.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}
```

BAML automatically generates the output schema and parses the LLM response into the correct typed class — no manual JSON parsing needed. Each extraction function is focused and minimal, keeping prompts small and fast.

## Scripts

| Command | Description |
|---|---|
| `npm run baml-generate` | Regenerate `baml_client/` from `baml_src/` |
| `npm run build` | Generate client + compile TypeScript |
| `npm start` | Build and run the assistant |

## Learn More

- [BAML Docs](https://docs.boundaryml.com/)
- [BAML GitHub](https://github.com/boundaryml/baml)
- [Function calling with BAML](https://docs.boundaryml.com/docs/snippets/supported-fields/unions)