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
You are building Step 8 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  Backend runtime:     Node.js + Express
  Config validation:   Zod + semantic validation
  Diff engine:         diffConfigs() + isBreaking()
  Config endpoint:     POST /config (256KB body limit)
  Router:              RouterEngine hot-swap (Step 3)
  Cache:               Redis (ioredis) for distributed config sync (Step 13)

Architecture decisions now locked:
  - Hot reload via POST /config → validate → diff → apply
  - Breaking changes (REMOVE_FIELD, CHANGE_FIELD_TYPE, REMOVE_ENTITY) → 409
  - Non-breaking changes applied immediately
  - **RouterEngine.replaceRoutes()** used for atomic route replacement (fixes clearExistingRoutes)
  - **async-mutex** prevents concurrent reloads (fixes race condition)
  - **Atomic DB sync**: runtimeState.config updated ONLY after syncDatabase succeeds (fixes partial state)
  - **Config snapshots** saved to config_snapshots table on each reload
  - **Redis cache invalidation** on reload for distributed consistency
  - **Rollback on failure**: if any step fails, all changes are reverted
  - In-flight requests use the config snapshot from request start (req.config)
  - Frontend polls GET /config/version every 10s → reload on change
  - Config body limit: 256KB
</project>

<context>
Steps 0–7 are complete:
  - Full project with auth, CRUD, CSV import, notifications
  - diffConfigs() and isBreaking() from Step 1 ready to use
  - runtimeState holds current config and version
  - RouterEngine with replaceRoutes() from Step 3 ready for hot-swap
  - Frontend useConfigPolling() already polls /config/version
  - req.config middleware snapshots config per request
  - Redis cache service available for distributed invalidation
  - Notification listeners support unregister/re-register

CRITICAL FIXES IMPLEMENTED IN THIS STEP:

FIX 1 — clearExistingRoutes() (CTO Review #1 Critical):
  The original design referenced clearExistingRoutes() but never defined it.
  Fix: RouterEngine.replaceRoutes() creates a new Router, populates it,
  and swaps the app's reference atomically. Express garbage-collects the
  old router when in-flight requests complete. No route deletion needed.

FIX 2 — Concurrent reload mutex (CTO Review #8 High):
  Two POST /config requests arriving simultaneously would corrupt the
  route table. Fix: async-mutex (Mutex) acquired at the start of
  reloadConfig and released at the end. Second request waits for first
  to complete.

FIX 3 — Atomic DB sync (CTO Review #9 High):
  Original: runtimeState.config = newConfig → syncDatabase ← BROKEN
  Fix: syncDatabase(newConfig) → registerDynamicRoutes → runtimeState.config = newConfig
  If syncDatabase fails, runtimeState.config is NOT updated.
  Previous config remains active. System stays consistent.

FIX 4 — Config version history:
  Each reload saves a snapshot to config_snapshots table.
  Enables rollback to any previous version.
  Version is Date.now() timestamp (millisecond precision).

FIX 5 — Redis cache invalidation:
  On successful reload, invalidate config cache in Redis.
  Other instances receive pub/sub invalidation and refresh their cache.
</context>

<task>
Implement Step 8: Hot Config Reload. This step adds the ability to update
the running config without restarting the server. All critical fixes
for atomicity, concurrency, and consistency are implemented.

Step 8 implements:
  - POST /config endpoint:
    1. Accept new config JSON (256KB body limit)
    2. Validate with validateConfig()
    3. Normalize with normalizeConfig()
    4. Diff against current config with diffConfigs()
    5. Reject breaking changes with 409 + details
    6. Acquire mutex → apply non-breaking changes via reloadConfig()
    7. Release mutex → return { success: true, version: newVersion }
  - reloadConfig(newConfig) function:
    1. Acquire async-mutex (wait if another reload is in progress)
    2. syncDatabase(newConfig) — create new entity tables FIRST
    3. Re-register dynamic routes via RouterEngine.replaceRoutes()
    4. Re-register notification listeners (unregister old, register new)
    5. Update runtimeState.config and runtimeState.version (ATOMIC — after all steps succeed)
    6. Save config snapshot to config_snapshots table
    7. Invalidate Redis cache for this app
    8. Release mutex
    9. On ANY failure: do NOT update runtimeState.config, log error, release mutex, throw
  - Rollback on failure: config unchanged, routes unchanged, DB unaffected
  - In-flight request safety via req.config snapshot
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

GROUP 1 — Config Reload Endpoint
  backend/src/api/configRoutes.ts   ← MODIFY existing: Add POST /config:
                                        express.json({ limit: "256kb" })
                                        1. validateConfig(req.body)
                                           Fail → 400 INVALID_CONFIG + errors
                                        2. normalizeConfig(result.data)
                                        3. diffConfigs(runtimeState.config, newConfig)
                                        4. Filter breaking changes
                                           Breaking found → 409 BREAKING_SCHEMA_CHANGE + details
                                        5. reloadConfig(app, newConfig) — MUTEX PROTECTED
                                        6. Return { success: true, version: runtimeState.version }

GROUP 2 — Runtime Update with Mutex (FIXED)
  backend/src/core/reloadEngine.ts  ← NEW FILE: ReloadEngine with mutex:
                                        import { Mutex } from "async-mutex"
                                        const reloadMutex = new Mutex()
                                        
                                        async function reloadConfig(app, newConfig):
                                          return await reloadMutex.runExclusive(async () => {
                                            // 1. Sync database (create new entity tables)
                                            const syncResult = await syncDatabase(newConfig)
                                            
                                            // 2. Re-register routes via RouterEngine
                                            replaceRoutes(app, newConfig)
                                            
                                            // 3. Re-register notification listeners
                                            if (typeof unregisterNotifications === "function") {
                                              unregisterNotifications()
                                            }
                                            const cleanup = registerNotificationListeners()
                                            unregisterNotifications = cleanup
                                            
                                            // 4. Update runtimeState (ATOMIC — after all success)
                                            runtimeState.config = newConfig
                                            runtimeState.version = Date.now()
                                            
                                            // 5. Save config snapshot
                                            if (req?.app?.id) {
                                              await saveConfigSnapshot(req.app.id, newConfig, runtimeState.version)
                                            }
                                            
                                            // 6. Invalidate Redis cache
                                            if (req?.app?.id) {
                                              await invalidateConfigCache(req.app.id)
                                            }
                                            
                                            logger.info({ version: runtimeState.version }, "Config reloaded successfully")
                                            return runtimeState.version
                                          })
                                          // If any step throws, mutex is released automatically
                                          // runtimeState.config is NOT updated → system stays consistent

GROUP 3 — Route Management (clearExistingRoutes FIX)
  backend/src/core/routerEngine.ts  ← MODIFY existing: Ensure replaceRoutes is fully implemented:
                                        replaceRoutes(app, config):
                                          1. Create new Express Router
                                          2. Populate with entity routes from config
                                          3. Apply auth middleware to new router
                                          4. Swap: app._router.stack replaces old apiRouter
                                          This IS the fix for clearExistingRoutes().
                                          Express has no removeRoutes() — hot-swap is the only pattern.

GROUP 4 — Entry Point Update
  backend/src/core/runtime.ts       ← MODIFY: Export reloadConfig for use by configRoutes
                                        Add reloadConfig to module exports

GROUP 5 — Frontend (no changes needed)
  Frontend useConfigPolling already polls /config/version every 10s.
  When version changes, window.location.reload() is called.
  No frontend changes needed for hot reload.
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed after all changes.

RULE 2 — Breaking changes are REJECTED, not applied (enforced).
  If diffConfigs() finds ANY change where isBreaking() returns true,
  the entire config update is rejected with HTTP 409. The change
  types that are breaking:
    - REMOVE_FIELD
    - CHANGE_FIELD_TYPE
    - REMOVE_ENTITY
  Return the list of breaking changes in the response details.

RULE 3 — Config body limit is 256KB, NOT 1MB.
  POST /config uses its own express.json({ limit: "256kb" }).
  This is separate from the global 1MB limit on data endpoints.

RULE 4 — Validation happens BEFORE diff.
  If the new config fails Zod validation, return 400 immediately.
  Do not attempt to diff an invalid config against the current one.

RULE 5 — reloadConfig is atomic (MUTEX PROTECTED).
  async-mutex Mutex.runExclusive() ensures only one reload at a time.
  The sequence is:
    1. syncDatabase (create tables)
    2. replaceRoutes (swap router)
    3. Update runtimeState (LAST — only after 1+2 succeed)
  If steps 1-2 fail, runtimeState is never updated.
  The mutex is released automatically by runExclusive even on throw.

RULE 6 — Router hot-swap replaces routes atomically.
  replaceRoutes creates a fresh Express Router, registers routes on it,
  and swaps it into the app's middleware stack. The old router is
  garbage collected. This is the ONLY reliable way to update routes
  without Express route deletion API. This IS the clearExistingRoutes fix.

RULE 7 — POST /config is an admin endpoint.
  It requires authentication (JWT). It does NOT require tenant resolution
  (it operates on the global config). The auth check ensures only
  authenticated users can change the config.

RULE 8 — Diff details are informative.
  The 409 response includes the list of breaking changes:
  { error: "BREAKING_SCHEMA_CHANGE",
    details: [{ type: "REMOVE_FIELD", entity: "bug", field: "severity" }] }

RULE 9 — Non-breaking changes include all safe types.
  ADD_ENTITY → new table created via syncDatabase
  ADD_FIELD → no DB change needed (JSONB)
  ADD_PAGE → new route available
  REMOVE_PAGE → route removed

RULE 10 — Config snapshots enable rollback.
  Each successful reload saves a snapshot to config_snapshots.
  Rollback (future feature) reads a previous snapshot and applies it
  through the same reloadConfig pipeline.

RULE 11 — Redis cache invalidation.
  On successful reload, call invalidateConfigCache(appId).
  This publishes to Redis pub/sub channel.
  Other instances receive the invalidation and clear their local cache.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors

CHECK 2 — Non-breaking config update succeeds:
  POST /config with valid config that adds a new entity
  Expected: 200, { success: true, version: <new timestamp> }

CHECK 3 — New entity table created:
  After adding entity "task" via POST /config → \dt shows "task" table

CHECK 4 — New routes available:
  After adding entity "task" → GET /api/task returns { data: [] }

CHECK 5 — Breaking change rejected:
  POST /config that removes a field from existing entity
  Expected: 409, { error: "BREAKING_SCHEMA_CHANGE", details: [...] }

CHECK 6 — Invalid config rejected:
  POST /config with invalid JSON schema
  Expected: 400, { error: "INVALID_CONFIG", details: [...] }

CHECK 7 — Version incremented:
  GET /config/version before and after reload → version changed

CHECK 8 — Frontend auto-reloads:
  With frontend running, POST /config → frontend reloads
  (detected by version polling every 10s)

CHECK 9 — In-flight request safety:
  Start a long request, reload config mid-request
  Expected: request completes with original config (req.config snapshot)

CHECK 10 — Config too large rejected:
  POST /config with body > 256KB → 413

CHECK 11 — Existing data preserved:
  Create records in "bug" entity, add "task" entity via POST /config
  Verify: "bug" records still accessible after reload

CHECK 12 — Concurrent reload blocked:
  Send 2 POST /config simultaneously
  Expected: Both succeed (second waits for first via mutex), no corruption

CHECK 13 — Config snapshot saved:
  After reload, config_snapshots table has new row with new version

CHECK 14 — Rollback on failure:
  Force a failure during reload (e.g., invalid table name)
  Expected: runtimeState.config unchanged, old routes still active

CHECK 15 — Steps 0-7 regression:
  Auth, CRUD, CSV import, notifications all working
</verification>
```
