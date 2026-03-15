import {
  tenants,
  tenantMembers,
  documents,
  queries,
  users,
  type Tenant,
  type TenantMember,
  type Document,
  type Query,
  type CreateTenantRequest,
  type CreateTenantMemberRequest,
  type CreateDocumentRequest,
  type TenantResponse,
  type TenantMemberResponse,
  type DocumentResponse,
  type QueryResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  getTenant(id: number): Promise<TenantResponse | undefined>;
  getAllTenants(): Promise<TenantResponse[]>;
  createTenant(data: CreateTenantRequest): Promise<Tenant>;
  
  getTenantMembers(tenantId: number): Promise<TenantMemberResponse[]>;
  getTenantMemberByUser(tenantId: number, userId: string): Promise<TenantMember | undefined>;
  addTenantMember(data: CreateTenantMemberRequest): Promise<TenantMember>;
  
  getDocuments(tenantId?: number, category?: string): Promise<DocumentResponse[]>;
  getDocument(id: number): Promise<DocumentResponse | undefined>;
  createDocument(data: CreateDocumentRequest): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  getQueries(tenantId?: number, userId?: string): Promise<QueryResponse[]>;
  createQuery(data: {
    tenantId: number;
    userId: string;
    query: string;
    response?: string;
    context?: string;
    relevantDocs?: string[];
  }): Promise<Query>;
}

export class DatabaseStorage implements IStorage {
  // TENANTS
  async getTenant(id: number): Promise<TenantResponse | undefined> {
    const [tenant] = await db
      .select({
        ...tenants,
        membersCount: sql<number>`count(${tenantMembers.id})::int`,
      })
      .from(tenants)
      .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .where(eq(tenants.id, id))
      .groupBy(tenants.id);
    return tenant;
  }

  async getAllTenants(): Promise<TenantResponse[]> {
    return db
      .select({
        ...tenants,
        membersCount: sql<number>`count(${tenantMembers.id})::int`,
      })
      .from(tenants)
      .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .groupBy(tenants.id)
      .orderBy(desc(tenants.createdAt));
  }

  async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  // TENANT MEMBERS
  async getTenantMembers(tenantId: number): Promise<TenantMemberResponse[]> {
    return db
      .select({
        ...tenantMembers,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(tenantMembers)
      .leftJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId));
  }

  async getTenantMemberByUser(
    tenantId: number,
    userId: string
  ): Promise<TenantMember | undefined> {
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId)
        )
      );
    return member;
  }

  async addTenantMember(data: CreateTenantMemberRequest): Promise<TenantMember> {
    const [member] = await db.insert(tenantMembers).values(data).returning();
    return member;
  }

  // DOCUMENTS
  async getDocuments(
    tenantId?: number,
    category?: string
  ): Promise<DocumentResponse[]> {
    let query = db
      .select({
        ...documents,
        uploaderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .orderBy(desc(documents.createdAt));

    if (tenantId) {
      query = query.where(eq(documents.tenantId, tenantId)) as any;
    }
    if (category) {
      query = query.where(eq(documents.category, category)) as any;
    }

    return query;
  }

  async getDocument(id: number): Promise<DocumentResponse | undefined> {
    const [doc] = await db
      .select({
        ...documents,
        uploaderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.id, id));
    return doc;
  }

  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // QUERIES
  async getQueries(
    tenantId?: number,
    userId?: string
  ): Promise<QueryResponse[]> {
    let query = db
      .select()
      .from(queries)
      .orderBy(desc(queries.createdAt));

    if (tenantId) {
      query = query.where(eq(queries.tenantId, tenantId)) as any;
    }
    if (userId) {
      query = query.where(eq(queries.userId, userId)) as any;
    }

    return query;
  }

  async createQuery(data: {
    tenantId: number;
    userId: string;
    query: string;
    response?: string;
    context?: string;
    relevantDocs?: string[];
  }): Promise<Query> {
    const [query] = await db.insert(queries).values(data).returning();
    return query;
  }
}

export const storage = new DatabaseStorage();
