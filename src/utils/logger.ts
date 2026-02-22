import pino from 'pino';

const loggerOpts: pino.LoggerOptions =
  process.env.NODE_ENV !== 'production'
    ? {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }
    : { level: process.env.LOG_LEVEL ?? 'info' };

export const logger = pino(loggerOpts);
