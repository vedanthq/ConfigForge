import { eventBus } from './eventBus';
import { sendEmailNotification } from './emailService';
import { runtimeState } from '../core/runtime';
import { logger } from '../lib/logger';

export function registerNotificationListeners(): () => void {
  eventBus.on('entity.create', async (payload) => {
    if (runtimeState.config?.features?.notifications?.on_create) {
      await sendEmailNotification(payload);
    }
  });

  eventBus.on('entity.update', async (payload) => {
    if (runtimeState.config?.features?.notifications?.on_update) {
      await sendEmailNotification(payload);
    }
  });

  eventBus.on('entity.delete', async (payload) => {
    if (runtimeState.config?.features?.notifications?.on_delete) {
      await sendEmailNotification(payload);
    }
  });

  logger.info('Notification listeners registered');

  return function unregisterNotificationListeners(): void {
    eventBus.removeAllListeners('entity.create');
    eventBus.removeAllListeners('entity.update');
    eventBus.removeAllListeners('entity.delete');
    logger.info('Notification listeners unregistered');
  };
}
