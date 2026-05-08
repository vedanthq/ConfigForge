import { Router } from 'express';
import type { Express, Router as RouterType } from 'express';
import type { RuntimeConfig } from './types';
import { listHandler, createHandler, updateHandler, deleteHandler } from '../api/handlers';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

export interface RouterEngine {
  replaceRoutes(config: RuntimeConfig): void;
  getCurrentRouter(): RouterType;
}

export function createRouterEngine(app: Express): RouterEngine {
  let currentRouter: RouterType = Router();

  app.use('/api', (req, res, next) => {
    currentRouter(req, res, next);
  });

  return {
    replaceRoutes(config: RuntimeConfig): void {
      const newRouter = Router();

      newRouter.use(requireAuth);

      for (const entity of config.entities) {
        const name = entity.name;
        newRouter.get(`/${name}`, listHandler(name));
        newRouter.post(`/${name}`, createHandler(name));
        newRouter.put(`/${name}/:id`, updateHandler(name));
        newRouter.delete(`/${name}/:id`, deleteHandler(name));
      }

      currentRouter = newRouter;
    },

    getCurrentRouter(): RouterType {
      return currentRouter;
    },
  };
}
