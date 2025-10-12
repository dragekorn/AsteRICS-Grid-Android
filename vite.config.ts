import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Vite configuration for AsTeRICS-Grid Android build.
 * 
 * Optimizations:
 * - Code splitting for lazy loading
 * - Asset optimization (images, fonts)
 * - WASM support for Piper TTS
 * - Source maps for production debugging
 * - Tree shaking for minimal bundle size
 * 
 * Target bundle size: < 2MB (excluding WASM models)
 * 
 * @see https://vitejs.dev/config/
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            // Performance optimization: inline event handlers
            hoistStatic: true,
            cacheHandlers: true,
          },
        },
      }),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/js': resolve(__dirname, 'src/js'),
        '@/vue-components': resolve(__dirname, 'src/vue-components'),
        '@/types': resolve(__dirname, 'src/js/types'),
      },
      extensions: ['.ts', '.js', '.vue', '.json', '.wasm'],
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      
      // Source maps for production debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Minification with terser for better compression
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true, // Remove console.log in production
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.debug'], // Remove specific calls
              passes: 2, // Multiple passes for better compression
            },
            mangle: {
              safari10: true, // Safari 10 compatibility
            },
            format: {
              comments: false, // Remove all comments
            },
          }
        : undefined,

      // Chunk optimization for code splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal caching
          manualChunks: {
            // Vendor chunks
            'vendor-vue': ['vue', 'vuex', 'pinia'],
            'vendor-utils': ['lodash-es', 'axios'],
          },

          // Asset file naming
          chunkFileNames: isProduction
            ? 'assets/js/[name].[hash].js'
            : 'assets/js/[name].js',
          entryFileNames: isProduction
            ? 'assets/js/[name].[hash].js'
            : 'assets/js/[name].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') ?? [];
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(assetInfo.name ?? '')) {
              return `assets/images/[name].[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name ?? '')) {
              return `assets/fonts/[name].[hash].${ext}`;
            }
            if (/\.wasm$/.test(assetInfo.name ?? '')) {
              return `assets/wasm/[name].[hash].${ext}`;
            }
            return `assets/[name].[hash].${ext}`;
          },
        },

        // Suppress circular dependency warnings for AsTeRICS-Grid legacy code
        onwarn(warning, warn) {
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'EVAL') return; // Legacy AsTeRICS code uses eval
          warn(warning);
        },
      },

      // Performance budgets
      chunkSizeWarningLimit: 1000, // Warn for chunks > 1MB
      
      // Asset optimization
      assetsInlineLimit: 4096, // Inline assets < 4KB as base64
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Target modern browsers for Capacitor WebView
      target: 'es2020',
      
      // Report bundle size
      reportCompressedSize: true,
    },

    // Development server (not used in Capacitor, but useful for web testing)
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      cors: true,
      hmr: {
        overlay: true,
      },
    },

    // Preview server
    preview: {
      port: 3000,
      strictPort: true,
      host: true,
    },

    // Optimization configuration
    optimizeDeps: {
      include: ['vue', 'vuex', 'lodash-es', 'axios', 'idb'],
      exclude: ['@capacitor/filesystem', '@capacitor/app'],
      esbuildOptions: {
        target: 'es2020',
      },
    },

    // Worker configuration for WASM
    worker: {
      format: 'es',
      plugins: () => [vue()],
    },

    // WASM support
    assetsInclude: ['**/*.wasm', '**/*.onnx'],

    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: JSON.stringify(!isProduction),
    },

    // ESBuild options for TypeScript compilation
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
      treeShaking: true,
    },

    // JSON optimization
    json: {
      stringify: true, // Faster JSON parsing
    },
  };
});