/**
 * Адаптер для замены TTS в AsTeRICS-Grid на наш ServerTTS
 */

// Ждём загрузки AsTeRICS-Grid
window.addEventListener('load', async () => {
  if (!window.ASTERICS_GRID_ANDROID) return;
  
  // Импортируем наш TTS
  const { TTSServiceFactory } = await import('./service/tts/TTSService');
  const { nlpClient } = await import('./service/api/NLPClient');
  
  // Устанавливаем URL сервера
  if (window.SERVER_TTS_URL) {
    nlpClient.setServerUrl(window.SERVER_TTS_URL);
  }
  
  // Получаем TTS сервис
  const tts = await TTSServiceFactory.getInstance();
  
  // Monkey-patch для AsTeRICS-Grid
  // Ищем их TTS объект и заменяем
  if (window.speechSynthesis) {
    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    
    window.speechSynthesis.speak = function(utterance) {
      // Перехватываем вызов и используем наш TTS
      tts.synthesize({ text: utterance.text })
        .then(result => tts.play(result))
        .catch(err => {
          console.error('ServerTTS failed, falling back', err);
          originalSpeak(utterance); // Fallback
        });
    };
  }
});