import type { Provider } from "next-auth/providers";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { RuntimeConfig } from "../core/types";
import { db } from "../db/connection";

export function buildAuthProviders(config: RuntimeConfig): Provider[] {
  const providers: Provider[] = [];
  const methods = config.auth.methods || [];

  if (methods.includes("email")) {
    providers.push(
      CredentialsProvider({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await db("users").where({ email: credentials.email }).first();
          if (!user || !user.password_hash) return null;

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!valid) return null;

          return { id: user.id, email: user.email };
        },
      })
    );
  }

  if (methods.includes("google")) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      })
    );
  }

  return providers;
}
