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
        <input type="text" id="serverUrl" value="http://192.168.1.100:5000" style="width: 100%; padding: 8px;">
        <button id="setServer" style="margin-top: 5px; padding: 8px 16px;">Установить</button>
      </div>
      
      <div style="margin: 20px 0;">
        <label>Введи слова (через пробел):</label><br>
        <input type="text" id="wordsInput" value="Я обниматься мама папа" style="width: 100%; padding: 8px;">
      </div>
      
      <button id="speakBtn" style="padding: 10px 20px; font-size: 16px; background: #2196F3; color: white; border: none; cursor: pointer;">
        🔊 Озвучить
      </button>
      
      <div id="status" style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
        Готов к работе
      </div>
    </div>
  `;

  const serverUrlInput = document.getElementById('serverUrl') as HTMLInputElement;
  const setServerBtn = document.getElementById('setServer');
  const wordsInput = document.getElementById('wordsInput') as HTMLInputElement;
  const speakBtn = document.getElementById('speakBtn');
  const statusDiv = document.getElementById('status');

  function updateStatus(msg: string, isError = false): void {
    if (statusDiv) {
      statusDiv.textContent = msg;
      statusDiv.style.background = isError ? '#ffebee' : '#e8f5e9';
    }
  }

  // Установка URL сервера
  setServerBtn?.addEventListener('click', () => {
    const url = serverUrlInput.value.trim();
    nlpClient.setServerUrl(url);
    updateStatus(`Сервер установлен: ${url}`);
  });

  // Озвучивание
  speakBtn?.addEventListener('click', async () => {
    try {
      updateStatus('Инициализация...');
      
      const tts = await TTSServiceFactory.getInstance();
      
      const text = wordsInput.value.trim();
      const words = text.split(/\s+/).filter(w => w.length > 0);
      
      updateStatus(`Генерация речи для: ${words.join(', ')}...`);
      
      const result = await tts.synthesize({ text });
      
      updateStatus('Воспроизведение...');
      
      await tts.play(result, {
        onEnd: () => updateStatus('✅ Готово!'),
        onError: (err) => updateStatus(`❌ Ошибка: ${err.message}`, true),
      });
      
    } catch (error) {
      logger.error('Test failed', error);
      updateStatus(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  });
}

// Запуск при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void testTTS());
} else {
  void testTTS();
}
