/**
 * Structured logging utility for frontend
 * Provides consistent logging interface with different log levels
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment: boolean
  private minLevel: LogLevel

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    // Support runtime log level configuration via window.LOG_LEVEL
    const configuredLevel = (window as typeof window & { LOG_LEVEL?: string }).LOG_LEVEL || import.meta.env.VITE_LOG_LEVEL
    this.minLevel = this.parseLogLevel(configuredLevel) || (this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO)
  }

  private parseLogLevel(level: string | undefined): LogLevel | undefined {
    if (!level) return undefined
    const normalized = level.toLowerCase()
    switch (normalized) {
      case 'debug':
        return LogLevel.DEBUG
      case 'info':
        return LogLevel.INFO
      case 'warn':
        return LogLevel.WARN
      case 'error':
        return LogLevel.ERROR
      default:
        return undefined
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentLevelIndex = levels.indexOf(this.minLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return
    }

    const formattedMessage = this.formatMessage(level, message, context)

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.log(formattedMessage)
        break
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(formattedMessage)
        break
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(formattedMessage)
        break
    }

    // In production, you could also send logs to a service like Sentry, LogRocket, etc.
    if (!this.isDevelopment && level === LogLevel.ERROR) {
      // TODO: Send to error tracking service
      // e.g., Sentry.captureMessage(message, { level: 'error', extra: context })
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
    }

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    } else if (error) {
      errorContext.error = error
    }

    this.log(LogLevel.ERROR, message, errorContext)
  }
}

// Export singleton instance
export const logger = new Logger()
