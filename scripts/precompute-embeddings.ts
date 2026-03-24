import * as fs from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchEmbedding } from "../src/router/embeddings";
import { EXAMPLES } from "../src/router/examples";

const OUTPUT_PATH = fileURLToPath(new URL("../data/embeddings.json", import.meta.url));

interface EmbeddingEntry {
  tool: string;
  example: string;
  embedding: number[];
}

/**
 * precompute - embeds all routing examples concurrently and writes them to disk.
 * Run once with `npm run precompute` before starting the assistant.
 * ToolRouter.initialize() loads this file to skip live embedding calls on startup.
 */
async function precompute(): Promise<void> {
  const tasks: Promise<EmbeddingEntry>[] = [];

  for (const { tool, phrases } of EXAMPLES) {
    for (const example of phrases) {
      tasks.push(
        fetchEmbedding(example).then((embedding) => ({ tool, example, embedding }))
      );
    }
  }

  const entries = await Promise.all(tasks);

  const dir = dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(entries, null, 2));
  console.log(`Wrote ${entries.length} embeddings to ${OUTPUT_PATH}`);
}

await precompute();
