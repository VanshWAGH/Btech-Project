import {
  pgTable,
  text,
  varchar,
  serial,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";
export * from "./models/chat";

/* ============================================================
   TENANTS
============================================================ */

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   TENANT MEMBERS
============================================================ */

export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: serial("id").primaryKey(),

    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: text("role").notNull(), // admin | member | viewer
    department: text("department"),
    permissions: text("permissions").array().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("tenant_members_tenant_idx").on(table.tenantId),
    userIdx: index("tenant_members_user_idx").on(table.userId),
  })
);

/* ============================================================
   DOCUMENTS
============================================================ */

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),

    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    content: text("content").notNull(),
    category: text("category"),

    uploadedBy: varchar("uploaded_by", { length: 255 })
      .notNull()
      .references(() => users.id),

    isPublic: boolean("is_public").default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("documents_tenant_idx").on(table.tenantId),
  })
);

/* ============================================================
   QUERIES (RAG History)
============================================================ */

export const queries = pgTable(
  "queries",
  {
    id: serial("id").primaryKey(),

    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),

    query: text("query").notNull(),
    response: text("response"),
    context: text("context"),

    relevantDocs: text("relevant_docs").array().default([]),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("queries_tenant_idx").on(table.tenantId),
    userIdx: index("queries_user_idx").on(table.userId),
  })
);

/* ============================================================
   USER METADATA
============================================================ */

export const userMetadata = pgTable("user_metadata", {
  id: serial("id").primaryKey(),

  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  jobTitle: text("job_title"),
  department: text("department"),
  phone: text("phone"),
  preferences: text("preferences").array().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   POLICIES
============================================================ */

export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   TENANT POLICIES (Many-to-Many)
============================================================ */

export const tenantPolicies = pgTable("tenant_policies", {
  id: serial("id").primaryKey(),

  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  policyId: integer("policy_id")
    .notNull()
    .references(() => policies.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================================================
   RELATIONS
============================================================ */

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  documents: many(documents),
  queries: many(queries),
  policies: many(tenantPolicies),
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

export const userMetadataRelations = relations(userMetadata, ({ one }) => ({
  user: one(users, {
    fields: [userMetadata.userId],
    references: [users.id],
  }),
}));

export const tenantPoliciesRelations = relations(tenantPolicies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantPolicies.tenantId],
    references: [tenants.id],
  }),
  policy: one(policies, {
    fields: [tenantPolicies.policyId],
    references: [policies.id],
  }),
}));

/* ============================================================
   INSERT SCHEMAS
============================================================ */

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertTenantMemberSchema = createInsertSchema(tenantMembers).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertQuerySchema = createInsertSchema(queries).omit({
  id: true,
  createdAt: true,
});

export const insertUserMetadataSchema = createInsertSchema(userMetadata).omit({
  id: true,
  createdAt: true,
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
});

export const insertTenantPolicySchema = createInsertSchema(tenantPolicies).omit({
  id: true,
  createdAt: true,
});

/* ============================================================
   TYPES
============================================================ */

export type Tenant = typeof tenants.$inferSelect;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type UserMetadata = typeof userMetadata.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type TenantPolicy = typeof tenantPolicies.$inferSelect;