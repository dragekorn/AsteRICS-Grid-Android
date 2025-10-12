# AsTeRICS-Grid Android with Offline Piper TTS

Enterprise-grade Android application based on AsTeRICS-Grid with integrated offline text-to-speech synthesis using Piper TTS (WebAssembly).

## 🎯 Project Goals

- ✅ Full offline functionality without internet dependency
- ✅ High-quality speech synthesis with Piper TTS (WASM)
- ✅ Production-ready code with enterprise standards
- ✅ Performance optimized for 10k+ RPS
- ✅ Memory-safe operation (< 150MB peak)
- ✅ Comprehensive error handling and logging

## 📋 Current Status

### ✅ Phase 1: Completed (Foundation)
- [x] Project structure and configuration
- [x] TypeScript strict mode with null-safety
- [x] Capacitor Android integration
- [x] Logging infrastructure (structured logging)
- [x] Error handling (retry logic, circuit breakers)
- [x] Performance monitoring
- [x] Build system (Vite + Gradle)
- [x] Code quality tools (ESLint, Prettier)
- [x] Mock TTS service for testing

### 🔄 Phase 2: In Progress (TTS Integration)
- [ ] Piper TTS WASM integration
- [ ] Native Android TTS service (Kotlin)
- [ ] Audio pipeline implementation
- [ ] Voice model management
- [ ] Cache system for synthesized audio

### 📅 Phase 3: Planned (Storage & Offline)
- [ ] IndexedDB storage layer
- [ ] Offline asset management
- [ ] Background sync
- [ ] Data persistence

### 📅 Phase 4: Planned (Testing & QA)
- [ ] Unit tests (90%+ coverage)
- [ ] Integration tests
- [ ] Performance benchmarks
- [ ] Security audit

### 📅 Phase 5: Planned (Release)
- [ ] APK optimization and signing
- [ ] CI/CD pipeline
- [ ] Documentation
- [ ] Beta distribution

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Java JDK**: 17 (for Android builds)
- **Android Studio**: Latest stable version
- **Android SDK**: API 26+ (Android 8.0+)

### Installation

```bash
# 1. Clone this repository
git clone https://github.com/your-org/asterics-grid-android.git
cd asterics-grid-android

# 2. Clone AsTeRICS-Grid source
git clone https://github.com/asterics/AsTeRICS-Grid.git ../asterics-grid

# 3. Install dependencies
npm install

# 4. Build AsTeRICS-Grid (from its directory)
cd ../asterics-grid
npm install
npm run build
cd ../asterics-grid-android

# 5. Build project
npm run build

# 6. Add Android platform
npm run capacitor:add

# 7. Sync with Android
npm run android:sync

# 8. Open in Android Studio
npm run android:open
```

### Development Workflow

```bash
# Run development server (web preview)
npm run dev

# Build for production
npm run build

# Sync changes to Android
npm run android:sync

# Run on Android device/emulator
npm run android:run

# Build release APK
npm run android:build
```

## 📁 Project Structure

```
asterics-grid-android/
├── android/                    # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/asterics/grid/
│   │   │   │   ├── tts/       # TTS Service (Phase 2)
│   │   │   │   ├── storage/   # Storage managers
│   │   │   │   └── utils/     # Utilities
│   │   │   ├── assets/
│   │   │   │   └── piper/     # WASM models (Phase 2)
│   │   │   └── res/
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   └── build.gradle.kts
├── src/                        # Web application
│   ├── js/
│   │   ├── service/
│   │   │   └── tts/           # TTS abstraction layer
│   │   ├── util/              # Utilities (Logger, ErrorHandler, etc.)
│   │   └── types/             # TypeScript definitions
│   ├── vue-components/
│   └── css/
├── scripts/                    # Build scripts
│   └── copy-asterics-grid.js
├── dist/                       # Build output (generated)
├── capacitor.config.ts         # Capacitor configuration
├── vite.config.ts              # Build configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# AsTeRICS-Grid source path (optional)
ASTERICS_GRID_PATH=../asterics-grid

# Build configuration
NODE_ENV=production

# Android keystore (for release builds)
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=release
KEY_PASSWORD=your_key_password
```

### Android Signing

For release builds, create `android/keystore.properties`:

```properties
storeFile=/path/to/your/keystore.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## 📊 Performance Metrics

### Current Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Memory Usage | < 150MB | < 200MB |
| TTS Latency | < 300ms | < 1000ms |
| App Launch Time | < 2s | < 5s |
| APK Size | < 120MB | < 150MB |
| CPU Usage | < 50% | < 80% |
| Battery Impact | < 5%/hour | < 10%/hour |

### Monitoring

```bash
# Generate performance report
npm run analyze

# Profile memory usage
npm run profile:memory

# Benchmark TTS synthesis
npm run benchmark:tts
```

## 🔐 Security

### Code Obfuscation

Release builds use ProGuard/R8 for:
- Code obfuscation
- Resource shrinking
- Optimization

### Certificate Pinning

Configured in `capacitor.config.ts` for API endpoints.

### Permissions

Minimal permissions requested:
- `INTERNET` - Optional, for future features
- `ACCESS_NETWORK_STATE` - Network status
- `MODIFY_AUDIO_SETTINGS` - TTS playback

## 📝 Code Quality Standards

### TypeScript

- Strict mode enabled
- Null-safety enforced
- No `any` types allowed
- Explicit return types required

### Kotlin

- Kotlin 1.9+
- Coroutines for async operations
- Null-safety by default
- Immutability preferred

### Documentation

- JSDoc/TSDoc for all public APIs
- KDoc for Kotlin code
- Inline comments for complex logic
- Architecture decision records (ADRs)

## 🐛 Troubleshooting

### Common Issues

#### Build fails with "AsTeRICS-Grid not found"

```bash
# Set the path to AsTeRICS-Grid
export ASTERICS_GRID_PATH=/path/to/asterics-grid

# Or place it in ../asterics-grid relative to project
```

#### Android Studio sync fails

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android:sync
```

#### WebView not loading

- Check `android/app/src/main/AndroidManifest.xml` permissions
- Verify Capacitor configuration in `capacitor.config.ts`
- Check Chrome DevTools for JavaScript errors

#### Out of memory during build

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make changes following code standards
4. Add tests for new features
5. Run linting and tests
6. Submit a pull request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add Piper TTS integration
fix: Resolve memory leak in audio playback
docs: Update README with installation steps
test: Add unit tests for TTS service
perf: Optimize WASM loading
```

## 📄 License

This project is licensed under GPL-3.0 - see the LICENSE file for details.

AsTeRICS-Grid is licensed under AGPL-3.0.

## 🔗 Resources

- [AsTeRICS-Grid](https://github.com/asterics/AsTeRICS-Grid)
- [Piper TTS](https://github.com/rhasspy/piper)
- [Capacitor](https://capacitorjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Kotlin](https://kotlinlang.org/)

## 📞 Support

For issues and questions:
- GitHub Issues: [Open an issue](https://github.com/your-org/asterics-grid-android/issues)
- Email: support@asterics-grid.com

## 🗓️ Roadmap

### Version 1.0 (Current)
- Core AsTeRICS-Grid functionality
- Mock TTS for development
- Basic Android integration

### Version 1.1 (Q2 2024)
- Piper TTS integration
- Offline voice synthesis
- Performance optimizations

### Version 1.2 (Q3 2024)
- Multiple language support
- Custom voice models
- Advanced settings

### Version 2.0 (Q4 2024)
- Cloud sync (optional)
- User authentication
- Analytics and telemetry

---

**Built with ❤️ for accessibility and independence**