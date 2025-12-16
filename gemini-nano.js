// 日本語コメント: Chrome Prompt API (Gemini Nano) 統合（存在チェック付き）
(function () {
  'use strict';

  var gemini = {
    ready: false,
    lastError: null,
    model: null,
  };

  async function initGeminiNano() {
    try {
      if (!window.ai || !window.ai.languageModel) {
        throw new Error('Prompt API unavailable');
      }
      if (gemini.ready && gemini.model) return gemini.model;
      gemini.model = await window.ai.languageModel.create();
      gemini.ready = true;
      gemini.lastError = null;
      console.log('[GeminiNano] initialized');
      return gemini.model;
    } catch (err) {
      gemini.lastError = err;
      gemini.ready = false;
      console.log('[GeminiNano] init error', err);
      return null;
    }
  }

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'KeyG') {
      ev.preventDefault();
      initGeminiNano();
    }
  });

  window.gemini = gemini;
  window.initGeminiNano = initGeminiNano;
})();
