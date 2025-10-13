/**
 * Тестовая страница для TTS
 */

import { TTSServiceFactory } from './service/tts/TTSService';
import { nlpClient } from './service/api/NLPClient';
import { createLogger } from './util/Logger';

const logger = createLogger('TestTTS');

async function testTTS(): Promise<void> {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;

  appDiv.innerHTML = `
    <div style="padding: 20px; font-family: Arial; max-width: 600px;">
      <h1>🎤 TTS Тест</h1>
      
      <div style="margin: 20px 0;">
        <label>IP сервера:</label><br>
        <input type="text" id="serverUrl" value="http://192.168.0.104:5000" style="width: 100%; padding: 8px;">
        <button id="setServer" style="margin-top: 5px; padding: 8px 16px;">Установить</button>
        <button id="testServer" style="margin-top: 5px; padding: 8px 16px; background: #4CAF50; color: white; border: none;">Тест сервера</button>
      </div>
      
      <div style="margin: 20px 0;">
        <label>Введи слова (через пробел):</label><br>
        <input type="text" id="wordsInput" value="Я обниматься мама папа" style="width: 100%; padding: 8px;">
      </div>
      
      <button id="speakBtn" style="padding: 10px 20px; font-size: 16px; background: #2196F3; color: white; border: none; cursor: pointer;">
        🔊 Озвучить
      </button>
      
      <div id="status" style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 400px; overflow-y: auto;">
        Готов к работе
      </div>
      
      <div id="logs" style="margin-top: 20px; padding: 10px; background: #263238; color: #aed581; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 11px; max-height: 300px; overflow-y: auto;">
        === ЛОГИ ===
      </div>
    </div>
  `;

  const serverUrlInput = document.getElementById('serverUrl') as HTMLInputElement;
  const setServerBtn = document.getElementById('setServer');
  const testServerBtn = document.getElementById('testServer');
  const wordsInput = document.getElementById('wordsInput') as HTMLInputElement;
  const speakBtn = document.getElementById('speakBtn');
  const statusDiv = document.getElementById('status');
  const logsDiv = document.getElementById('logs');

  function addLog(msg: string): void {
    const timestamp = new Date().toLocaleTimeString();
    if (logsDiv) {
      logsDiv.textContent += `\n[${timestamp}] ${msg}`;
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
    console.log(msg);
  }

  function updateStatus(msg: string, isError = false): void {
    if (statusDiv) {
      statusDiv.textContent = msg;
      statusDiv.style.background = isError ? '#ffebee' : '#e8f5e9';
    }
    addLog(msg);
  }

  // Добавляем глобальный обработчик ошибок
  window.addEventListener('error', (e) => {
    addLog(`🔴 GLOBAL ERROR: ${e.message} at ${e.filename}:${e.lineno}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    addLog(`🔴 UNHANDLED REJECTION: ${e.reason}`);
  });

  // Установка URL сервера
  setServerBtn?.addEventListener('click', () => {
    const url = serverUrlInput.value.trim();
    nlpClient.setServerUrl(url);
    updateStatus(`Сервер установлен: ${url}`);
  });

  // Тест подключения к серверу
  testServerBtn?.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    addLog(`🔍 Тестирую подключение к ${url}...`);
    
    try {
      updateStatus('Проверка /health...');
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      addLog(`📡 Статус ответа: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        updateStatus(`❌ Сервер вернул ${response.status}`, true);
        return;
      }
      
      const data = await response.json();
      addLog(`✅ Ответ сервера: ${JSON.stringify(data, null, 2)}`);
      updateStatus(`✅ Сервер работает! Model: ${data.model || 'unknown'}`);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      addLog(`❌ Ошибка подключения: ${err.name} - ${err.message}`);
      addLog(`Stack: ${err.stack}`);
      updateStatus(`❌ Не могу подключиться: ${err.message}`, true);
    }
  });

  // Озвучивание
  speakBtn?.addEventListener('click', async () => {
    try {
      addLog('🎤 Начинаю озвучивание...');
      updateStatus('Инициализация TTS...');
      
      addLog('📦 Создаю TTS сервис...');
      const tts = await TTSServiceFactory.getInstance();
      addLog('✅ TTS сервис создан');
      
      const text = wordsInput.value.trim();
      const words = text.split(/\s+/).filter(w => w.length > 0);
      
      addLog(`📝 Слова для озвучки: ${words.join(', ')}`);
      updateStatus(`Генерация речи для: ${words.join(', ')}...`);
      
      addLog('🔊 Синтезирую речь...');
      const result = await tts.synthesize({ text });
      addLog(`✅ Речь синтезирована. Размер: ${result.audioData.byteLength} bytes`);
      
      updateStatus('Воспроизведение...');
      
      await tts.play(result, {
        onEnd: () => {
          addLog('✅ Воспроизведение завершено');
          updateStatus('✅ Готово!');
        },
        onError: (err) => {
          addLog(`❌ Ошибка воспроизведения: ${err.message}`);
          updateStatus(`❌ Ошибка: ${err.message}`, true);
        },
      });
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Test failed', err);
      addLog(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${err.name} - ${err.message}`);
      addLog(`Stack: ${err.stack}`);
      updateStatus(`❌ Ошибка: ${err.message}`, true);
    }
  });

  // Логируем старт приложения
  addLog('🚀 Приложение запущено');
  addLog(`📱 UserAgent: ${navigator.userAgent}`);
  addLog(`🌐 URL: ${window.location.href}`);
  addLog(`🔌 Сервер по умолчанию: http://192.168.0.104:5000`);
}

// Запуск при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void testTTS());
} else {
  void testTTS();
}
