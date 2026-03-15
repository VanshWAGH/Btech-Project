import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export type TenantRole =
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "MANAGER"
  | "USER"
  | "VIEWER";

export interface TenantAccessContext {
  tenantId: number;
  role: TenantRole;
  department?: string | null;
  accessLevel?: string | null;
  permissions: string[];
  organizationType?: string | null;
  isSuperAdmin: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    tenantContext?: TenantAccessContext;
  }
}

function resolveTenantId(req: Request): number | undefined {
  if (req.params.tenantId) return Number(req.params.tenantId);
  if (req.body?.tenantId) return Number(req.body.tenantId);
  if (req.query?.tenantId) return Number(req.query.tenantId as string);
  if (req.headers["x-tenant-id"]) return Number(req.headers["x-tenant-id"]);
  return undefined;
}

export function withTenantContext(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const tenantId = resolveTenantId(req);
      if (!tenantId) {
        if (required) {
          return res
            .status(400)
            .json({ message: "Tenant context is required for this operation" });
        }
        return next();
      }

      const member = await storage.getTenantMemberByUser(tenantId, user.id);

      if (!member && !user.isSuperAdmin) {
        return res.status(403).json({ message: "Access denied for tenant" });
      }

      req.tenantContext = {
        tenantId,
        role: (member?.role as TenantRole) ?? "SUPER_ADMIN",
        department: member?.department,
        accessLevel: (member as any)?.accessLevel ?? null,
        permissions: member?.permissions ?? [],
        organizationType: (member as any)?.organizationType ?? null,
        isSuperAdmin: !!user.isSuperAdmin,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requirePermission(
  permission: string,
  allowedRoles: TenantRole[] = ["TENANT_ADMIN", "MANAGER", "SUPER_ADMIN"],
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.tenantContext;
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!ctx) {
      return res
        .status(400)
        .json({ message: "Tenant context is required for this operation" });
    }

    if (user.isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(ctx.role)) {
      return res.status(403).json({ message: "Role not allowed" });
    }

    if (ctx.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ message: "Missing required permission" });
  };
}

