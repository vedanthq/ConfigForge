# Authentication System

This document specifies the ConfigForge authentication system: NextAuth.js configuration, config-driven provider selection, session management, and tenant-scoped authorization.

The authentication system is **not a standalone feature** — it is infrastructure that enables tenant isolation. Every generated app shares the same auth engine, but the available login methods are controlled by each app's config via `auth.methods`.

---

# 1. Authentication Architecture

```text
Config JSON (auth.methods)
   |
buildAuthProviders(config) -> selects providers dynamically
   |
NextAuth.js (manages sessions, JWT, callbacks)
   |
Middleware (resolves app_id + user_id per request)
   |
CRUD Handlers (scoped to app_id + user_id)
```

---

# 2. Config-Driven Provider Selection

This is the core function that makes authentication a config-driven feature. It reads `config.auth.methods` and builds the providers array dynamically:

```ts
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";

export function buildAuthProviders(config: RuntimeConfig) {
  const providers = [];

  if (config.auth?.methods?.includes("email")) {
    providers.push(CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db("users")
          .where({ email: credentials.email })
          .first();

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      }
    }));
  }

  if (config.auth?.methods?.includes("google")) {
    providers.push(GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }));
  }

  return providers;
}
```

> Decision: **Providers are built from config at boot time via `buildAuthProviders()`, not hardcoded.**
> Rejected: Hardcoding both providers in `authOptions.providers` and toggling visibility in the UI.
> Why: Hardcoding providers means the backend always initializes all auth strategies, even if config says email-only. Config-driven selection means the backend only loads what the config requests, which is consistent with the project's core principle.

---

# 3. NextAuth Configuration

```ts
import NextAuth from "next-auth";

export const authOptions = {
  providers: buildAuthProviders(runtimeState.config),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.user_id = user.id;
        token.email = user.email;
      }

      // For OAuth users, handle first-time registration
      if (account?.provider === "google" && user?.email) {
        let existingUser = await db("users")
          .where({ email: user.email })
          .first();

        if (!existingUser) {
          [existingUser] = await db("users")
            .insert({ email: user.email, auth_provider: "google" })
            .returning("*");
        }

        token.user_id = existingUser.id;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.user_id,
        email: token.email
      };
      return session;
    }
  }
};

export default NextAuth(authOptions);
```

---

# 4. User Registration

## 4.1 Email Registration

```ts
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "EMAIL_AND_PASSWORD_REQUIRED" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
  }

  const existing = await db("users").where({ email }).first();
  if (existing) {
    return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db("users")
    .insert({
      email,
      password_hash: passwordHash,
      auth_provider: "email"
    })
    .returning("*");

  return res.status(201).json({ success: true, user: { id: user.id, email: user.email } });
});
```

## 4.2 Google OAuth Registration

Handled automatically by the `jwt` callback in NextAuth configuration (section 3). When a Google user signs in for the first time, a user record is created in the `users` table with `auth_provider: "google"`.

---

# 5. Tenant Resolution

## 5.1 App Resolution Middleware

Every API request resolves the target application (tenant) from the subdomain or header:

```ts
async function resolveTenant(req, res, next) {
  const subdomain = req.headers["x-app-subdomain"]
    || req.hostname.split(".")[0];

  const app = await db("apps").where({ subdomain }).first();

  if (!app) {
    return res.status(404).json({ error: "APP_NOT_FOUND" });
  }

  req.app = app;
  next();
}
```

## 5.2 App Membership Check

After resolving the user and app, verify the user has access to this app:

```ts
async function checkAppMembership(req, res, next) {
  const membership = await db("app_users")
    .where({ app_id: req.app.id, user_id: req.user.id })
    .first();

  if (!membership) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  next();
}
```

## 5.3 Middleware Chain

```ts
app.use("/api", resolveTenant, requireAuth, checkAppMembership);
```

---

# 6. Session Security

| Security Property | Implementation |
|---|---|
| Session strategy | JWT (stateless) |
| Secret | `process.env.NEXTAUTH_SECRET` (generated via `openssl rand -base64 32`) |
| Cookie type | HTTP-only (set by NextAuth) |
| Token contents | `user_id` + `email` only — no `app_id` in token |
| App resolution | Always resolved from server-side subdomain, never from client token |

> Decision: **`app_id` is NOT stored in the JWT token.**
> Rejected: Including `app_id` in the JWT to avoid DB lookup on every request.
> Why: If `app_id` is in the token, a user could forge a token to access another app's data. Resolving `app_id` from the subdomain on every request ensures tenant isolation cannot be bypassed by token manipulation.

---

# 7. Environment Variables

```env
# REQUIRED: Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<generated-secret>

# REQUIRED: Your frontend URL
NEXTAUTH_URL=https://your-frontend-url.vercel.app

# REQUIRED for Google OAuth (only if auth.methods includes "google")
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

# 8. Database Tables

The auth system requires three tables. See doc_06 for full SQL:

| Table | Purpose |
|---|---|
| `users` | Stores all user accounts (email, password_hash, auth_provider) |
| `apps` | Stores all application instances (subdomain, config, created_at) |
| `app_users` | Join table mapping users to apps (many-to-many) |

---

# 9. Failure Modes

| What can fail | What the system does | How to debug |
|---|---|---|
| Invalid credentials (email) | Returns null from `authorize`, NextAuth shows error | Check `users` table for matching email + verify password hash |
| Google OAuth not configured | Redirect fails, NextAuth shows error | Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars |
| NEXTAUTH_SECRET missing | NextAuth refuses to start | Set NEXTAUTH_SECRET via `openssl rand -base64 32` |
| User not in app_users | Returns 403 FORBIDDEN | Check `app_users` table for app_id + user_id row |
| App not found (bad subdomain) | Returns 404 APP_NOT_FOUND | Check `apps` table for matching subdomain |
| auth.methods empty in config | Blocked by Zod `.min(1)` validation | Config rejected before reaching auth system |
| auth.methods missing from config | Defaults to `["email"]` via Zod `.default()` | Only email login will be available |
| Duplicate email on registration | Returns 409 EMAIL_ALREADY_EXISTS | Expected behavior — user should sign in instead |
| Password too short | Returns 400 PASSWORD_TOO_SHORT | Minimum 8 characters enforced |

---

CHANGES APPLIED:
- Guide sections used: 2.3 (buildAuthProviders), 2.4 (LoginPage — referenced to doc_08), 2.5 (table references), 11 (NEXTAUTH_SECRET fix)
- Contradictions resolved: Replaced hardcoded providers with buildAuthProviders(runtimeState.config); added bcrypt.compare for password verification; app_id not stored in JWT; NEXTAUTH_SECRET now shows proper generation command
- Code added: buildAuthProviders(), user registration endpoint, checkAppMembership middleware, OAuth auto-registration in jwt callback
- Removed: Hardcoded provider array; "Password check omitted for brevity" comment; trailing commentary; emoji from headers
