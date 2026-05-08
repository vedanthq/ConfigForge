import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db } from "../db/connection";
import { logger } from "../lib/logger";

async function generateToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  return new SignJWT({ user_id: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export function registerAuthRoutes(app: Express): void {
  app.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== "string" || !email.trim()) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required" });
        return;
      }

      if (!password || typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "PASSWORD_TOO_SHORT", message: "Password must be at least 8 characters" });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await db("users").where({ email: normalizedEmail }).first();
      if (existing) {
        res.status(409).json({ error: "EMAIL_ALREADY_EXISTS", message: "Email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await db("users")
        .insert({
          email: normalizedEmail,
          password_hash: passwordHash,
          auth_provider: "email",
        })
        .returning(["id", "email"]);

      res.status(201).json({ success: true, user: { id: user.id, email: user.email } });
    } catch (err) {
      logger.error({ err }, "Registration failed");
      res.status(500).json({ error: "SERVER_ERROR", message: "Registration failed" });
    }
  });

  app.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== "string" || !email.trim()) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required" });
        return;
      }
      if (!password || typeof password !== "string") {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Password is required" });
        return;
      }

      const user = await db("users").where({ email: email.trim().toLowerCase() }).first();
      if (!user || !user.password_hash) {
        res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
        return;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password" });
        return;
      }

      const token = await generateToken(user.id, user.email);
      res.json({ success: true, user: { id: user.id, email: user.email }, token });
    } catch (err) {
      logger.error({ err }, "Login failed");
      res.status(500).json({ error: "SERVER_ERROR", message: "Login failed" });
    }
  });

  app.post("/auth/google-register", async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string" || !email.trim()) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required" });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      let user = await db("users").where({ email: normalizedEmail }).first();

      if (!user) {
        [user] = await db("users")
          .insert({
            email: normalizedEmail,
            auth_provider: "google",
            password_hash: null,
          })
          .returning("*");
      }

      res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (err) {
      logger.error({ err }, "Google registration failed");
      res.status(500).json({ error: "SERVER_ERROR", message: "Google registration failed" });
    }
  });
}
