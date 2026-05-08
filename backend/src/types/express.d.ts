import type { RuntimeConfig } from '../core/types';

declare module 'express-serve-static-core' {
  interface Request {
    user: { id: string; email: string };
    config: RuntimeConfig;
    requestId: string;
  }

  interface Application<ResBody = any, Locals extends Record<string, any> = Record<string, any>> {
    id: string;
    subdomain?: string;
  }
}
