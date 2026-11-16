(function (scope) {
  'use strict';
  // Keep recognition lifecycle separate from fields, so stale events cannot edit another answer.
  function createVoiceInput({ Recognition, onText, onStatus, onPreview }) {
    let session = null;
    const errors = {
      'not-allowed': '无法使用麦克风。请在浏览器的网站设置中允许麦克风，再试一次。',
      'service-not-allowed': '浏览器未允许语音识别服务，请更换支持语音输入的浏览器。',
      'audio-capture': '没有找到可用的麦克风，请检查设备是否已连接或被其他程序占用。',
      'network': '语音服务连接失败，请检查网络后重试，也可使用键盘语音输入。',
      'no-speech': '没有听到清晰的语音，请靠近麦克风后重试。',
      'language-not-supported': '当前识别服务不支持普通话，请使用键盘语音输入。'
    };
    function cancel() {
      if (!session) return;
      const old = session;
      session = null;
      old.recognition.abort();
      onPreview(old.target, '');
      onStatus(old.target, '已停止语音输入。', false);
    }
    function start(target) {
      if (!Recognition) { onStatus(target, '当前浏览器暂不支持网页语音输入。可用 Chrome 或 Safari 重试，也可点手机键盘上的麦克风。', false); return; }
      if (session) {
        if (session.target === target) {
          if (!session.stopping) { session.stopping = true; onStatus(target, '正在结束识别…', true); session.recognition.stop(); }
          return;
        }
        cancel();
      }
      const recognition = new Recognition();
      const current = { recognition, target, seen: new Set(), heard: false, error: false, stopping: false };
      session = current;
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => { if (session === current && !current.stopping) onStatus(target, '正在听，请说普通话；说完后点击“停止输入”。', true); };
      recognition.onresult = event => {
        if (session !== current) return;
        let preview = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            if (!current.seen.has(i)) { current.seen.add(i); const text = result[0].transcript.trim(); if (text) { current.heard = true; onText(target, text); } }
          } else preview += result[0].transcript;
        }
        onPreview(target, preview);
      };
      recognition.onerror = event => {
        if (session !== current) return;
        current.error = true;
        onStatus(target, errors[event.error] || (event.error === 'aborted' ? '已停止语音输入。' : '语音识别未能完成，请重试或使用文字输入。'), false);
      };
      recognition.onend = () => {
        if (session !== current) return;
        session = null;
        onPreview(target, '');
        if (!current.error) onStatus(target, current.heard ? '语音已转为文字，可检查并修改。' : '本次未识别到文字，可以重试。', false);
      };
      onStatus(target, '正在启动，请允许浏览器使用麦克风…', true);
      try { recognition.start(); } catch { session = null; onStatus(target, '语音输入暂时无法启动，请重试或使用文字输入。', false); }
    }
    return { start, cancel };
  }
  scope.createVoiceInput = createVoiceInput;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createVoiceInput };
})(typeof window !== 'undefined' ? window : globalThis);
