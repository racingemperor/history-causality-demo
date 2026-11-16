const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createVoiceInput } = require('./voice.js');
function setup(supported = true) {
  const calls = [], sessions = [];
  class Recognition { constructor() { sessions.push(this); } start() { this.onstart(); } stop() { this.stopped = true; } abort() { this.aborted = true; this.onend(); } }
  const voice = createVoiceInput({ Recognition: supported ? Recognition : null, onText: (...args) => calls.push(['text', ...args]), onStatus: (...args) => calls.push(['status', ...args]), onPreview: (...args) => calls.push(['preview', ...args]) });
  return { voice, calls, sessions };
}
test('interim text is previewed, final text is committed once', () => {
  const { voice, calls, sessions } = setup(); voice.start('answer');
  const interim = Object.assign([{transcript:'工业'}], {isFinal:false});
  const final = Object.assign([{transcript:'工业革命'}], {isFinal:true});
  sessions[0].onresult({resultIndex:0,results:[interim]});
  assert.equal(calls.filter(x => x[0] === 'text').length, 0);
  sessions[0].onresult({resultIndex:0,results:[final]}); sessions[0].onresult({resultIndex:0,results:[final]});
  assert.deepEqual(calls.filter(x => x[0] === 'text'), [['text','answer','工业革命']]);
});
test('stopping accepts the final result but changing fields rejects stale callbacks', () => {
  const { voice, calls, sessions } = setup(); voice.start('first'); voice.start('first');
  assert.equal(sessions[0].stopped, true);
  sessions[0].onresult({resultIndex:0,results:[Object.assign([{transcript:'白银外流'}],{isFinal:true})]});
  voice.start('second'); assert.equal(sessions[0].aborted, true);
  sessions[0].onresult({resultIndex:0,results:[Object.assign([{transcript:'旧结果'}],{isFinal:true})]});
  assert.equal(calls.filter(x => x[0] === 'text').length, 1);
});
test('permission errors are explained and never inserted into the answer', () => {
  const { voice, calls, sessions } = setup(); voice.start('answer'); sessions[0].onerror({error:'not-allowed'}); sessions[0].onend();
  assert.match(calls.filter(x => x[0] === 'status').at(-1)[2], /允许麦克风/);
  assert.equal(calls.filter(x => x[0] === 'text').length, 0);
});
test('unsupported browsers provide a usable fallback', () => {
  const { voice, calls } = setup(false); voice.start('answer');
  assert.match(calls.at(-1)[2], /键盘上的麦克风/);
});
