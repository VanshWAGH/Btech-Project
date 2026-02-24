import type { Request } from "express";

const TENANT_SERVICE_BASE_URL =
  process.env.TENANT_SERVICE_BASE_URL ?? "http://localhost:8081";

async function forwardRequest<T>(
  req: Request,
  path: string,
  init: RequestInit,
): Promise<T> {
  const url = new URL(path, TENANT_SERVICE_BASE_URL).toString();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Forward auth header / user context if present
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Tenant service error ${response.status}: ${body || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export const tenantServiceClient = {
  listTenants: (req: Request) =>
    forwardRequest<any[]>(req, "/api/tenants", {
      method: "GET",
    }),
  getTenant: (req: Request, id: number) =>
    forwardRequest<any>(req, `/api/tenants/${id}`, {
      method: "GET",
    }),
  createTenant: (req: Request, body: unknown) =>
    forwardRequest<any>(req, "/api/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

