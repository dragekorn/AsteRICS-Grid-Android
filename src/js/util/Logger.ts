/**
 * Structured logging service for AsTeRICS-Grid Android.
 * 
 * Features:
 * - Configurable log levels
 * - Contextual logging
 * - Structured data support
 * - Performance-optimized (zero-cost in production when disabled)
 * - Memory-safe circular reference handling
 * - Thread-safe log queue
 * 
 * @example
 * ```typescript
 * const logger = Logger.getInstance('TTSService');
 * logger.info('Synthesis started', { requestId: '123', text: 'Hello' });
 * logger.error('Synthesis failed', new Error('WASM init failed'));
 * ```
 */

import type { ILogger, ILogEntry, LogLevel } from '@/types/global';

/**
 * Configuration for logger instance.
 */
interface ILoggerConfig {
  readonly minLevel: LogLevel;
  readonly maxQueueSize: number;
  readonly enableConsole: boolean;
  readonly enablePersistence: boolean;
}

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: ILoggerConfig = {
  minLevel: __DEV__ ? 0 /* DEBUG */ : 1 /* INFO */,
  maxQueueSize: 1000,
  enableConsole: true,
  enablePersistence: false,
} as const;

/**
 * Singleton logger implementation with structured logging.
 * Thread-safe and memory-efficient.
 */
export class Logger implements ILogger {
  private static readonly instances = new Map<string, Logger>();
  private readonly logQueue: ILogEntry[] = [];
  private config: ILoggerConfig;

  /**
   * Private constructor to enforce singleton pattern per context.
   * 
   * @param context - Logger context (e.g., service name)
   * @param config - Logger configuration
   */
  private constructor(
    private readonly context: string,
    config: Partial<ILoggerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Bind methods to preserve context
    this.debug = this.debug.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
  }

  /**
   * Gets or creates a logger instance for the given context.
   * 
   * @param context - Logger context identifier
   * @param config - Optional configuration overrides
   * @returns Logger instance
   * 
   * @example
   * ```typescript
   * const logger = Logger.getInstance('MyService');
   * ```
   */
  public static getInstance(
    context: string,
    config?: Partial<ILoggerConfig>
  ): Logger {
    if (!Logger.instances.has(context)) {
      Logger.instances.set(context, new Logger(context, config));
    }
    return Logger.instances.get(context)!;
  }

  /**
   * Logs a debug message.
   * Only logged if level >= DEBUG.
   * 
   * @param message - Log message
   * @param data - Optional structured data
   */
  public debug(message: string, data?: unknown): void {
    this.log(0 /* DEBUG */, message, data);
  }

  /**
   * Logs an info message.
   * Only logged if level >= INFO.
   * 
   * @param message - Log message
   * @param data - Optional structured data
   */
  public info(message: string, data?: unknown): void {
    this.log(1 /* INFO */, message, data);
  }

  /**
   * Logs a warning message.
   * Only logged if level >= WARN.
   * 
   * @param message - Log message
   * @param data - Optional structured data
   */
  public warn(message: string, data?: unknown): void {
    this.log(2 /* WARN */, message, data);
  }

  /**
   * Logs an error message with stack trace.
   * Always logged regardless of level.
   * 
   * @param message - Log message
   * @param error - Optional error object or data
   */
  public error(message: string, error?: Error | unknown): void {
    const stackTrace = error instanceof Error ? error.stack : undefined;
    this.log(3 /* ERROR */, message, error, stackTrace);
  }

  /**
   * Sets the minimum log level.
   * 
   * @param level - New minimum log level
   */
  public setLevel(level: LogLevel): void {
    this.config = { ...this.config, minLevel: level };
  }

  /**
   * Gets all log entries from the queue.
   * 
   * @returns Readonly array of log entries
   */
  public getLogs(): readonly ILogEntry[] {
    return Object.freeze([...this.logQueue]);
  }

  /**
   * Clears the log queue.
   * Useful for memory management in long-running sessions.
   */
  public clearLogs(): void {
    this.logQueue.length = 0;
  }

  /**
   * Core logging method with level filtering and queue management.
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional data payload
   * @param stackTrace - Optional stack trace
   */
  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    stackTrace?: string
  ): void {
    // Early return if below minimum level (zero-cost when disabled)
    if (level < this.config.minLevel) {
      return;
    }

    const entry: ILogEntry = Object.freeze({
      level,
      message,
      timestamp: Date.now(),
      context: this.context,
      data: this.sanitizeData(data),
      stackTrace,
    });

    // Add to queue with overflow protection
    if (this.logQueue.length >= this.config.maxQueueSize) {
      this.logQueue.shift(); // Remove oldest entry
    }
    this.logQueue.push(entry);

    // Console output (if enabled)
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Persistence (if enabled)
    if (this.config.enablePersistence) {
      this.persistLog(entry).catch((persistError) => {
        // Fallback to console on persistence failure
        console.error('[Logger] Failed to persist log:', persistError);
      });
    }
  }

  /**
   * Writes log entry to console with appropriate formatting.
   * 
   * @param entry - Log entry to write
   */
  private writeToConsole(entry: ILogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${this.getLevelName(entry.level)}] [${entry.context}]`;
    
    const consoleMethod = this.getConsoleMethod(entry.level);
    
    if (entry.data !== undefined || entry.stackTrace !== undefined) {
      consoleMethod(prefix, entry.message, {
        data: entry.data,
        stack: entry.stackTrace,
      });
    } else {
      consoleMethod(prefix, entry.message);
    }
  }

  /**
   * Gets console method for log level.
   * 
   * @param level - Log level
   * @returns Console method
   */
  private getConsoleMethod(level: LogLevel): Console['log'] {
    switch (level) {
      case 0: /* DEBUG */
        return console.log;
      case 1: /* INFO */
        return console.info;
      case 2: /* WARN */
        return console.warn;
      case 3: /* ERROR */
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Gets human-readable level name.
   * 
   * @param level - Log level
   * @returns Level name
   */
  private getLevelName(level: LogLevel): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;
    return names[level] ?? 'UNKNOWN';
  }

  /**
   * Sanitizes data for logging, handling circular references and large objects.
   * 
   * @param data - Data to sanitize
   * @returns Sanitized data safe for logging
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    try {
      // Handle circular references with replacer
      const seen = new WeakSet<object>();
      
      return JSON.parse(
        JSON.stringify(data, (key, value: unknown) => {
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }

          // Truncate long strings
          if (typeof value === 'string' && value.length > 1000) {
            return `${value.substring(0, 1000)}... [truncated]`;
          }

          // Handle special objects
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
            };
          }

          if (value instanceof ArrayBuffer) {
            return `[ArrayBuffer ${value.byteLength} bytes]`;
          }

          return value;
        })
      );
    } catch (sanitizeError) {
      // Fallback if sanitization fails
      return `[Unsanitizable data: ${String(sanitizeError)}]`;
    }
  }

  /**
   * Persists log entry to storage (IndexedDB).
   * Non-blocking operation with error handling.
   * 
   * @param entry - Log entry to persist
   * @returns Promise that resolves when persistence completes
   */
  private async persistLog(entry: ILogEntry): Promise<void> {
    // Implementation will be added in Phase 3 (Storage)
    // For now, this is a placeholder
    return Promise.resolve();
  }
}

/**
 * Creates a scoped logger for a specific module.
 * Convenience function for common usage pattern.
 * 
 * @param moduleName - Name of the module
 * @returns Configured logger instance
 * 
 * @example
 * ```typescript
 * const logger = createLogger('TTSService');
 * logger.info('Service initialized');
 * ```
 */
export function createLogger(moduleName: string): ILogger {
  return Logger.getInstance(moduleName);
}

// Export singleton instance for global logging
export const globalLogger = Logger.getInstance('Global');