/**
 * TTS сервис использующий AAC NLP сервер.
 * 
 * Особенности:
 * - Склонение слов на сервере
 * - Качественный голос Piper
 * - Кеширование аудио
 */

import { TTSService, type ITTSSynthesizeOptions } from './TTSService';
import type { ITTSResult, ITTSStatus, IVoiceModel } from '@/js/types/global';
import { nlpClient } from '@/js/service/api/NLPClient';
import { createLogger } from '@/js/util/Logger';
import { performanceMonitor } from '@/js/util/PerformanceMonitor';

const logger = createLogger('ServerTTSService');

export class ServerTTSService extends TTSService {
  private serverAvailable = false;

  public async initialize(): Promise<void> {
    performanceMonitor.mark('server-tts-init-start');

    try {
      // Проверяем доступность сервера с коротким таймаутом
      const healthPromise = nlpClient.healthCheck();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 3000);
      });
      
      const health = await Promise.race([healthPromise, timeoutPromise]);
      
      this.serverAvailable = health.status === 'ok';
      this.isInitialized = true;

      performanceMonitor.measure('server-tts-init', 'server-tts-init-start');

      logger.info('Server TTS initialized', {
        serverAvailable: this.serverAvailable,
        model: health.model,
      });
    } catch (error) {
      logger.error('Failed to initialize Server TTS', error);
      throw error;
    }
  }

  public async synthesize(options: ITTSSynthesizeOptions): Promise<ITTSResult> {
    this.ensureInitialized();

    if (!this.serverAvailable) {
      throw new Error('Server is not available');
    }

    const requestId = this.generateRequestId();
    performanceMonitor.mark(`server-tts-synth-${requestId}`);

    try {
      const validatedOptions = this.validateOptions(options);

      logger.debug('Synthesizing via server', {
        requestId,
        text: validatedOptions.text,
      });

      // Разбиваем текст на слова для сервера
      const words = validatedOptions.text.split(/\s+/).filter(w => w.length > 0);

      // Генерируем речь через сервер
      const audioData = await nlpClient.generateSpeech(words);

      const synthesisTime = performanceMonitor.measure(
        `server-tts-synth-${requestId}`,
        `server-tts-synth-${requestId}`
      );

      const result: ITTSResult = {
        requestId,
        audioData,
        duration: this.estimateDuration(audioData),
        sampleRate: 22050,
        channels: 1,
        synthesisTime,
      };

      logger.info('Server synthesis completed', {
        requestId,
        duration: result.duration,
        synthesisTime: result.synthesisTime,
      });

      return result;
    } catch (error) {
      logger.error('Server synthesis failed', error);
      throw error;
    }
  }

  public async getAvailableVoices(): Promise<readonly IVoiceModel[]> {
    return [
      {
        id: 'ru_RU-irina-medium',
        name: 'Ирина (средний)',
        language: 'ru-RU',
        gender: 'female',
        sampleRate: 22050,
        modelSize: 28 * 1024 * 1024, // 28 MB
        quality: 'medium',
        loaded: this.serverAvailable,
      },
    ];
  }

  public getStatus(): ITTSStatus {
    return {
      initialized: this.isInitialized,
      activeRequests: 0,
      queuedRequests: 0,
      availableVoices: ['ru_RU-irina-medium'],
      memoryUsage: 0,
      lastError: null,
    };
  }

  public async cleanup(): Promise<void> {
    this.stop();
    this.isInitialized = false;
    this.serverAvailable = false;
    logger.info('Server TTS cleaned up');
  }

  private estimateDuration(audioData: ArrayBuffer): number {
    // WAV header: 44 bytes, потом данные
    // Для 22050 Hz, 1 канал, 16 bit = 2 bytes per sample
    const dataSize = audioData.byteLength - 44;
    const bytesPerSecond = 22050 * 2; // 22050 samples/sec * 2 bytes/sample
    return dataSize / bytesPerSecond;
  }
}
