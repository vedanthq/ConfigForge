import type { Express, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { buildZodSchema } from '../db/schemaBuilder';
import { db } from '../db/connection';
import { logger } from '../lib/logger';

const BATCH_SIZE = 500;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function handleMulter(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'FILE_TOO_LARGE' });
        return;
      }
      logger.error({ err }, 'Multer upload error');
      res.status(400).json({ error: 'UPLOAD_ERROR' });
      return;
    }
    next();
  });
}

export function registerCsvRoutes(app: Express): void {
  app.post('/api/csv-parse', handleMulter, async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.config.features?.csv_import) {
        res.status(403).json({ error: 'FEATURE_DISABLED' });
        return;
      }

      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: 'NO_FILE_PROVIDED' });
        return;
      }

      const text = file.buffer.toString('utf-8');
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
        res.status(400).json({ error: 'INVALID_CSV' });
        return;
      }

      const headers = parsed.meta.fields || [];
      const preview = parsed.data.slice(0, 3);

      res.json({ success: true, headers, preview });
    } catch (err) {
      logger.error({ err }, 'CSV parse failed');
      res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });

  app.post('/api/csv-import', handleMulter, async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.config.features?.csv_import) {
        res.status(403).json({ error: 'FEATURE_DISABLED' });
        return;
      }

      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: 'NO_FILE_PROVIDED' });
        return;
      }

      const entityName = req.body.entity;
      const entity = req.config.entities.find((e: any) => e.name === entityName);
      if (!entity) {
        res.status(404).json({ error: 'ENTITY_NOT_FOUND' });
        return;
      }

      let mapping: Record<string, string>;
      try {
        mapping = typeof req.body.mapping === 'string'
          ? JSON.parse(req.body.mapping)
          : req.body.mapping;
      } catch {
        res.status(400).json({ error: 'INVALID_MAPPING' });
        return;
      }

      const text = file.buffer.toString('utf-8');
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
        res.status(400).json({ error: 'INVALID_CSV' });
        return;
      }

      const schema = buildZodSchema(entity);
      const validRows: any[] = [];
      const errors: { row: number; errors: any[] }[] = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const csvRow = parsed.data[i] as Record<string, string>;
        const remapped: Record<string, any> = {};

        for (const [csvCol, fieldId] of Object.entries(mapping)) {
          if (!fieldId) continue;
          let val: any = csvRow[csvCol];
          const field = entity.fields.find((f: any) => f.id === fieldId);
          if (field) {
            switch (field.type) {
              case 'number':
                val = val ? Number(val) : undefined;
                break;
              case 'boolean':
                val = val?.toLowerCase() === 'true' || val === '1';
                break;
            }
          }
          remapped[fieldId] = val;
        }

        const result = schema.safeParse(remapped);
        if (result.success) {
          validRows.push({
            app_id: req.app.id,
            user_id: req.user.id,
            data: result.data,
          });
        } else {
          errors.push({
            row: i + 1,
            errors: result.error.errors,
          });
        }
      }

      let imported = 0;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        try {
          await db.batchInsert(entity.name, batch);
          imported += batch.length;
        } catch (batchErr) {
          logger.error({ err: batchErr, batchStart: i }, 'Batch insert failed');
        }
      }

      res.json({
        success: true,
        imported,
        skipped: validRows.length - imported,
        errors: errors.slice(0, 10),
      });
    } catch (err) {
      logger.error({ err }, 'CSV import failed');
      res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });
}
