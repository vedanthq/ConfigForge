```markdown
<role>
You are a Senior Full-Stack Engineer with 10+ years of experience building
production web platforms, API backends, and developer tooling in TypeScript.
You write clean, idiomatic TypeScript that compiles on the first attempt. You
never leave a package in a state where `npx tsc --noEmit` fails. You follow
the project's established coding standards without deviation. Every file you
produce is complete — no placeholders, no TODOs, no stub comments that say
"implement later."
</role>

<project>
You are building Step 5 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Auth framework:      NextAuth.js
  Auth providers:      Email (CredentialsProvider) + Google (GoogleProvider)
  Password hashing:    bcryptjs (12 rounds) — pure JS, no native deps
  Session strategy:    JWT (stateless)
  Token contents:      user_id + email ONLY — no app_id
  App resolution:      Subdomain/header per request, NEVER from token
  Config field:        auth.methods: ["email"] | ["email","google"] | ["google"]

Architecture decisions now locked:
  - buildAuthProviders(config) reads config.auth.methods and returns providers[]
  - Providers are rebuilt on EVERY request by reading runtimeState.config live
    NOT at boot time — this is the FIX for the auth reload gap
  - app_id is NEVER stored in JWT tokens (security: prevents cross-app token reuse)
  - app_id is resolved from X-App-Subdomain header, then hostname subdomain,
    then X-App-ID header as last resort
  - User registration: POST /auth/register (email + password, min 8 chars)
  - OAuth auto-registration: first Google login creates user record
  - App membership: checkAppMembership middleware verifies app_users table
  - Middleware chain: /api → resolveTenant → requireAuth → checkAppMembership
  - NEXTAUTH_SECRET validated at boot — must be ≥32 chars or server exits
  - bcrypt.compare has null check for OAuth users (password_hash is NULL)
</project>

<context>
Steps 0–4 are complete:
  - Project scaffolded, DB connected, system tables exist
  - Config validation, normalization, diff engine working
  - Entity tables created dynamically
  - CRUD routes with placeholder auth (X-User-Id / X-App-Id headers)
  - Frontend renders config-driven forms, lists, detail, dashboard pages
  - RouterEngine hot-swap for dynamic route management

This step replaces the placeholder auth with real JWT authentication.
The X-User-Id and X-App-Id header middleware from Step 3 will be replaced
with proper JWT verification and multi-strategy tenant resolution.

CRITICAL ARCHITECTURAL FIX — Auth Provider Reload:
  The original design built auth providers at boot time:
    providers: buildAuthProviders(runtimeState.config)  // BROKEN — built once
  This meant changing auth.methods in config and reloading did NOT update
  NextAuth providers. This step implements the fix:
    Providers are resolved dynamically per-request via runtimeState.
    The NextAuth configuration stores a reference to runtimeState, not a snapshot.

CRITICAL ARCHITECTURAL FIX — Tenant Resolution:
  The original design used req.hostname.split(".")[0] exclusively.
  This breaks in Railway/Vercel deployments where the hostname is
  the deployment URL, not a customer subdomain.
  Fix: X-App-Subdomain header → hostname subdomain → X-App-ID header fallback.

CRITICAL ARCHITECTURAL FIX — bcrypt Null Check:
  Google OAuth users have password_hash = NULL in the database.
  bcrypt.compare(password, null) throws TypeError.
  Fix: Check if user.password_hash exists before calling bcrypt.compare.
</context>

<task>
Implement Step 5: Authentication System. This step replaces placeholder auth
with real JWT-based authentication and config-driven provider selection.

Step 5 implements:
  - buildAuthProviders(config) — dynamic provider registration, callable at ANY time
  - NextAuth.js configuration with JWT strategy
  - JWT callback: stores user_id + email, handles Google auto-registration
  - Session callback: exposes user_id + email to session
  - User registration endpoint: POST /auth/register
  - Real tenant resolver: header/subdomain multi-strategy → DB lookup
  - Real auth middleware: JWT token verification → req.user
  - App membership middleware: checks app_users table
  - Middleware chain: /api → resolveTenant → requireAuth → checkAppMembership
  - Config-driven LoginPage component (renders only methods from config)
  - NextAuth API route handler in frontend
  - NEXTAUTH_SECRET validation at boot (≥32 chars)
  - bcrypt null-check for OAuth users in CredentialsProvider authorize callback

Step 5 does NOT implement:
  - CSV import (Step 6)
  - Email notifications (Step 7)
  - Config hot reload (Step 8)
</task>

<output_requirements>
Produce every file listed below. Each file must be complete.
Do not skip any file. Do not use placeholder comments.

Output format for each file:
### path/to/file.ts
```ts
(complete file content)
```

FILES TO PRODUCE:

GROUP 1 — Auth Providers (FIXED — runtime-safe)
  backend/src/auth/providers.ts     ← buildAuthProviders(config: RuntimeConfig):
                                        - If methods.includes("email"): add CredentialsProvider
                                          with bcryptjs.compare password verification
                                          WITH null check: if (!user.password_hash) return null
                                        - If methods.includes("google"): add GoogleProvider
                                          with GOOGLE_CLIENT_ID/SECRET from env
                                        - Returns Provider[] array
                                        SAFE to call at any time — no side effects, no singletons

GROUP 2 — NextAuth Configuration (FIXED — reads runtimeState live)
  backend/src/auth/nextauth.ts      ← authOptions base object:
                                        providers: []  ← populated dynamically via auth handler
                                        session: { strategy: "jwt" }
                                        secret: process.env.NEXTAUTH_SECRET
                                        callbacks:
                                          jwt: store user_id + email in token
                                               Google auto-registration on first sign-in
                                               Read from DB, not from runtimeState
                                          session: expose user_id + email
                                        IMPORTANT: authOptions.providers is NOT set here.
                                        Instead, create a getAuthOptions() function that
                                        reads runtimeState.config and calls buildAuthProviders()
                                        LIVE on every invocation. This fixes the auth reload gap.

GROUP 3 — NextAuth Route Handler (FIXED — dynamic providers)
  frontend/src/app/api/auth/[...nextauth]/route.ts ← NextAuth route handler:
                                        import { authOptions } from backend/src/auth/nextauth
                                        BUT with dynamic provider resolution:
                                        Create a handler that calls buildAuthProviders(runtimeState.config)
                                        on EVERY request. This ensures config changes to auth.methods
                                        are reflected immediately without server restart.

GROUP 4 — Registration
  backend/src/api/authRoutes.ts     ← POST /auth/register:
                                        Validates email + password (min 8 chars)
                                        Checks duplicate email → 409
                                        Hashes password with bcryptjs (12 rounds)
                                        Inserts into users table
                                        Returns 201 with user id + email

GROUP 5 — Middleware (Replace Placeholders — FIXED tenant resolution)
  backend/src/middleware/tenantResolver.ts ← REPLACE existing:
                                        Multi-strategy tenant resolution:
                                        1. X-App-Subdomain header (primary)
                                        2. req.hostname.split(".")[0] (subdomain fallback)
                                        3. X-App-ID header (last resort)
                                        Queries apps table by subdomain or id
                                        Sets req.app = db row
                                        Returns 404 APP_NOT_FOUND if not found in all strategies
                                        Logs resolution strategy for debugging
  backend/src/middleware/auth.ts          ← REPLACE existing:
                                        Extracts Bearer token from Authorization header
                                        Verifies JWT using NEXTAUTH_SECRET
                                        Sets req.user = { id, email }
                                        Returns 401 if invalid/missing
                                        Logs AUTH_FAILURE audit event on failure
  backend/src/middleware/membership.ts    ← NEW:
                                        Queries app_users WHERE app_id + user_id
                                        Returns 403 FORBIDDEN if no membership

GROUP 6 — Frontend Auth
  frontend/src/components/auth/LoginPage.tsx ← Config-driven login UI:
                                        Reads config.auth.methods
                                        methods.includes("email") → email/password form
                                        methods.includes("google") → Google OAuth button
                                        Both present → divider between them
                                        Loading state on submit
                                        Error display for invalid credentials
                                        Uses NextAuth signIn() and useSession()

GROUP 7 — NEXTAUTH_SECRET Validation
  backend/src/core/runtime.ts       ← MODIFY: Add NEXTAUTH_SECRET check at boot:
                                        if (!process.env.NEXTAUTH_SECRET || 
                                            process.env.NEXTAUTH_SECRET.length < 32) {
                                          logger.fatal("NEXTAUTH_SECRET missing or too short")
                                          process.exit(1)
                                        }

GROUP 8 — Entry Point Update
  backend/src/index.ts              ← MODIFY:
                                        Wire /auth/register route
                                        Wire NextAuth handler
                                        Replace middleware chain:
                                          app.use("/api", resolveTenant, requireAuth, checkAppMembership)
                                        Remove placeholder header-based auth middleware
                                        Add NEXTAUTH_SECRET validation before boot
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed in both frontend/ and backend/.

RULE 2 — app_id is NEVER in the JWT token.
  The jwt callback stores ONLY user_id and email. app_id is resolved
  per-request from the subdomain/header. This is a hard security constraint.
  grep "app_id" backend/src/auth/nextauth.ts → ZERO matches.

RULE 3 — buildAuthProviders is callable at ANY time.
  It reads config.auth.methods LIVE from the passed config argument.
  It does NOT read from module-level state. It must be safe to call
  on every request. This is the fix for the auth-reload gap.

RULE 4 — Auth providers resolved DYNAMICALLY per request.
  The NextAuth route handler calls buildAuthProviders(runtimeState.config)
  on EVERY invocation. Not at module init time. Not at boot time.
  This ensures config changes to auth.methods take effect immediately.

RULE 5 — bcrypt null check for OAuth users.
  In the CredentialsProvider authorize callback:
    const user = await db("users").where({ email }).first()
    if (!user || !user.password_hash) return null  // ← NULL CHECK
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return null
    return { id: user.id, email: user.email }
  Without the null check, Google-only users cause TypeError on login.

RULE 6 — Password hashing uses bcryptjs with 12 rounds.
  Registration: bcryptjs.hash(password, 12)
  Login: bcryptjs.compare(password, user.password_hash)
  12 rounds — not 10, not 15.

RULE 7 — Google auto-registration creates user record.
  On first Google sign-in, the jwt callback:
    1. Checks if user exists in DB by email
    2. If not → INSERT into users with auth_provider: "google"
    3. Sets token.user_id to the DB user ID

RULE 8 — Registration validates inputs.
  email: required, non-empty
  password: required, minimum 8 characters
  Duplicate email: return 409 EMAIL_ALREADY_EXISTS

RULE 9 — Middleware chain order is critical.
  /api routes: resolveTenant → requireAuth → checkAppMembership
  This order ensures: app exists → user authenticated → user has access.
  Config routes (/config/*) are NOT behind this middleware chain.

RULE 10 — Existing CRUD handlers continue working.
  After replacing auth middleware, all CRUD operations from Step 3
  must still work. req.app.id and req.user.id must be populated
  by the new middleware (same shape as placeholder).

RULE 11 — Tenant resolution uses 3 strategies in order.
  1. X-App-Subdomain header (primary — works in all deployments)
  2. req.hostname.split(".")[0] (subdomain — works with wildcard DNS)
  3. X-App-ID header (last resort — for direct API access)
  First strategy that returns a match wins. If none match → 404.

RULE 12 — NEXTAUTH_SECRET validation at boot.
  if (process.env.NEXTAUTH_SECRET.length < 32)
    logger.fatal("NEXTAUTH_SECRET must be at least 32 characters")
    process.exit(1)
  This prevents the "invalid signature" errors from weak secrets.

RULE 13 — LoginPage renders conditionally.
  Only renders providers listed in config.auth.methods.
  ["email"] → email form only, no Google button
  ["google"] → Google button only, no email form
  ["email","google"] → both with divider
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors
  cd frontend && npx tsc --noEmit → 0 errors

CHECK 2 — Registration succeeds:
  POST /auth/register with { email: "test@test.com", password: "testtest123" }
  Expected: 201, { success: true, user: { id, email } }

CHECK 3 — Duplicate registration blocked:
  POST /auth/register with same email
  Expected: 409, { error: "EMAIL_ALREADY_EXISTS" }

CHECK 4 — Short password rejected:
  POST /auth/register with password "abc"
  Expected: 400, { error: "PASSWORD_TOO_SHORT" }

CHECK 5 — Login with email works:
  Use NextAuth signIn("credentials") with valid email/password
  Expected: JWT token returned with user_id + email

CHECK 6 — CRUD with JWT:
  Obtain JWT, send as Authorization: Bearer <token>
  Also send X-App-Subdomain header with valid app subdomain
  GET /api/bug → 200 with data

CHECK 7 — Missing token returns 401:
  GET /api/bug without Authorization header → 401

CHECK 8 — Invalid token returns 401:
  GET /api/bug with Authorization: Bearer invalid-token → 401

CHECK 9 — Missing app membership returns 403:
  Authenticated user not in app_users for this app
  Expected: 403 FORBIDDEN

CHECK 10 — App not found returns 404:
  X-App-Subdomain: nonexistent-app → 404 APP_NOT_FOUND

CHECK 11 — Tenant resolution via header works:
  X-App-Subdomain header → resolves to correct app

CHECK 12 — Tenant resolution via X-App-ID works:
  X-App-ID header (no subdomain) → resolves to correct app

CHECK 13 — NEXTAUTH_SECRET validation:
  Set weak secret, start server → fatal error, exit

CHECK 14 — bcrypt null check prevents crash:
  Create Google-only user (no password_hash)
  Attempt email login → returns null (no crash, no TypeError)

CHECK 15 — LoginPage renders email only:
  Config with auth.methods: ["email"]
  Expected: Email form visible, no Google button

CHECK 16 — LoginPage renders both:
  Config with auth.methods: ["email", "google"]
  Expected: Email form + divider + Google button

CHECK 17 — Config routes still public:
  GET /config/runtime without auth headers → 200

CHECK 18 — Health check still works:
  GET /health → 200

CHECK 19 — Steps 0-4 regression:
  All previous functionality intact
</verification>
```
