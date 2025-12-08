/**
 * Structured logging utility for backend
 * Provides consistent logging interface with different log levels
 */

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.minLevel = this.parseLogLevel(process.env.LOG_LEVEL) || (this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);
  }

  parseLogLevel(level) {
    if (!level) return null;
    const normalized = level.toLowerCase();
    switch (normalized) {
      case 'debug':
        return LOG_LEVELS.DEBUG;
      case 'info':
        return LOG_LEVELS.INFO;
      case 'warn':
        return LOG_LEVELS.WARN;
      case 'error':
        return LOG_LEVELS.ERROR;
      default:
        return null;
    }
  }

  shouldLog(level) {
    const levels = [LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN, LOG_LEVELS.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  formatMessage(level, message, context) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && { context }),
    };
    return JSON.stringify(logEntry);
  }

  log(level, message, context) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case LOG_LEVELS.DEBUG:
      case LOG_LEVELS.INFO:
        console.log(formattedMessage);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage);
        break;
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message, context) {
    this.log(LOG_LEVELS.DEBUG, message, context);
  }

  info(message, context) {
    this.log(LOG_LEVELS.INFO, message, context);
  }

  warn(message, context) {
    this.log(LOG_LEVELS.WARN, message, context);
  }

  error(message, error, context) {
    const errorContext = {
      ...context,
    };

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.log(LOG_LEVELS.ERROR, message, errorContext);
  }
}

// Export singleton instance
export const logger = new Logger();
