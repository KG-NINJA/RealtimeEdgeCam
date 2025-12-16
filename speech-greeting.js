// 日本語コメント: Web Speech API を使った挨拶システム（重複挨拶を抑制）
(function () {
  'use strict';

  var GREETABLE_CLASSES = ['person', 'dog', 'cat', 'bird', 'horse', 'cow', 'elephant', 'bear'];
  var historyMs = 10 * 1000; // 10秒以内の重複を抑止
  var speakCooldownMs = 3000; // 3秒クールダウン
  var greetings = [
    'こんにちは！安全に進みます。',
    'やあ！周囲を確認しました。',
    'Hello, nice to meet you.',
    'Hi there, I see you.',
    'こんにちは、通路を確保します。',
    'Greetings, path is being checked.',
  ];

  var speech = {
    enabled: false,
    speaking: false,
    lastSpokenAt: 0,
    history: {},
  };

  function pickGreeting() {
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  function canSpeak(now) {
    return speech.enabled && (now - speech.lastSpokenAt) >= speakCooldownMs;
  }

  function say(text) {
    if (!window.speechSynthesis) return;
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = Math.random() < 0.5 ? 'ja-JP' : 'en-US';
    utter.onstart = function () { speech.speaking = true; };
    utter.onend = function () { speech.speaking = false; };
    speech.speaking = true;
    window.speechSynthesis.speak(utter);
  }

  function toggleSpeech() {
    speech.enabled = !speech.enabled;
    if (!speech.enabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function testGreeting() {
    var now = performance.now();
    if (!canSpeak(now)) return;
    speech.lastSpokenAt = now;
    say(pickGreeting());
  }

  // 日本語コメント: COCO-SSDの最新クラスを参照し、対象を検出したら挨拶
  function autoGreetDetection() {
    var now = performance.now();
    if (!canSpeak(now)) return;
    var st = window.state || {};
    var cls = (st.mlLastClass || '').toLowerCase();
    if (!cls || GREETABLE_CLASSES.indexOf(cls) === -1) return;
    var last = speech.history[cls] || 0;
    if (now - last < historyMs) return;
    speech.history[cls] = now;
    speech.lastSpokenAt = now;
    say(pickGreeting());
  }

  window.addEventListener('keydown', function (ev) {
    if (ev.code === 'KeyH') {
      ev.preventDefault();
      toggleSpeech();
    } else if (ev.code === 'KeyT') {
      ev.preventDefault();
      testGreeting();
    }
  });

  window.speech = speech;
  window.speak = say;
  window.autoGreetDetection = autoGreetDetection;
})();
