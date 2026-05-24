export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // Simple TF-style character n-gram embedding (no external deps)
  // Produces a 128-dim vector from character bigrams
  const vector = new Array(128).fill(0)
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '')
  for (let i = 0; i < normalized.length - 1; i++) {
    const bigram = normalized.slice(i, i + 2)
    let hash = 0
    for (let j = 0; j < bigram.length; j++) {
      hash = (hash * 31 + bigram.charCodeAt(j)) % 128
    }
    vector[Math.abs(hash)] += 1
  }
  // normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  return magnitude === 0 ? vector : vector.map(v => v / magnitude)
}