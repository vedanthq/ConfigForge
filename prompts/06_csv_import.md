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
You are building Step 6 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  CSV parsing:         PapaParse
  File uploads:        Multer (2MB limit, memory storage)
  Validation:          Zod (same buildZodSchema used for CRUD)
  Database:            PostgreSQL + JSONB via Knex

Architecture decisions now locked:
  - CSV import is a TWO-STEP flow: parse first, then import with mapping
  - Step 1: POST /api/csv-parse → returns headers + 3-row preview
  - Step 2: POST /api/csv-import → applies mapping, validates each row, batch inserts
  - Column-to-field mapping is MANUAL via dropdown UI, NOT auto-matched
  - Valid rows are inserted; invalid rows are skipped with error details
  - Error reporting capped at 10 errors (prevent huge response payloads)
  - File size limit: 2MB enforced by Multer
  - Feature gated by config: features.csv_import must be true
  - **Batch inserts**: Use knex.batchInsert in groups of 500 to avoid timeout
  - **Progress tracking**: Import returns partial results if connection drops
</project>

<context>
Steps 0–5 are complete:
  - Full project scaffolded, DB connected, migrations run
  - Config validation pipeline working
  - Dynamic entity tables with JSONB data columns
  - CRUD routes with real JWT authentication
  - Config-driven login page
  - Frontend rendering forms, lists, detail, dashboard from config

This step adds the first qualifying feature: CSV Import. The import uses
the existing buildZodSchema() to validate each row against the entity
schema, ensuring data integrity.

CRITICAL FIX — Batch Inserts:
  The original design inserted rows one at a time:
    for (const row of data) { await db(entity.name).insert(row) }
    // 10,000 rows = 10,000 round-trips = timeout
  This implementation uses knex.batchInsert:
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.batchInsert(entity.name, batch);
    }
    // 10,000 rows = 20 round-trips = fast
</context>

<task>
Implement Step 6: CSV Import (Feature 1). This step adds the complete CSV
import pipeline — backend parse/import endpoints and frontend mapping UI.

Step 6 implements:
  Backend:
  - Multer configuration (2MB, memory storage)
  - POST /api/csv-parse — parse CSV, return headers + 3-row preview
  - POST /api/csv-import — apply mapping, validate rows, batch insert valid ones
  - Feature gating: check config.features.csv_import before processing

  Frontend:
  - CSVUploadFlow component (3-step orchestrator: upload → mapping → result)
  - CSVMapperUI component (dropdown column-to-field mapping table)
  - ImportResult component (imported/skipped counts + error list)
  - Integration into existing ListPage (button to trigger CSV import)

Step 6 does NOT implement:
  - Email notifications (Step 7)
  - Config hot reload (Step 8)
  - LLM config generation (Step 9)
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

GROUP 1 — Backend CSV Routes
  backend/src/api/csvRoutes.ts      ← Multer setup: multer({ storage: memoryStorage(),
                                        limits: { fileSize: 2 * 1024 * 1024 } })

                                        POST /api/csv-parse:
                                          1. Check req.file exists → 400 NO_FILE_PROVIDED
                                          2. Check file size ≤ 2MB → 413 FILE_TOO_LARGE
                                          3. Parse with Papa.parse(text, { header: true })
                                          4. If parse errors and no data → 400 INVALID_CSV
                                          5. Return { success: true, headers: string[],
                                             preview: first 3 rows }

                                        POST /api/csv-import:
                                          1. Find entity by req.body.entity name in config
                                          2. Parse CSV with Papa.parse
                                          3. Parse mapping from req.body.mapping (JSON string)
                                          4. For each row:
                                             a. Remap CSV columns to entity fields per mapping
                                             b. Validate via buildZodSchema(entity).safeParse()
                                             c. Valid → collect in batch array
                                             d. Invalid → skip, record error
                                          5. Batch insert valid rows using knex.batchInsert:
                                             BATCH_SIZE = 500
                                             for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                                               const batch = validRows.slice(i, i + BATCH_SIZE);
                                               await db.batchInsert(entity.name, batch);
                                             }
                                          6. Return { success: true, imported, skipped,
                                             errors: first 10 }

GROUP 2 — Backend Route Registration
  backend/src/index.ts              ← MODIFY: Wire csvRoutes under /api prefix
                                        (behind tenant + auth middleware)

GROUP 3 — Frontend CSV Components
  frontend/src/components/csv/CSVUploadFlow.tsx ← 3-state orchestrator:
                                        "upload" → file input, accept=".csv"
                                        "mapping" → <CSVMapperUI>
                                        "result" → <ImportResult>
                                        Error state with retry button
                                        Handles POST /api/csv-parse and /api/csv-import

  frontend/src/components/csv/CSVMapperUI.tsx   ← Table with columns:
                                        Column 1: CSV column name
                                        Column 2: dropdown (-- Skip -- + entity.fields)
                                        "Import" button to submit mapping
                                        mapping format: { csvColumn: entityFieldId }

  frontend/src/components/csv/ImportResult.tsx  ← Displays:
                                        Green: "{N} rows imported successfully"
                                        Orange: "{N} rows skipped" (if any)
                                        Error list: "Row {N}: {error messages}"

GROUP 4 — Frontend Integration
  frontend/src/components/pages/ListPage.tsx ← MODIFY: Add "Import CSV" button
                                          that opens CSVUploadFlow for entity
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed in both frontend/ and backend/.

RULE 2 — CSV parse and import are separate endpoints.
  Parse returns headers only — no data is imported.
  Import requires mapping — columns are remapped before validation.
  This two-step design gives users control over column mapping.

RULE 3 — Mapping is manual, NEVER auto-matched.
  The UI shows a dropdown for each CSV column. The user selects
  which entity field it maps to, or "Skip" to ignore. Auto-matching
  by name similarity is explicitly rejected.

RULE 4 — Every row validated via buildZodSchema.
  The same schema builder used by CRUD handlers validates CSV rows.
  This ensures imported data meets the same constraints as manual entry.
  Invalid rows are skipped — they do NOT fail the entire import.

RULE 5 — Error reporting capped at 10.
  Return errors.slice(0, 10) in the response. This prevents a 10MB
  error response for a 50K-row CSV with many failures.

RULE 6 — Tenant isolation on import.
  Every inserted row includes app_id and user_id from the request.
  CSV import does NOT bypass tenant scoping.

RULE 7 — Feature gating.
  POST /api/csv-parse and POST /api/csv-import should check:
    if (!req.config.features?.csv_import) return 403 FEATURE_DISABLED
  If csv_import is false or missing, the feature is disabled.

RULE 8 — File validation before parse.
  Check req.file exists → 400 NO_FILE_PROVIDED
  Check file size ≤ 2MB → 413 FILE_TOO_LARGE
  These checks happen BEFORE attempting Papa.parse.

RULE 9 — Multer uses memory storage.
  Files are buffered in memory (req.file.buffer), NOT written to disk.
  This avoids file system cleanup and temp directory issues.

RULE 10 — Batch insert uses knex.batchInsert.
  BATCH_SIZE = 500 rows per batch.
  This fixes the timeout issue with large CSVs (CTO Review Priority 6).
  Wrap batch insert in try/catch per batch for resilience.

RULE 11 — CSVUploadFlow handles all error states.
  Parse failure → show error + "Try again" button
  Import failure → show error + "Try again" button
  Network error → show error + "Try again" button
  Always recoverable — never a dead-end UI state.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors
  cd frontend && npx tsc --noEmit → 0 errors

CHECK 2 — CSV parse returns headers:
  POST /api/csv-parse with valid CSV file
  Expected: { success: true, headers: ["col1","col2"], preview: [{...},...] }

CHECK 3 — No file returns 400:
  POST /api/csv-parse with no file attached
  Expected: 400, { error: "NO_FILE_PROVIDED" }

CHECK 4 — Oversized file rejected:
  POST /api/csv-parse with >2MB file
  Expected: 413, { error: "FILE_TOO_LARGE" }

CHECK 5 — CSV import with mapping:
  POST /api/csv-import with file + entity "bug" + mapping
    { "Title": "title", "Severity": "severity" }
  Expected: { success: true, imported: N, skipped: 0, errors: [] }

CHECK 6 — Invalid rows skipped:
  CSV with rows that fail Zod validation (e.g., wrong enum value)
  Expected: { imported: M, skipped: K, errors: [{row:1,...}] }

CHECK 7 — Unmapped columns skipped:
  Mapping with some columns set to "" (Skip)
  Expected: Only mapped columns appear in inserted data

CHECK 8 — Feature gating:
  Set config.features.csv_import = false
  POST /api/csv-parse → 403

CHECK 9 — Frontend upload flow:
  Click "Import CSV" on ListPage → file picker → CSVMapperUI → ImportResult

CHECK 10 — Mapper UI shows correct fields:
  CSVMapperUI dropdown options match entity.fields

CHECK 11 — Import result shows counts:
  After import → "X rows imported" + "Y rows skipped" if any

CHECK 12 — Error recovery:
  Parse failure → error message + "Try again" button → file picker

CHECK 13 — Batch insert with 1500 rows:
  CSV with 1500 valid rows → 3 batch inserts of 500 each
  Expected: { imported: 1500, skipped: 0 }

CHECK 14 — Steps 0-5 regression:
  Auth, CRUD, login page, config endpoints all working
</verification>
```
