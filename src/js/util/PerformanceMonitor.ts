/**
 * Performance monitoring and resource tracking service.
 * 
 * Features:
 * - Memory usage monitoring
 * - CPU usage estimation
 * - Network metrics
 * - Custom performance marks
 * - Automatic threshold alerts
 * - Zero-overhead when disabled
 * 
 * Target metrics:
 * - Memory: < 150MB peak usage
 * - CPU: < 70% average utilization
 * - FPS: > 55 for UI interactions
 * 
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 * 
 * // Measure operation
 * monitor.mark('tts-synthesis-start');
 * await synthesizeSpeech(text);
 * monitor.measure('tts-synthesis', 'tts-synthesis-start');
 * 
 * // Get metrics
 * const metrics = monitor.getMetrics();
 * console.log(`Memory usage: ${metrics.memory.percentUsed}%`);
 * ```
 */

import type { IPerformanceMetrics, IMemoryMetrics } from '@/types/global';
import { createLogger } from './Logger';

const logger = createLogger('PerformanceMonitor');

/**
 * Performance monitoring configuration.
 */
interface IPerformanceConfig {
  readonly enabled: boolean;
  readonly sampleInterval: number;
  readonly memoryThreshold: number;
  readonly alertCallback?: (alert: IPerformanceAlert) => void;
}

/**
 * Performance alert information.
 */
export interface IPerformanceAlert {
  readonly type: 'memory' | 'cpu' | 'fps';
  readonly severity: 'warning' | 'critical';
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: number;
  readonly message: string;
}

/**
 * Performance measurement record.
 */
interface IPerformanceMeasurement {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: IPerformanceConfig = {
  enabled: __DEV__ || true, // Always enabled for production monitoring
  sampleInterval: 5000, // 5 seconds
  memoryThreshold: 0.85, // 85% of heap limit
} as const;

/**
 * Performance monitor singleton for resource tracking.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  private config: IPerformanceConfig;
  private metricsHistory: IPerformanceMetrics[] = [];
  private measurements: IPerformanceMeasurement[] = [];
  private marks = new Map<string, number>();
  private intervalId: number | null = null;

  /**
   * Private constructor to enforce singleton pattern.
   * 
   * @param config - Optional configuration overrides
   */
  private constructor(config: Partial<IPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Gets the singleton instance.
   * 
   * @param config - Optional configuration for first initialization
   * @returns PerformanceMonitor instance
   */
  public static getInstance(config?: Partial<IPerformanceConfig>): PerformanceMonitor {
    if (PerformanceMonitor.instance === null) {
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Creates a performance mark at the current time.
   * 
   * @param name - Mark name
   * 
   * @example
   * ```typescript
   * monitor.mark('operation-start');
   * // ... do work ...
   * monitor.measure('operation', 'operation-start');
   * ```
   */
  public mark(name: string): void {
    if (!this.config.enabled) {
      return;
    }

    this.marks.set(name, performance.now());
    
    // Also use native Performance API if available
    if (typeof performance.mark === 'function') {
      performance.mark(name);
    }
  }

  /**
   * Measures duration between two marks or from a mark to now.
   * 
   * @param name - Measurement name
   * @param startMark - Start mark name
   * @param endMark - Optional end mark name (defaults to now)
   * @returns Measurement duration in milliseconds
   * 
   * @throws {Error} If start mark doesn't exist
   */
  public measure(name: string, startMark: string, endMark?: string): number {
    if (!this.config.enabled) {
      return 0;
    }

    const startTime = this.marks.get(startMark);
    if (startTime === undefined) {
      throw new Error(`Performance mark "${startMark}" not found`);
    }

    const endTime = endMark !== undefined
      ? this.marks.get(endMark)
      : performance.now();

    if (endTime === undefined) {
      throw new Error(`Performance mark "${endMark}" not found`);
    }

    const duration = endTime - startTime;

    const measurement: IPerformanceMeasurement = {
      name,
      duration,
      startTime,
      endTime,
    };

    this.measurements.push(measurement);

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements.shift();
    }

    logger.debug(`Performance: ${name} took ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Gets current performance metrics snapshot.
   * 
   * @returns Current performance metrics
   */
  public getMetrics(): IPerformanceMetrics {
    return {
      timestamp: Date.now(),
      memory: this.getMemoryMetrics(),
      cpu: this.getCPUMetrics(),
      network: this.getNetworkMetrics(),
    };
  }

  /**
   * Gets memory usage metrics.
   * 
   * @returns Memory metrics
   */
  public getMemoryMetrics(): IMemoryMetrics {
    const memory = performance.memory;

    if (memory === undefined) {
      // Fallback if memory API not available
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        percentUsed: 0,
      };
    }

    const percentUsed = memory.jsHeapSizeLimit > 0
      ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      : 0;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      percentUsed,
    };
  }

  /**
   * Gets CPU usage estimation.
   * Based on frame timing and task duration.
   * 
   * @returns CPU metrics
   */
  private getCPUMetrics(): { usage: number; throttled: boolean } {
    // Estimate CPU usage from frame timing
    // This is a simplified heuristic
    const entries = performance.getEntriesByType('measure');
    
    if (entries.length === 0) {
      return { usage: 0, throttled: false };
    }

    // Calculate average task duration
    const avgDuration = entries.reduce((sum, entry) => sum + entry.duration, 0) / entries.length;
    
    // Rough estimate: usage percentage based on 60fps budget (16.67ms per frame)
    const frameBudget = 16.67;
    const usage = Math.min((avgDuration / frameBudget) * 100, 100);
    const throttled = usage > 80;

    return { usage, throttled };
  }

  /**
   * Gets network metrics.
   * 
   * @returns Network metrics
   */
  private getNetworkMetrics(): {
    online: boolean;
    effectiveType: string;
    downlink: number;
    rtt: number;
  } {
    const connection = (navigator as unknown as {
      connection?: {
        effectiveType: string;
        downlink: number;
        rtt: number;
      };
    }).connection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType ?? 'unknown',
      downlink: connection?.downlink ?? 0,
      rtt: connection?.rtt ?? 0,
    };
  }

  /**
   * Gets all performance measurements.
   * 
   * @returns Array of measurements
   */
  public getMeasurements(): readonly IPerformanceMeasurement[] {
    return Object.freeze([...this.measurements]);
  }

  /**
   * Gets measurements by name.
   * 
   * @param name - Measurement name to filter by
   * @returns Filtered measurements
   */
  public getMeasurementsByName(name: string): readonly IPerformanceMeasurement[] {
    return Object.freeze(
      this.measurements.filter((m) => m.name === name)
    );
  }

  /**
   * Gets average duration for named measurements.
   * 
   * @param name - Measurement name
   * @returns Average duration in milliseconds
   */
  public getAverageDuration(name: string): number {
    const measurements = this.getMeasurementsByName(name);
    
    if (measurements.length === 0) {
      return 0;
    }

    const sum = measurements.reduce((acc, m) => acc + m.duration, 0);
    return sum / measurements.length;
  }

  /**
   * Clears all marks and measurements.
   */
  public clear(): void {
    this.marks.clear();
    this.measurements.length = 0;
    
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks();
    }
    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures();
    }
  }

  /**
   * Clears specific mark.
   * 
   * @param name - Mark name to clear
   */
  public clearMark(name: string): void {
    this.marks.delete(name);
    
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks(name);
    }
  }

  /**
   * Starts periodic monitoring.
   */
  private startMonitoring(): void {
    if (this.intervalId !== null) {
      return;
    }

    // Initial snapshot
    this.captureMetrics();

    // Periodic snapshots
    this.intervalId = window.setInterval(() => {
      this.captureMetrics();
    }, this.config.sampleInterval);

    logger.info('Performance monitoring started', {
      interval: this.config.sampleInterval,
    });
  }

  /**
   * Stops periodic monitoring.
   */
  public stopMonitoring(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Performance monitoring stopped');
    }
  }

  /**
   * Captures current metrics snapshot.
   */
  private captureMetrics(): void {
    const metrics = this.getMetrics();
    
    this.metricsHistory.push(metrics);

    // Keep only last hour of data (assuming 5s interval = 720 samples/hour)
    if (this.metricsHistory.length > 720) {
      this.metricsHistory.shift();
    }

    // Check thresholds and trigger alerts
    this.checkThresholds(metrics);
  }

  /**
   * Checks performance thresholds and triggers alerts.
   * 
   * @param metrics - Current metrics
   */
  private checkThresholds(metrics: IPerformanceMetrics): void {
    // Memory threshold check
    const memoryPercent = metrics.memory.percentUsed / 100;
    
    if (memoryPercent >= this.config.memoryThreshold) {
      const alert: IPerformanceAlert = {
        type: 'memory',
        severity: memoryPercent >= 0.95 ? 'critical' : 'warning',
        value: memoryPercent * 100,
        threshold: this.config.memoryThreshold * 100,
        timestamp: Date.now(),
        message: `Memory usage at ${(memoryPercent * 100).toFixed(1)}% (threshold: ${(this.config.memoryThreshold * 100).toFixed(0)}%)`,
      };

      this.triggerAlert(alert);
    }

    // CPU threshold check
    if (metrics.cpu.usage > 80) {
      const alert: IPerformanceAlert = {
        type: 'cpu',
        severity: metrics.cpu.usage > 90 ? 'critical' : 'warning',
        value: metrics.cpu.usage,
        threshold: 80,
        timestamp: Date.now(),
        message: `CPU usage at ${metrics.cpu.usage.toFixed(1)}%`,
      };

      this.triggerAlert(alert);
    }
  }

  /**
   * Triggers performance alert.
   * 
   * @param alert - Alert information
   */
  private triggerAlert(alert: IPerformanceAlert): void {
    logger.warn(`Performance alert: ${alert.message}`, {
      type: alert.type,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold,
    });

    if (this.config.alertCallback !== undefined) {
      this.config.alertCallback(alert);
    }
  }

  /**
   * Gets metrics history.
   * 
   * @param limit - Maximum number of entries to return
   * @returns Metrics history
   */
  public getMetricsHistory(limit?: number): readonly IPerformanceMetrics[] {
    const history = [...this.metricsHistory].reverse();
    return Object.freeze(
      limit !== undefined ? history.slice(0, limit) : history
    );
  }

  /**
   * Generates performance report.
   * 
   * @returns Formatted performance report
   */
  public generateReport(): string {
    const currentMetrics = this.getMetrics();
    const measurements = this.getMeasurements();

    let report = '=== Performance Report ===\n\n';

    // Memory stats
    report += '--- Memory ---\n';
    report += `Used: ${(currentMetrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Total: ${(currentMetrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Limit: ${(currentMetrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Usage: ${currentMetrics.memory.percentUsed.toFixed(1)}%\n\n`;

    // CPU stats
    report += '--- CPU ---\n';
    report += `Usage: ${currentMetrics.cpu.usage.toFixed(1)}%\n`;
    report += `Throttled: ${currentMetrics.cpu.throttled ? 'Yes' : 'No'}\n\n`;

    // Network stats
    report += '--- Network ---\n';
    report += `Status: ${currentMetrics.network.online ? 'Online' : 'Offline'}\n`;
    report += `Type: ${currentMetrics.network.effectiveType}\n`;
    report += `Downlink: ${currentMetrics.network.downlink} Mbps\n`;
    report += `RTT: ${currentMetrics.network.rtt} ms\n\n`;

    // Top 10 slowest operations
    if (measurements.length > 0) {
      report += '--- Top 10 Slowest Operations ---\n';
      const sorted = [...measurements].sort((a, b) => b.duration - a.duration);
      sorted.slice(0, 10).forEach((m, i) => {
        report += `${i + 1}. ${m.name}: ${m.duration.toFixed(2)}ms\n`;
      });
    }

    return report;
  }
}

/**
 * Global performance monitor instance.
 */
export const performanceMonitor = PerformanceMonitor.getInstance();