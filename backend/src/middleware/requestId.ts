import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger as rootLogger } from '../lib/logger';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  (req as any).requestId = requestId;
  (req as any).logger = rootLogger.child({ requestId });

  res.setHeader('X-Request-Id', requestId);

  (req as any).logger.info({ method: req.method, url: req.url }, 'incoming request');

  next();
}
