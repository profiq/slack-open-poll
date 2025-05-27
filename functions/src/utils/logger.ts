import * as logger from 'firebase-functions/logger';
import config from './config';

interface LoggerContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  pollId?: string;
  functionName?: string;
  timestamp?: string;
  duration?: number;
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const ENV_LOG_LEVELS: Record<string, LogLevel> = {
  production: LogLevel.WARN,
  development: LogLevel.DEBUG,
  test: LogLevel.DEBUG,
};

const getLogLevel = (): LogLevel => {
  return ENV_LOG_LEVELS[config.NODE_ENV];
};

class Logger {
  private context: LoggerContext;
  private level: LogLevel;

  constructor(context: LoggerContext = {}) {
    this.context = context;
    this.level = getLogLevel();
  }

  debug(message: string, additionalContext: LoggerContext = {}) {
    if (this.level > LogLevel.DEBUG) return;

    this.log(LogLevel.DEBUG, message, this.mergeContext(additionalContext));
  }

  info(message: string, additionalContext: LoggerContext = {}) {
    if (this.level > LogLevel.INFO) return;

    this.log(LogLevel.INFO, message, this.mergeContext(additionalContext));
  }

  warn(message: string, additionalContext: LoggerContext = {}) {
    if (this.level > LogLevel.WARN) return;

    this.log(LogLevel.WARN, message, this.mergeContext(additionalContext));
  }

  error(message: string | Error, additionalContext: LoggerContext = {}) {
    if (this.level > LogLevel.ERROR) return;

    const isError = message instanceof Error;
    const logMessage = isError ? message.message : message;
    const errorInfo = isError ? { name: message.name, stack: message.stack } : {};

    this.log(LogLevel.ERROR, logMessage, this.mergeContext({ ...additionalContext, ...errorInfo }));
  }

  withContext(additionalContext: LoggerContext): Logger {
    return new Logger(this.mergeContext(additionalContext));
  }

  startTimer(label: string): number {
    this.debug(`Timer started for ${label}`);

    return Date.now();
  }

  endTimer(label: string, startTime: number) {
    const dur = Date.now() - startTime;

    this.info(`Timer ended for ${label}`, { duration: dur });
  }

  private log(level: LogLevel, message: string, context: LoggerContext) {
    const logEntry = {
      level: LogLevel[level],
      message,
      context,
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.DEBUG:
        logger.debug(output);
        break;
      case LogLevel.INFO:
        logger.info(output);
        break;
      case LogLevel.WARN:
        logger.warn(output);
        break;
      case LogLevel.ERROR:
        logger.error(output);
        break;
    }
  }

  private mergeContext(additional: LoggerContext): LoggerContext {
    return { ...this.context, ...additional };
  }
}

export { Logger, LoggerContext };
