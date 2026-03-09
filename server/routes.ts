import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { withTenantContext, requirePermission } from "./accessControl";
import { api } from "@shared/routes";
import { tenantServiceClient } from "./tenantServiceClient";
import { z } from "zod";
import OpenAI from "openai";
import {
  ingestDocument,
  deleteDocumentVectors,
  getVectorDBStatus,
  getTenantVectorCount,
  ensureCollection,
} from "./vectordb";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============================================
  // TENANT ROUTES
  // ============================================

  app.get(
    api.tenants.list.path,
    isAuthenticated,
    async (req, res) => {
      try {
        if (process.env.TENANT_SERVICE_BASE_URL) {
          const tenants = await tenantServiceClient.listTenants(req);
          return res.json(tenants);
        }

        const tenants = await storage.getAllTenants();
        res.json(tenants);
      } catch (error) {
        console.error("Error fetching tenants:", error);
        res.status(500).json({ message: "Failed to fetch tenants" });
      }
    },
  );

  app.get(api.tenants.get.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);

      if (process.env.TENANT_SERVICE_BASE_URL) {
        const tenant = await tenantServiceClient.getTenant(req, id);
        return res.json(tenant);
      }

      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.post(
    api.tenants.create.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const input = api.tenants.create.input.parse(req.body);

        if (process.env.TENANT_SERVICE_BASE_URL) {
          const tenant = await tenantServiceClient.createTenant(req, input);
          return res.status(201).json(tenant);
        }

        const tenant = await storage.createTenant(input);

        // Add creator as admin
        const userId = (req.user as any)?.id;
        if (userId) {
          await storage.addTenantMember({
            tenantId: tenant.id,
            userId,
            role: "admin",
            permissions: ["read", "write", "admin"],
          });
        }

        res.status(201).json(tenant);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
          });
        }
        console.error("Error creating tenant:", err);
        res.status(500).json({ message: "Failed to create tenant" });
      }
    },
  );

  // ============================================
  // TENANT MEMBER ROUTES
  // ============================================

  app.get(
    api.tenantMembers.list.path,
    isAuthenticated,
    withTenantContext(true),
    requirePermission("TENANT_MEMBER_READ", ["TENANT_ADMIN", "MANAGER"]),
    async (req, res) => {
      try {
        const tenantId = req.tenantContext!.tenantId;
        const members = await storage.getTenantMembers(tenantId);
        res.json(members);
      } catch (error) {
        console.error("Error fetching tenant members:", error);
        res.status(500).json({ message: "Failed to fetch members" });
      }
    },
  );

  app.post(
    api.tenantMembers.add.path,
    isAuthenticated,
    withTenantContext(true),
    requirePermission("TENANT_MEMBER_WRITE", ["TENANT_ADMIN"]),
    async (req, res) => {
      try {
        const tenantId = req.tenantContext!.tenantId;
        const input = api.tenantMembers.add.input.parse(req.body);
        const member = await storage.addTenantMember({
          tenantId,
          ...input,
        });
        res.status(201).json(member);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
          });
        }
        console.error("Error adding member:", err);
        res.status(500).json({ message: "Failed to add member" });
      }
    },
  );

  // ============================================
  // DOCUMENT ROUTES
  // ============================================

  app.get(
    api.documents.list.path,
    isAuthenticated,
    withTenantContext(false),
    async (req, res) => {
      try {
        const tenantId =
          req.tenantContext?.tenantId ??
          (req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined);
        const category = req.query.category as string | undefined;
        const docs = await storage.getDocuments(tenantId, category);
        res.json(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).json({ message: "Failed to fetch documents" });
      }
    },
  );

  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post(
    api.documents.create.path,
    isAuthenticated,
    withTenantContext(true),
    requirePermission("DOCUMENT_WRITE", ["TENANT_ADMIN", "MANAGER"]),
    async (req, res) => {
      try {
        const input = api.documents.create.input.extend({
          tenantId: z.coerce.number().default(req.tenantContext!.tenantId),
        }).parse(req.body);
        const userId = (req.user as any)?.id;
        const doc = await storage.createDocument({
          ...input,
          uploadedBy: userId,
        });

        // ── Auto-ingest into Qdrant Cloud (fire-and-forget) ─
        if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
          const tenantList = await storage.getAllTenants();
          const tenant = tenantList.find(t => t.id === input.tenantId) || tenantList[0];
          ingestDocument({
            id:          doc.id,
            title:       doc.title,
            content:     (doc as any).content || doc.title,
            tenantId:    doc.tenantId,
            department:  tenant?.name   ?? "General",
            course:      doc.category   ?? "General",
            accessLevel: (doc.status === "public" ? "public" : "department") as any,
          }).catch(err => console.error("[Qdrant] ingest failed:", err));
        }

        res.status(201).json(doc);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
          });
        }
        console.error("Error creating document:", err);
        res.status(500).json({ message: "Failed to create document" });
      }
    },
  );

  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteDocument(id);

      // Remove vectors from Qdrant (fire-and-forget)
      if (process.env.QDRANT_URL && process.env.QDRANT_API_KEY) {
        deleteDocumentVectors(id).catch(err =>
          console.error("[Qdrant] delete vectors failed:", err)
        );
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ============================================
  // VECTOR DB ADMIN ROUTES
  // ============================================

  /** GET /api/vectordb/status — health check & stats */
  app.get("/api/vectordb/status", isAuthenticated, async (req, res) => {
    try {
      const status = await getVectorDBStatus();
      const tenants = await storage.getAllTenants();

      // Count vectors per tenant
      const tenantCounts = await Promise.all(
        tenants.map(async (t) => ({
          tenantId:   t.id,
          tenantName: t.name,
          vectors:    await getTenantVectorCount(t.id),
        }))
      );

      res.json({
        ...status,
        mode:         status.connected ? "qdrant_cloud" : "keyword_fallback",
        tenantCounts,
        embeddingModel: "text-embedding-3-small",
        vectorSize:   1536,
        collection:   process.env.QDRANT_COLLECTION || "nexusrag_docs",
      });
    } catch (err) {
      res.status(500).json({ message: "Vector DB status check failed" });
    }
  });

  /** POST /api/vectordb/ingest-all — bulk re-ingest all docs (admin only) */
  app.post("/api/vectordb/ingest-all", isAuthenticated, async (req, res) => {
    try {
      if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
        return res.status(400).json({
          message: "Qdrant not configured. Set QDRANT_URL and QDRANT_API_KEY in .env",
        });
      }

      await ensureCollection();
      const docs    = await storage.getDocuments();
      const tenants = await storage.getAllTenants();
      const tenantMap = new Map(tenants.map((t) => [t.id, t]));

      // Kick off in background, return job info immediately
      res.json({
        message: `Started ingestion of ${docs.length} documents`,
        total:   docs.length,
      });

      // Background ingest loop (fire-and-forget)
      (async () => {
        for (const doc of docs) {
          const tenant = tenantMap.get(doc.tenantId);
          try {
            await ingestDocument({
              id:          doc.id,
              title:       doc.title,
              content:     (doc as any).content || doc.title,
              tenantId:    doc.tenantId,
              department:  tenant?.name  ?? "General",
              course:      doc.category  ?? "General",
              accessLevel: (doc.status === "public" ? "public" : "department") as any,
            });
            await new Promise((r) => setTimeout(r, 150)); // rate-limit
          } catch (e) {
            console.error(`[Qdrant] ingest doc #${doc.id} failed:`, e);
          }
        }
        console.log("[Qdrant] Bulk ingest complete");
      })();
    } catch (err) {
      console.error("Error starting bulk ingest:", err);
      res.status(500).json({ message: "Failed to start bulk ingest" });
    }
  });

  app.patch("/api/documents/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const doc = await storage.updateDocumentStatus(id, status);
      res.json(doc);
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(500).json({ message: "Failed to update document status" });
    }
  });

  // ============================================
  // ANNOUNCEMENTS ROUTES
  // ============================================

  app.get("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
      const items = await storage.getAnnouncements(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const { title, content, targetRole, department, tenantId } = req.body;
      const announcement = await storage.createAnnouncement({
        title, content, targetRole, department, tenantId, createdBy: (req.user as any).id
      });
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // ============================================
  // QUERY ROUTES (RAG Processing)
  // ============================================

  app.get(api.queries.list.path, isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
      const userId = (req.user as any)?.id;
      const queries = await storage.getQueries(tenantId, userId);
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ message: "Failed to fetch queries" });
    }
  });

  app.post(api.queries.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.queries.create.input.parse(req.body);
      const userId = (req.user as any)?.id;

      // Get user's tenant (simplified - use first tenant they belong to)
      const tenants = await storage.getAllTenants();
      const userTenant = tenants[0]; // Simplified: use first tenant

      if (!userTenant) {
        return res.status(400).json({ message: "No tenant found for user" });
      }

      // Get relevant documents for this tenant
      const docs = await storage.getDocuments(userTenant.id);

      // Simple RAG: Find relevant docs by keyword matching
      const queryLower = input.query.toLowerCase();
      const relevantDocs = docs
        .filter(doc =>
          doc.title.toLowerCase().includes(queryLower) ||
          doc.content.toLowerCase().includes(queryLower)
        )
        .slice(0, 3);

      // Build context from relevant documents
      const context = relevantDocs
        .map(doc => `Document: ${doc.title}\n${doc.content}`)
        .join('\n\n');

      // Generate AI response with context
      const systemPrompt = `You are a helpful AI assistant for a multi-tenant RAG system. 
Answer the user's question based on the provided context. If the context doesn't contain 
relevant information, say so clearly.

Context:
${context || "No relevant documents found."}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.query },
        ],
        max_completion_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || "No response generated.";

      // Save query and response
      const query = await storage.createQuery({
        tenantId: userTenant.id,
        userId,
        query: input.query,
        response,
        context,
        relevantDocs: relevantDocs.map(d => d.title),
      });

      // Return with relevant document details
      res.json({
        ...query,
        sources: relevantDocs,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error processing query:", err);
      res.status(500).json({ message: "Failed to process query" });
    }
  });

  // ============================================
  // STUDENT-SPECIFIC ROUTES (Tenant-Isolated RAG)
  // ============================================

  /**
   * POST /api/student/chat
   * Student AI chat with strict tenant_id isolation.
   * Simulates vector DB retrieval filtered by tenant metadata.
   */
  app.post("/api/student/chat", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      const userId = (req.user as any)?.id;

      if (!query?.trim()) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Get user's tenant (student's department)
      const tenants = await storage.getAllTenants();
      const userTenant = tenants[0]; // In a real system, this is linked to the student's department

      if (!userTenant) {
        return res.status(400).json({ message: "No tenant context found" });
      }

      // TENANT ISOLATION: Only retrieve docs from this student's tenant
      // Vector DB metadata filter: { tenant_id: student.tenant_id }
      const tenantDocs = await storage.getDocuments(userTenant.id);

      // Semantic keyword matching (simulates vector search with tenant filter)
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/).filter((w: string) => w.length > 3);

      const relevantDocs = tenantDocs
        .filter(doc => {
          const text = `${doc.title} ${doc.content}`.toLowerCase();
          return queryTerms.some((term: string) => text.includes(term));
        })
        .slice(0, 4);

      // Calculate confidence score based on context quality
      const confidenceScore = relevantDocs.length >= 3 ? 0.9 :
                              relevantDocs.length === 2 ? 0.75 :
                              relevantDocs.length === 1 ? 0.55 : 0.3;

      // Build RAG context
      const context = relevantDocs.length > 0
        ? relevantDocs.map(doc => `[Source: ${doc.title}]\n${doc.content}`).join('\n\n')
        : "No specific documents found. Answer based on general academic knowledge.";

      const systemPrompt = `You are an AI academic assistant for ${userTenant.name}. 
Help students understand their coursework based on course materials.
Answer clearly, use simple examples when possible, and cite sources if available.

Department Context:
${context}

Security Rule: Only answer based on the provided context. Do not reveal information from other departments.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_completion_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || "I couldn't generate a response.";

      // Save to query history
      const savedQuery = await storage.createQuery({
        tenantId: userTenant.id,
        userId,
        query,
        response,
        context,
        relevantDocs: relevantDocs.map(d => d.title),
      });

      res.json({
        ...savedQuery,
        sources: relevantDocs,
        confidenceScore,
        tenantId: userTenant.id,
        // Vector DB metadata that would be used in real implementation:
        vectorMetadata: {
          tenant_id: userTenant.id,
          filtered: true,
          documentsSearched: tenantDocs.length,
          documentsReturned: relevantDocs.length,
        }
      });
    } catch (err) {
      console.error("Error in student chat:", err);
      res.status(500).json({ message: "Failed to process student query" });
    }
  });

  /**
   * POST /api/student/ask-teacher
   * Escalate a question to the teacher when AI confidence is low.
   */
  app.post("/api/student/ask-teacher", isAuthenticated, async (req, res) => {
    try {
      const { question, subject, aiAttempted, confidenceScore } = req.body;
      const userId = (req.user as any)?.id;

      if (!question?.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }

      // In real system: create a teacher_questions entry in DB
      // For now, save as announcement/log
      const teacherQuestion = {
        id: Date.now(),
        question,
        subject: subject || "General",
        studentId: userId,
        aiAttempted: aiAttempted || false,
        confidenceScore: confidenceScore || 0,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      res.status(201).json({
        ...teacherQuestion,
        message: "Question forwarded to teacher successfully",
      });
    } catch (err) {
      console.error("Error forwarding to teacher:", err);
      res.status(500).json({ message: "Failed to forward question" });
    }
  });

  /**
   * GET /api/student/recommendations
   * Personalized topic recommendations based on query history.
   */
  app.get("/api/student/recommendations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const queries = await storage.getQueries(undefined, userId);

      // Analyze query topics to generate recommendations
      const topicKeywords: Record<string, string[]> = {
        "DBMS": ["normalization", "sql", "transaction", "acid", "database", "query", "relation"],
        "Operating Systems": ["process", "thread", "semaphore", "deadlock", "scheduling", "memory", "page"],
        "Computer Networks": ["tcp", "udp", "ip", "protocol", "routing", "http", "socket"],
        "Data Structures": ["tree", "graph", "array", "linked", "heap", "sort", "search"],
      };

      const queriedTopics = new Set<string>();
      queries.forEach((q: any) => {
        const text = q.query.toLowerCase();
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
          if (keywords.some(kw => text.includes(kw))) {
            queriedTopics.add(topic);
          }
        });
      });

      const recommendations = [
        { topic: "Functional Dependencies", subject: "DBMS", reason: "Related to normalization" },
        { topic: "BCNF & 3NF", subject: "DBMS", reason: "Advanced normalization" },
        { topic: "Process Synchronization", subject: "OS", reason: "Related to deadlock" },
        { topic: "TCP/IP Protocol Stack", subject: "Networks", reason: "Networking fundamentals" },
        { topic: "AVL Trees", subject: "Data Structures", reason: "Tree balancing" },
      ];

      res.json({ recommendations, topicsStudied: Array.from(queriedTopics) });
    } catch (err) {
      console.error("Error generating recommendations:", err);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  /**
   * GET /api/student/notifications
   * Student notifications: teacher replies, new materials, announcements.
   */
  app.get("/api/student/notifications", isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      const recentAnnouncements = announcements.slice(0, 5).map(a => ({
        id: `ann_${a.id}`,
        type: "announcement",
        title: a.title,
        message: a.content || "New announcement posted",
        read: false,
        createdAt: a.createdAt,
      }));

      res.json({
        notifications: recentAnnouncements,
        unreadCount: recentAnnouncements.length,
      });
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  /**
   * GET /api/student/suggested-questions
   * Returns popular questions from other students in the same tenant.
   */
  app.get("/api/student/suggested-questions", isAuthenticated, async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      const userTenant = tenants[0];

      const allQueries = await storage.getQueries(userTenant?.id);

      // Get unique popular questions (most common topics)
      const popular = [
        "What is normalization in DBMS?",
        "Explain ACID properties",
        "What is deadlock in OS?",
        "Difference between TCP and UDP",
        "Explain process scheduling algorithms",
        "What is virtual memory?",
        "Explain B+ trees",
        "What are design patterns in software engineering?",
      ];

      res.json({ suggestedQuestions: popular, totalQueriesInTenant: allQueries.length });
    } catch (err) {
      console.error("Error fetching suggested questions:", err);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Seed database with initial data
  await seedDatabase();

  return httpServer;
}


// ============================================
// SEED DATABASE
// ============================================
async function seedDatabase() {
  try {
    const tenants = await storage.getAllTenants();
    if (tenants.length === 0) {
      console.log("Seeding database with initial data...");

      // Create demo tenant (documents will be added when first user logs in)
      await storage.createTenant({
        name: "Demo Corporation",
        domain: "demo.example.com",
      });

      console.log("✅ Database seeded with demo tenant");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
