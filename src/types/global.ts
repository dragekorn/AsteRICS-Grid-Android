/**
 * Global type definitions - converted from .d.ts
 */

/* ==================== Application Types ==================== */

export interface IAppConfig {
  readonly version: string;
  readonly buildTime: string;
  readonly environment: 'development' | 'production';
  readonly tts: ITTSConfig;
  readonly storage: IStorageConfig;
  readonly performance: IPerformanceConfig;
}

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

export interface IStorageConfig {
  readonly indexedDbName: string;
  readonly indexedDbVersion: number;
  readonly cacheQuota: number;
  readonly persistentStorage: boolean;
}

export interface IPerformanceConfig {
  readonly enabled: boolean;
  readonly metricsInterval: number;
  readonly memoryWarningThreshold: number;
  readonly cpuWarningThreshold: number;
}

/* ==================== TTS Service Types ==================== */

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

export interface ITTSResult {
  readonly requestId: string;
  readonly audioData: ArrayBuffer;
  readonly duration: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly synthesisTime: number;
}

export interface ITTSError {
  readonly code: TTSErrorCode;
  readonly message: string;
  readonly requestId: string;
  readonly timestamp: number;
  readonly details?: unknown;
}

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

export interface ITTSStatus {
  readonly initialized: boolean;
  readonly activeRequests: number;
  readonly queuedRequests: number;
  readonly availableVoices: readonly string[];
  readonly memoryUsage: number;
  readonly lastError: ITTSError | null;
}

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

/* ==================== Error Handling Types ==================== */

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

export interface IPerformanceMetrics {
  readonly timestamp: number;
  readonly memory: IMemoryMetrics;
  readonly cpu: ICPUMetrics;
  readonly network: INetworkMetrics;
}

export interface IMemoryMetrics {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
  readonly percentUsed: number;
}

export interface ICPUMetrics {
  readonly usage: number;
  readonly throttled: boolean;
}

export interface INetworkMetrics {
  readonly online: boolean;
  readonly effectiveType: string;
  readonly downlink: number;
  readonly rtt: number;
}

/* ==================== Logger Types ==================== */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface ILogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context?: string;
  readonly data?: unknown;
  readonly stackTrace?: string;
}

export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown): void;
  setLevel(level: LogLevel): void;
}

/* ==================== Storage Types ==================== */

export interface IStorageItem<T> {
  readonly key: string;
  readonly value: T;
  readonly timestamp: number;
  readonly expiresAt: number | null;
}

export type StorageResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: Error };

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
