import { type Express, type Request, type Response } from 'express';
import { generateAndValidate } from '../services/llmService';
import { logger } from '../lib/logger';

export function registerLlmRoutes(app: Express): void {
  app.post('/api/generate-config', async (req: Request, res: Response) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: 'LLM_NOT_CONFIGURED' });
      return;
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'INVALID_PROMPT', message: 'Prompt must be a non-empty string' });
      return;
    }

    try {
      const config = await generateAndValidate(prompt);
      res.json({ success: true, config });
    } catch (err: any) {
      logger.error({ err: err.message }, 'LLM generation failed');
      res.status(500).json({ error: 'LLM_GENERATION_FAILED' });
    }
  });
}
