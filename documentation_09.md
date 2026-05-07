# Developer Guide

This document provides the development environment setup, project structure, coding conventions, and extension patterns for ConfigForge.

---

## 1. Project Structure

```text
configforge/
├── frontend/                          # Next.js 14 application
│   ├── src/
│   │   ├── app/                       # Next.js app router
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── page.tsx               # Home page
│   │   │   └── api/
│   │   │       └── auth/
│   │   │           └── [...nextauth]/
│   │   │               └── route.ts   # NextAuth handler
│   │   ├── components/
│   │   │   ├── AppShell.tsx           # Top-level loading/error wrapper
│   │   │   ├── PageRouter.tsx         # URL-to-config page resolver
│   │   │   ├── PageRenderer.tsx       # Page type to component mapper
│   │   │   ├── FormPage.tsx           # Dynamic form with submit states
│   │   │   ├── ListPage.tsx           # Dynamic table view
│   │   │   ├── DetailPage.tsx         # Single record view
│   │   │   ├── DashboardPage.tsx      # Aggregated view
│   │   │   ├── ErrorPage.tsx          # Error display
│   │   │   ├── LoginPage.tsx          # Config-driven login UI
│   │   │   ├── CSVUploadFlow.tsx      # CSV import orchestrator
│   │   │   ├── CSVMapperUI.tsx        # Column-to-field mapping UI
│   │   │   ├── ImportResult.tsx       # Import result display
│   │   │   └── inputs/
│   │   │       ├── TextInput.tsx
│   │   │       ├── NumberInput.tsx
│   │   │       ├── SelectInput.tsx
│   │   │       ├── BooleanInput.tsx
│   │   │       ├── DateInput.tsx
│   │   │       └── UnknownField.tsx   # Fallback for unknown types
│   │   ├── hooks/
│   │   │   ├── useRuntimeConfig.ts    # Fetches config from backend
│   │   │   └── useConfigPolling.ts    # Hot reload polling
│   │   ├── lib/
│   │   │   ├── componentRegistry.ts   # Field type -> component map
│   │   │   └── renderField.tsx        # Safe field renderer with fallback
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                           # Node.js + Express API
│   ├── src/
│   │   ├── index.ts                   # Express app + boot
│   │   ├── core/
│   │   │   ├── runtime.ts             # Runtime state + boot + reload
│   │   │   ├── validator.ts           # Zod schema + semantic validation
│   │   │   ├── normalizer.ts          # Config normalization
│   │   │   └── diff.ts                # Config diff engine
│   │   ├── api/
│   │   │   ├── routes.ts              # Dynamic route registration
│   │   │   ├── handlers.ts            # CRUD handlers (list, create, update, delete)
│   │   │   ├── configRoutes.ts        # Config management endpoints
│   │   │   └── csvRoutes.ts           # CSV parse + import endpoints
│   │   ├── middleware/
│   │   │   ├── tenantResolver.ts      # Resolves app_id from subdomain
│   │   │   ├── auth.ts                # JWT verification middleware
│   │   │   └── membership.ts          # App membership check
│   │   ├── services/
│   │   │   ├── eventBus.ts            # EventEmitter instance
│   │   │   ├── emailService.ts        # Nodemailer transporter
│   │   │   ├── notificationService.ts # Event listeners (config-driven)
│   │   │   └── llmService.ts          # Anthropic API + retry loop
│   │   ├── auth/
│   │   │   ├── providers.ts           # buildAuthProviders(config)
│   │   │   └── nextauth.ts            # NextAuth configuration
│   │   └── db/
│   │       ├── connection.ts          # Knex connection setup
│   │       └── schemaBuilder.ts       # buildZodSchema(entity)
│   ├── migrations/
│   │   └── 001_initial_setup.ts       # apps, users, app_users tables
│   ├── config/
│   │   └── app.json                   # Default config file
│   ├── knexfile.ts                    # Knex configuration
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example                       # Template for environment variables
├── .gitignore
├── README.md                          # Project README (see doc_01)
└── documentation_*.md                 # Documentation files
```

---

## 2. Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| PostgreSQL | 15+ | Database |
| npm | 9+ | Package manager |
| Git | 2.30+ | Version control |

### First-Time Setup

```bash
# 1. Clone and install
git clone https://github.com/your-username/configforge.git
cd configforge

# 2. Frontend
cd frontend && npm install
cp .env.example .env.local

# 3. Backend
cd ../backend && npm install
cp .env.example .env

# 4. Database
npx knex migrate:latest

# 5. Run
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd frontend && npm run dev
```

---

## 3. Coding Conventions

### Naming

| Item | Convention | Example |
|------|-----------|---------|
| Entity names | snake_case | `menu_item` |
| Field IDs | snake_case | `due_date` |
| Config keys | snake_case | `csv_import` |
| React components | PascalCase | `FormPage` |
| TypeScript files | camelCase | `eventBus.ts` |
| SQL tables | snake_case | `app_users` |

### TypeScript

- Strict mode enabled
- No `any` types (except for JSONB data columns)
- All functions must have explicit return types
- Use `z.infer<typeof schema>` for types derived from Zod schemas

### Error Handling

- All API handlers wrapped in try/catch
- Errors returned as structured JSON: `{ error: string, details?: any }`
- Never throw unhandled exceptions in request handlers
- Email failures must never block API responses

---

## 4. Adding a New Field Type

To add a new field type (e.g., `textarea`):

### Step 1: Add to Zod schema (doc_03)

```ts
type: z.enum(["text", "number", "date", "select", "boolean", "textarea"])
```

### Step 2: Create input component

```tsx
// frontend/src/components/inputs/TextareaInput.tsx
export function TextareaInput({ value, onChange }) {
  return (
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} />
  );
}
```

### Step 3: Register in component registry

```ts
import { TextareaInput } from "@/components/inputs/TextareaInput";

export const componentRegistry = {
  // ... existing types
  textarea: TextareaInput
};
```

### Step 4: Update buildZodSchema

```ts
case "textarea": validator = z.string(); break;
```

No backend changes required — JSONB stores any field type natively.

---

## 5. Adding a New Page Type

To add a new page type (e.g., `kanban`):

### Step 1: Add to page type enum (doc_03)

```ts
type: z.enum(["list", "form", "detail", "dashboard", "kanban"])
```

### Step 2: Create page component

```tsx
// frontend/src/components/KanbanPage.tsx
export function KanbanPage({ entity, config }) {
  // Custom rendering logic
}
```

### Step 3: Add to PageRenderer (doc_04)

```tsx
case "kanban":
  return <KanbanPage entity={entity} config={config} />;
```

---

## 6. Adding a New Auth Provider

To add a new auth provider (e.g., `github`):

### Step 1: Add to auth.methods enum (doc_03)

```ts
methods: z.array(z.enum(["email", "google", "github"]))
```

### Step 2: Add provider in buildAuthProviders (doc_07)

```ts
if (config.auth?.methods?.includes("github")) {
  providers.push(GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET
  }));
}
```

### Step 3: Add button in LoginPage (doc_08)

```tsx
{methods.includes("github") && (
  <button onClick={() => signIn("github")}>Sign in with GitHub</button>
)}
```

---

## 7. Testing Strategy

| Layer | Tool | What to test |
|-------|------|-------------|
| Config validation | Jest | Zod schema + semantic validation |
| API handlers | Supertest | CRUD operations, error responses |
| Frontend components | React Testing Library | Rendering, form submission, error states |
| Integration | Cypress or Playwright | Full flow: config -> UI -> submit -> DB |

---

CHANGES APPLIED:
- Guide section used: 7 (complete folder structure)
- Contradictions resolved: Folder structure now reflects the complete two-directory layout with all files referenced across documents; includes new files from guide (AppShell, CSVMapperUI, ImportResult, LoginPage, buildAuthProviders, etc.)
- Removed: Simplified/incomplete folder structure; trailing commentary; emoji from headers
