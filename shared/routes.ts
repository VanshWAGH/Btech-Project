import { z } from 'zod';
import { insertTenantSchema, insertTenantMemberSchema, insertDocumentSchema } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    user: {
      method: 'GET' as const,
      path: '/api/auth/user' as const,
      responses: {
        200: z.custom<any>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  
  tenants: {
    list: {
      method: 'GET' as const,
      path: '/api/tenants' as const,
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/tenants/:id' as const,
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tenants' as const,
      input: insertTenantSchema,
      responses: {
        201: z.custom<any>(),
        400: errorSchemas.validation,
      },
    },
  },

  tenantMembers: {
    list: {
      method: 'GET' as const,
      path: '/api/tenants/:tenantId/members' as const,
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/tenants/:tenantId/members' as const,
      input: insertTenantMemberSchema.omit({ tenantId: true }),
      responses: {
        201: z.custom<any>(),
        400: errorSchemas.validation,
      },
    },
  },

  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      input: z.object({
        tenantId: z.coerce.number().optional(),
        category: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/documents' as const,
      input: insertDocumentSchema,
      responses: {
        201: z.custom<any>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  queries: {
    list: {
      method: 'GET' as const,
      path: '/api/queries' as const,
      input: z.object({
        tenantId: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/queries' as const,
      input: z.object({
        query: z.string(),
      }),
      responses: {
        200: z.custom<any>(),
        400: errorSchemas.validation,
      },
    },
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type CreateTenantInput = z.infer<typeof api.tenants.create.input>;
export type CreateDocumentInput = z.infer<typeof api.documents.create.input>;
export type CreateQueryInput = z.infer<typeof api.queries.create.input>;
