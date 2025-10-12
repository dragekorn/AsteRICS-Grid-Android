/**
 * Global type definitions for AsTeRICS-Grid Android application.
 * 
 * Provides type safety for:
 * - Capacitor plugins
 * - TTS services
 * - Storage mechanisms
 * - Error handling
 * - Performance monitoring
 */

/* ==================== Capacitor Types ==================== */

declare module '@capacitor/filesystem' {
  export interface Directory {
    Data: string;
    Cache: string;
    External: string;
    Documents: string;
  }
}

/* ==================== Application Types ==================== */

/**
 * Application configuration interface.
 * Immutable configuration loaded at startup.
 */
export interface IAppConfig {
  readonly version: string;
  readonly buildTime: string;
  readonly environment: 'development' | 'production';
  readonly tts: ITTSConfig;
  readonly storage: IStorageConfig;
  readonly performance: IPerformanceConfig;
}

/**
 * TTS (Text-to-Speech) configuration.
 */
export interface ITTSConfig {
  readonly enabled: boolean;
  readonly defaultVoice: string;
  readonly fallbackVoice: string;
  readonly sampleRate: number;
  readonly maxConcurrentRequests: number;
  readonly synthesisTimeout: number;
  readonly cacheEnabled: boolean;
  readonly cacheSizeLimit: number;
}

/**
 * Storage configuration.
 */
export interface IStorageConfig {
  readonly indexedDbName: string;
  readonly indexedDbVersion: number;
  readonly cacheQuota: number;
  readonly persistentStorage: boolean;
}

/**
 * Performance monitoring configuration.
 */
export interface IPerformanceConfig {
  readonly enabled: boolean;
  readonly metricsInterval: number;
  readonly memoryWarningThreshold: number;
  readonly cpuWarningThreshold: number;
}

/* ==================== TTS Service Types ==================== */

/**
 * TTS synthesis request.
 * Immutable request object for speech synthesis.
 */
export interface ITTSRequest {
  readonly id: string;
  readonly text: string;
  readonly voice: string;
  readonly rate: number;
  readonly pitch: number;
  readonly volume: number;
  readonly language: string;
  readonly timestamp: number;
}

/**
 * TTS synthesis result.
 */
export interface ITTSResult {
  readonly requestId: string;
  readonly audioData: ArrayBuffer;
  readonly duration: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly synthesisTime: number;
}

/**
 * TTS error information.
 */
export interface ITTSError {
  readonly code: TTSErrorCode;
  readonly message: string;
  readonly requestId: string;
  readonly timestamp: number;
  readonly details?: unknown;
}

/**
 * TTS error codes enumeration.
 */
export enum TTSErrorCode {
  SYNTHESIS_FAILED = 'SYNTHESIS_FAILED',
  VOICE_NOT_FOUND = 'VOICE_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  TIMEOUT = 'TIMEOUT',
  MEMORY_ERROR = 'MEMORY_ERROR',
  WASM_INIT_FAILED = 'WASM_INIT_FAILED',
  AUDIO_PLAYBACK_FAILED = 'AUDIO_PLAYBACK_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * TTS service status.
 */
export interface ITTSStatus {
  readonly initialized: boolean;
  readonly activeRequests: number;
  readonly queuedRequests: number;
  readonly availableVoices: readonly string[];
  readonly memoryUsage: number;
  readonly lastError: ITTSError | null;
}

/**
 * Voice model metadata.
 */
export interface IVoiceModel {
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly gender: 'male' | 'female' | 'neutral';
  readonly sampleRate: number;
  readonly modelSize: number;
  readonly quality: 'low' | 'medium' | 'high';
  readonly loaded: boolean;
}

/* ==================== Storage Types ==================== */

/**
 * Generic storage item.
 */
export interface IStorageItem<T> {
  readonly key: string;
  readonly value: T;
  readonly timestamp: number;
  readonly expiresAt: number | null;
}

/**
 * Storage operation result.
 */
export type StorageResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: Error };

/**
 * Cache entry for TTS audio.
 */
export interface ICacheEntry {
  readonly id: string;
  readonly text: string;
  readonly voice: string;
  readonly audioData: ArrayBuffer;
  readonly size: number;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
  readonly accessCount: number;
}

/* ==================== Error Handling Types ==================== */

/**
 * Application error codes.
 */
export enum AppErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_STATE = 'INVALID_STATE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured application error.
 */
export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly timestamp: number = Date.now()
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/* ==================== Performance Monitoring Types ==================== */

/**
 * Performance metrics snapshot.
 */
export interface IPerformanceMetrics {
  readonly timestamp: number;
  readonly memory: IMemoryMetrics;
  readonly cpu: ICPUMetrics;
  readonly network: INetworkMetrics;
}

/**
 * Memory usage metrics.
 */
export interface IMemoryMetrics {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
  readonly percentUsed: number;
}

/**
 * CPU usage metrics.
 */
export interface ICPUMetrics {
  readonly usage: number;
  readonly throttled: boolean;
}

/**
 * Network metrics.
 */
export interface INetworkMetrics {
  readonly online: boolean;
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
}

/* ==================== Logger Types ==================== */

/**
 * Log levels enumeration.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure.
 */
export interface ILogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context?: string;
  readonly data?: unknown;
  readonly stackTrace?: string;
}

/**
 * Logger interface.
 */
export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown): void;
  setLevel(level: LogLevel): void;
}

/* ==================== Utility Types ==================== */

/**
 * Makes all properties in T readonly recursively.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Makes all properties in T required recursively.
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extracts promise type.
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Nullable type helper.
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper.
 */
export type Optional<T> = T | undefined;

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/* ==================== AsTeRICS-Grid Legacy Types ==================== */

/**
 * Grid data structure (simplified).
 * Full types will be imported from AsTeRICS-Grid.
 */
export interface IGridData {
  readonly id: string;
  readonly label: string;
  readonly gridElements: readonly IGridElement[];
  readonly rowCount: number;
  readonly columnCount: number;
}

/**
 * Grid element (simplified).
 */
export interface IGridElement {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly actions: readonly IAction[];
}

/**
 * Action interface (simplified).
 */
export interface IAction {
  readonly type: string;
  readonly data: unknown;
}

/* ==================== Global Augmentations ==================== */

declare global {
  interface Window {
    /** Application configuration */
    readonly APP_CONFIG: IAppConfig;
    
    /** Performance monitoring API */
    readonly performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }

  /** Build-time constants */
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;
  const __DEV__: boolean;
}

export {};