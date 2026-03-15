import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

// Export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// ============================================
// MULTI-TENANT RAG SYSTEM TABLES
// ============================================

// Tenants - Organizations using the system
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tenant members - Users belonging to tenants with roles
export const tenantMembers = pgTable("tenant_members", {
  id: serial("id").primaryKey(),
  tenantId: serial("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // admin, member, viewer
  department: text("department"),
  permissions: text("permissions").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tenant_members_tenant_idx").on(table.tenantId),
  index("tenant_members_user_idx").on(table.userId),
]);

// Documents - Files uploaded to the system
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: serial("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documents_tenant_idx").on(table.tenantId),
]);

// Queries - User queries with context
export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  tenantId: serial("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  query: text("query").notNull(),
  response: text("response"),
  context: text("context"),
  relevantDocs: text("relevant_docs").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("queries_tenant_idx").on(table.tenantId),
  index("queries_user_idx").on(table.userId),
]);

// ============================================
// RELATIONS
// ============================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  documents: many(documents),
  queries: many(queries),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMembers.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const queriesRelations = relations(queries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [queries.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [queries.userId],
    references: [users.id],
  }),
}));

// ============================================
// BASE SCHEMAS
// ============================================

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertTenantMemberSchema = createInsertSchema(tenantMembers).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertQuerySchema = createInsertSchema(queries).omit({ id: true, createdAt: true });

// ============================================
// EXPLICIT API CONTRACT TYPES
// ============================================

// Base types
export type Tenant = typeof tenants.$inferSelect;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Query = typeof queries.$inferSelect;

// Request types
export type CreateTenantRequest = z.infer<typeof insertTenantSchema>;
export type CreateTenantMemberRequest = z.infer<typeof insertTenantMemberSchema>;
export type CreateDocumentRequest = z.infer<typeof insertDocumentSchema>;
export type CreateQueryRequest = {
  query: string;
};

// Response types
export type TenantResponse = Tenant & { membersCount?: number };
export type TenantMemberResponse = TenantMember & { userName?: string };
export type DocumentResponse = Document & { uploaderName?: string };
export type QueryResponse = Query & { relevantDocuments?: DocumentResponse[] };

// Query processing response
export type ProcessedQueryResponse = {
  response: string;
  context: string;
  relevantDocs: string[];
  sources: DocumentResponse[];
};
