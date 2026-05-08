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
You are building Step 4 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Frontend framework:  Next.js 14 (App Router)
  Frontend styling:    Tailwind CSS
  Language:            TypeScript (strict mode)
  Backend runtime:     Node.js + Express (running on port 4000)
  API URL:             Configured via NEXT_PUBLIC_API_URL env var

Architecture decisions now locked:
  - Component registry pattern: field type → React component mapping
  - ConfigContext (React Context) provides config to all components — no prop drilling
  - AppShell is the root — handles loading/error/ready states
  - useRuntimeConfig() fetches config from GET /config/runtime, provides via ConfigContext
  - useConfigPolling() polls GET /config/version every 10 seconds (reduced from 5s)
  - PageRouter matches URL path to config page definition, supports detail routes (/entity/:id)
  - PageRenderer resolves page type to component (form/list/detail/dashboard)
  - renderField() uses component registry with UnknownField fallback
  - Unknown field types render orange warning box — never crash
  - FormPage has 4 states: idle, submitting, error, success
  - ListPage has 4 states: loading, error, empty, data — with pagination
  - DetailPage implemented: shows single record read-only
  - DashboardPage implemented: summary cards with entity counts
  - ErrorBoundary catches React errors gracefully
  - Suspense boundaries for lazy-loaded pages
  - Loading skeleton states instead of plain text
</project>

<context>
Steps 0–3 are complete. The backend is fully operational:
  - Config loads and validates at boot
  - Entity tables created dynamically from config
  - CRUD routes registered: GET/POST/PUT/DELETE /api/{entity}
  - Config endpoints: GET /config/runtime, GET /config/version
  - RouterEngine hot-swap for dynamic route management
  - Rate limiting active on /api
  - Redis caching and audit logging active
  - Structured logging with request IDs

This step builds the frontend — a config-driven React UI that reads the
backend config and dynamically renders pages, forms, lists, and detail views.

Key documentation references:
  1. documentation_04.md — ALL sections (AppShell, hooks, PageRouter,
     PageRenderer, component registry, FormPage, ListPage, ErrorPage,
     UnknownField, CSV Upload Flow)
  2. documentation_09.md — Section 1 (Frontend directory structure)
</context>

<task>
Implement Step 4: Frontend Renderer. This step produces the complete
config-driven frontend that dynamically renders UI from backend config.

Step 4 implements:
  - ConfigContext — React Context providing config to all child components
  - AppShell (root component: loading skeleton → error → ready states)
  - useRuntimeConfig() hook (fetches GET /config/runtime, populates context)
  - useConfigPolling() hook (polls GET /config/version every 10s)
  - PageRouter (URL path → config page match, supports /entity/:id for detail)
  - PageRenderer (page.type → component switch, fully case-matched)
  - Component registry (text/number/select/boolean/date → input components)
  - renderField() with UnknownField fallback
  - FormPage (create form with submit/error/success states, reset on success)
  - ListPage (data table with loading/error/empty states, pagination)
  - DetailPage (single record read-only view with all fields)
  - DashboardPage (summary cards: entity counts, recent records)
  - ErrorPage (reusable error display)
  - ErrorBoundary (catches render errors, shows fallback UI)
  - LoadingSkeleton (skeleton placeholders for loading states)
  - All 5 input components + UnknownField fallback
  - Wire AppShell into the Next.js app/page.tsx

Step 4 does NOT implement:
  - Authentication UI (LoginPage — Step 5)
  - CSV upload UI (CSVUploadFlow — Step 6)
  - LLM generator UI (Step 9)
</task>

<output_requirements>
Produce every file listed below. Each file must be complete.
Do not skip any file. Do not use placeholder comments.

Output format for each file:
### path/to/file.tsx
```tsx
(complete file content)
```

FILES TO PRODUCE:

GROUP 0 — Config Context (NEW — replaces prop drilling)
  frontend/src/context/ConfigContext.tsx ← React Context for config:
                                        ConfigProvider: wraps children, fetches config,
                                        provides { config, error, loading, refresh }
                                        useConfig(): hook to access config from any component
                                        Eliminates prop drilling — any component can access config

GROUP 1 — Hooks
  frontend/src/hooks/useRuntimeConfig.ts  ← Now used by ConfigProvider internally.
                                              Can also be used standalone.
                                              Returns { config, error, loading }.
                                              useEffect fetches GET {API_URL}/config/runtime.
  frontend/src/hooks/useConfigPolling.ts  ← useEffect with setInterval (10000ms — 10 seconds).
                                              Fetches GET {API_URL}/config/version.
                                              Calls window.location.reload() on version change.
                                              Silently ignores fetch errors.
                                              Capped at 10s to reduce server load.

GROUP 2 — Component Registry
  frontend/src/lib/componentRegistry.ts   ← Record<string, React.ComponentType<FieldProps>>
                                              Maps: text→TextInput, number→NumberInput,
                                              select→SelectInput, boolean→BooleanInput,
                                              date→DateInput
  frontend/src/lib/renderField.tsx        ← renderField(props: FieldProps): JSX.Element
                                              Looks up registry, falls back to UnknownField

GROUP 3 — Input Components
  frontend/src/components/inputs/TextInput.tsx    ← <input type="text">
  frontend/src/components/inputs/NumberInput.tsx  ← <input type="number">
  frontend/src/components/inputs/SelectInput.tsx  ← <select> with field.options
  frontend/src/components/inputs/BooleanInput.tsx ← <input type="checkbox">
  frontend/src/components/inputs/DateInput.tsx    ← <input type="date">
  frontend/src/components/inputs/UnknownField.tsx ← Orange warning box:
                                                      "Unknown field type: {type}"
                                                      Shows field ID for debugging.
                                                      Border: 1px solid orange.
                                                      Background: #fff3cd (light yellow).

GROUP 4 — Common Components (NEW)
  frontend/src/components/common/ErrorBoundary.tsx  ← React error boundary:
                                                        Catches render errors
                                                        Shows "Something went wrong" fallback
                                                        Logs error details to console
                                                        "Try again" button resets error state
  frontend/src/components/common/LoadingSkeleton.tsx ← Skeleton placeholder:
                                                        Animated pulse effect
                                                        Configurable rows (default 3)
                                                        Used by ListPage and DetailPage loading states

GROUP 5 — Page Components
  frontend/src/components/pages/AppShell.tsx     ← Root wrapper. Three states:
                                                      loading → <LoadingSkeleton rows={4} />
                                                      error → red error + Retry button
                                                      ready → renders <ConfigProvider>
                                                                <PageRouter config={config} />
                                                              </ConfigProvider>
  frontend/src/components/pages/PageRouter.tsx   ← Reads window.location.pathname.
                                                      Attempts EXACT match against config.pages first.
                                                      Then attempts PATTERN match: /entity/:id for detail pages.
                                                      Not found → <ErrorPage message="Page not found">
                                                      Found → <PageRenderer page={page} config={config} params={params}>
  frontend/src/components/pages/PageRenderer.tsx ← Finds entity by page.entity name.
                                                      Switch on page.type:
                                                        form → <FormPage entity={entity}>
                                                        list → <ListPage entity={entity}>
                                                        detail → <DetailPage entity={entity} id={params.id}>
                                                        dashboard → <DashboardPage config={config}>
                                                        default → <ErrorPage message="Unsupported page type: {type}">
  frontend/src/components/pages/FormPage.tsx     ← Dynamic form from entity.fields.
                                                      States: formData, submitting, error, success.
                                                      POST to /api/{entity.name} with { data: formData }.
                                                      Success → green message + "Create another" button.
                                                      Error → red inline message.
                                                      Submitting → disabled button "Saving..."
  frontend/src/components/pages/ListPage.tsx     ← Fetches GET /api/{entity.name} with pagination params.
                                                      States: loading → <LoadingSkeleton rows={5} />,
                                                      error → red error message,
                                                      empty → "No records found for {entity.label}",
                                                      data → <table> with entity.fields as columns.
                                                      Pagination: page query param, prev/next buttons,
                                                      "Page {page}" indicator, 20 items per page default.
  frontend/src/components/pages/DetailPage.tsx  ← NEW — Single record view:
                                                      Fetches GET /api/{entity.name}/{id}
                                                      States: loading → <LoadingSkeleton />,
                                                      error → red error message,
                                                      not found → <ErrorPage message="Record not found">,
                                                      data → read-only display of all fields.
                                                      Shows field labels and values.
                                                      "Back to list" link.
  frontend/src/components/pages/DashboardPage.tsx ← NEW — Summary dashboard:
                                                      Fetches GET /api/{entity.name} for each entity.
                                                      Shows count cards: "X {entity.label} records".
                                                      Shows recent 5 records table.
                                                      Shows quick-create button for each entity.
  frontend/src/components/pages/ErrorPage.tsx    ← Centered error display. Two variants:
                                                      "Page not found" → 404-style message
                                                      Custom message prop.
                                                      "Go back" button (window.history.back)
                                                      "Home" button link.

GROUP 6 — App Integration
  frontend/src/app/page.tsx               ← MODIFY: Import and render <AppShell />
  frontend/src/app/layout.tsx             ← MODIFY if needed: ensure globals.css imported
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `cd frontend && npx tsc --noEmit` must succeed after all changes.
  All components use "use client" directive where React hooks are used.

RULE 2 — API_URL comes from environment.
  All fetch calls use:
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  Never hardcode "http://localhost:4000" directly in fetch URLs.

RULE 3 — Unknown field types never crash.
  renderField() must handle any string type gracefully. If the type
  is not in componentRegistry, render UnknownField. Never throw,
  never return null, never use a bare conditional that could fail.

RULE 4 — All components handle all states.
  FormPage: idle, submitting, submitError, submitSuccess
  ListPage: loading, error, empty (data.length===0), data (with pagination)
  DetailPage: loading, error, notFound, data
  DashboardPage: loading, error, data
  AppShell: loading (skeleton), error, ready
  No component may render nothing — every state has visible output.

RULE 5 — Field props interface is consistent.
  All input components accept: { id, type, label, value, onChange, options? }
  onChange signature: (value: any) => void
  All inputs display field.label (not field.id) as the visible label.

RULE 6 — FormPage resets on success.
  After successful submit: show green success message, clear formData,
  show "Create another" button that resets to empty form.

RULE 7 — ListPage displays JSONB data correctly.
  Table cells render row.data[field.id], not row[field.id].
  Data is in the JSONB data column, not as top-level SQL columns.
  Use String(row.data?.[field.id] ?? "") for display.

RULE 8 — Hot reload polling is resilient.
  useConfigPolling catches all fetch errors silently. Polling failure
  must never show an error to the user — it retries on the next interval.
  Polling interval is 10 seconds (not 5) to reduce server load.

RULE 9 — No Tailwind utility classes required.
  Use inline styles for this step (matching documentation_04.md code).
  Tailwind styling will be added in a polish step later.

RULE 10 — PageRouter supports detail routes.
  First try exact match against config.pages[].path.
  If no match, try pattern: /{entity-name}/{uuid} → detail page.
  Parse UUID from path segment after entity name.
  Pass matched params (entity, id) to PageRenderer.

RULE 11 — ConfigContext wraps the component tree.
  AppShell wraps content in ConfigProvider.
  Any component can use useConfig() to access config.
  This eliminates the prop drilling problem described in the architecture review.

RULE 12 — Pagination defaults.
  ListPage defaults to 20 items per page.
  Uses query parameter `page` (defaults to 1).
  Shows "Page X of Y" indicator.
  Prev button disabled on page 1.
  Next button disabled if fewer items than page size returned.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd frontend && npx tsc --noEmit → 0 errors

CHECK 2 — Frontend starts:
  cd frontend && npm run dev → Next.js on port 3000, no errors

CHECK 3 — AppShell loading state:
  Stop backend, load http://localhost:3000
  Expected: Loading skeleton then error with Retry button

CHECK 4 — AppShell ready state:
  Start backend, load http://localhost:3000
  Expected: PageRouter renders (may show "Page not found" for /)

CHECK 5 — Form page renders:
  Navigate to /bugs/new (or matching config path)
  Expected: Form with title, severity, assignee, resolved fields

CHECK 6 — Form submit creates record:
  Fill form, click Submit → green success message
  Verify: GET /api/bug returns the created record

CHECK 7 — List page renders with pagination:
  Navigate to /bugs (or matching config path)
  Expected: Table showing records with column headers, pagination controls

CHECK 8 — Empty list shows message:
  Delete all records, visit list page
  Expected: "No records found for bug"

CHECK 9 — Unknown field type renders warning:
  Add field with type "rating" to config
  Expected: Orange warning box in form, no crash

CHECK 10 — Config polling active:
  Open browser console → network tab shows /config/version requests every 10s

CHECK 11 — Error page works:
  Navigate to /nonexistent-path
  Expected: ErrorPage with "Page not found" and Go back button

CHECK 12 — Detail page works:
  Create a record, navigate to /bugs/<record-id>
  Expected: DetailPage showing all fields read-only

CHECK 13 — Dashboard page works:
  Navigate to /dashboard (or matching config path)
  Expected: DashboardPage showing entity count cards

CHECK 14 — ErrorBoundary catches errors:
  Temporarily break a component (e.g., remove a required prop)
  Expected: ErrorBoundary fallback UI, not white screen

CHECK 15 — ConfigContext provides config:
  Any component using useConfig() has access to config without prop drilling

CHECK 16 — Steps 0-3 regression:
  Backend health check, CRUD operations, config endpoints all work
</verification>
```
