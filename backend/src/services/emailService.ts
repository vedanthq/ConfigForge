import nodemailer from 'nodemailer';
import type { EventPayload } from './eventBus';
import { runtimeState } from '../core/runtime';
import { logger } from '../lib/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  secure: false,
});

export async function sendEmailNotification(payload: EventPayload): Promise<void> {
  const recipients = runtimeState.config?.features?.notification_recipients;
  if (!recipients || recipients.length === 0) {
    logger.warn({ entity: payload.entity }, 'No notification recipients configured');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@configforge.app',
      to: recipients.join(', '),
      subject: `[ConfigForge] ${payload.entity} ${payload.action}`,
      text: `Action: ${payload.action}\nEntity: ${payload.entity}\nData:\n${JSON.stringify(payload.data, null, 2)}`,
    });
    logger.info({ entity: payload.entity, action: payload.action }, 'Notification email sent');
  } catch (err) {
    logger.error({ err, entity: payload.entity, action: payload.action }, 'Failed to send notification email');
  }
}
