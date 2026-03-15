const cache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 500;

/**
 * fetchEmbedding - calls the Ollama embeddings API to convert text into a vector.
 * Results are cached in-memory (LRU-style, max 500 entries) since the model is
 * deterministic: identical inputs always produce identical vectors.
 * @param text - the input string to embed
 * @returns a numeric vector representing the semantic meaning of the text
 * @throws if the Ollama API returns a non-2xx response
 */
export async function fetchEmbedding(text: string): Promise<number[]> {
  const cached = cache.get(text);
  if (cached) return cached;

  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { embedding: number[] };

  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(text, data.embedding);

  return data.embedding;
}
