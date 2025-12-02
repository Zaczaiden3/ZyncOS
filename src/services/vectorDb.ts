import { embedText } from './gemini';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: any;
  timestamp: number;
  temporalWeight?: number; // Dynamic weight based on recency
  sentiment?: 'positive' | 'neutral' | 'negative' | 'analytical';
}

interface VectorDB extends DBSchema {
  vectors: {
    key: string;
    value: VectorDocument;
    indexes: { 'by-timestamp': number };
  };
}

// IndexedDB-based Vector Store
// Scalable to thousands of documents without blocking the main thread.
export class VectorStore {
  private dbPromise: Promise<IDBPDatabase<VectorDB>>;
  private readonly DB_NAME = 'zync-vector-db';
  private readonly STORE_NAME = 'vectors';

  constructor() {
    this.dbPromise = openDB<VectorDB>(this.DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore('vectors', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async add(content: string, metadata?: any, sentiment?: 'positive' | 'neutral' | 'negative' | 'analytical') {
    if (!content || content.trim().length < 5) return;

    const embedding = await embedText(content);
    if (!embedding || embedding.length === 0) return;

    const doc: VectorDocument = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      content,
      embedding,
      metadata,
      timestamp: Date.now(),
      temporalWeight: 1.0, // Initial weight is max
      sentiment
    };

    const db = await this.dbPromise;
    await db.put(this.STORE_NAME, doc);
  }

  async search(query: string, topK: number = 5): Promise<VectorDocument[]> {
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding || queryEmbedding.length === 0) return [];

    const db = await this.dbPromise;
    const allDocs = await db.getAll(this.STORE_NAME);

    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;

    // Pre-calculate constants
    const decayRate = 0.1;
    const minDecay = 0.1;

    // Calculate Cosine Similarity & Apply Temporal Weighting
    const scoredDocs: (VectorDocument & { score: number })[] = [];
    
    for (const doc of allDocs) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        
        // Temporal Decay: Weight decreases as data gets older
        const ageHours = (now - doc.timestamp) / ONE_HOUR;
        const decayFactor = Math.max(minDecay, 1.0 - (ageHours * decayRate));
        
        // Weighted Score: 70% Similarity, 30% Temporal Recency
        const finalScore = (similarity * 0.7) + (decayFactor * 0.3);
        
        scoredDocs.push({ ...doc, score: finalScore, temporalWeight: decayFactor });
    }

    // Sort by score descending
    scoredDocs.sort((a, b) => b.score - a.score);

    return scoredDocs.slice(0, topK);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    const len = vecA.length;

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  async clear() {
      const db = await this.dbPromise;
      await db.clear(this.STORE_NAME);
  }

  async getAllDocuments(): Promise<VectorDocument[]> {
      const db = await this.dbPromise;
      return db.getAll(this.STORE_NAME);
  }
}

export const memoryStore = new VectorStore();
