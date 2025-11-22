import winston from 'winston';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
if (config.logging.toFile && !fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (config.logging.toFile) {
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
      format: logFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exceptionHandlers: config.logging.toFile
    ? [
        new winston.transports.File({
          filename: path.join(config.logging.dir, 'exceptions.log'),
        }),
      ]
    : [],
  rejectionHandlers: config.logging.toFile
    ? [
        new winston.transports.File({
          filename: path.join(config.logging.dir, 'rejections.log'),
        }),
      ]
    : [],
});

// Create specialized loggers
export const twitterLogger = logger.child({ service: 'twitter' });
export const agentLogger = logger.child({ service: 'agent' });
export const aiLogger = logger.child({ service: 'ai-engine' });
export const dbLogger = logger.child({ service: 'database' });
