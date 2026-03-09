interface VectorEntry {
  tool: string;
  example: string;
  embedding: number[];
}

/**
 * cosineSimilarity - computes the cosine similarity between two vectors.
 * Returns a value in [-1, 1] where 1 means identical direction.
 * Returns 0 if either vector has zero magnitude.
 * @param a - first embedding vector
 * @param b - second embedding vector
 * @returns cosine similarity score
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  /**
   * add - stores a labelled embedding in the vector store.
   * @param tool - the tool name this example belongs to (e.g. `"weather_request"`)
   * @param example - the original example phrase
   * @param embedding - the pre-computed embedding vector for the phrase
   */
  add(tool: string, example: string, embedding: number[]): void {
    this.entries.push({ tool, example, embedding });
  }

  /**
   * search - finds the closest tool to the given query embedding via brute-force cosine scan.
   * Falls back to `"skip_api_call"` if the store is empty.
   * @param queryEmbedding - the embedding of the user's input
   * @returns the best-matching tool name and its similarity score
   */
  search(queryEmbedding: number[]): { tool: string; score: number } {
    let best = { tool: "skip_api_call", score: -Infinity };
    for (const entry of this.entries) {
      const score = cosineSimilarity(queryEmbedding, entry.embedding);
      if (score > best.score) {
        best = { tool: entry.tool, score };
      }
    }
    return best;
  }
}
