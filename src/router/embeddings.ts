/**
 * fetchEmbedding - calls the Ollama embeddings API to convert text into a vector.
 * Uses the `nomic-embed-text` model for fast, lightweight embedding generation.
 * @param text - the input string to embed
 * @returns a numeric vector representing the semantic meaning of the text
 * @throws if the Ollama API returns a non-2xx response
 */
export async function fetchEmbedding(text: string): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}
