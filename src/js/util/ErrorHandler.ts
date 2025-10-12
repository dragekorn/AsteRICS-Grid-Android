/**
 * Centralized error handling and recovery service.
 * 
 * Features:
 * - Structured error classification
 * - Automatic retry logic for transient failures
 * - Circuit breaker pattern for failing services
 * - Error reporting and aggregation
 * - Memory-safe error storage
 * 
 * @example
 * ```typescript
 * const errorHandler = ErrorHandler.getInstance();
 * 
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   errorHandler.handleError(error, { context: 'TTSService' });
 * }
 * ```
 */

import { AppError, AppErrorCode } from '@/types/global';
import { createLogger } from './Logger';

const logger = createLogger('ErrorHandler');

/**
 * Error severity levels for prioritization.
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Error handling options.
 */
export interface IErrorHandlingOptions {
  readonly context?: string;
  readonly severity?: ErrorSeverity;
  readonly shouldReport?: boolean;
  readonly shouldRetry?: boolean;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Processed error information.
 */
export interface IProcessedError {
  readonly id: string;
  readonly code: AppErrorCode;
  readonly message: string;
  readonly severity: ErrorSeverity;
  readonly timestamp: number;
  readonly context?: string;
  readonly stackTrace?: string;
  readonly metadata?: Record<string, unknown>;
  readonly originalError: unknown;
}

/**
 * Retry configuration for transient errors.
 */
interface IRetryConfig {
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffMultiplier: number;
}

/**
 * Circuit breaker state.
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration.
 */
interface ICircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly successThreshold: number;
  readonly timeout: number;
}

/**
 * Centralized error handler with retry and circuit breaker patterns.
 * Singleton instance ensures consistent error handling across the application.
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  
  private readonly errorHistory: IProcessedError[] = [];
  private readonly maxHistorySize = 100;
  
  private readonly circuits = new Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number;
  }>();

  private readonly defaultRetryConfig: IRetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  } as const;

  private readonly defaultCircuitConfig: ICircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  } as const;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Gets the singleton instance of ErrorHandler.
   * 
   * @returns ErrorHandler instance
   */
  public static getInstance(): ErrorHandler {
    if (ErrorHandler.instance === null) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handles an error with optional retry and reporting.
   * 
   * @param error - Error to handle
   * @param options - Error handling options
   * @returns Processed error information
   * 
   * @example
   * ```typescript
   * errorHandler.handleError(error, {
   *   context: 'TTSService',
   *   severity: ErrorSeverity.HIGH,
   *   shouldRetry: true,
   *   maxRetries: 3
   * });
   * ```
   */
  public handleError(
    error: unknown,
    options: IErrorHandlingOptions = {}
  ): IProcessedError {
    const processedError = this.processError(error, options);
    
    // Log the error
    logger.error(processedError.message, {
      code: processedError.code,
      severity: processedError.severity,
      context: processedError.context,
      metadata: processedError.metadata,
    });

    // Store in history
    this.addToHistory(processedError);

    // Report to external service if needed
    if (options.shouldReport === true) {
      this.reportError(processedError).catch((reportError) => {
        logger.warn('Failed to report error', reportError);
      });
    }

    return processedError;
  }

  /**
   * Wraps an async operation with retry logic.
   * 
   * @param operation - Async operation to execute
   * @param options - Error handling options
   * @returns Promise with operation result
   * 
   * @throws {AppError} If all retry attempts fail
   * 
   * @example
   * ```typescript
   * const result = await errorHandler.withRetry(
   *   () => fetchData(),
   *   { maxRetries: 3, retryDelay: 1000 }
   * );
   * ```
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    options: IErrorHandlingOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.defaultRetryConfig.maxAttempts;
    const baseDelay = options.retryDelay ?? this.defaultRetryConfig.baseDelay;

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset circuit on success
        if (options.context !== undefined) {
          this.recordSuccess(options.context);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Record failure in circuit
        if (options.context !== undefined) {
          this.recordFailure(options.context);
        }

        // Don't retry if circuit is open
        if (options.context !== undefined && this.isCircuitOpen(options.context)) {
          throw new AppError(
            AppErrorCode.INVALID_STATE,
            `Circuit breaker open for ${options.context}`,
            { originalError: error }
          );
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          baseDelay * Math.pow(this.defaultRetryConfig.backoffMultiplier, attempt),
          this.defaultRetryConfig.maxDelay
        );

        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          context: options.context,
          error: this.extractErrorMessage(error),
        });

        await this.sleep(delay);
      }
    }

    // All retries failed
    throw new AppError(
      AppErrorCode.UNKNOWN_ERROR,
      `Operation failed after ${maxRetries} attempts`,
      { lastError }
    );
  }

  /**
   * Executes operation with circuit breaker pattern.
   * 
   * @param circuitName - Unique circuit identifier
   * @param operation - Operation to execute
   * @returns Promise with operation result
   * 
   * @throws {AppError} If circuit is open
   */
  public async withCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.isCircuitOpen(circuitName)) {
      throw new AppError(
        AppErrorCode.INVALID_STATE,
        `Circuit breaker is open for ${circuitName}`,
        { circuitName }
      );
    }

    try {
      const result = await operation();
      this.recordSuccess(circuitName);
      return result;
    } catch (error) {
      this.recordFailure(circuitName);
      throw error;
    }
  }

  /**
   * Gets recent error history.
   * 
   * @param limit - Maximum number of errors to return
   * @returns Array of recent errors
   */
  public getErrorHistory(limit?: number): readonly IProcessedError[] {
    const errors = [...this.errorHistory].reverse();
    return Object.freeze(limit !== undefined ? errors.slice(0, limit) : errors);
  }

  /**
   * Clears error history.
   * Useful for memory management.
   */
  public clearHistory(): void {
    this.errorHistory.length = 0;
  }

  /**
   * Processes raw error into structured format.
   * 
   * @param error - Raw error
   * @param options - Processing options
   * @returns Processed error
   */
  private processError(
    error: unknown,
    options: IErrorHandlingOptions
  ): IProcessedError {
    const id = this.generateErrorId();
    const timestamp = Date.now();
    
    if (error instanceof AppError) {
      return {
        id,
        code: error.code,
        message: error.message,
        severity: options.severity ?? ErrorSeverity.MEDIUM,
        timestamp,
        context: options.context,
        stackTrace: error.stack,
        metadata: options.metadata,
        originalError: error,
      };
    }

    if (error instanceof Error) {
      return {
        id,
        code: AppErrorCode.UNKNOWN_ERROR,
        message: error.message,
        severity: options.severity ?? ErrorSeverity.MEDIUM,
        timestamp,
        context: options.context,
        stackTrace: error.stack,
        metadata: options.metadata,
        originalError: error,
      };
    }

    // Handle non-Error objects
    return {
      id,
      code: AppErrorCode.UNKNOWN_ERROR,
      message: String(error),
      severity: options.severity ?? ErrorSeverity.LOW,
      timestamp,
      context: options.context,
      metadata: options.metadata,
      originalError: error,
    };
  }

  /**
   * Adds error to history with overflow protection.
   * 
   * @param error - Processed error
   */
  private addToHistory(error: IProcessedError): void {
    if (this.errorHistory.length >= this.maxHistorySize) {
      this.errorHistory.shift();
    }
    this.errorHistory.push(error);
  }

  /**
   * Records a failure for circuit breaker.
   * 
   * @param circuitName - Circuit identifier
   */
  private recordFailure(circuitName: string): void {
    const circuit = this.getOrCreateCircuit(circuitName);
    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    circuit.successes = 0;

    if (circuit.failures >= this.defaultCircuitConfig.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker opened for ${circuitName}`, {
        failures: circuit.failures,
      });
    }
  }

  /**
   * Records a success for circuit breaker.
   * 
   * @param circuitName - Circuit identifier
   */
  private recordSuccess(circuitName: string): void {
    const circuit = this.getOrCreateCircuit(circuitName);
    
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      
      if (circuit.successes >= this.defaultCircuitConfig.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
        logger.info(`Circuit breaker closed for ${circuitName}`);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      circuit.failures = 0;
    }
  }

  /**
   * Checks if circuit breaker is open.
   * 
   * @param circuitName - Circuit identifier
   * @returns True if circuit is open
   */
  private isCircuitOpen(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    
    if (circuit === undefined) {
      return false;
    }

    if (circuit.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
      
      if (timeSinceLastFailure >= this.defaultCircuitConfig.timeout) {
        circuit.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker half-open for ${circuitName}`);
        return false;
      }
      
      return true;
    }

    return false;
  }

  /**
   * Gets or creates circuit state.
   * 
   * @param circuitName - Circuit identifier
   * @returns Circuit state
   */
  private getOrCreateCircuit(circuitName: string): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number;
  } {
    if (!this.circuits.has(circuitName)) {
      this.circuits.set(circuitName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
      });
    }
    return this.circuits.get(circuitName)!;
  }

  /**
   * Sets up global error handlers for unhandled errors.
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handleError(event.reason, {
        context: 'UnhandledRejection',
        severity: ErrorSeverity.HIGH,
        shouldReport: true,
      });
    });

    // Global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error ?? event.message, {
        context: 'GlobalError',
        severity: ErrorSeverity.HIGH,
        shouldReport: true,
      });
    });
  }

  /**
   * Reports error to external service.
   * Placeholder for future implementation.
   * 
   * @param error - Processed error
   * @returns Promise that resolves when reporting completes
   */
  private async reportError(error: IProcessedError): Promise<void> {
    // Implementation will be added when error reporting service is configured
    logger.debug('Error reported', { errorId: error.id });
    return Promise.resolve();
  }

  /**
   * Extracts error message from unknown error.
   * 
   * @param error - Unknown error
   * @returns Error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Generates unique error ID.
   * 
   * @returns Unique error identifier
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility for retry delays.
   * 
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global error handler instance.
 * Use this for consistent error handling across the application.
 */
export const errorHandler = ErrorHandler.getInstance();