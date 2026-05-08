import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export function createLogger(name: string): pino.Logger {
  const options: pino.LoggerOptions = {
    name,
    level: process.env.LOG_LEVEL || 'info',
  };

  if (isDev) {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  }

  return pino(options);
}

export const logger = createLogger('configforge');
