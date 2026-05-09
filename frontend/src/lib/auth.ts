import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { API_URL } from "@/lib/config";

async function fetchConfigMethods(): Promise<("email" | "google")[]> {
  try {
    const res = await fetch(`${API_URL}/config/runtime`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return ["email"];
    const data = await res.json();
    return data.config?.auth?.methods || ["email"];
  } catch {
    return ["email"];
  }
}

async function fetchGoogleUser(email: string): Promise<{ id: string; email: string; token?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/google-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) return { id: data.user.id, email: data.user.email, token: data.token };
    return data.user || null;
  } catch {
    return null;
  }
}

async function verifyCredentials(email: string, password: string): Promise<{ id: string; email: string; token: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) return { id: data.user.id, email: data.user.email, token: data.token };
    return data.user || null;
  } catch {
    return null;
  }
}

export async function buildAuthOptions(): Promise<NextAuthOptions> {
  const methods = await fetchConfigMethods();
  const providers: any[] = [];

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
          const user = await verifyCredentials(credentials.email, credentials.password);
          if (!user) return null;
          return { id: user.id, email: user.email, token: (user as any).token || "" };
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

  return {
    providers,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async jwt({ token, user, account, profile }) {
        if (account) {
          if (account.provider === "google") {
            const email = profile?.email;
            if (!email) return token;
            const dbUser = await fetchGoogleUser(email);
            if (dbUser) {
              token.user_id = dbUser.id;
              token.email = dbUser.email;
              if (dbUser.token) {
                token.accessToken = dbUser.token;
              }
            }
          } else if (account.provider === "credentials") {
            token.user_id = user.id as string;
            token.email = user.email as string;
            token.accessToken = (user as any).token as string;
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
          },
          accessToken: token.accessToken as string,
        };
      },
    },
  };
}
