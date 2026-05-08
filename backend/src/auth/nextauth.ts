import type { NextAuthOptions } from "next-auth";
import type { DefaultUser } from "next-auth";
import { buildAuthProviders } from "./providers";
import { runtimeState } from "../core/runtime";
import { db } from "../db/connection";

interface SessionUser extends DefaultUser {
  id: string;
  email: string;
}

export function getAuthOptions(): NextAuthOptions {
  const config = runtimeState.config;
  if (!config) throw new Error("Runtime config not initialized");

  return {
    providers: buildAuthProviders(config),
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async jwt({ token, user, account, profile }) {
        if (account) {
          if (account.provider === "google") {
            const email = profile?.email;
            if (!email) return token;

            let dbUser = await db("users").where({ email }).first();
            if (!dbUser) {
              [dbUser] = await db("users")
                .insert({
                  email,
                  auth_provider: "google",
                  password_hash: null,
                })
                .returning("*");
            }
            token.user_id = dbUser.id;
            token.email = dbUser.email;
          } else if (account.provider === "credentials") {
            token.user_id = user.id as string;
            token.email = user.email as string;
          }
        }
        return token;
      },
      async session({ session, token }) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.user_id,
            email: token.email,
          } as SessionUser,
        };
      },
    },
  };
}
