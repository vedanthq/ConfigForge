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
You are building Step 9 of ConfigForge — a production-grade config-driven AI
App Generator Platform, written in TypeScript.

Finalized project facts (do not deviate from these):
  LLM provider:       Anthropic Claude API (@anthropic-ai/sdk)
  Model:              **claude-3-5-sonnet-20241022** (FIXED — not the deprecated 20240229)
  Max tokens:         **4096** (increased from 2000 — complex configs need more)
  Validation:         Same Zod pipeline as config validation
  Retry limit:        3 attempts maximum
  Model env var:      LLM_MODEL (default: claude-3-5-sonnet-20241022)

Architecture decisions now locked:
  - Natural language → JSON config via LLM
  - System prompt enforces strict JSON-only output
  - JSON Schema injected into prompt for structure guidance
  - Output validated through: JSON.parse → validateConfig → accept/retry
  - 3 retries: if all fail → LLM_GENERATION_FAILED error
  - No partial acceptance — invalid LLM output is fully rejected
  - LLM endpoint: POST /api/generate-config
  - Feature is a BONUS differentiator, NOT a qualifying feature
  - Model configured via LLM_MODEL env var for easy updates
</project>

<context>
Steps 0–8 are complete:
  - Full platform: auth, CRUD, CSV, notifications, hot reload
  - validateConfig() pipeline ready to validate LLM output
  - POST /config endpoint ready to accept generated config

This step adds the bonus feature: converting natural language
descriptions into valid ConfigForge JSON configs using the
Anthropic Claude API.

CRITICAL FIX — Deprecated Model:
  The original design used claude-3-sonnet-20240229 which is deprecated
  and would cause API call failures. Fixed to claude-3-5-sonnet-20241022.
  The model string is now configurable via LLM_MODEL env var.
</context>

<task>
Implement Step 9: LLM Config Generation (Bonus Feature). This step adds
the ability to generate valid ConfigForge configs from natural language.

Step 9 implements:
  Backend:
  - generateConfig(userInput) — calls Anthropic Claude API
  - generateAndValidate(userInput) — generate + validate + retry loop
  - POST /api/generate-config endpoint:
    1. Accept { prompt: string } from frontend
    2. Call generateAndValidate(prompt)
    3. Return { success: true, config: validatedConfig }
    4. On failure → { error: "LLM_GENERATION_FAILED" }
  - System prompt with strict rules for JSON-only output
  - JSON Schema injection into the prompt
  - Model configurable via LLM_MODEL env var

  Frontend:
  - GeneratorUI component:
    - Textarea for natural language input
    - "Generate" button with loading state
    - Success → display generated JSON + "Apply" button
    - "Apply" calls POST /config to load the generated config
    - Error → display error message + retry option

Step 9 does NOT implement:
  - Security hardening (Step 10)
  - Final integrity audit (Step 11)
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

GROUP 1 — LLM Service
  backend/src/services/llmService.ts ← Anthropic client initialization:
                                        new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

                                        const MODEL = process.env.LLM_MODEL || "claude-3-5-sonnet-20241022"
                                        const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || "4096")

                                        SYSTEM_PROMPT: string constant with rules:
                                          - Output ONLY valid JSON
                                          - Follow provided JSON Schema exactly
                                          - Do not invent fields outside schema
                                          - All entities must have at least one field
                                          - All pages must reference valid entities
                                          - Use snake_case names
                                          - For select fields, include options
                                          - Return JSON only, no markdown, no explanation

                                        generateConfig(userInput: string): Promise<string>
                                          - Constructs prompt with SCHEMA + USER REQUEST
                                          - Calls client.messages.create()
                                          - model: MODEL (from env var)
                                          - max_tokens: MAX_TOKENS (from env var)
                                          - Returns response.content[0].text

                                        generateAndValidate(userInput: string): Promise<Config>
                                          - Loop: max 3 attempts
                                          - Each attempt:
                                            1. generateConfig(userInput)
                                            2. JSON.parse(raw)
                                            3. validateConfig(parsed)
                                            4. If success → return data
                                            5. If fail → increment, retry
                                          - After 3 failures → throw Error("LLM_GENERATION_FAILED")

GROUP 2 — LLM Route
  backend/src/api/llmRoutes.ts      ← POST /api/generate-config:
                                        1. Check ANTHROPIC_API_KEY is set → 500 LLM_NOT_CONFIGURED
                                        2. Extract prompt from req.body.prompt
                                        3. Call generateAndValidate(prompt)
                                        4. Return { success: true, config: result }
                                        5. Catch → { error: "LLM_GENERATION_FAILED" }

GROUP 3 — Route Registration
  backend/src/index.ts              ← MODIFY: Wire llmRoutes

GROUP 4 — Config Schema Export
  backend/src/core/configSchema.json ← JSON Schema version of the Zod schema
                                        Used for injection into LLM prompt.
                                        Must match the Zod schema exactly.

GROUP 5 — Frontend Generator UI
  frontend/src/components/GeneratorUI.tsx ← Natural language input:
                                        - Textarea: "Describe your app..."
                                        - "Generate" button (disabled while loading)
                                        - Loading state: "Generating config..."
                                        - Success: JSON preview + "Apply Config" button
                                        - "Apply Config" calls POST /config
                                        - Error: message + "Try Again" button

GROUP 6 — Frontend Integration
  frontend/src/app/page.tsx         ← MODIFY: Add link/button to GeneratorUI
                                        or integrate as a section on home page
</output_requirements>

<implementation_rules>
RULE 1 — Every file compiles.
  `npx tsc --noEmit` must succeed in both frontend/ and backend/.

RULE 2 — Maximum 3 retries, then fail.
  Each retry costs API tokens. generateAndValidate() tries at most 3
  times. If all 3 produce invalid output, throw LLM_GENERATION_FAILED.
  Do NOT retry indefinitely.

RULE 3 — LLM output is UNTRUSTED input.
  The output goes through the same validation pipeline as any config:
    JSON.parse → validateConfig (Zod + semantic) → accept/reject
  No special treatment. No relaxed validation. If it fails Zod, retry.

RULE 4 — System prompt enforces JSON-only output.
  The system prompt explicitly says "Return JSON only" and "No explanation."
  This minimizes the chance of the LLM wrapping JSON in markdown code blocks.

RULE 5 — JSON Schema injected into prompt.
  The prompt includes the full JSON schema so the LLM knows the
  exact structure expected. This dramatically improves output quality.

RULE 6 — Missing API key returns 500 LLM_NOT_CONFIGURED.
  If process.env.ANTHROPIC_API_KEY is not set, the endpoint returns
  immediately with 500 and error code "LLM_NOT_CONFIGURED". It does
  NOT attempt to call the API.

RULE 7 — Frontend shows raw JSON for transparency.
  The GeneratorUI displays the generated JSON in a <pre> block before
  the user clicks "Apply". Users must see what was generated before
  it becomes their live config.

RULE 8 — "Apply Config" uses existing POST /config endpoint.
  The frontend sends the generated config to POST /config (Step 8).
  This ensures the config goes through the same breaking change
  detection and validation as a manual config update.

RULE 9 — Graceful degradation without API key.
  The GeneratorUI handles LLM_NOT_CONFIGURED error gracefully
  with a user-friendly message: "LLM service not configured. Set ANTHROPIC_API_KEY to enable."

RULE 10 — No streaming. Simple request/response.
  Use a single API call, not streaming. Wait for the complete response,
  then display it. Streaming adds complexity with minimal value here.

RULE 11 — Model is configurable via env var (FIXED).
  The model string comes from LLM_MODEL env var with fallback to
  claude-3-5-sonnet-20241022. This ensures the model can be updated
  without code changes when Anthropic releases newer models.
</implementation_rules>

<verification>
After completing all files, run these checks. ALL must pass:

CHECK 1 — TypeScript compiles:
  cd backend && npx tsc --noEmit → 0 errors
  cd frontend && npx tsc --noEmit → 0 errors

CHECK 2 — Generate valid config:
  POST /api/generate-config with { prompt: "I want a bug tracker with
  title, severity, and assignee" }
  Expected: { success: true, config: { version: "1.0", ... } }

CHECK 3 — Generated config passes validation:
  Take the returned config, call validateConfig(config)
  Expected: { success: true }

CHECK 4 — Apply generated config:
  POST /config with the generated config
  Expected: 200, config applied, new routes available

CHECK 5 — Missing API key:
  Unset ANTHROPIC_API_KEY
  POST /api/generate-config → 500, { error: "LLM_NOT_CONFIGURED" }

CHECK 6 — Frontend generator UI:
  Load GeneratorUI, type prompt, click Generate
  Expected: Loading spinner → JSON preview → Apply button

CHECK 7 — Apply button works:
  Click "Apply Config" → POST /config → success → frontend reloads

CHECK 8 — Retry on invalid output:
  generateAndValidate loops up to 3 times

CHECK 9 — Error display:
  Simulate failure → "LLM_GENERATION_FAILED" error shown in UI

CHECK 10 — Steps 0-8 regression:
  Auth, CRUD, CSV import, notifications, hot reload all working
</verification>
```
