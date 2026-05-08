import type { Request, Response } from 'express';
import { db } from '../db/connection';
import { buildZodSchema } from '../db/schemaBuilder';
import { eventBus } from '../services/eventBus';
import { logger } from '../lib/logger';

export function listHandler(entityName: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const rows = await db(entityName)
        .where({ app_id: req.app.id, user_id: req.user.id })
        .orderBy('created_at', 'desc');
      res.json({ success: true, data: rows });
    } catch (err) {
      logger.error({ err, entity: entityName }, 'Failed to list entities');
      res.status(500).json({ error: 'DB_ERROR', message: 'Failed to list entities' });
    }
  };
}

export function createHandler(entityName: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const entity = req.config.entities.find((e) => e.name === entityName);
      if (!entity) {
        res.status(404).json({ error: 'NOT_FOUND', message: `Entity '${entityName}' not found` });
        return;
      }

      const schema = buildZodSchema(entity);
      const result = schema.safeParse(req.body.data);
      if (!result.success) {
        res.status(400).json({ error: 'VALIDATION_ERROR', details: result.error.errors });
        return;
      }

      const [row] = await db(entityName)
        .insert({
          app_id: req.app.id,
          user_id: req.user.id,
          data: result.data,
        })
        .returning('*');

      eventBus.emit('entity.create', {
        entity: entityName,
        action: 'create',
        data: row,
        userId: req.user.id,
      });

      res.status(201).json({ success: true, data: row });
    } catch (err) {
      logger.error({ err, entity: entityName }, 'Failed to create entity');
      res.status(500).json({ error: 'DB_ERROR', message: 'Failed to create entity' });
    }
  };
}

export function updateHandler(entityName: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const entity = req.config.entities.find((e) => e.name === entityName);
      if (!entity) {
        res.status(404).json({ error: 'NOT_FOUND', message: `Entity '${entityName}' not found` });
        return;
      }

      const schema = buildZodSchema(entity).partial();
      const result = schema.safeParse(req.body.data);
      if (!result.success) {
        res.status(400).json({ error: 'VALIDATION_ERROR', details: result.error.errors });
        return;
      }

      const existing = await db(entityName)
        .where({ id, app_id: req.app.id, user_id: req.user.id })
        .first();

      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: `${entityName} with id '${id}' not found` });
        return;
      }

      const mergedData = { ...existing.data, ...result.data };

      const [updated] = await db(entityName)
        .where({ id, app_id: req.app.id, user_id: req.user.id })
        .update({ data: mergedData, updated_at: db.fn.now() })
        .returning('*');

      eventBus.emit('entity.update', {
        entity: entityName,
        action: 'update',
        data: updated,
        userId: req.user.id,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      logger.error({ err, entity: entityName }, 'Failed to update entity');
      res.status(500).json({ error: 'DB_ERROR', message: 'Failed to update entity' });
    }
  };
}

export function deleteHandler(entityName: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await db(entityName)
        .where({ id, app_id: req.app.id, user_id: req.user.id })
        .first();

      if (!existing) {
        res.status(404).json({ error: 'NOT_FOUND', message: `${entityName} with id '${id}' not found` });
        return;
      }

      await db(entityName)
        .where({ id, app_id: req.app.id, user_id: req.user.id })
        .del();

      eventBus.emit('entity.delete', {
        entity: entityName,
        action: 'delete',
        data: existing,
        userId: req.user.id,
      });

      res.json({ success: true });
    } catch (err) {
      logger.error({ err, entity: entityName }, 'Failed to delete entity');
      res.status(500).json({ error: 'DB_ERROR', message: 'Failed to delete entity' });
    }
  };
}
