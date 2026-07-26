import { pipeline } from '@xenova/transformers';

// Singleton pipeline — loaded once on first call, then cached in memory
let _pipe = null;
let _loading = false;

/**
 * Returns a 384-dimensional embedding vector for the given text.
 * Uses the all-MiniLM-L6-v2 model (runs 100% locally — zero API cost).
 * First call downloads & caches the model (~25MB). Subsequent calls are instant.
 *
 * @param {string} text
 * @returns {Promise<number[]>} 384-element float array
 */
export const embed = async (text) => {
  if (!_pipe) {
    if (!_loading) {
      _loading = true;
      console.log('🧠 Loading local embedding model (Xenova/all-MiniLM-L6-v2)...');
      console.log('   First load downloads ~25MB. This is a one-time download.');
    }
    _pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use quantized model for faster inference
    });
    _loading = false;
    console.log('✅ Embedding model ready. Semantic search is now active.');
  }

  const output = await _pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data); // Returns 384-element float array
};

/**
 * Compute cosine similarity between two 384-dim vectors.
 * Used for re-ranking in hybrid search.
 */
export const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Warm up the model at server startup so first search isn't slow.
 */
export const warmupEmbeddings = async () => {
  try {
    await embed('warmup devsolved semantic search');
    console.log('✅ Embedding model warmed up.');
  } catch (err) {
    console.warn('⚠️  Embedding model warmup failed:', err.message);
    console.warn('   Semantic search will still work, but first query may be slow.');
  }
};
