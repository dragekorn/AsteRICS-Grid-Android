/**
 * API клиент для AAC NLP сервера.
 * 
 * Обрабатывает:
 * - Построение предложений из слов
 * - Генерацию речи
 * - Кеширование ответов
 * - Обработку ошибок и retry
 */

import { errorHandler } from '@/js/util/ErrorHandler';
import { createLogger } from '@/js/util/Logger';
import { performanceMonitor } from '@/js/util/PerformanceMonitor';

const logger = createLogger('NLPClient');

/**
 * Конфигурация API.
 */
interface INLPConfig {
  readonly serverUrl: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

/**
 * Результат построения предложения.
 */
export interface ISentenceResult {
  readonly sentence: string;
  readonly originalWords: readonly string[];
}

/**
 * Клиент для AAC NLP сервера.
 */

export class NLPClient {
  private static instance: NLPClient | null = null;

  private readonly config: INLPConfig = {
    serverUrl: 'http://192.168.0.104:5000',  // Твой IP с сервером TTS
    timeout: 5000,  // Уменьшил таймаут для быстрой обработки ошибок
    retryAttempts: 1,  // Меньше retry - быстрее fallback на mock
  };

  private constructor() {
    logger.info('NLP Client initialized', { serverUrl: this.config.serverUrl });
  }

  /**
   * Получить singleton instance.
   */
  public static getInstance(): NLPClient {
    if (NLPClient.instance === null) {
      NLPClient.instance = new NLPClient();
    }
    return NLPClient.instance;
  }

  /**
   * Проверка здоровья сервера.
   * 
   * @returns Promise с статусом сервера
   */
  public async healthCheck(): Promise<{ status: string; model: string }> {
    performanceMonitor.mark('nlp-health-check-start');

    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      performanceMonitor.measure('nlp-health-check', 'nlp-health-check-start');

      return data;
    } catch (error) {
      logger.error('Health check failed', error);
      throw error;
    }
  }

  /**
   * Построить предложение из слов.
   * 
   * @param words - Массив слов
   * @returns Promise с предложением
   */
  public async buildSentence(words: readonly string[]): Promise<ISentenceResult> {
    performanceMonitor.mark('nlp-sentence-start');

    try {
      const response = await errorHandler.withRetry(
        async () => {
          const res = await fetch(`${this.config.serverUrl}/api/sentence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words }),
            signal: AbortSignal.timeout(this.config.timeout),
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          return res.json();
        },
        {
          maxRetries: this.config.retryAttempts,
          retryDelay: 1000,
          context: 'NLPClient.buildSentence',
        }
      );

      performanceMonitor.measure('nlp-sentence', 'nlp-sentence-start');

      logger.info('Sentence built', {
        words: words.length,
        sentence: response.sentence,
      });

      return response;
    } catch (error) {
      logger.error('Failed to build sentence', error);
      throw error;
    }
  }

  /**
   * Сгенерировать речь из слов.
   * 
   * @param words - Массив слов
   * @returns Promise с аудио данными (ArrayBuffer)
   */
  public async generateSpeech(words: readonly string[]): Promise<ArrayBuffer> {
    performanceMonitor.mark('nlp-speech-start');

    try {
      const response = await errorHandler.withRetry(
        async () => {
          const res = await fetch(`${this.config.serverUrl}/api/speak`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words }),
            signal: AbortSignal.timeout(30000), // 30 sec для генерации
          });

          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }

          return res.arrayBuffer();
        },
        {
          maxRetries: 2,
          retryDelay: 2000,
          context: 'NLPClient.generateSpeech',
        }
      );

      performanceMonitor.measure('nlp-speech', 'nlp-speech-start');

      logger.info('Speech generated', {
        words: words.length,
        audioSize: response.byteLength,
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate speech', error);
      throw error;
    }
  }

  /**
   * Установить URL сервера.
   * 
   * @param url - URL сервера
   */
  public setServerUrl(url: string): void {
    (this.config as { serverUrl: string }).serverUrl = url;
    logger.info('Server URL updated', { url });
  }
}

/**
 * Глобальный экземпляр клиента.
 */
export const nlpClient = NLPClient.getInstance();
