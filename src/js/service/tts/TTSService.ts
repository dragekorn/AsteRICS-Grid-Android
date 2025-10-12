/**
 * Abstract TTS service interface + Factory
 */

import type {
  ITTSRequest,
  ITTSResult,
  ITTSError,
  ITTSStatus,
  IVoiceModel,
} from '@/js/types/global';
import { createLogger } from '@/js/util/Logger';
import { errorHandler } from '@/js/util/ErrorHandler';
import { performanceMonitor } from '@/js/util/PerformanceMonitor';

const logger = createLogger('TTSService');

export interface ITTSSynthesizeOptions {
  readonly text: string;
  readonly voice?: string;
  readonly rate?: number;
  readonly pitch?: number;
  readonly volume?: number;
  readonly language?: string;
}

export interface ITTSPlaybackOptions {
  readonly loop?: boolean;
  readonly volume?: number;
  readonly onEnd?: () => void;
  readonly onError?: (error: Error) => void;
}

export abstract class TTSService {
  protected isInitialized = false;
  protected currentVoice: string | null = null;
  protected audioContext: AudioContext | null = null;
  
  public abstract initialize(): Promise<void>;
  public abstract synthesize(options: ITTSSynthesizeOptions): Promise<ITTSResult>;
  public abstract getAvailableVoices(): Promise<readonly IVoiceModel[]>;
  public abstract getStatus(): ITTSStatus;
  public abstract cleanup(): Promise<void>;

  public async play(
    result: ITTSResult,
    options: ITTSPlaybackOptions = {}
  ): Promise<void> {
    performanceMonitor.mark('tts-playback-start');

    try {
      if (this.audioContext === null) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const audioBuffer = await this.audioContext.decodeAudioData(
        result.audioData.slice(0)
      );

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = options.loop ?? false;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = options.volume ?? 1.0;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      return new Promise<void>((resolve, reject) => {
        source.onended = () => {
          source.disconnect();
          gainNode.disconnect();
          
          if (options.onEnd !== undefined) {
            options.onEnd();
          }
          
          performanceMonitor.measure('tts-playback', 'tts-playback-start');
          resolve();
        };

        const errorCallback = (error: Error): void => {
          source.disconnect();
          gainNode.disconnect();
          
          if (options.onError !== undefined) {
            options.onError(error);
          }
          
          reject(error);
        };

        try {
          source.start(0);
        } catch (error) {
          errorCallback(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } catch (error) {
      const handledError = errorHandler.handleError(error, {
        context: 'TTSService.play',
        severity: 'MEDIUM' as const,
      });
      
      throw new Error(handledError.message);
    }
  }

  public stop(): void {
    if (this.audioContext !== null) {
      void this.audioContext.close().then(() => {
        this.audioContext = null;
      });
    }
  }

  public async setVoice(voiceId: string): Promise<void> {
    const voices = await this.getAvailableVoices();
    const voice = voices.find((v) => v.id === voiceId);

    if (voice === undefined) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    this.currentVoice = voiceId;
    logger.info(`Voice changed to: ${voiceId}`);
  }

  public getCurrentVoice(): string | null {
    return this.currentVoice;
  }

  protected validateOptions(
    options: ITTSSynthesizeOptions
  ): Required<ITTSSynthesizeOptions> {
    if (options.text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (options.text.length > 5000) {
      throw new Error('Text too long (max 5000 characters)');
    }

    return {
      text: options.text,
      voice: options.voice ?? this.currentVoice ?? 'default',
      rate: this.clamp(options.rate ?? 1.0, 0.5, 2.0),
      pitch: this.clamp(options.pitch ?? 1.0, 0.5, 2.0),
      volume: this.clamp(options.volume ?? 1.0, 0.0, 1.0),
      language: options.language ?? 'ru-RU',
    };
  }

  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  protected generateRequestId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('TTS service not initialized. Call initialize() first.');
    }
  }
}

/**
 * TTS Factory - выбирает реализацию
 */
export class TTSServiceFactory {
  private static instance: TTSService | null = null;

  public static async getInstance(): Promise<TTSService> {
    if (TTSServiceFactory.instance === null) {
      TTSServiceFactory.instance = await TTSServiceFactory.createInstance();
    }
    return TTSServiceFactory.instance;
  }

  private static async createInstance(): Promise<TTSService> {
    logger.info('Creating TTS service instance...');

    try {
      // Пробуем ServerTTSService
      const { ServerTTSService } = await import('./ServerTTSService');
      const service = new ServerTTSService();
      await service.initialize();
      
      logger.info('TTS service initialized: ServerTTSService');
      return service;
    } catch (error) {
      logger.warn('ServerTTS unavailable, falling back to Mock', error);
      
      // Fallback на Mock
      const { MockTTSService } = await import('./MockTTSService');
      const service = new MockTTSService();
      await service.initialize();
      
      logger.info('TTS service initialized: MockTTSService (fallback)');
      return service;
    }
  }

  public static reset(): void {
    if (TTSServiceFactory.instance !== null) {
      void TTSServiceFactory.instance.cleanup();
      TTSServiceFactory.instance = null;
    }
  }
}
