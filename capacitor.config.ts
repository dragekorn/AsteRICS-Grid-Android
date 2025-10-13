import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for AsTeRICS-Grid Android app.
 * 
 * Performance optimizations:
 * - Mixed content allowed for legacy AsTeRICS-Grid compatibility
 * - Hardware acceleration enabled
 * - WebView memory optimizations
 * 
 * @see https://capacitorjs.com/docs/config
 */
const config: CapacitorConfig = {
  appId: 'com.asterics.grid',
  appName: 'AsTeRICS Grid',
  webDir: 'dist',
  
  server: {
    // Allow loading local files for offline operation
    androidScheme: 'https',
    hostname: 'localhost',
    // Clear text traffic enabled для HTTP подключения к TTS серверу
    cleartext: true,
    // Allow mixed content for AsTeRICS-Grid compatibility
    allowNavigation: ['*'],
  },

  android: {
    // Minimum SDK version for modern Android features
    minVersion: 26,
    
    // Build configuration
    buildOptions: {
      // Enable ProGuard/R8 for release builds
      minifyEnabled: true,
      shrinkResources: true,
      // Signing configuration (will be set in gradle)
      signingConfig: 'release',
    },

    // WebView performance optimizations
    webContentsDebuggingEnabled: false,
    
    // Allow file access for WASM and audio files
    allowMixedContent: true,
    
    // Background execution (for TTS synthesis)
    backgroundColor: '#ffffff',
    
    // Splash screen configuration
    splash: {
      launchShowDuration: 2000,
      backgroundColor: '#2196f3',
      androidScaleType: 'CENTER_CROP',
    },
  },

  plugins: {
    // Filesystem plugin for storing voice models and cache
    Filesystem: {
      ioTimeout: 30000, // 30 seconds for large file operations
    },

    // App plugin for lifecycle management
    App: {
      // Handle back button for navigation
      backButton: {
        enabled: true,
      },
    },

    // Keyboard plugin for AAC grid input
    Keyboard: {
      resize: 'native',
      style: 'light',
      resizeOnFullScreen: true,
    },

    // SplashScreen configuration - ОТКЛЮЧЕН ДЛЯ ДЕБАГА!
    SplashScreen: {
      launchAutoHide: true, // СКРЫТЬ СРАЗУ!
      launchDuration: 0, // БЕЗ ЗАДЕРЖКИ!
      showSpinner: false, // БЕЗ СПИННЕРА!
    },
  },

  // Logging configuration
  loggingBehavior: process.env.NODE_ENV === 'production' ? 'none' : 'debug',
};

export default config;