# awesome-baml-framework

A simple demonstration of how to build an AI assistant with **function calling** (tool use) using [BAML](https://docs.boundaryml.com/) (Basically, A Made-Up Language).

## What This Shows

BAML lets you define LLM functions with typed inputs/outputs in `.baml` files. This project demonstrates:

- **Tool routing** — classifies a user message and selects the right API to call (two strategies — see below)
- **Typed outputs** — BAML enforces structured responses (union types as discriminated tool selections)
- **Streaming** — real-time streamed assistant responses
- **Conversation history** — rolling window of the last 10 messages
- **Session management** — isolated session state with unique IDs
- **Fallback clients** — automatic failover from OpenAI to local model

### Tools Available

| Tool | Trigger example |
|---|---|
| `WeatherAPI` | "What's the weather in Tokyo?" |
| `MovieAPI` | "Show me top movies" / "Search for movies" |
| `MusicAPI` | "What are the top albums?" / "Search music" |
| `SkipAPICall` | Any unrelated input — gracefully skipped |

### How It Works

```
User input
    │
    ▼
toolRouter.route(input) → vector similarity → WeatherAPI | MovieAPI | MusicAPI | SkipAPICall
    │
    ▼
Handler runs (mock API call)
    │
    ▼
Chat(messages) → BAML streams a natural language response
    │
    ▼
Response printed, added to history
```

---

## Vector Store Router

The project ships two routing strategies. The active one (`src/router/`) replaces the LLM classifier with a **vector similarity router** for dramatically faster tool selection.

### Why Two Strategies?

| | LLM Router (`b.UseTool`) | Vector Router (`toolRouter`) |
|---|---|---|
| Latency | 4,000–6,000 ms | 50–150 ms |
| Startup cost | 0 ms | ~3–5 s (one-time) |
| Model | `lfm2.5-thinking` (inference) | `nomic-embed-text` (embeddings) |
| Best for | Complex payloads, many fields | Simple intent + 1–2 params |

### When to Use Each

**Use the Vector Router** when:
- The tool payload is simple — a single field like `city` or a binary `action: "search" | "top"`
- Low latency matters more than flexibility
- The number of tools and their meanings are stable

**Use the LLM Router** when:
- The payload has multiple fields that require reasoning to fill (e.g. date ranges, filters, nested objects)
- Tool boundaries are ambiguous and need nuanced understanding
- You need the model to handle edge cases or paraphrase inputs

### How the Vector Router Works

```
Startup (once, ~3-5s)
    │
    ├─ Embed ~46 example phrases (14 weather + 12 movie + 12 music + 10 skip)
    └─ Store vectors in-memory

Per query (~50-150ms)
    │
    ├─ fetchEmbedding(userInput)        ~50ms  Ollama API call
    ├─ VectorStore.search()             ~1ms   cosine similarity scan
    └─ paramExtractor (regex)          <1ms   extract city / action
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

2. **Add param extraction** in `src/router/paramExtractor.ts` if the tool has parameters:

```typescript
export function extractNewsCategory(input: string): string {
  if (/\b(sport|sports)\b/i.test(input)) return "sports";
  if (/\b(tech|technology)\b/i.test(input)) return "technology";
  return "general";
}
```

3. **Add the route case** in `ToolRouter.route()`:

```typescript
case "news_request":
  return { api_name: "news_request", category: extractNewsCategory(input) };
```

> **Note:** The Vector Router works well here because `news_request` has a single straightforward field (`category`). If your tool needs to extract a structured date range like `{ from: "2026-01-01", to: "2026-03-01" }`, the LLM router is a better fit — regex cannot reliably parse that kind of payload.

### Confidence Threshold

The router falls back to `SkipAPICall` when the best similarity score is below `0.35` (configured in `ToolRouter`). Raise this value to make routing stricter; lower it to be more permissive.

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

Then update `baml_src/clients.baml` to change the `UseTool`, `Chat`, and `SummarizeHistory` functions to use `CustomGPT5` (or `OpenaiFallback` for automatic failover to the local model) instead of `LFModel`.

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
│   ├── assistant.baml   # BAML functions: UseTool, Chat, SummarizeHistory
│   ├── clients.baml     # LLM client config (Ollama, OpenAI, fallback, retry policies)
│   └── generators.baml  # TypeScript code generation config
├── baml_client/         # Auto-generated TypeScript client (do not edit)
├── src/
│   ├── main.ts              # Main assistant loop with tool handlers
│   ├── session.ts           # Session class (messages + UUID)
│   ├── state.ts             # State class (session registry)
│   └── router/
│       ├── toolRouter.ts    # Composition layer — initialize() + route()
│       ├── vectorStore.ts   # In-memory cosine similarity store
│       ├── embeddings.ts    # Ollama embeddings API client
│       └── paramExtractor.ts # Regex-based city / action extraction
└── package.json
```

## BAML Concepts Highlighted

**Union type tool selection** (`assistant.baml`):
```baml
function UseTool(user_input: string) -> WeatherAPI | MovieAPI | MusicAPI | SkipAPICall {
    client "LFModel"
    prompt #"
        Classify the user request and extract structured data.
        {{ ctx.output_format }}
        {{ _.role('user') }}
        {{ user_input }}
    "#
}
```

BAML automatically generates the output schema and parses the LLM response into the correct typed class — no manual JSON parsing needed.

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