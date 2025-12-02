// common/middleware/tenantContext.ts
import { Request, Response, NextFunction } from "express";

export interface TenantRequest extends Request {
  tenantId?: string;
}

/**
 * Middleware that:
 *  - reads X-Tenant-Id header
 *  - if missing -> 400
 *  - attaches tenantId to req for handlers to use
 */
export function tenantContext(req: TenantRequest, res: Response, next: NextFunction) {
  const tenantId = req.header("X-Tenant-Id");
  if (!tenantId) {
    return res.status(400).json({ error: "X-Tenant-Id header is required" });
  }
  req.tenantId = tenantId;
  next();
}

