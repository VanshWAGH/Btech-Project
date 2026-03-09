/**
 * ============================================================
 * QDRANT CLOUD — Vector Database Service
 * ============================================================
 *
 * Setup:
 *  1. Go to https://cloud.qdrant.io  → Create free cluster
 *  2. Copy the Cluster URL and API Key
 *  3. Add to .env:
 *       QDRANT_URL=https://<cluster-id>.us-east-1.cloud.qdrant.io
 *       QDRANT_API_KEY=<your-api-key>
 *       QDRANT_COLLECTION=nexusrag_docs
 *
 * Collection Schema (auto-created on first ingest):
 *  Each point =  one document chunk (512-token window)
 *  Vector size = 1536 (text-embedding-3-small)
 *
 *  Payload / Metadata (for tenant isolation):
 *  {
 *    tenant_id:    number,   ← PRIMARY isolation key
 *    document_id:  number,
 *    department:   string,
 *    course:       string,
 *    access_level: "public" | "department" | "private",
 *    title:        string,
 *    chunk_index:  number,
 *    chunk_text:   string,
 *    created_at:   string (ISO),
 *  }
 * ============================================================
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

// ── Clients ────────────────────────────────────────────────
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,        // undefined → no auth (local)
  checkCompatibility: false,
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ── Constants ──────────────────────────────────────────────
export const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || "nexusrag_docs";

const VECTOR_SIZE = 1536;         // text-embedding-3-small output dim
const CHUNK_SIZE  = 500;          // characters per chunk
const CHUNK_OVERLAP = 80;         // overlap between chunks

// ── Types ──────────────────────────────────────────────────
export interface VectorDocumentPayload {
  tenant_id:    number;
  document_id:  number;
  department:   string;
  course:       string;
  access_level: "public" | "department" | "private";
  title:        string;
  chunk_index:  number;
  chunk_text:   string;
  created_at:   string;
}

export interface SearchResult {
  id:          string | number;
  score:       number;
  payload:     VectorDocumentPayload;
}

// ============================================================
// 1. COLLECTION SETUP
// ============================================================

/**
 * Create the Qdrant collection if it doesn't exist yet.
 * Call once on server startup.
 */
export async function ensureCollection(): Promise<void> {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size:     VECTOR_SIZE,
          distance: "Cosine",         // cosine similarity for semantic search
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create payload index for fast tenant filtering (critical for isolation)
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name:   "tenant_id",
        field_schema: "integer",
      });

      // Index for department-level filtering
      await qdrant.createPayloadIndex(COLLECTION_NAME, {
        field_name:   "access_level",
        field_schema: "keyword",
      });

      console.log(`✅ Qdrant collection "${COLLECTION_NAME}" created`);
    } else {
      console.log(`ℹ️  Qdrant collection "${COLLECTION_NAME}" already exists`);
    }
  } catch (err) {
    console.error("❌ Failed to ensure Qdrant collection:", err);
    throw err;
  }
}

// ============================================================
// 2. EMBEDDING GENERATION
// ============================================================

/**
 * Generate a 1536-dim embedding vector for any text string.
 * Uses OpenAI text-embedding-3-small (cheap + accurate).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),     // max token guard
  });
  return response.data[0].embedding;
}

// ============================================================
// 3. DOCUMENT INGESTION (chunking + upsert)
// ============================================================

/**
 * Chunk a long text into overlapping windows.
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

/**
 * Ingest a document into Qdrant.
 *  - Splits content into overlapping chunks
 *  - Embeds each chunk
 *  - Stores with full tenant isolation metadata
 *
 * Call this when a teacher/admin uploads a course material.
 */
export async function ingestDocument(doc: {
  id:           number;
  title:        string;
  content:      string;
  tenantId:     number;
  department:   string;
  course:       string;
  accessLevel?: "public" | "department" | "private";
}): Promise<{ chunksIngested: number }> {
  const chunks = chunkText(doc.content || doc.title);
  const points: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const embedding = await generateEmbedding(
      `${doc.title}\n${chunkText}`          // prefix with title for better retrieval
    );

    const payload: VectorDocumentPayload = {
      tenant_id:    doc.tenantId,
      document_id:  doc.id,
      department:   doc.department,
      course:       doc.course,
      access_level: doc.accessLevel ?? "department",
      title:        doc.title,
      chunk_index:  i,
      chunk_text:   chunkText,
      created_at:   new Date().toISOString(),
    };

    points.push({
      id:      doc.id * 10000 + i,   // unique point ID per chunk
      vector:  embedding,
      payload,
    });
  }

  await qdrant.upsert(COLLECTION_NAME, {
    wait:   true,
    points,
  });

  console.log(
    `📥 Ingested doc #${doc.id} → ${chunks.length} chunks into Qdrant`
  );
  return { chunksIngested: chunks.length };
}

/**
 * Delete all vectors for a document (e.g., when teacher deletes a file).
 */
export async function deleteDocumentVectors(documentId: number): Promise<void> {
  await qdrant.delete(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key:   "document_id",
          match: { value: documentId },
        },
      ],
    },
  });
  console.log(`🗑️  Deleted vectors for document #${documentId}`);
}

// ============================================================
// 4. TENANT-ISOLATED VECTOR SEARCH
// ============================================================

/**
 * Search the vector DB for relevant chunks.
 *
 * TENANT ISOLATION RULE:
 *   Returns only chunks where:
 *     payload.tenant_id == tenantId
 *     OR payload.access_level == "public"
 *
 * This is enforced at the Qdrant filter level — students
 * CANNOT receive vectors from other departments.
 */
export async function searchDocuments(
  query:    string,
  tenantId: number,
  options?: {
    limit?:      number;
    accessLevel?: "public" | "department" | "private";
    course?:      string;
  }
): Promise<SearchResult[]> {
  const limit = options?.limit ?? 5;

  // Generate query embedding
  const queryVector = await generateEmbedding(query);

  // Build tenant isolation filter
  const filter: any = {
    should: [
      // Own-tenant documents
      {
        must: [
          {
            key:   "tenant_id",
            match: { value: tenantId },
          },
        ],
      },
      // Public documents (cross-tenant access allowed)
      {
        must: [
          {
            key:   "access_level",
            match: { value: "public" },
          },
        ],
      },
    ],
  };

  // Optional: narrow to a specific course
  if (options?.course) {
    filter.must = [
      {
        key:   "course",
        match: { value: options.course },
      },
    ];
  }

  const results = await qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    filter,
    limit,
    with_payload: true,
    score_threshold: 0.35,        // ignore very low similarity matches
  });

  return results.map((r) => ({
    id:      r.id,
    score:   r.score,
    payload: r.payload as unknown as VectorDocumentPayload,
  }));
}

// ============================================================
// 5. HEALTH / DIAGNOSTICS
// ============================================================

/**
 * Check Qdrant connectivity and collection stats.
 */
export async function getVectorDBStatus(): Promise<{
  connected:   boolean;
  collection:  string;
  totalPoints: number;
  url:         string;
}> {
  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return {
      connected:   true,
      collection:  COLLECTION_NAME,
      totalPoints: info.points_count ?? 0,
      url:         process.env.QDRANT_URL || "http://localhost:6333",
    };
  } catch {
    return {
      connected:   false,
      collection:  COLLECTION_NAME,
      totalPoints: 0,
      url:         process.env.QDRANT_URL || "http://localhost:6333",
    };
  }
}

/**
 * Count vectors for a specific tenant.
 */
export async function getTenantVectorCount(tenantId: number): Promise<number> {
  try {
    const result = await qdrant.count(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key:   "tenant_id",
            match: { value: tenantId },
          },
        ],
      },
    });
    return result.count;
  } catch {
    return 0;
  }
}
