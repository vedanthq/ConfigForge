import { EventEmitter } from 'events';

export interface EventPayload {
  entity: string;
  action: string;
  data: any;
  userId?: string;
}

export const eventBus = new EventEmitter();
