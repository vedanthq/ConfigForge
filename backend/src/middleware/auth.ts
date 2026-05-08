import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { logAuditEvent } from "../services/auditService";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      logAuditEvent({
        type: "AUTH_FAILURE",
        ip: req.ip,
        requestId: (req as any).requestId,
        details: { reason: "missing_token" },
      });
      res.status(401).json({ error: "UNAUTHORIZED", message: "Missing or invalid token" });
      return;
    }

    const token = authHeader.slice(7);
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    req.user = {
      id: payload.user_id as string,
      email: payload.email as string,
    };

    next();
  } catch {
    logAuditEvent({
      type: "AUTH_FAILURE",
      ip: req.ip,
      requestId: (req as any).requestId,
      details: { reason: "invalid_token" },
    });
    res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid token" });
  }
}
