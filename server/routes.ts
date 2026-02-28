import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { withTenantContext, requirePermission } from "./accessControl";
import { api } from "@shared/routes";
import { tenantServiceClient } from "./tenantServiceClient";
import { z } from "zod";
import OpenAI from "openai";

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
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
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
