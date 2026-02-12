import { pipeline, env } from '@xenova/transformers';

// Disable local model checks (use cached models)
env.allowLocalModels = false;

export interface SemanticMatchResult {
  intent: string;
  score: number;
  matchedExample?: string;
}

export interface IntentExamples {
  intent: string;
  examples: string[];
}

/**
 * Semantic Matcher - Uses embeddings for similar meaning detection
 *
 * Catches queries that fuzzy matching misses:
 * - "wifi password" ≈ "internet code"
 * - "check in time" ≈ "when can I arrive"
 * - "how much" ≈ "what's the price"
 */
export class SemanticMatcher {
  private embedder: any = null;
  private intentEmbeddings = new Map<string, { centroid: number[]; examples: string[] }>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the semantic matcher (loads model and computes embeddings)
   * Call this once at startup - it's slow (~5-10 seconds)
   */
  async initialize(intentExamples: IntentExamples[]): Promise<void> {
    // Prevent multiple initializations
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize(intentExamples);
    await this.initPromise;
  }

  private async _initialize(intentExamples: IntentExamples[]): Promise<void> {
    try {
      console.log('[Semantic] Initializing embedding model...');
      const startTime = Date.now();

      // Load lightweight multilingual model
      // Using all-MiniLM-L6-v2 - small (80MB), fast, good quality
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { quantized: true }  // Smaller model size
      );

      console.log(`[Semantic] Model loaded in ${Date.now() - startTime}ms`);

      // Pre-compute embeddings for each intent
      console.log('[Semantic] Computing intent embeddings...');
      const embeddingStartTime = Date.now();

      for (const { intent, examples } of intentExamples) {
        if (examples.length === 0) continue;

        // Compute embedding for each example
        const embeddings = await Promise.all(
          examples.map(ex => this.embed(ex))
        );

        // Compute centroid (average of all examples)
        const centroid = this.computeCentroid(embeddings);

        this.intentEmbeddings.set(intent, { centroid, examples });
      }

      const totalTime = Date.now() - embeddingStartTime;
      console.log(
        `[Semantic] Computed ${intentExamples.length} intent embeddings in ${totalTime}ms`
      );

      this.initialized = true;
    } catch (error) {
      console.error('[Semantic] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if semantic matcher is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Match user text using semantic similarity
   * @param text User input text
   * @param threshold Minimum similarity threshold (0-1, default: 0.75)
   * @returns Best matching intent or null
   */
  async match(text: string, threshold = 0.75): Promise<SemanticMatchResult | null> {
    if (!this.initialized) {
      console.warn('[Semantic] Matcher not initialized, skipping');
      return null;
    }

    try {
      // Get embedding for user text
      const textEmbedding = await this.embed(text);

      // Compare against all intent centroids
      let bestMatch: SemanticMatchResult | null = null;

      for (const [intent, { centroid, examples }] of this.intentEmbeddings) {
        const similarity = this.cosineSimilarity(textEmbedding, centroid);

        if (similarity > threshold && (!bestMatch || similarity > bestMatch.score)) {
          bestMatch = {
            intent,
            score: similarity,
            matchedExample: examples[0] // First example as reference
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('[Semantic] Match error:', error);
      return null;
    }
  }

  /**
   * Get all matches above threshold
   * @param text User input text
   * @param threshold Minimum similarity threshold
   * @returns All matching intents sorted by score
   */
  async matchAll(text: string, threshold = 0.70): Promise<SemanticMatchResult[]> {
    if (!this.initialized) {
      return [];
    }

    try {
      const textEmbedding = await this.embed(text);
      const results: SemanticMatchResult[] = [];

      for (const [intent, { centroid, examples }] of this.intentEmbeddings) {
        const similarity = this.cosineSimilarity(textEmbedding, centroid);

        if (similarity >= threshold) {
          results.push({
            intent,
            score: similarity,
            matchedExample: examples[0]
          });
        }
      }

      // Sort by score descending
      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('[Semantic] MatchAll error:', error);
      return [];
    }
  }

  /**
   * Compute embedding vector for text
   * @param text Input text
   * @returns Embedding vector (384 dimensions)
   */
  private async embed(text: string): Promise<number[]> {
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });

    // Convert tensor to array
    return Array.from(output.data);
  }

  /**
   * Compute centroid (average) of multiple embeddings
   * @param embeddings Array of embedding vectors
   * @returns Centroid vector
   */
  private computeCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot compute centroid of empty embeddings');
    }

    const dimensions = embeddings[0].length;
    const centroid = new Array(dimensions).fill(0);

    // Sum all embeddings
    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += embedding[i];
      }
    }

    // Average
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  /**
   * Compute cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Similarity score (0-1, higher = more similar)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get statistics about loaded intents
   */
  getStats(): { totalIntents: number; totalExamples: number; ready: boolean } {
    let totalExamples = 0;
    for (const { examples } of this.intentEmbeddings.values()) {
      totalExamples += examples.length;
    }

    return {
      totalIntents: this.intentEmbeddings.size,
      totalExamples,
      ready: this.initialized
    };
  }
}

// Singleton instance
let semanticMatcherInstance: SemanticMatcher | null = null;

export function getSemanticMatcher(): SemanticMatcher {
  if (!semanticMatcherInstance) {
    semanticMatcherInstance = new SemanticMatcher();
  }
  return semanticMatcherInstance;
}
