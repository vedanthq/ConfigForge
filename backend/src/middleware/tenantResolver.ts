import type { Request, Response, NextFunction } from "express";
import { db } from "../db/connection";

export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subdomain = req.headers["x-app-subdomain"] as string | undefined;
    const hostname = req.hostname;
    const appIdHeader = req.headers["x-app-id"] as string | undefined;

    let app: any = null;
    let strategy = "";

    if (subdomain) {
      app = await db("apps").where({ subdomain }).first();
      strategy = "x-app-subdomain";
    }

    if (!app && hostname && hostname !== "localhost") {
      const hostSubdomain = hostname.split(".")[0];
      if (hostSubdomain && hostSubdomain !== hostname) {
        app = await db("apps").where({ subdomain: hostSubdomain }).first();
        strategy = "hostname";
      }
    }

    if (!app && appIdHeader) {
      app = await db("apps").where({ id: appIdHeader }).first();
      strategy = "x-app-id";
    }

    if (!app) {
      res.status(404).json({ error: "APP_NOT_FOUND", message: "App not found" });
      return;
    }

    (req as any).tenantAppId = app.id;
    (req as any).logger?.info({ appId: app.id, strategy }, "Tenant resolved");

    next();
  } catch (err) {
    (req as any).logger?.error({ err }, "Tenant resolution failed");
    res.status(500).json({ error: "SERVER_ERROR", message: "Tenant resolution failed" });
  }
}
