/**
 * Mock TTS service for development and testing.
 * 
 * Uses Web Speech API as fallback while Piper TTS is being integrated.
 * This implementation will be replaced by PiperTTSService in Phase 2.
 * 
 * Features:
 * - Web Speech API integration
 * - Simulated async behavior for testing
 * - Memory-safe audio generation
 * - Performance metrics collection
 * 
 * @example
 * ```typescript
 * const tts = new MockTTSService();
 * await tts.initialize();
 * const result = await tts.synthesize({ text: 'Hello world' });
 * await tts.play(result);
 * ```
 */

import {
  TTSService,
  type ITTSSynthesizeOptions,
} from './TTSService';
import type {
  ITTSResult,
  ITTSStatus,
  IVoiceModel,
  ITTSError,
} from '@/js/types/global';
import { createLogger } from '@/js/util/Logger';
import { performanceMonitor } from '@/js/util/PerformanceMonitor';

const logger = createLogger('MockTTSService');

/**
 * Mock TTS service using Web Speech API.
 * Development/testing implementation.
 */
export class MockTTSService extends TTSService {
  private synth: SpeechSynthesis | null = null;
  private availableVoices: IVoiceModel[] = [];
  private activeRequests = 0;
  private queuedRequests = 0;

  /**
   * Initializes mock TTS service.
   * 
   * @throws {Error} If Web Speech API not available
   */
  public async initialize(): Promise<void> {
    performanceMonitor.mark('tts-init-start');

    try {
      // Check for Web Speech API support
      if (!('speechSynthesis' in window)) {
        throw new Error('Web Speech API not supported in this browser');
      }

      this.synth = window.speechSynthesis;

      // Load available voices
      await this.loadVoices();

      this.isInitialized = true;

      performanceMonitor.measure('tts-init', 'tts-init-start');
      logger.info('Mock TTS service initialized', {
        voiceCount: this.availableVoices.length,
      });
    } catch (error) {
      logger.error('Failed to initialize Mock TTS service', error);
      throw error;
    }
  }

  /**
   * Synthesizes text to speech using Web Speech API.
   * 
   * Note: Web Speech API doesn't return raw audio data,
   * so we generate a mock audio buffer for consistency with the interface.
   * 
   * @param options - Synthesis options
   * @returns Promise resolving to synthesis result
   */
  public async synthesize(options: ITTSSynthesizeOptions): Promise<ITTSResult> {
    this.ensureInitialized();

    const requestId = this.generateRequestId();
    performanceMonitor.mark(`tts-synthesis-start-${requestId}`);

    this.activeRequests++;

    try {
      const validatedOptions = this.validateOptions(options);

      logger.debug('Synthesizing text', {
        requestId,
        textLength: validatedOptions.text.length,
        voice: validatedOptions.voice,
      });

      // Generate mock audio buffer
      // In real Piper TTS implementation, this will be actual synthesized audio
      const audioData = await this.generateMockAudio(validatedOptions);

      const synthesisTime = performanceMonitor.measure(
        `tts-synthesis-${requestId}`,
        `tts-synthesis-start-${requestId}`
      );

      const result: ITTSResult = {
        requestId,
        audioData,
        duration: this.estimateDuration(validatedOptions.text),
        sampleRate: 22050, // Typical TTS sample rate
        channels: 1, // Mono
        synthesisTime,
      };

      logger.info('Synthesis completed', {
        requestId,
        duration: result.duration,
        synthesisTime: result.synthesisTime,
      });

      return result;
    } catch (error) {
      logger.error('Synthesis failed', error);
      
      const ttsError: ITTSError = {
        code: 'SYNTHESIS_FAILED',
        message: error instanceof Error ? error.message : String(error),
        requestId,
        timestamp: Date.now(),
        details: error,
      };

      throw ttsError;
    } finally {
      this.activeRequests--;
      performanceMonitor.clearMark(`tts-synthesis-start-${requestId}`);
    }
  }

  /**
   * Gets available voice models.
   * 
   * @returns Array of available voice models
   */
  public async getAvailableVoices(): Promise<readonly IVoiceModel[]> {
    this.ensureInitialized();

    if (this.availableVoices.length === 0) {
      await this.loadVoices();
    }

    return Object.freeze([...this.availableVoices]);
  }

  /**
   * Gets current service status.
   * 
   * @returns Service status
   */
  public getStatus(): ITTSStatus {
    return {
      initialized: this.isInitialized,
      activeRequests: this.activeRequests,
      queuedRequests: this.queuedRequests,
      availableVoices: this.availableVoices.map((v) => v.id),
      memoryUsage: this.estimateMemoryUsage(),
      lastError: null,
    };
  }

  /**
   * Cleans up resources.
   */
  public async cleanup(): Promise<void> {
    if (this.synth !== null) {
      this.synth.cancel();
      this.synth = null;
    }

    this.stop();
    this.isInitialized = false;
    this.availableVoices = [];

    logger.info('Mock TTS service cleaned up');
  }

  /**
   * Loads available voices from Web Speech API.
   * 
   * @returns Promise that resolves when voices are loaded
   */
  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (this.synth === null) {
        resolve();
        return;
      }

      const loadVoicesImpl = (): void => {
        const voices = this.synth!.getVoices();
        
        this.availableVoices = voices.map((voice, index) => ({
          id: `mock_${index}`,
          name: voice.name,
          language: voice.lang,
          gender: this.guessGender(voice.name),
          sampleRate: 22050,
          modelSize: 0, // Mock - no actual model
          quality: 'medium',
          loaded: true,
        }));

        // Set default voice if not set
        if (this.currentVoice === null && this.availableVoices.length > 0) {
          const englishVoice = this.availableVoices.find((v) =>
            v.language.startsWith('en')
          );
          this.currentVoice = englishVoice?.id ?? this.availableVoices[0]!.id;
        }

        resolve();
      };

      // Some browsers load voices asynchronously
      if (this.synth.getVoices().length > 0) {
        loadVoicesImpl();
      } else {
        this.synth.onvoiceschanged = () => {
          loadVoicesImpl();
        };

        // Fallback timeout
        setTimeout(() => {
          if (this.availableVoices.length === 0) {
            loadVoicesImpl();
          }
        }, 1000);
      }
    });
  }

  /**
   * Generates mock audio buffer.
   * In real implementation, this will be replaced with actual WASM synthesis.
   * 
   * @param options - Synthesis options
   * @returns Promise resolving to audio data
   */
  private async generateMockAudio(
    options: Required<ITTSSynthesizeOptions>
  ): Promise<ArrayBuffer> {
    // Generate a simple sine wave as mock audio
    const sampleRate = 22050;
    const duration = this.estimateDuration(options.text);
    const numSamples = Math.floor(sampleRate * duration);
    
    // Create audio buffer
    const buffer = new Float32Array(numSamples);
    const frequency = 440; // A4 note
    
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
    }

    // Convert to WAV format
    return this.encodeWAV(buffer, sampleRate);
  }

  /**
   * Encodes Float32Array as WAV file.
   * 
   * @param samples - Audio samples
   * @param sampleRate - Sample rate in Hz
   * @returns WAV file as ArrayBuffer
   */
  private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string): void => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]!));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Estimates audio duration based on text length.
   * Rough heuristic: ~150 words per minute.
   * 
   * @param text - Input text
   * @returns Estimated duration in seconds
   */
  private estimateDuration(text: string): number {
    const wordsPerMinute = 150;
    const wordCount = text.split(/\s+/).length;
    return (wordCount / wordsPerMinute) * 60;
  }

  /**
   * Estimates memory usage of the service.
   * 
   * @returns Estimated memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    // Rough estimate based on active operations
    const baseUsage = 1024 * 1024; // 1MB base
    const perRequestUsage = 512 * 1024; // 512KB per active request
    
    return baseUsage + this.activeRequests * perRequestUsage;
  }

  /**
   * Guesses gender from voice name.
   * Simple heuristic for mock implementation.
   * 
   * @param name - Voice name
   * @returns Guessed gender
   */
  private guessGender(name: string): 'male' | 'female' | 'neutral' {
    const lowerName = name.toLowerCase();
    
    if (
      lowerName.includes('female') ||
      lowerName.includes('woman') ||
      lowerName.includes('zira') ||
      lowerName.includes('samantha')
    ) {
      return 'female';
    }
    
    if (
      lowerName.includes('male') ||
      lowerName.includes('man') ||
      lowerName.includes('david') ||
      lowerName.includes('alex')
    ) {
      return 'male';
    }
    
    return 'neutral';
  }
}