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
   * search - finds the best tool by averaging the top-k cosine similarity scores per tool.
   * This is more robust than nearest-neighbor when domains share structural phrase patterns
   * (e.g. "best movies right now" vs "best albums right now").
   * Falls back to `"skip_api_call"` if the store is empty.
   * @param queryEmbedding - the embedding of the user's input
   * @param k - number of top examples per tool to average (default: 3)
   * @returns the best-matching tool name and its aggregated similarity score
   */
  search(queryEmbedding: number[], k = 3): { tool: string; score: number } {
    // Score every entry
    const scored = this.entries.map((entry) => ({
      tool: entry.tool,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Group scores by tool, keep top-k per tool, then average them
    const toolScores = new Map<string, number[]>();
    for (const { tool, score } of scored) {
      if (!toolScores.has(tool)) toolScores.set(tool, []);
      toolScores.get(tool)!.push(score);
    }

    let best = { tool: "skip_api_call", score: -Infinity };
    for (const [tool, scores] of toolScores) {
      const topK = scores.sort((a, b) => b - a).slice(0, k);
      const avg = topK.reduce((s, x) => s + x, 0) / topK.length;
      if (avg > best.score) {
        best = { tool, score: avg };
      }
    }
    return best;
  }
}
