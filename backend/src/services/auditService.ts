import { logger } from '../lib/logger';

export const AuditEventTypes = {
  AUTH_FAILURE: 'AUTH_FAILURE',
  RATE_LIMIT: 'RATE_LIMIT',
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  CONFIG_RELOAD: 'CONFIG_RELOAD',
  CSV_IMPORT: 'CSV_IMPORT',
  LLM_GENERATION: 'LLM_GENERATION',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
} as const;

export type AuditEventType = typeof AuditEventTypes[keyof typeof AuditEventTypes];

export interface AuditEvent {
  type: AuditEventType | string;
  actorId?: string;
  appId?: string;
  resource?: string;
  action?: string;
  details?: any;
  ip?: string;
  requestId?: string;
}

export function logAuditEvent(event: AuditEvent): void {
  try {
    logger.info({ ...event, eventType: 'audit' }, `Audit: ${event.type}`);
  } catch (err: any) {
    try {
      logger.error({ err: err?.message }, 'Audit logging failed');
    } catch {
      // swallow
    }
  }
}
