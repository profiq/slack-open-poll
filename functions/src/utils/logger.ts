import * as logger from 'firebase-functions/logger';
import { isProduction } from './utils';

interface LoggerContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  pollId?: string;
  functionName?: string;
  timestamp?: string;
  duration?: number;
}

/*
Production enviroment logs - only WARN and ERROR
Every other enviroment logs - everything
*/

class Logger {
  private context: LoggerContext;

  constructor(context: LoggerContext = {}) {
    this.context = context;
  }

  debug(message: string, additionalContext: LoggerContext = {}) {
    if (isProduction()) return;
    const mergedContext = {
      ...this.context,
      ...additionalContext,
    };

    this.log('DEBUG', message, mergedContext);
  }

  info(message: string, additionalContext: LoggerContext = {}) {
    if (isProduction()) return;
    const mergedContext = {
      ...this.context,
      ...additionalContext,
    };

    this.log('INFO', message, mergedContext);
  }

  warn(message: string, additionalContext: LoggerContext = {}) {
    const mergedContext = {
      ...this.context,
      ...additionalContext,
    };

    this.log('WARN', message, mergedContext);
  }

  error(message: string | Error, additionalContext: LoggerContext = {}) {
    const isError = message instanceof Error;
    const logMessage = isError ? message.message : message;
    const errorInfo = isError ? { name: message.name, stack: message.stack } : {};

    const errorContext = {
      ...this.context,
      ...additionalContext,
      ...errorInfo,
    };

    this.log('ERROR', logMessage, errorContext);
  }

  withContext(additionalContext: LoggerContext): Logger {
    const mergedContext = {
      ...this.context,
      ...additionalContext,
    };

    return new Logger(mergedContext);
  }

  startTimer(label: string): number {
    this.debug(`Timer started for ${label}`);

    return Date.now();
  }

  endTimer(label: string, startTime: number) {
    const dur = Date.now() - startTime;

    this.info(`Timer ended for ${label}`, { duration: dur });
  }

  private log(level: string, message: string, context: LoggerContext) {
    const logEntry = { level, message, context };

    if (level === 'INFO') {
      logger.info(JSON.stringify(logEntry));
    } else if (level === 'ERROR') {
      logger.error(JSON.stringify(logEntry));
    } else if (level === 'DEBUG') {
      logger.debug(JSON.stringify(logEntry));
    } else if (level === 'WARN') {
      logger.warn(JSON.stringify(logEntry));
    }
  }
}

export { Logger, LoggerContext };
