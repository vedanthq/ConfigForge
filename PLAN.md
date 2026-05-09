# ConfigForge — Finalization Phase Plan

> **Phase Goal:** Fix critical UX bugs, harden auth, add tests, and polish everything for hackathon judging.

---

## Quick-Start Summary

### Depth Strategy
| Danger Zone | Attack Surface | Mitigations |
|---|---|---|
| **LoginPage dead code** | `/login` route, auth gate, signup UX | Wave 1 — task 1-2 (routes + gate) |
| **Infinite loading skeleton** | 4 pages: `DashboardPage`, `ListPage`, `FormPage`, `DetailPage` | Wave 1 — task 2 (unauthenticated state) |
| **Google OAuth can't call API** | `lib/auth.ts` JWT callback | Wave 3 — task 3 |
| **Shared Express singleton `req.app.id`** | `tenantResolver.ts`, 6 handlers, `membership.ts` | Wave 2 — task 4 |
| **GeneratorUI sends unauthenticated POST** | `GeneratorUI.tsx:48` | Wave 3 — task 5 |
| **No test coverage** | Entire codebase | Wave 5 — task 6 |
| **execSync blocks event loop** | `runtime.ts` Knex migrations | Wave 4 — task 9 |

### Wave Plan

| Wave | Plans | Description |
|------|-------|-------------|
| **Wave 1** | Plan 01 | **Fix infinite loading + auth UX** — routes, signup, auth gate, unauthenticated state |
| **Wave 2** | Plan 02 | **Fix tenant security race** — tenantResolver, handlers, membership, type augmentation |
| **Wave 3** | Plan 03, 04 | **Fix API auth** — Google OAuth token, GeneratorUI auth, centralize API config |
| **Wave 4** | Plan 05 | **Backend hardening** — execSync→knex API, Vercel rewrites |
| **Wave 5** | Plan 06 | **Add tests** — backend auth/CRUD/tenant/isolation tests, frontend login flow test |
| **Wave 6** | Plan 07 | **Polish** — Tailwind, reusable UI components, observability, demo UX |

---

## File Change Inventory

### Modified Files

| # | File | Change | Wave |
|---|------|--------|------|
| 1 | `frontend/src/app/page.tsx` | Add auth gate (redirect unauthenticated to /login) | W1 |
| 2 | `frontend/src/app/layout.tsx` | Add nav bar with login/signup/signout links | W1 |
| 3 | `frontend/src/app/login/page.tsx` | **NEW** — renders LoginPage at `/login` | W1 |
| 4 | `frontend/src/app/signup/page.tsx` | **NEW** — signup form route at `/signup` | W1 |
| 5 | `frontend/src/components/auth/LoginPage.tsx` | Convert inline styles to Tailwind, add "Sign up" link | W1 |
| 6 | `frontend/src/components/auth/SignupPage.tsx` | **NEW** — signup form component | W1 |
| 7 | `frontend/src/components/pages/AppShell.tsx` | Add auth gate, show login prompt when unauthenticated | W1 |
| 8 | `frontend/src/components/pages/DashboardPage.tsx` | Replace `if (!token) return` with unauthenticated state | W1 |
| 9 | `frontend/src/components/pages/ListPage.tsx` | Same fix + API_URL→config.ts | W1, W3 |
| 10 | `frontend/src/components/pages/FormPage.tsx` | Same fix + API_URL→config.ts | W1, W3 |
| 11 | `frontend/src/components/pages/DetailPage.tsx` | Same fix + API_URL→config.ts | W1, W3 |
| 12 | `frontend/src/components/pages/PageRouter.tsx` | Skip auth pages when routing config pages (don't 404 /login, /signup) | W1 |
| 13 | `backend/src/middleware/tenantResolver.ts:36` | Replace `req.app.id` with `(req as any).tenantAppId` | W2 |
| 14 | `backend/src/api/handlers.ts` (6 occurrences) | Replace `req.app.id` with `(req as any).tenantAppId` | W2 |
| 15 | `backend/src/middleware/membership.ts:6` | Replace `req.app.id` with `(req as any).tenantAppId` | W2 |
| 16 | `backend/src/api/configRoutes.ts:43,54` | Replace `(req as any).app?.id` with `(req as any).tenantAppId` | W2 |
| 17 | `backend/src/types/express.d.ts` | Remove `id` from Application interface, add `tenantAppId` to Request | W2 |
| 18 | `frontend/src/lib/auth.ts` | JWT callback: generate accessToken for Google OAuth via `/auth/google-register` | W3 |
| 19 | `frontend/src/lib/config.ts` | **NEW** — single source for API_URL, APP_ID, env vars | W3 |
| 20 | `frontend/src/hooks/useRuntimeConfig.ts` | Import API_URL from config.ts | W3 |
| 21 | `frontend/src/hooks/useConfigPolling.ts` | Import API_URL from config.ts | W3 |
| 22 | `frontend/src/lib/api.ts` | Import API_URL from config.ts | W3 |
| 23 | `frontend/src/components/GeneratorUI.tsx` | Import useApiToken, attach JWT to POST /config, handle 401 | W3 |
| 24 | `frontend/src/components/csv/CSVUploadFlow.tsx` | Import API_URL from config.ts | W3 |
| 25 | `backend/src/core/runtime.ts` | Replace `execSync` with `knex.migrate.latest()` / `knex.seed.run()` | W4 |
| 26 | `frontend/vercel.json` | Add rewrites proxy for backend API | W4 |
| 27 | `backend/__tests__/auth.test.ts` | **NEW** — register, login, route protection | W5 |
| 28 | `backend/__tests__/crud.test.ts` | **NEW** — CRUD operations | W5 |
| 29 | `backend/__tests__/config-reload.test.ts` | **NEW** — config reload + rollback | W5 |
| 30 | `backend/__tests__/tenant-isolation.test.ts` | **NEW** — tenant isolation verification | W5 |
| 31 | `frontend/__tests__/login-flow.test.tsx` | **NEW** — login page render + form submission | W5 |
| 32 | `backend/package.json` | Add `vitest` + `supertest` devDeps + test script | W5 |
| 33 | `frontend/package.json` | Add `vitest` + `@testing-library/react` devDeps + test script | W5 |
| 34 | `backend/vitest.config.ts` | **NEW** | W5 |
| 35 | `frontend/vitest.config.ts` | **NEW** | W5 |
| 36 | All frontend `.tsx` files | Convert inline styles to Tailwind classes | W6 |
| 37 | `frontend/src/components/ui/Button.tsx` | **NEW** reusable Button component | W6 |
| 38 | `frontend/src/components/ui/Card.tsx` | **NEW** reusable Card component | W6 |
| 39 | `frontend/src/components/ui/Input.tsx` | **NEW** reusable Input component | W6 |
| 40 | `frontend/src/components/ui/Table.tsx` | **NEW** reusable Table component | W6 |
| 41 | `frontend/src/components/ui/Toast.tsx` | **NEW** toast notification system | W6 |
| 42 | `backend/src/index.ts` | Add `GET /metrics` endpoint | W6 |
| 43 | `frontend/src/components/RuntimeStatus.tsx` | **NEW** — runtime config version + status indicator | W6 |

---

## Wave 1 — Plan 01: Fix Auth UX & Infinite Loading Bug

**Dependencies:** None (parallelizable)
**Autonomous:** Yes
**Files modified:** 12 files

### Task 1.1: Create Login/Signup Routes

**Files:**
- `frontend/src/app/login/page.tsx` (NEW)
- `frontend/src/app/signup/page.tsx` (NEW)
- `frontend/src/components/auth/SignupPage.tsx` (NEW)
- `frontend/src/components/auth/LoginPage.tsx` (MODIFY)
- `frontend/src/components/pages/PageRouter.tsx` (MODIFY)

**Action:**

1. **Create `frontend/src/app/login/page.tsx`:**
   ```tsx
   "use client";
   import LoginPage from "@/components/auth/LoginPage";
   export default function LoginRoute() { return <LoginPage />; }
   ```

2. **Create `frontend/src/app/signup/page.tsx`:**
   - "use client" page that renders a SignupPage component
   - SignupPage contains email + password + confirm password fields
   - POSTs to `/auth/register` on submit
   - On success: shows success message with link to /login
   - On error: shows error message (email taken, password too short)
   - Link to `/login` for existing users

3. **Create `frontend/src/components/auth/SignupPage.tsx`:**
   - Full signup form with email, password, confirm password
   - Client-side validation (password length >= 8, passwords match)
   - Error display for server errors
   - Loading state during submission
   - Tailwind styling (inline to start, will be converted in Wave 6)
   - Link to login page at bottom

4. **Modify `frontend/src/components/auth/LoginPage.tsx`:**
   - Add "Don't have an account? Sign up" link at bottom
   - Keep existing functionality intact

5. **Modify `frontend/src/components/pages/PageRouter.tsx`:**
   - Add early return: if pathname is `/login` or `/signup`, return null (let parent handle routing)
   - This prevents config-driven pages from trying to match auth routes

**Verify:**
```bash
# Frontend TypeScript check
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- Navigating to `/login` renders the login form
- Navigating to `/signup` renders the signup form
- Submitting signup with valid data calls POST /auth/register
- Submitting signup with mismatched passwords shows client-side error
- Login page shows link to signup

### Task 1.2: Add Auth Gate + Navigation

**Files:**
- `frontend/src/components/pages/AppShell.tsx` (MODIFY)
- `frontend/src/app/layout.tsx` (MODIFY)

**Action:**

1. **Modify `frontend/src/components/pages/AppShell.tsx`:**
   - Use `useSession()` from next-auth/react to check auth state
   - If `status === "loading"`: show LoadingSkeleton (session check in progress)
   - If `status === "unauthenticated"`: show a login-prompt screen with "Sign in to continue" message and a button linking to `/login`
   - If `status === "authenticated"`: render existing AppContent (PageRouter + ErrorBoundary)
   - Wrap in `useSession` from within a client component

2. **Modify `frontend/src/app/layout.tsx`:**
   - Convert to client component (or add a NavBar client component)
   - Add a top navigation bar with:
     - App name / logo ("ConfigForge")
     - If authenticated: nav links (Dashboard), sign out button
     - If not authenticated: Login / Sign Up buttons
   - Use `useSession()` for conditional rendering
   - Keep `<Providers>` wrapper with SessionProvider

**Design decisions:**
- Auth gate at AppShell level protects ALL config-driven pages at once
- /login and /signup routes bypass the auth gate (they need to be accessible without auth)
- Nav bar is minimal — just sign in/out and app name

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- Unauthenticated users see login prompt, not loading skeleton
- Clicking "Sign in" navigates to /login
- Authenticated users see the app with nav bar
- Sign out button appears when authenticated
- /login and /signup pages are accessible without auth

### Task 1.3: Fix Infinite Loading Bug

**Files:**
- `frontend/src/components/pages/DashboardPage.tsx` (MODIFY)
- `frontend/src/components/pages/ListPage.tsx` (MODIFY)
- `frontend/src/components/pages/FormPage.tsx` (MODIFY)
- `frontend/src/components/pages/DetailPage.tsx` (MODIFY)

**Action:**

In ALL four pages, replace the pattern:

```tsx
useEffect(() => {
  const fetch = async () => {
    if (!token) return;  // ← BUG: never sets loading=false
    ...
  };
  fetch();
}, [token]);
```

With:

```tsx
useEffect(() => {
  const fetch = async () => {
    if (!token) {
      // Already handled by auth gate, but defensive fallback
      setLoading(false);
      return;
    }
    ...
  };
  fetch();
}, [token]);
```

Additionally:

1. **DashboardPage.tsx:** `const token = useApiToken();` — the `if (!token) return;` on line 28 prevents loading from ever completing. Change to set loading false.

2. **ListPage.tsx:** Same pattern on line 27. Fix to set loading false.

3. **FormPage.tsx:** Line 28 `if (!token) { setError("Not authenticated..."); return; }` — this is actually OK since it doesn't prevent loading. But handle the edge case where token is undefined by setting loading false.

4. **DetailPage.tsx:** Line 31 `if (!token) return;` — fix to set loading false.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- All 4 pages gracefully degrade to "not authenticated" state instead of permanent loading
- Infinite loading skeleton is eliminated for unauthenticated users

---

## Wave 2 — Plan 02: Fix Multi-Tenant Security

**Dependencies:** None (parallel with Wave 1)
**Autonomous:** Yes
**Files modified:** 5 files

### Task 2.1: Fix tenantResolver Race Condition

**Files:**
- `backend/src/middleware/tenantResolver.ts` (MODIFY)
- `backend/src/types/express.d.ts` (MODIFY)

**Action:**

1. **In `backend/src/middleware/tenantResolver.ts` line 36:**
   - CHANGE: `req.app.id = app.id;`
   - TO: `(req as any).tenantAppId = app.id;`
   
   Rationale: `req.app` is the Express Application singleton shared across ALL requests. Setting `.id` on it creates a race condition — concurrent requests from different tenants will overwrite each other's `req.app.id`. Using `(req as any).tenantAppId` stores the resolved app ID on the request object itself (per-request scope, not shared).

2. **In `backend/src/types/express.d.ts`:**
   - REMOVE `id: string;` from the `Application` interface (lines 10-13)
   - ADD `tenantAppId: string;` to the `Request` interface (line 4-8)
   
   Updated interface:
   ```typescript
   declare module 'express-serve-static-core' {
     interface Request {
       user: { id: string; email: string };
       config: RuntimeConfig;
       requestId: string;
       tenantAppId: string;
     }
   
     interface Application<ResBody = any, Locals extends Record<string, any> = Record<string, any>> {
       subdomain?: string;
     }
   }
   ```

### Task 2.2: Update All Handlers

**Files:**
- `backend/src/api/handlers.ts` (MODIFY)
- `backend/src/middleware/membership.ts` (MODIFY)
- `backend/src/api/configRoutes.ts` (MODIFY)

**Action:**

1. **In `backend/src/api/handlers.ts`** — Replace ALL occurrences of `req.app.id` with `req.tenantAppId`:
   - Line 15: `.where({ app_id: req.app.id, ... })` → `.where({ app_id: req.tenantAppId, ... })` (listHandler)
   - Line 19: same (listHandler count)
   - Line 50: same (createHandler insert)
   - Line 88: same (updateHandler check)
   - Line 100: same (updateHandler update)
   - Line 124: same (getHandler)
   - Line 143: same (deleteHandler check)
   - Line 153: same (deleteHandler del)
   
   Total: ~8 replacements across 5 handler functions.

2. **In `backend/src/middleware/membership.ts` line 6:**
   - CHANGE: `const appId = req.app.id;`
   - TO: `const appId = req.tenantAppId;`

3. **In `backend/src/api/configRoutes.ts`:**
   - Line 43: `(req as any).app?.id` → `(req as any).tenantAppId`
   - Line 54: `(req as any).app?.id` → `(req as any).tenantAppId`

**Verify:**
```bash
cd backend && npx tsc --noEmit
```

**Acceptance:**
- `req.app.id` is never set on the shared Application singleton
- All handlers use per-request `tenantAppId`
- TypeScript compilation passes with 0 errors
- No functional regression in tenant isolation

---

## Wave 3 — Plan 03: Fix API Auth

**Dependencies:** Wave 1 (auth infrastructure)
**Autonomous:** Yes
**Files modified:** 8 files (1 new)

### Task 3.1: Centralize Frontend Config

**Files:**
- `frontend/src/lib/config.ts` (NEW)
- `frontend/src/lib/api.ts` (MODIFY)
- `frontend/src/hooks/useRuntimeConfig.ts` (MODIFY)
- `frontend/src/hooks/useConfigPolling.ts` (MODIFY)
- `frontend/src/components/csv/CSVUploadFlow.tsx` (MODIFY)
- `frontend/src/components/pages/ListPage.tsx` (MODIFY)
- `frontend/src/components/pages/FormPage.tsx` (MODIFY)
- `frontend/src/components/pages/DetailPage.tsx` (MODIFY)
- `frontend/src/components/pages/DashboardPage.tsx` (MODIFY)
- `frontend/src/lib/auth.ts` (MODIFY)
- `frontend/src/components/GeneratorUI.tsx` (MODIFY)

**Action:**

1. **Create `frontend/src/lib/config.ts`:**
   ```typescript
   export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
   export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "";
   
   export const apiConfig = {
     baseUrl: API_URL,
     appId: APP_ID,
     defaultHeaders: {
       "Content-Type": "application/json",
     },
   } as const;
   ```

2. **Update `frontend/src/lib/api.ts`:** Change `const API_URL = process.env...` to `import { API_URL, APP_ID } from "./config"`.

3. **Update all other files** that declare `const API_URL = ...`:
   - `useRuntimeConfig.ts` — import from config.ts
   - `useConfigPolling.ts` — import from config.ts
   - `CSVUploadFlow.tsx` — import from config.ts
   - `ListPage.tsx` — import from config.ts (remove local declaration)
   - `FormPage.tsx` — import from config.ts
   - `DetailPage.tsx` — import from config.ts
   - `DashboardPage.tsx` — import from config.ts
   - `lib/auth.ts` — import from config.ts
   - `GeneratorUI.tsx` — import from config.ts

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- Exactly one file declares `API_URL` — `lib/config.ts`
- All 10+ consumer files import it
- No broken imports

### Task 3.2: Fix Google OAuth accessToken

**Files:**
- `frontend/src/lib/auth.ts` (MODIFY)

**Action:**

In the `jwt` callback (lines 87-102), the Google OAuth branch (lines 89-96) fetches the user from backend but NEVER sets `token.accessToken`. This means Google-authenticated users get a valid session but no API token, so all backend API calls fail with 401.

**Fix:**

In the Google OAuth branch, after fetching/creating the user, generate an accessToken by calling the backend:

```typescript
if (account.provider === "google") {
  const email = profile?.email;
  if (!email) return token;
  const dbUser = await fetchGoogleUser(email);
  if (dbUser) {
    token.user_id = dbUser.id;
    token.email = dbUser.email;
    // Generate a backend JWT token for API calls
    const tokenRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: dbUser.email, 
        // For Google users, we need a token endpoint that accepts just the email
        // Since /auth/login requires password, call a different approach:
      }),
    });
    // Better approach: generate JWT client-side using the same jose library
    // Or add a backend endpoint that issues tokens for OAuth users
  }
}
```

**Better approach:** Modify the `/auth/google-register` endpoint to also return a JWT token (like `/auth/login` does), then use that in the Google OAuth flow:

1. In `frontend/src/lib/auth.ts`, modify `fetchGoogleUser` to also return a `token` field, or create a separate `fetchGoogleToken` function.

2. In `backend/src/api/authRoutes.ts`, modify the `/auth/google-register` response to include a JWT token:
   ```typescript
   const token = await generateToken(user.id, user.email);
   res.json({ success: true, user: { id: user.id, email: user.email }, token });
   ```

3. In `frontend/src/lib/auth.ts`:
   ```typescript
   token.accessToken = data.token as string;  // Use the JWT from backend
   ```

**Why this works:** The backend `/auth/google-register` already creates users. Adding a JWT to its response gives Google OAuth users the same API token that credentials login provides. The jose library is already set up server-side.

**Implementation steps:**

1. **Modify `backend/src/api/authRoutes.ts`** — In the `/auth/google-register` handler (line 89-116):
   - After fetching/creating the user, generate a JWT:
   ```typescript
   const token = await generateToken(user.id, user.email);
   res.json({ success: true, user: { id: user.id, email: user.email }, token });
   ```

2. **Modify `frontend/src/lib/auth.ts`** — In the `jwt` callback Google branch:
   - After `fetchGoogleUser`, extract the token from response:
   ```typescript
   if (dbUser && (dbUser as any).token) {
     token.accessToken = (dbUser as any).token;
   }
   ```

3. **Update `fetchGoogleUser`** to accept the token in its return type:
   ```typescript
   async function fetchGoogleUser(email: string): Promise<{ id: string; email: string; token?: string } | null> {
   ```

**Verify:**
```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- Google OAuth users get `session.accessToken` populated
- API calls with Google OAuth session no longer return 401
- Backend `/auth/google-register` returns a JWT token alongside user data

### Task 3.3: Fix GeneratorUI Auth

**Files:**
- `frontend/src/components/GeneratorUI.tsx` (MODIFY)

**Action:**

1. Import `useApiToken` from `@/hooks/useApiToken`
2. Import `API_URL` from `@/lib/config` (after centralized config is done, or use local API_URL until then)
3. In the `handleApply` function (line 44-67):
   - Get token from `useApiToken()`
   - Add `Authorization: Bearer {token}` header
   - Handle 401 response gracefully (show "Please sign in" message)

**Implementation:**

```tsx
import { useApiToken } from "@/hooks/useApiToken";
import { API_URL } from "@/lib/config";

export default function GeneratorUI() {
  const token = useApiToken();
  // ...existing state...

  const handleApply = async () => {
    if (!generatedConfig) return;
    if (!token) {
      setError("Please sign in to apply configurations");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`${API_URL}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(generatedConfig),
      });
      // ...rest of existing handler...
    }
  };
}
```

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Acceptance:**
- POST /config from GeneratorUI includes JWT Bearer token
- Unauthenticated users see "Please sign in" error instead of generic failure
- Authenticated users can apply generated configs

---

## Wave 4 — Plan 05: Backend Hardening

**Dependencies:** None
**Autonomous:** Yes
**Files modified:** 2 files

### Task 5.1: Replace execSync Migrations

**Files:**
- `backend/src/core/runtime.ts` (MODIFY)

**Action:**

Replace `execSync` calls in `runPendingMigrations()` (lines 54-69) with the programmatic Knex API:

**Before:**
```typescript
async function runPendingMigrations(): Promise<void> {
  try {
    execSync(
      './node_modules/.bin/tsx ./node_modules/knex/bin/cli.js migrate:latest --knexfile ./knexfile.ts',
      { stdio: 'pipe', timeout: 30000 },
    );
    logger.info('Knex migrations completed');

    execSync(
      './node_modules/.bin/tsx ./node_modules/knex/bin/cli.js seed:run --knexfile ./knexfile.ts',
      { stdio: 'pipe', timeout: 30000 },
    );
    logger.info('Knex seeds completed');
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Post-boot migrations/seeds failed');
  }
}
```

**After:**
```typescript
import { db } from '../db/connection';

async function runPendingMigrations(): Promise<void> {
  try {
    // Use the existing knex instance from connection.ts
    const [migrateConfig, seedConfig] = await Promise.all([
      import('../../knexfile').then(m => m.default.development || m.default.production),
    ]);
    
    await db.migrate.latest({
      directory: './migrations',
      extension: 'ts',
    });
    logger.info('Knex migrations completed');

    await db.seed.run({
      directory: './seeds',
      extension: 'ts',
    });
    logger.info('Knex seeds completed');
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Post-boot migrations/seeds failed — app running in degraded mode');
  }
}
```

**OR** more simply, since `db` is already a Knex instance:

```typescript
import { db } from '../db/connection';

async function runPendingMigrations(): Promise<void> {
  try {
    await db.migrate.latest({
      directory: require('path').resolve(__dirname, '../../migrations'),
      extension: 'ts',
    });
    logger.info('Knex migrations completed');

    await db.seed.run({
      directory: require('path').resolve(__dirname, '../../seeds'),
      extension: 'ts',
    });
    logger.info('Knex seeds completed');
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Post-boot migrations/seeds failed — app running in degraded mode');
  }
}
```

Also remove `import { execSync } from 'child_process';` from the top of the file if no longer needed.

**Verify:**
```bash
cd backend && npx tsc --noEmit
```

**Acceptance:**
- `execSync` is no longer called in runtime.ts
- Migrations run through Knex programmatic API
- No child_process import needed

### Task 5.2: Add Vercel Rewrites

**Files:**
- `frontend/vercel.json` (MODIFY)

**Action:**

Add rewrites configuration to proxy API requests to the backend:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://configforge-backend.railway.app/api/:path*"
    },
    {
      "source": "/auth/:path*",
      "destination": "https://configforge-backend.railway.app/auth/:path*"
    },
    {
      "source": "/config/:path*",
      "destination": "https://configforge-backend.railway.app/config/:path*"
    },
    {
      "source": "/health",
      "destination": "https://configforge-backend.railway.app/health"
    }
  ]
}
```

**Note:** The backend URL should be configurable. Use environment variable substitution in Vercel dashboard via `NEXT_PUBLIC_API_URL`. Or better, use a single catch-all rewrite:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/auth/(.*)",
      "destination": "https://configforge-backend.railway.app/auth/$1"
    },
    {
      "source": "/config/(.*)",
      "destination": "https://configforge-backend.railway.app/config/$1"
    }
  ]
}
```

**Verify:**
```bash
cd frontend && npx vercel.json validate  # or just verify JSON syntax
```

**Acceptance:**
- Vercel proxies `/api/*`, `/auth/*`, `/config/*` to backend
- Backend URL is configurable for different environments

---

## Wave 5 — Plan 06: Add Tests

**Dependencies:** Wave 2 (tenantResolver fixed), Wave 3 (auth fixed)
**Autonomous:** Yes
**Files modified:** 8 files (6 new)

### Task 6.1: Add Backend Tests

**Files:**
- `backend/__tests__/auth.test.ts` (NEW)
- `backend/__tests__/crud.test.ts` (NEW)
- `backend/__tests__/config-reload.test.ts` (NEW)
- `backend/__tests__/tenant-isolation.test.ts` (NEW)
- `backend/__tests__/setup.ts` (NEW)
- `backend/package.json` (MODIFY)
- `backend/vitest.config.ts` (NEW)

**Action:**

1. **Add test dependencies to `backend/package.json`:**
   ```json
   "devDependencies": {
     "vitest": "^1.0.0",
     "supertest": "^6.0.0",
     "@types/supertest": "^6.0.0"
   }
   ```
   Add test script: `"test": "vitest run"`

2. **Create `backend/vitest.config.ts`:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       setupFiles: ['./__tests__/setup.ts'],
     },
   });
   ```

3. **Create `backend/__tests__/setup.ts`:**
   - Set up test environment variables
   - No actual DB connection (mock or skip if not available)
   - Use mock Express app for integration tests

4. **Create `backend/__tests__/auth.test.ts`:**
   - Test registration endpoint (POST /auth/register)
     - Valid registration returns 201 with user
     - Duplicate email returns 409
     - Missing email returns 400
     - Short password returns 400
   - Test login endpoint (POST /auth/login)
     - Valid credentials return 200 with JWT
     - Invalid password returns 401
     - Non-existent user returns 401
   - Test route protection (requireAuth middleware)
     - Missing Bearer token returns 401
     - Invalid JWT returns 401
     - Valid JWT passes through

5. **Create `backend/__tests__/crud.test.ts`:**
   - Test CRUD operations against the handler functions
   - Create entity → verify 201 + returned data
   - List entities → verify 200 + paginated results
   - Get entity by ID → verify 200 + correct data
   - Update entity → verify 200 + merged data
   - Delete entity → verify 200
   - Non-existent entity → verify 404

6. **Create `backend/__tests__/config-reload.test.ts`:**
   - Test POST /config with valid config → verify 200 + new version
   - Test POST /config with breaking changes → verify 409
   - Test POST /config rollback → verify 200 + previous version

7. **Create `backend/__tests__/tenant-isolation.test.ts`:**
   - Test that tenant A cannot access tenant B's data
   - Test that tenant resolver with different x-app-id values scopes correctly

**Verify:**
```bash
cd backend && npm test
```

**Note:** Tests will skip when no database is available (use `describe.skipIf` or conditional execution).

### Task 6.2: Add Frontend Tests

**Files:**
- `frontend/__tests__/login-flow.test.tsx` (NEW)
- `frontend/package.json` (MODIFY)
- `frontend/vitest.config.ts` (NEW)

**Action:**

1. **Add test dependencies to `frontend/package.json`:**
   ```json
   "devDependencies": {
     "vitest": "^1.0.0",
     "@testing-library/react": "^14.0.0",
     "@testing-library/jest-dom": "^6.0.0",
     "jsdom": "^24.0.0"
   }
   ```
   Add test script: `"test": "vitest run"`

2. **Create `frontend/vitest.config.ts`:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import path from 'path';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: [],
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   });
   ```

3. **Create `frontend/__tests__/login-flow.test.tsx`:**
   - Test LoginPage renders correctly
   - Test email/password fields exist
   - Test submit button is present
   - Test error message display
   - Test social login buttons (when configured)

**Verify:**
```bash
cd frontend && npm test
```

**Acceptance:**
- `npm test` passes in both frontend and backend
- Auth, CRUD, config reload, and tenant isolation are tested
- Login page rendering is tested

---

## Wave 6 — Plan 07: Polish & Observability

**Dependencies:** Wave 1 (auth gate), Wave 3 (centralized config)
**Autonomous:** Yes (checkpoint for visual verification)
**Files modified:** ~20 files (5 new)

### Task 7.1: Convert Inline Styles to Tailwind

**Files:**
- All `.tsx` component files in `frontend/src/`

**Action:**

Systematic replacement of inline `style={{...}}` props with Tailwind utility classes.

**Key conversions:**

| Inline Style | Tailwind Class |
|---|---|
| `padding: "2rem"` | `p-8` |
| `textAlign: "center"` | `text-center` |
| `fontSize: "1.5rem", fontWeight: 700` | `text-2xl font-bold` |
| `marginBottom: "1.5rem"` | `mb-6` |
| `backgroundColor: "#f5f5f5"` | `bg-gray-100` |
| `color: "#d32f2f"` | `text-red-600` |
| `borderRadius: "8px"` | `rounded-lg` |
| `border: "1px solid #dee2e6"` | `border border-gray-200` |
| `display: "flex", gap: "1rem"` | `flex gap-4` |
| `justifyContent: "space-between"` | `justify-between` |
| `width: "100%"` | `w-full` |
| `boxSizing: "border-box"` | `box-border` |

**Priority order:** Common components first (high reuse), then page components:
1. `LoadingSkeleton.tsx` (used everywhere)
2. `ErrorPage.tsx` (used everywhere)
3. Input components (`TextInput`, `NumberInput`, etc.)
4. Page components (`DashboardPage`, `ListPage`, etc.)
5. Auth components (`LoginPage`)
6. GeneratorUI, CSV components
7. ErrorBoundary

### Task 7.2: Create Reusable UI Components

**Files:**
- `frontend/src/components/ui/Button.tsx` (NEW)
- `frontend/src/components/ui/Card.tsx` (NEW)
- `frontend/src/components/ui/Input.tsx` (NEW)
- `frontend/src/components/ui/Table.tsx` (NEW)
- `frontend/src/components/ui/Toast.tsx` (NEW)

**Action:**

Create a reusable component library under `frontend/src/components/ui/`:

1. **Button.tsx:** Variants (primary, secondary, danger, ghost), sizes (sm, md, lg), loading state with spinner, disabled state. Tailwind classes.

2. **Card.tsx:** Container with optional header, footer, padding variants. Shadow and border customization.

3. **Input.tsx:** Wrapper around native input with label, error message, helper text. Color-coded border on error.

4. **Table.tsx:** Sortable headers, striped rows, responsive overflow, empty state.

5. **Toast.tsx:** Fixed-position container, success/error/info variants, auto-dismiss with configurable timeout, slide-in animation.

Update all existing components to use these primitives.

### Task 7.3: Add Observability

**Files:**
- `backend/src/index.ts` (MODIFY)
- `frontend/src/components/RuntimeStatus.tsx` (NEW)

**Action:**

1. **Add `GET /metrics` endpoint in `backend/src/index.ts`:**
   ```typescript
   app.get('/metrics', (_req, res) => {
     res.json({
       uptime: process.uptime(),
       config_version: runtimeState.version,
       config_entities: runtimeState.config?.entities?.length || 0,
       config_pages: runtimeState.config?.pages?.length || 0,
       memory: process.memoryUsage(),
       cpu: process.cpuUsage(),
     });
   });
   ```

2. **Create `frontend/src/components/RuntimeStatus.tsx`:**
   - Small badge in the nav area showing config version
   - Green/yellow/red indicator for connection status
   - Polls `/config/version` to show current version
   - Shows "Connected" or "Disconnected" status

### Task 7.4: Improve Demo UX

**Files:**
- `frontend/src/components/GeneratorUI.tsx` (MODIFY)
- `frontend/src/components/pages/AppShell.tsx` (MODIFY)

**Action:**

1. **Add config reload success toast:** In `GeneratorUI.tsx`, after `handleApply` succeeds, show a toast: "Configuration applied! Version X".

2. **Add rollback toast:** Show when rollback succeeds.

3. **Add RuntimeStatus to AppShell:** Show config version and connection status in the nav bar.

4. **Add demo data seed:** Create a `backend/seeds/demo.ts` that populates sample records for the "Bug Tracker" demo config (a few sample bugs, users, etc.).

**Verify:**
```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

**Acceptance:**
- `/metrics` returns structured observability data
- Status badge shows config version in UI
- Successful config apply shows toast notification
- Demo data seed works with `npm run seed`

---

## Threat Model

| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-FIN-01 | Spoofing | `tenantResolver.ts:36` | Mitigate | Per-request `tenantAppId` instead of shared `req.app.id` (Wave 2) |
| T-FIN-02 | Spoofing | `lib/auth.ts` JWT callback | Mitigate | Google OAuth now generates accessToken via backend JWT (Wave 3) |
| T-FIN-03 | Repudiation | All API endpoints | Mitigate | Audit logging already exists (auditService.ts) |
| T-FIN-04 | Information Disclosure | `/metrics` | Accept | No PII, only runtime stats; low-value target |
| T-FIN-05 | Elevation of Privilege | GeneratorUI POST /config | Mitigate | Now requires JWT token (Wave 3) |
| T-FIN-06 | Denial of Service | `/auth/register` | Mitigate | Rate limiting already present (security.ts) |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Break existing auth flow | Medium | High | Each auth change verified with tsc + manual flow test |
| TypeScript compilation errors after tenantResolver change | Low | Medium | Bulk find-replace verified with grep before edit |
| Test suite requires database | High | Low | Use `describe.skipIf` for DB-dependent tests, mock Express for handler tests |
| Tailwind conversion introduces visual regressions | Medium | Medium | Visual checkpoint after Wave 6 |
| execSync→knex API migration breaks migrations | Low | High | Keep old code commented until verified |

---

## Rollback Strategy

### Per-Plan Rollback
```bash
# Revert specific plan
git revert <plan-commit-hash> --no-edit
```

### Full Phase Rollback
```bash
# Find the phase start commit
git log --oneline --grep="finalization" | tail -1
# Revert all commits from phase start to HEAD
git revert HEAD~N..HEAD --no-edit  # N = number of commits
```

### Critical Files Backup
Before modifying these files, consider creating a backup branch:
- `backend/src/middleware/tenantResolver.ts`
- `frontend/src/lib/auth.ts`
- `backend/src/api/handlers.ts`
- `backend/src/core/runtime.ts`
- `frontend/src/components/pages/AppShell.tsx`

---

## Verification Runbook

### After each Wave:

```bash
# 1. Backend compilation
cd backend && npx tsc --noEmit

# 2. Frontend compilation
cd frontend && npx tsc --noEmit

# 3. If CI exists:
# git commit && check CI status
```

### End-to-End Verification (after all Waves):

```bash
# Start services
docker compose up -d db redis

# Run migrations
cd backend && npm run migrate

# Start backend
cd backend && npm run dev &
sleep 3

# Verify health
curl http://localhost:4000/health

# Verify registration
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Verify login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Start frontend
cd frontend && npm run dev &
sleep 5

# Verify frontend compiles (check for build errors)
```

---

## Git Commit Strategy

| Wave | Commit Message | Scope |
|------|---------------|-------|
| W1 | `fix(auth): add login/signup routes, auth gate, fix infinite loading` | 12 files |
| W2 | `fix(security): replace req.app.id with per-request tenantAppId` | 5 files |
| W3 | `fix(auth): Google OAuth token, GeneratorUI JWT, centralize config` | 11 files |
| W4 | `fix(perf): replace execSync with knex programmatic API, add vercel rewrites` | 2 files |
| W5 | `test: add backend and frontend test suites` | 8 files |
| W6 | `style: Tailwind conversion, UI components, observability, demo UX` | ~20 files |
