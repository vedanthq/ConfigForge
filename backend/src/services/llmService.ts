import Anthropic from '@anthropic-ai/sdk';
import { validateConfig } from '../core/validator';
import type { Config } from '../core/types';
import { logger } from '../lib/logger';
import schema from '../core/configSchema.json';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const MODEL = process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10);

const SYSTEM_PROMPT = `You are a configuration generator. Output ONLY valid JSON.
Follow the provided JSON Schema exactly.
Do not invent fields outside the schema.
All entities must have at least one field.
All pages must reference valid entities.
Use snake_case names.
For select fields, include options.
Return JSON only, no markdown, no explanation.`;

export async function generateConfig(userInput: string): Promise<string> {
  const prompt = `JSON Schema:\n${JSON.stringify(schema, null, 2)}\n\nUSER REQUEST:\n${userInput}\n\nGenerate the JSON config:`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response type from Claude API');
}

export async function generateAndValidate(userInput: string): Promise<Config> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await generateConfig(userInput);
      const parsed = JSON.parse(raw);
      const result = validateConfig(parsed);

      if (result.success) {
        logger.info({ attempt }, 'LLM config generation succeeded');
        return result.data;
      }

      logger.warn({ attempt, errors: result.errors }, 'LLM config validation failed, retrying');
    } catch (err: any) {
      logger.warn({ attempt, err: err.message }, 'LLM config generation error, retrying');
    }
  }

  throw new Error('LLM_GENERATION_FAILED');
}
