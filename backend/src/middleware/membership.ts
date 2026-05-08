import type { Request, Response, NextFunction } from "express";
import { db } from "../db/connection";

export async function checkAppMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appId = req.app.id;
    const userId = req.user.id;

    if (!appId) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "App not resolved" });
      return;
    }

    const membership = await db("app_users")
      .where({ app_id: appId, user_id: userId })
      .first();

    if (!membership) {
      res.status(403).json({ error: "FORBIDDEN", message: "User is not a member of this app" });
      return;
    }

    next();
  } catch (err) {
    (req as any).logger?.error({ err }, "Membership check failed");
    res.status(500).json({ error: "SERVER_ERROR", message: "Membership check failed" });
  }
}
