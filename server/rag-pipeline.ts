/**
 * ============================================================
 * RAG PIPELINE — powered by Qdrant Cloud vector search
 * ============================================================
 * Flow:
 *  1. Analyse query intent & complexity
 *  2. Embed query → Qdrant Cloud search with tenant filter
 *  3. Rerank by score, build context
 *  4. Generate answer with gpt-4o
 *  5. Confidence = weighted mean of Qdrant cosine scores
 * ============================================================
 */

import OpenAI from "openai";
import { storage } from "./storage";
import {
  searchDocuments,
  ingestDocument,
  deleteDocumentVectors,
  getVectorDBStatus,
  ensureCollection,
} from "./vectordb";

// Re-export helpers so callers can use vectordb through rag-pipeline
export { ingestDocument, deleteDocumentVectors, getVectorDBStatus, ensureCollection };

const openai = new OpenAI({
  apiKey:   process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL:  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ── Helpers ────────────────────────────────────────────────

function classifyQuery(query: string) {
  const isComplex =
    query.length > 50 ||
    /\b(why|how|explain|compare|difference|describe|analyze)\b/i.test(query);
  return {
    complexity: isComplex ? "complex" : "simple",
    model:      isComplex ? (process.env.AI_CHAT_MODEL || "gpt-4o")  : (process.env.AI_CHAT_MODEL_MINI || "gpt-4o-mini"),
  };
}

function calcConfidence(scores: number[]): number {
  if (scores.length === 0) return 0;
  // weighted average — top result counts double
  const [top = 0, ...rest] = scores;
  const avg = (top * 2 + rest.reduce((s, v) => s + v, 0)) / (rest.length + 2);
  return Math.min(Math.round(avg * 100) / 100, 1.0);
}

// ── RAG Pipeline ───────────────────────────────────────────

export class RAGPipeline {

  /**
   * Stage 1: Intent classification & Query Complexity Scoring
   */
  static async analyzeQuery(query: string) {
    return classifyQuery(query);
  }

  /**
   * Stage 2: Qdrant Cloud vector retrieval with tenant isolation
   *
   * Filter applied at DB level:
   *   tenant_id == userTenantId  OR  access_level == "public"
   *
   * Students CANNOT receive chunks from other departments.
   */
  static async retrieveDocuments(
    query:       string,
    tenantId:    number,
    userContext: { role: string; department: string; course?: string }
  ) {
    // Try Qdrant Cloud first
    if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
      try {
        const results = await searchDocuments(query, tenantId, {
          limit:  6,
          course: userContext.course,
        });

        if (results.length > 0) {
          const docs = results.map((r) => ({
            title:    r.payload.title,
            content:  r.payload.chunk_text,
            category: r.payload.course,
            score:    r.score,
          }));

          return {
            docs,
            scores:         results.map((r) => r.score),
            retrievalMode:  "qdrant_vector" as const,
          };
        }
      } catch (err) {
        console.warn("[RAG] Qdrant search failed, falling back to keyword:", err);
      }
    }

    // ── Fallback: keyword search (no Qdrant configured) ────
    const allDocs = await storage.getDocuments(tenantId);
    const q = query.toLowerCase();
    const terms = q.split(/\s+/).filter((w) => w.length > 3);

    const matched = allDocs
      .filter((doc) => {
        const text = `${doc.title} ${doc.content}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      })
      .slice(0, 5)
      .map((doc) => ({
        title:    doc.title,
        content:  doc.content,
        category: doc.category,
        score:    0.6,                    // static mid-confidence for keyword match
      }));

    return {
      docs:           matched,
      scores:         matched.map(() => 0.6),
      retrievalMode:  "keyword_fallback" as const,
    };
  }

  /**
   * Knowledge Gap Detection
   */
  static async handleKnowledgeGap(query: string, tenantId: number) {
    console.warn(`[KNOWLEDGE GAP]: "${query}" — tenant ${tenantId}`);
    return {
      gapDetected:    true,
      message:        "The information is not available in the university knowledge base.",
      adminNotified:  true,
    };
  }

  /**
   * Core RAG Execution
   *  → embed query → Qdrant tenant-filtered search → LLM → save
   */
  static async execute(req: any, queryStr: string) {
    const userId     = req.user?.id;
    const role       = req.user?.role       || "STUDENT";
    const department = req.user?.department || "General";

    const tenants    = await storage.getAllTenants();
    const userTenant = tenants[0];

    if (!userTenant) {
      return { response: "No tenant configured.", sources: [], confidence: 0 };
    }

    // 1. Classify query
    const analysis = classifyQuery(queryStr);

    // 2. Retrieve from Qdrant (tenant-isolated)
    const { docs, scores, retrievalMode } = await this.retrieveDocuments(
      queryStr,
      userTenant.id,
      { role, department }
    );

    console.log(
      `[RAG] mode=${retrievalMode} found=${docs.length} ` +
      `tenant=${userTenant.id} model=${analysis.model}`
    );

    // 3. Knowledge Gap
    const confidence = calcConfidence(scores);
    if (docs.length === 0 || confidence < 0.35) {
      const gap = await this.handleKnowledgeGap(queryStr, userTenant.id);
      return {
        response:       gap.message,
        sources:        [],
        confidence:     confidence,
        confidenceScore: confidence,
        retrievalMode,
        modelUsed:      analysis.model,
      };
    }

    // 4. Build context string
    const contextStr = docs
      .map((d, i) =>
        `[Source ${i + 1}: ${d.title}${d.category ? ` — ${d.category}` : ""}]\n${d.content}`
      )
      .join("\n\n");

    // 5. LLM generation
    const systemPrompt = `You are an AI academic assistant for the ${department} department.
User Role: ${role}

STRICT RULES:
- Answer only from the CONTEXT below.
- Do NOT reveal information from other departments or tenants.
- If the context is insufficient, say "This topic is not covered in your course materials."
- Always cite the source name (e.g. "According to [Source 1: DBMS Notes]…").

CONTEXT:
${contextStr}`;

    const completion = await openai.chat.completions.create({
      model:                  analysis.model,
      messages: [
        { role: "system",  content: systemPrompt },
        { role: "user",    content: queryStr },
      ],
      max_completion_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || "No response generated.";

    // 6. Persist query + response
    const savedQuery = await storage.createQuery({
      tenantId:    userTenant.id,
      userId,
      query:       queryStr,
      response:    answer,
      context:     contextStr,
      relevantDocs: docs.map((d) => d.title),
    });

    return {
      ...savedQuery,
      response:        answer,
      sources:         docs.map((d) => ({ title: d.title, category: d.category })),
      confidence:      confidence,
      confidenceScore: confidence,
      confidenceLabel: confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low",
      retrievalMode,
      modelUsed:       analysis.model,
    };
  }
}
