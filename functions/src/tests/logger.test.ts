import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../utils/logger';
import * as fLogger from 'firebase-functions/logger';

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ requestId: 'testId' });
    vi.clearAllMocks();
  });

  it('should log info with context', () => {
    logger.info('Test info log', { userId: 'U123456' });

    expect(fLogger.info).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'INFO',
        message: 'Test info log',
        context: {
          requestId: 'testId',
          userId: 'U123456',
        },
      })
    );
  });

  it('should log error with context', () => {
    logger.error('Test error log', { workspaceId: 'W123456' });

    expect(fLogger.error).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'ERROR',
        message: 'Test error log',
        context: {
          requestId: 'testId',
          workspaceId: 'W123456',
        },
      })
    );
  });

  it('should log debug with context', () => {
    logger.debug('Test debug log', { pollId: 'P123456' });

    expect(fLogger.debug).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'DEBUG',
        message: 'Test debug log',
        context: {
          requestId: 'testId',
          pollId: 'P123456',
        },
      })
    );
  });

  it('should log warn with context', () => {
    logger.warn('Test warn', { functionName: 'F123456' });

    expect(fLogger.warn).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'WARN',
        message: 'Test warn',
        context: {
          requestId: 'testId',
          functionName: 'F123456',
        },
      })
    );
  });

  it('should merge context with withContext', () => {
    const newLogger = logger.withContext({
      userId: 'U123456',
      workspaceId: 'W123456',
      pollId: 'P123456',
    });

    newLogger.info('Merged');

    expect(fLogger.info).toHaveBeenCalledWith(
      JSON.stringify({
        level: 'INFO',
        message: 'Merged',
        context: {
          requestId: 'testId',
          userId: 'U123456',
          workspaceId: 'W123456',
          pollId: 'P123456',
        },
      })
    );
  });
});
