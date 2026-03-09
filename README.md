# awesome-baml-framework

A simple demonstration of how to build an AI assistant with **function calling** (tool use) using [BAML](https://docs.boundaryml.com/) (Basically, A Made-Up Language).

## What This Shows

BAML lets you define LLM functions with typed inputs/outputs in `.baml` files. This project demonstrates:

- **Tool routing** — the LLM classifies a user message and selects the right API to call
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
UseTool(input) → BAML classifies → WeatherAPI | MovieAPI | MusicAPI | SkipAPICall
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

Pull the model used in `baml_src/clients.baml`:

```bash
ollama pull lfm2.5-thinking
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
│   ├── main.ts          # Main assistant loop with tool handlers
│   ├── session.ts       # Session class (messages + UUID)
│   └── state.ts         # State class (session registry)
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