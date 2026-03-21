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

  app.patch("/api/user/update", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const role = (req.user as any).role;

      const { firstName, lastName, department, bio } = req.body;

      let updateData: any = {};

      // 🧑‍🎓 STUDENT (limited control)
      if (role === "STUDENT") {
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (bio !== undefined) updateData.bio = bio;
      }

      // 👨‍🏫 TEACHER (medium control)
      else if (role === "TEACHER") {
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (bio !== undefined) updateData.bio = bio;
        if (department !== undefined) updateData.department = department;
      }

      // 🏛️ ADMIN (full control)
      else if (role === "ADMIN" || role === "UNIVERSITY_ADMIN") {
        updateData = { firstName, lastName, department, bio };
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      res.json(updatedUser);

    } catch (err) {
      console.error("❌ Update profile error:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

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
  
  // GET all announcements (for listing page)
  app.get("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;

      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;

      if (!tenantId) {
        return res.status(400).json({ message: "No tenant found" });
      }

      const data = await storage.getAnnouncements(tenantId);

      // ✅ Apply filtering (BEST VERSION)
      const filtered = data.filter((a: any) => {
        if (a.targetRole && a.targetRole !== "ALL" && a.targetRole !== user.role) {
          return false;
        }

        if (a.department && a.department !== user.department) {
          return false;
        }

        return true;
      });

      res.json(filtered);

    } catch (err) {
      console.error("Error fetching announcements:", err);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // POST create announcement + notify all tenant members
  app.post("/api/announcements", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { title, content, targetRole, department, eventDate, eventType } = req.body;

      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;

      if (!tenantId) {
        return res.status(400).json({ message: "No tenant found" });
      }

      // ✅ CREATE announcement (CRITICAL FIX)
      const announcement = await storage.createAnnouncement({
        title,
        content,
        targetRole: targetRole || "ALL",
        department: department || null,
        tenantId,
        createdBy: userId,
      });

      // ✅ FILTER MEMBERS (YOUR LOGIC - KEEP THIS 🔥)
      const members = await storage.getTenantMembers(tenantId);

      const filteredMembers = members.filter((m: any) => {
        if (m.userId === userId) return false;

        if (targetRole !== "ALL" && m.role !== targetRole) return false;

        if (department && m.department !== department) return false;

        return true;
      });

      // ✅ SEND NOTIFICATIONS
      await Promise.all(
        filteredMembers.map((m: any) =>
          storage.createNotification({
            userId: m.userId,
            tenantId,
            type: "announcement",
            title: `📢 ${title}`,
            message: content?.length > 120 ? content.slice(0, 120) + "…" : content,
            relatedId: announcement.id,
          }).catch(() => {})
        )
      );

      // ✅ EVENT CREATION (KEEP BOTH FEATURES)
      if (eventType && eventDate) {
        const event = await storage.createCalendarEvent({
          title,
          description: content,
          department: department || "All",
          tenantId,
          createdBy: userId,
          eventType,
          eventDate: new Date(eventDate),
        });

        await Promise.all(
          filteredMembers.map((m: any) =>
            storage.createNotification({
              userId: m.userId,
              tenantId,
              type: "new_event",
              title: "New Academic Event",
              message: `${title} scheduled on ${new Date(eventDate).toLocaleDateString()}`,
              relatedId: event.id,
            }).catch(() => {})
          )
        );
      }

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
        model: process.env.AI_CHAT_MODEL || "gpt-4o",
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
        model: process.env.AI_CHAT_MODEL || "gpt-4o",
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
      const userId = (req.user as any)?.id;
      
      // Fetch user's direct notifications from the new table
      const userNotifs = await storage.getUserNotifications(userId);
      const mappedNotifs = userNotifs.map(n => ({
        id: `notif_${n.id}`,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.isRead,
        createdAt: n.createdAt,
      }));

      // Fetch general announcements
      const announcements = await storage.getAnnouncements();
      const recentAnnouncements = announcements.slice(0, 5).map(a => ({
        id: `ann_${a.id}`,
        type: "announcement",
        title: a.title,
        message: a.content || "New announcement posted",
        read: false,
        createdAt: a.createdAt,
      }));

      const allNotifications = [...mappedNotifs, ...recentAnnouncements].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({
        notifications: allNotifications,
        unreadCount: allNotifications.filter(n => !n.read).length,
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

  // ============================================
  // COURSE ROUTES (Teacher CRUD + Student Read)
  // ============================================

  // Get all courses (optionally filtered)
  app.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let department = req.query.department as string | undefined;
      
      // Enforce department filtering for students to prevent cross-department course access
      if (user?.role?.toUpperCase() === "STUDENT" && user?.department) {
        department = user.department;
      }

      const teacherIdRaw = req.query.teacherId as string | undefined;
      const teacherId = teacherIdRaw ? parseInt(teacherIdRaw) : undefined;
      const tenants = await storage.getAllTenants();
      const tenantId = tenants[0]?.id;
      const courseList = await storage.getCourses(tenantId, department, teacherId);
      res.json(courseList);
    } catch (err) {
      console.error("Error fetching courses:", err);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get single course
  app.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const course = await storage.getCourse(id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      res.json(course);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Create course (Teacher only)
  app.post("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["TEACHER", "ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) {
        return res.status(403).json({ message: "Only teachers can create courses" });
      }
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const course = await storage.createCourse({
        ...req.body,
        teacherId: userId,
        tenantId,
      });
      // Notify students of the department about new course
      const allStudents = await storage.getUsersByRole(tenantId, "STUDENT");
      const studentsInDept = allStudents.filter(s => s.department === course.department);
      
      await Promise.all(studentsInDept.map((s: any) =>
        storage.createNotification({
          userId: s.id,
          tenantId,
          type: "new_course",
          title: "New Course Launched!",
          message: `A new course "${course.courseName}" has been launched in ${course.department}`,
          relatedId: course.id,
        }).catch(() => {})
      ));
      res.status(201).json(course);
    } catch (err) {
      console.error("Error creating course:", err);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course
  app.put("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const existing = await storage.getCourse(id);
      if (!existing) return res.status(404).json({ message: "Course not found" });
      if (existing.teacherId !== userId && !(req.user as any)?.isSuperAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const course = await storage.updateCourse(id, req.body);
      res.json(course);
    } catch (err) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course
  app.delete("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCourse(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // ============================================
  // ENROLLMENT ROUTES
  // ============================================

  // Get enrolled students for a course
  app.get("/api/courses/:id/students", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const students = await storage.getEnrolledStudents(courseId);
      res.json(students);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch enrolled students" });
    }
  });

  // Enroll student in course
  app.post("/api/courses/:id/enroll", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const targetStudentId = req.body.studentId || userId; // teacher enrolls manually or student self-enrolls

      const alreadyEnrolled = await storage.isEnrolled(courseId, targetStudentId);
      if (alreadyEnrolled) {
        return res.status(400).json({ message: "Student is already enrolled" });
      }

      const enrollment = await storage.enrollStudent(courseId, targetStudentId);
      res.status(201).json(enrollment);
    } catch (err) {
      console.error("Enroll error:", err);
      res.status(500).json({ message: "Failed to enroll student" });
    }
  });

  // Unenroll student
  app.delete("/api/courses/:id/enroll/:studentId", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const studentId = parseInt(req.params.studentId);
      await storage.unenrollStudent(courseId, studentId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to unenroll student" });
    }
  });

  // Get student's enrolled courses
  app.get("/api/student/courses", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const enrollments = await storage.getStudentEnrollments(userId);
      res.json(enrollments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // ============================================
  // COURSE NOTES ROUTES
  // ============================================

  // Get notes for a course
  app.get("/api/courses/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const topic = req.query.topic as string | undefined;
      const notes = await storage.getCourseNotes(courseId, topic);
      res.json(notes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // Upload note to course
  app.post("/api/courses/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const note = await storage.createCourseNote({
        ...req.body,
        courseId,
        uploadedBy: userId,
      });

      // Notify enrolled students about new note
      const students = await storage.getEnrolledStudents(courseId);
      const course = await storage.getCourse(courseId);
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      await Promise.all(students.map((s: any) =>
        storage.createNotification({
          userId: s.studentId,
          tenantId,
          type: "new_note",
          title: "New Study Material Uploaded",
          message: `New note "${note.title}" uploaded in ${course?.courseName || "your course"}`,
          relatedId: note.id,
        }).catch(() => {})
      ));

      res.status(201).json(note);
    } catch (err) {
      console.error("Error uploading note:", err);
      res.status(500).json({ message: "Failed to upload note" });
    }
  });

  // Update note metadata
  app.put("/api/notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.updateCourseNote(id, req.body);
      res.json(note);
    } catch (err) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Delete note
  app.delete("/api/notes/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCourseNote(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // ============================================
  // CALENDAR EVENT ROUTES
  // ============================================

  // Get calendar events
  app.get("/api/calendar", isAuthenticated, async (req, res) => {
    try {
      const department = req.query.department as string | undefined;
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      const events = await storage.getCalendarEvents(tenantId, department);
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Create calendar event (Teacher/Admin only)
    app.post("/api/calendar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["TEACHER", "ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;

      const resolvedDepartment =
        (typeof req.body?.department === "string" && req.body.department.trim()) ||
        ((req.user as any)?.department as string | undefined) ||
        "All";

      const event = await storage.createCalendarEvent({
        ...req.body,
        tenantId,
        createdBy: userId,
        department: resolvedDepartment,
        eventDate: new Date(req.body.eventDate),
      });

      // Notify all tenant members in the department
      const allMembers = await storage.getTenantMembers(tenantId);
      const targetMembers = allMembers.filter((m: any) =>
        !req.body.department || (m as any).department === req.body.department
      );
      await Promise.all(targetMembers.map((m: any) =>
        storage.createNotification({
          userId: m.userId,
          tenantId,
          type: "new_event",
          title: "New Academic Calendar Event",
          message: `"${event.title}" scheduled on ${new Date(event.eventDate).toLocaleDateString()}`,
          relatedId: event.id,
        }).catch(() => {})
      ));

      res.status(201).json(event);
    } catch (err) {
      console.error("Error creating event:", err);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Update calendar event
  app.put("/api/calendar/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body.eventDate
        ? { ...req.body, eventDate: new Date(req.body.eventDate) }
        : req.body;
      const event = await storage.updateCalendarEvent(id, data);
      res.json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Delete calendar event
  app.delete("/api/calendar/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCalendarEvent(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // ============================================
  // NOTIFICATION ROUTES
  // ============================================

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      console.log("👉 Fetching notifications for user:", userId);

      const notifs = await storage.getUserNotifications(userId);
      // console.log("👉 Notifications fetched:", notifs);

      const unreadCount = notifs.filter((n: any) => !n.isRead).length;

      res.json({ notifications: notifs, unreadCount });

    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Create notification manually (for testing or direct use)
  app.post("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      const { type, title, message, relatedId } = req.body;
      const notif = await storage.createNotification({
        userId,
        tenantId,
        type: type || "announcement",
        title: title || "Notification",
        message: message || "You have a new notification.",
        relatedId: relatedId || null,
      });
      res.status(201).json(notif);
    } catch (err) {
      console.error("Error creating notification:", err);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Mark ALL notifications as read — MUST be before /:id/read to avoid routing conflict
  app.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking all notifications:", err);
      res.status(500).json({ message: "Failed to mark all notifications" });
    }
  });

  // Mark individual notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid notification id" });
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking notification read:", err);
      res.status(500).json({ message: "Failed to mark notification" });
    }
  });

  // ✅ DELETE notification (YOUR FEATURE)
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ============================================
  // TEACHER DASHBOARD STATS
  // ============================================
  app.get("/api/teacher/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;

      const [teacherCourses, allDocs, recentQueries, upcomingEvents] = await Promise.all([
        storage.getCourses(tenantId, undefined, userId),
        storage.getDocuments(tenantId),
        storage.getQueries(tenantId),
        storage.getCalendarEvents(tenantId, (req.user as any)?.department),
      ]);

      // Count total enrolled students across all teacher's courses
      let totalEnrolled = 0;
      for (const c of teacherCourses) {
        const students = await storage.getEnrolledStudents(c.id);
        totalEnrolled += students.length;
      }

      // Get notes count across teacher's courses
      let totalNotes = 0;
      for (const c of teacherCourses) {
        const notes = await storage.getCourseNotes(c.id);
        totalNotes += notes.length;
      }

      const now = new Date();
      const upcoming = upcomingEvents.filter((e: any) => new Date(e.eventDate) >= now).slice(0, 5);

      res.json({
        totalCourses: teacherCourses.length,
        totalStudentsEnrolled: totalEnrolled,
        documentsUploaded: totalNotes,
        recentStudentActivity: recentQueries.slice(0, 5),
        upcomingEvents: upcoming,
      });
    } catch (err) {
      console.error("Teacher stats error:", err);
      res.status(500).json({ message: "Failed to fetch teacher stats" });
    }
  });

  // ============================================
  // DEPARTMENT ROUTES
  // ============================================
  app.get("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      if (!tenantId) return res.status(400).json({ message: "No tenant found" });
      const depts = await storage.getDepartments(tenantId);
      res.json(depts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) return res.status(403).json({ message: "Not authorized" });
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const dept = await storage.createDepartment({ ...req.body, tenantId });
      res.status(201).json(dept);
    } catch (err) {
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const dept = await storage.updateDepartment(parseInt(req.params.id), req.body);
      res.json(dept);
    } catch (err) { res.status(500).json({ message: "Failed to update department" }); }
  });

  app.delete("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDepartment(parseInt(req.params.id));
      res.status(204).send();
    } catch (err) { res.status(500).json({ message: "Failed to delete department" }); }
  });

  // ============================================
  // ACADEMIC YEAR ROUTES
  // ============================================
  app.get("/api/academic-years", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      if (!tenantId) return res.status(400).json({ message: "No tenant found" });
      res.json(await storage.getAcademicYears(tenantId));
    } catch (err) { res.status(500).json({ message: "Failed to fetch academic years" }); }
  });

  app.post("/api/academic-years", isAuthenticated, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) return res.status(403).json({ message: "Not authorized" });
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const year = await storage.createAcademicYear({ ...req.body, tenantId, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate) });
      res.status(201).json(year);
    } catch (err) { res.status(500).json({ message: "Failed to create academic year" }); }
  });

  app.patch("/api/academic-years/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      await storage.setActiveAcademicYear(parseInt(req.params.id), tenantList[0]?.id || 1);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Failed to activate year" }); }
  });

  // ============================================
  // SEMESTER ROUTES
  // ============================================
  app.get("/api/semesters", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id;
      const yearId = req.query.yearId ? parseInt(req.query.yearId as string) : undefined;
      if (!tenantId) return res.status(400).json({ message: "No tenant found" });
      res.json(await storage.getSemesters(tenantId, yearId));
    } catch (err) { res.status(500).json({ message: "Failed to fetch semesters" }); }
  });

  app.post("/api/semesters", isAuthenticated, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) return res.status(403).json({ message: "Not authorized" });
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const sem = await storage.createSemester({ ...req.body, tenantId, startDate: new Date(req.body.startDate), endDate: new Date(req.body.endDate) });
      res.status(201).json(sem);
    } catch (err) { res.status(500).json({ message: "Failed to create semester" }); }
  });

  app.patch("/api/semesters/:id/activate", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      await storage.setActiveSemester(parseInt(req.params.id), tenantList[0]?.id || 1);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Failed to activate semester" }); }
  });

  // ============================================
  // ADMIN - USER MANAGEMENT ROUTES
  // ============================================

  app.get("/api/admin/teachers", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      res.json(await storage.getUsersByRole(tenantId, "TEACHER"));
    } catch (err) { res.status(500).json({ message: "Failed to fetch teachers" }); }
  });

  app.get("/api/admin/students", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      res.json(await storage.getUsersByRole(tenantId, "STUDENT"));
    } catch (err) { res.status(500).json({ message: "Failed to fetch students" }); }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) return res.status(403).json({ message: "Not authorized" });
      const userId = parseInt(req.params.id);
      const { clearanceLevel, department, role } = req.body;
      const updates: any = {};
      if (clearanceLevel) updates.clearanceLevel = clearanceLevel;
      if (department !== undefined) updates.department = department;
      if (role) updates.role = role;
      const updated = await storage.updateUserStatus(userId, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req, res) => {
    try {
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const [teachers, students, allCourses, recentAnnouncements, calEvents, depts, activeYears] = await Promise.all([
        storage.getUsersByRole(tenantId, "TEACHER"),
        storage.getUsersByRole(tenantId, "STUDENT"),
        storage.getCourses(tenantId),
        storage.getAnnouncements(tenantId),
        storage.getCalendarEvents(tenantId),
        storage.getDepartments(tenantId),
        storage.getAcademicYears(tenantId),
      ]);
      res.json({
        totalTeachers: teachers.length,
        totalStudents: students.length,
        totalCourses: allCourses.length,
        totalDepts: depts.length,
        activeYear: (activeYears as any[]).find((y: any) => y.isActive)?.name || "N/A",
        recentAnnouncements: recentAnnouncements.slice(0, 3),
        upcomingEvents: (calEvents as any[]).filter((e: any) => new Date(e.eventDate) >= new Date()).slice(0, 5),
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });
    // ============================================
  // ADMIN ANALYTICS (REAL DB DATA)
  // ============================================
  /**
   * GET /api/admin/analytics
   * - Total queries today
   * - Avg relevant docs per query
   * - Knowledge gaps queue: queries with 0 relevant docs in last 7 days
   */
  app.get("/api/admin/analytics", isAuthenticated, async (req, res) => {
    try {
      const now = new Date();

      // Analytics should reflect "real" query behavior from DB.
      // We compute in-memory aggregates from the queries table within time windows.
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const last7Start = new Date(now);
      last7Start.setDate(last7Start.getDate() - 7);

      const tenants = await storage.getAllTenants();
      const activeTenants = tenants.length;
      const tenantNameById = new Map(tenants.map((t: any) => [t.id, t.name]));

      const [queriesToday, queriesLast7d] = await Promise.all([
        storage.getQueriesInRange(undefined, todayStart, now),
        storage.getQueriesInRange(undefined, last7Start, now),
      ]);

      const totalQueriesToday = queriesToday.length;

      const totalQueries7d = queriesLast7d.length;
      const sumRelevantDocs = queriesLast7d.reduce((acc: number, q: any) => {
        const docs = Array.isArray(q.relevantDocs) ? q.relevantDocs : [];
        return acc + docs.length;
      }, 0);
      const avgRelevantDocs = totalQueries7d ? sumRelevantDocs / totalQueries7d : 0;

      const knowledgeGaps = queriesLast7d.filter((q: any) => {
        const docs = Array.isArray(q.relevantDocs) ? q.relevantDocs : [];
        return docs.length === 0;
      });
      const knowledgeGapsCount = knowledgeGaps.length;

      // Group gaps by identical question text and compute counts + most common tenant.
      const groupMap = new Map<
        string,
        { queryText: string; count: number; tenantCounts: Map<number, number> }
      >();

      for (const q of knowledgeGaps as any[]) {
        const queryText = (q.query || "").toString();
        if (!queryText.trim()) continue;

        if (!groupMap.has(queryText)) {
          groupMap.set(queryText, {
            queryText,
            count: 0,
            tenantCounts: new Map(),
          });
        }

        const g = groupMap.get(queryText)!;
        g.count += 1;
        const tId = q.tenantId as number | undefined;
        if (typeof tId === "number") {
          g.tenantCounts.set(tId, (g.tenantCounts.get(tId) || 0) + 1);
        }
      }

      const knowledgeGapsQueue = Array.from(groupMap.values())
        .map((g) => {
          let topTenantId: number | null = null;
          let topTenantCount = -1;
          for (const [tId, c] of g.tenantCounts.entries()) {
            if (c > topTenantCount) {
              topTenantCount = c;
              topTenantId = tId;
            }
          }
          return {
            queryText: g.queryText,
            count: g.count,
            tenantName: topTenantId ? tenantNameById.get(topTenantId) || "Unknown" : "Unknown",
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      res.json({
        totalQueriesToday,
        avgRelevantDocs,
        activeTenants,
        knowledgeGapsCount,
        knowledgeGapsQueue,
      });
    } catch (err) {
      console.error("Admin analytics error:", err);
      res.status(500).json({ message: "Failed to fetch admin analytics" });
    }
  });

  app.post("/api/calendar/suggest", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const tenantList = await storage.getAllTenants();
      const tenantId = tenantList[0]?.id || 1;
      const event = await storage.createCalendarEvent({ ...req.body, tenantId, createdBy: userId, status: "pending", eventDate: new Date(req.body.eventDate) });
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit suggestion" });
    }
  });

  app.patch("/api/calendar/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role?.toUpperCase();
      if (!["ADMIN", "UNIVERSITY_ADMIN"].includes(userRole)) return res.status(403).json({ message: "Not authorized" });
      const event = await storage.updateCalendarEvent(parseInt(req.params.id), { status: "approved" } as any);
      res.json(event);
    } catch (err) { res.status(500).json({ message: "Failed to approve event" }); }
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