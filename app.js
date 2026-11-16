/* 知因 · Sequential learning demo. Answers remain in the current browser. */
'use strict';
const { layers, validateLayer, gradeEssay, countRelations, resolvePage, firstUnfinishedLayer } = HistoryLogic;
const KEY = 'zhiyin-history-v1';
const fresh = () => ({ version: 2, page: 'pre', preText: '', postText: '', pre: null, post: null, skippedPre: false, skippedPost: false, skippedTraining: false, skippedLinks: false, trainingFinished: false, active: 0, items: layers.map(() => ({ text: '', hints: 0, ok: false, skipped: false, attempts: [], feedback: null })), methodHints: { pre: 0, post: 0, connections: 0 }, links: ['', '', '', ''], trained: false });
let storageAvailable = true;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    if (![1, 2].includes(data.version) || !['pre', 'canvas', 'post', 'report'].includes(data.page) || !Array.isArray(data.items) || data.items.length !== 5 || !data.items.every(item => typeof item.text === 'string' && [0, 1, 2].includes(item.hints) && Array.isArray(item.attempts)) || !Array.isArray(data.links) || data.links.length !== 4 || !data.links.every(x => typeof x === 'string') || typeof data.preText !== 'string' || typeof data.postText !== 'string') return fresh();
    const base = fresh();
    base.preText = data.preText; base.postText = data.postText;
    base.pre = data.pre ? gradeEssay(data.preText) : null; base.post = data.post ? gradeEssay(data.postText) : null;
    for (const key of ['skippedPre', 'skippedPost', 'skippedTraining', 'skippedLinks', 'trainingFinished']) base[key] = !!data[key];
    for (const key of Object.keys(base.methodHints)) if ([0, 1, 2].includes(data.methodHints?.[key])) base.methodHints[key] = data.methodHints[key];
    base.items = data.items.map((item, i) => ({ text: item.text, hints: item.hints, ok: !!item.ok && validateLayer(i, item.text).ok, skipped: !!item.skipped, attempts: item.attempts, feedback: null }));
    base.links = data.links; base.trained = !!data.trained && base.items.every(item => item.ok) && base.links.every(x => countRelations(x) > 0); base.trainingFinished ||= base.trained;
    const first = firstUnfinishedLayer(base.items);
    base.active = Number.isInteger(data.active) && data.active >= 0 ? Math.min(data.active, first) : first;
    if (data.version === 1) base.active = first;
    base.page = resolvePage(base, data.page); return base;
  } catch { storageAvailable = false; return fresh(); }
}
let state = load();
let saveTimer, toastTimer, resetArmed = false, hintsOpen = false;
const main = document.getElementById('main');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const rubricNames = ['区分根本原因与直接诱因', '事件时序与先后关系', '阐明因果传导关系'];
const showScore = result => result && result.total !== null ? result.total : '待复核';
const dimension = (result, i) => !result ? '未完成' : result.dimensions[i] === null ? '待复核' : result.dimensions[i];
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { if (storageAvailable) toast('浏览器暂不能保存记录，本次仍可继续学习。'); storageAvailable = false; } }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4500); }
const voice = createVoiceInput({
  Recognition: window.SpeechRecognition || window.webkitSpeechRecognition,
  onText(id, text) { const field = document.getElementById(id); if (!field) return; field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end'); field.dispatchEvent(new Event('input', { bubbles: true })); },
  onStatus(id, text, active) {
    const status = document.getElementById(`voice-status-${id}`), button = document.querySelector(`[data-voice="${id}"]`);
    if (status) status.textContent = text;
    if (button) { button.setAttribute('aria-pressed', String(active)); button.classList.toggle('listening', active); button.querySelector('span').textContent = active ? '停止输入' : '语音输入'; }
  },
  onPreview(id, text) { const el = document.getElementById(`voice-preview-${id}`); if (el) { el.textContent = text ? `正在识别：${text}` : ''; el.hidden = !text; } }
});
function voiceControls(id) {
  return `<div class="voice-toolbar"><button type="button" class="voice-button" data-voice="${id}" aria-pressed="false" aria-describedby="voice-status-${id}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg><span>语音输入</span></button><span class="voice-status" id="voice-status-${id}" role="status">用普通话说出你的想法</span></div><p class="voice-preview" id="voice-preview-${id}" hidden></p>`;
}
function go(page) { voice.cancel(); hintsOpen = false; state.page = resolvePage(state, page); save(); render(); main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
const methodHints = {
  pre: ['先想一想：哪些是长期积累的背景，哪些是眼前发生的事件？用你已知的内容开始。', '可以按“背景 → 矛盾 → 事件 → 战争 → 影响”组织作答。每一步尝试说明上一项如何推动下一项，不必使用固定措辞。'],
  post: ['先判断题中的说法，再分别解释长期动因与具体事件的作用。', '想想：如果没有这一个具体事件，长期矛盾是否仍然存在？用完整的传导关系支持你的判断，再检查先后关系。'],
  connections: ['不要只重复两端的名词，试着说清中间发生了什么变化。', '每段可按“A 带来了什么需求或压力 → 谁作出什么反应 → B 怎样出现”说明；也可以用自己的句式。']
};
function currentHint() {
  if (state.page === 'canvas' && state.active < 5) return { owner: state.items[state.active], key: 'hints', texts: layers[state.active].hints, type: '思考线索' };
  const key = state.page === 'canvas' ? 'connections' : state.page;
  return { owner: state.methodHints, key, texts: methodHints[key], type: '作答方法' };
}
function hintPanel() {
  const hint = currentHint(), used = hint.owner[hint.key];
  if (!hintsOpen) return '<section class="page-hints" id="page-hints" aria-label="当前题目提示" hidden></section>';
  return `<section class="page-hints" id="page-hints" aria-label="当前题目提示">${hint.texts.slice(0, used).map((text, i) => `<div class="hint-box"><strong>${i === 0 ? '一级 · 轻提示' : '二级 · 深提示'} <span>${hint.type}</span></strong>${text}</div>`).join('')}${used < 2 ? '<button class="hint-button hint-next" data-action="deepen-hint">再看深提示 →</button>' : ''}</section>`;
}
function hintButtonText() { const hint = currentHint(); return `${hintsOpen ? '收起提示' : '提示'} <span>${hint.owner[hint.key]}/2</span>`; }
function updateHints() {
  document.getElementById('page-hints').outerHTML = hintPanel();
  const button = document.querySelector('[data-action="toggle-hints"]');
  button.innerHTML = hintButtonText(); button.setAttribute('aria-expanded', String(hintsOpen));
}
const pageHeader = (eyebrow, title, intro, meta) => `<div class="page-top"><span class="eyebrow">${eyebrow}</span><div class="page-tools"><span class="quiet-meta">${meta}</span>${state.page !== 'report' ? `<button class="hint-button header-hint" data-action="toggle-hints" aria-controls="page-hints" aria-expanded="${hintsOpen}">${hintButtonText()}</button><button class="skip-button" data-action="skip-stage" aria-label="跳过当前阶段">跳过 <span aria-hidden="true">↗</span></button>` : ''}</div></div><h2 class="page-heading">${title}</h2><p class="intro">${intro}</p>${state.page !== 'report' ? hintPanel() : ''}`;
const footer = () => `<div class="bottom-caption"><span>知其然，也知其所以然。</span><span>${storageAvailable ? '文字记录仅保存在当前浏览器' : '本次记录未持久保存'} · 教学演示版</span></div>`;
function rubric() { return `<div class="rubric-strip">${rubricNames.map((name, i) => `<div class="rubric-item"><strong>${name}</strong><span>${[4, 3, 3][i]}<small> 分</small></span></div>`).join('')}</div>`; }
function essayActions(mode) {
  const result = state[mode], pre = mode === 'pre';
  if (!result) return `<div class="test-bottom"><p class="quiet-meta">意思表达清楚即可，不必照搬课本原句。</p><button class="button" data-action="submit-${mode}">提交${pre ? '前测' : '后测'} <span aria-hidden="true">→</span></button></div>`;
  return `<section class="result-inline" aria-label="参考评分"><h3>${result.total === null ? '部分维度待复核，暂不计算总分' : `参考得分 ${result.total} / 10`} <span class="quiet-meta">· 语义规则辅助</span></h3><p>${result.dimensions.map((n, i) => `${['层级', '时序', '传导'][i]} ${n === null ? '待复核' : n + '/' + [4, 3, 3][i]}`).join('　·　')}</p><p>${pre ? '保留你的初始想法，接下来逐层追问。' : '作答已保存，接下来回看这次学习。'}</p><div class="result-actions"><button class="button small" data-action="continue-essay">${pre ? '开始推演' : '查看学习回顾'} →</button>${pre && result.total !== null && result.total >= 8 ? '<button class="button secondary small" data-action="skip-training">跳过训练，进入后测</button>' : ''}</div></section>`;
}
function testPage(mode) {
  const pre = mode === 'pre';
  const question = pre ? '请梳理第一次鸦片战争爆发的因果逻辑链条，说明哪些深层因素、中间矛盾、直接事件，最终导致战争爆发与后续影响，并写出各要素之间的推动关系。' : '有人说：“虎门销烟是鸦片战争爆发的根本原因。”这个说法是否正确？请结合历史因果逻辑，层层梳理并论证你的观点，写出完整的因果链条。';
  return pageHeader(pre ? 'BEFORE LEARNING / 前测' : 'TRANSFER / 后测', pre ? '战争，为什么会发生？' : '换个角度，还能推导吗？', pre ? '先用自己的语言，连接你已知的历史。暂时想不出来也没关系，可以选择跳过。' : '离开填空的提示，重新组织你的论证。试着把事件、矛盾与时代背景连接起来。', '主观简答 · 满分 10 分') + `<div class="divider"></div><section class="prompt-card" aria-label="${pre ? '前测' : '后测'}题目"><p class="prompt-caption">${pre ? '写下你的初始理解' : '请论证，而不只给判断'}</p><p class="prompt-text">${question}</p></section>${rubric()}<div class="answer-head"><label for="essay">${pre ? '我的初始思考' : '我的完整论证'}</label><span id="word-count">${state[mode + 'Text'].length} 字 · 不限字数</span></div><textarea id="essay" data-mode="${mode}" placeholder="${pre ? '你可以从最熟悉的一个事件出发，试着写下：因为……，所以……，进而……' : '先作出判断，再说明根本动因如何逐层推动冲突，最终转化为战争。'}">${esc(state[mode + 'Text'])}</textarea>${voiceControls('essay')}<p class="field-feedback" id="essay-error" role="status"></p><div id="essay-actions">${essayActions(mode)}</div><p class="under-note">参考评分不要求固定措辞。无法可靠判断的表述留待复核，不直接按错误扣分。</p>${footer()}`;
}
function layerCard(i) {
  const layer = layers[i], item = state.items[i];
  return `<section class="layer-card current ${item.ok ? 'correct' : ''}" id="layer-${i}"><div class="layer-head"><div class="layer-name"><div><h3>${layer.title}</h3><small>${layer.subtitle}</small></div></div><span class="layer-status">${item.ok ? '✓ 已通过' : '当前探索'}</span></div><div class="layer-body"><label class="layer-question" for="layer-input-${i}">${layer.question}</label><textarea id="layer-input-${i}" data-layer-input="${i}" placeholder="写下你的理解，也可以点击麦克风直接说。">${esc(item.text)}</textarea>${voiceControls(`layer-input-${i}`)}<div class="layer-actions"><span class="quiet-meta">需要线索？点击顶部的“提示”。</span><div id="layer-check-action">${layerCheckAction(i)}</div></div><p class="field-feedback ${item.feedback?.ok ? 'success' : ''}" role="status" id="layer-feedback">${item.feedback ? esc(item.feedback.message) : ''}</p></div></section><div class="layer-bottom"><p class="quiet-meta">检验通过后继续；暂时没有思路也可以跳过。</p><button class="text-button" data-action="skip-layer">跳过这一层 <span aria-hidden="true">→</span></button></div>`;
}
function layerCheckAction(i) { return state.items[i].ok ? '<button class="button small" data-action="next-layer">继续推导 →</button>' : `<button class="button small" data-check="${i}">检验这一层 →</button>`; }
function canvasPage() {
  if (state.active === 5) return connections();
  const resolved = state.items.filter(item => item.ok || item.skipped).length;
  return pageHeader('REASONING CANVAS / 推演画布', '沿着事件，向深处追问。', '每次专注一层，先写下理解，再检验自己的因果定位。后面的内容会随推演逐步展开。', '自主推演 · 阶梯提示') + `<div class="progress-summary"><span>已探索 ${resolved} 层</span><div class="progress-track" role="progressbar" aria-label="五层推演进度" aria-valuenow="${resolved}" aria-valuemin="0" aria-valuemax="5"><div class="progress-fill" style="width:${resolved * 20}%"></div></div></div>${layerCard(state.active)}${footer()}`;
}
function connections() {
  const names = [['深层动因', '贸易矛盾'], ['贸易矛盾', '国内危机'], ['国内危机', '禁烟行动'], ['禁烟冲突', '战争爆发']];
  const skipped = state.items.filter(item => item.skipped).length;
  return pageHeader('CONNECT THE DOTS / 连接因果', '把理解，连成一条因果链。', `从深层向事件复述，用自己的话说明“为什么 A 会推动 B”。${skipped ? `有 ${skipped} 层曾被跳过，可先按现有理解继续。` : ''}`, '从要素，到推动关系') + `<div class="divider"></div><section>${names.map(([a, b], i) => `<div class="connection"><label for="link-${i}">${a} <span aria-hidden="true">→</span> ${b}</label><textarea id="link-${i}" data-link="${i}" placeholder="说清两端的具体内容，以及它们如何相互推动。">${esc(state.links[i])}</textarea>${voiceControls(`link-${i}`)}</div>`).join('')}<p id="links-error" class="field-feedback" role="status"></p><div class="finish-row"><p class="quiet-meta">不必使用固定连接词，只要推动关系清楚。</p><button class="button" data-action="finish-training">完成推演，进入后测 →</button></div></section>${footer()}`;
}
function reportPage() {
  const before = state.pre, after = state.post;
  const comparable = before && after && before.total !== null && after.total !== null;
  const delta = comparable ? after.total - before.total : null;
  const difference = n => n > 0 ? `+${n}` : String(n);
  const hints = state.items.reduce((n, item) => n + item.hints, 0);
  const title = delta === null ? '每一次思考，都有迹可循。' : delta > 0 ? `比起最初，前进了 ${delta} 分。` : delta === 0 ? '得分相同，再看看论证的质量。' : '回到薄弱的环节，再推导一次。';
  return pageHeader('REFLECTION / 学习回顾', '从记住事件，到理解因果。', !before || !after ? '本次有测验被跳过或未提交，保留为未完成，不计零分，也不计算提升。' : !comparable ? '有维度无法可靠判断，保留原文等待复核，暂不计算总分变化。' : '不同设问，同一套评分维度。看看你的论述在哪里变得更清晰。', '语义规则辅助 · 可由教师复核') + `<div class="result-hero"><div><p>${delta === null ? '本次学习记录' : '参考总分变化'}</p><h2>${title}</h2><p>${state.skippedTraining ? '本次选择跳过部分或全部推演' : `通过 ${state.items.filter(x => x.ok).length} 层 · 跳过 ${state.items.filter(x => x.skipped).length} 层 · 使用 ${hints} 次提示`}</p></div><div class="score-pair"><div><div class="score-label">前测</div><span class="score ${before?.total === null ? 'pending-score' : ''}">${before ? showScore(before) : '—'}<small>${before && before.total !== null ? '/10' : ''}</small></span></div><span class="score-arrow" aria-hidden="true">→</span><div><div class="score-label">后测</div><span class="score ${after?.total === null ? 'pending-score' : ''}">${after ? showScore(after) : '—'}<small>${after && after.total !== null ? '/10' : ''}</small></span></div></div></div><table class="score-table"><caption class="quiet-meta">同维度参考评分对照</caption><thead><tr><th scope="col">评分维度</th><th scope="col">前测</th><th scope="col">后测</th><th scope="col">变化</th></tr></thead><tbody>${rubricNames.map((name, i) => { const a = before?.dimensions[i], b = after?.dimensions[i]; return `<tr><th scope="row">${name}（${[4, 3, 3][i]} 分）</th><td>${dimension(before, i)}</td><td>${dimension(after, i)}</td><td class="delta">${typeof a === 'number' && typeof b === 'number' ? difference(b - a) : '—'}</td></tr>`; }).join('')}</tbody></table>${after ? `<section class="report-details"><h3>这次论证的识别结果</h3>${after.notes.map(note => `<p>${esc(note)}</p>`).join('')}</section>` : ''}<div class="notice">系统按概念含义、传导关系和时序证据辅助判断，不要求原句或指定连接词。开放表述仍可能超出算法覆盖范围；无法确定的维度标为待复核。可以导出原文和识别依据，由教师继续判断。</div><details class="report-details"><summary>回看我的两次作答</summary><p>前测${before ? '' : ' · 未提交'}</p><div class="answer-record">${esc(state.preText || '本次未作答，不计为 0 分。')}</div><p>后测${after ? '' : ' · 未提交'}</p><div class="answer-record">${esc(state.postText || '本次未作答，不计为 0 分。')}</div></details><details class="report-details"><summary>回看推演与提示使用情况</summary>${state.items.map((item, i) => `<p><strong>${layers[i].title}</strong> · ${item.ok ? '已通过' : item.skipped ? '已跳过' : '未完成'} · 提示 ${item.hints}/2 · 检验 ${item.attempts.length} 次</p><div class="answer-record">${esc(item.text || '本次未填写')}</div>`).join('')}</details><div class="report-footer"><button class="button" data-action="export">导出学习记录 ↓</button><button class="button secondary" data-action="review-post">${after ? '修改后测作答' : '补做后测'}</button></div>${footer()}`;
}
function render() {
  voice.cancel(); state.page = resolvePage(state, state.page);
  document.getElementById('current-stage').textContent = { pre: '当前 · 初始思考', canvas: state.active === 5 ? '当前 · 连接因果' : '当前 · 因果推演', post: '当前 · 迁移检验', report: '当前 · 学习回顾' }[state.page];
  main.innerHTML = state.page === 'pre' ? testPage('pre') : state.page === 'canvas' ? canvasPage() : state.page === 'post' ? testPage('post') : reportPage();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.voice) return voice.start(button.dataset.voice);
  if (button.dataset.action === 'toggle-hints' && state.page !== 'report') {
    const hint = currentHint();
    hintsOpen = !hintsOpen;
    if (hintsOpen && hint.owner[hint.key] === 0) { hint.owner[hint.key] = 1; save(); }
    voice.cancel(); updateHints();
    return;
  }
  if (button.dataset.action === 'deepen-hint' && state.page !== 'report' && hintsOpen) {
    const hint = currentHint();
    if (hint.owner[hint.key] !== 1) return;
    hint.owner[hint.key] = 2; save(); voice.cancel(); updateHints();
    document.querySelector('[data-action="toggle-hints"]').focus({ preventScroll: true });
    return;
  }
  if (button.dataset.check !== undefined) {
    const i = +button.dataset.check; if (state.page !== 'canvas' || state.active !== i) return;
    const item = state.items[i], result = validateLayer(i, item.text); item.ok = result.ok; item.skipped = false; item.feedback = result;
    item.attempts.push({ text: item.text, ok: result.ok, type: result.type, hintsUsed: item.hints, at: new Date().toISOString() }); save(); render();
    if (!result.ok && !['empty', 'review'].includes(result.type)) { document.getElementById('feedback-text').textContent = result.message; document.getElementById('feedback-dialog').showModal(); }
    else document.getElementById(`layer-input-${i}`).focus({ preventScroll: true }); return;
  }
  const action = button.dataset.action;
  if (action === 'skip-stage') {
    if (state.page === 'pre') { state.skippedPre = !state.pre; return go('canvas'); }
    if (state.page === 'canvas') { state.skippedTraining = true; if (state.active === 5) state.skippedLinks = true; return go('post'); }
    if (state.page === 'post') { state.skippedPost = !state.post; return go('report'); }
  }
  if (action === 'skip-layer' || action === 'next-layer') {
    if (state.page !== 'canvas' || state.active >= 5) return; const item = state.items[state.active];
    if (action === 'next-layer' && !item.ok) return;
    if (action === 'skip-layer' && !item.ok) item.skipped = true;
    state.active++; return go('canvas');
  }
  if (action === 'continue-essay' && state[state.page]) return go(state.page === 'pre' ? 'canvas' : 'report');
  if (action === 'skip-training' && state.pre?.total !== null && state.pre?.total >= 8) { state.skippedTraining = true; return go('post'); }
  if (action === 'review-post' && state.page === 'report') return go('post');
  if (action === 'submit-pre' || action === 'submit-post') {
    const mode = action.endsWith('pre') ? 'pre' : 'post'; if (state.page !== mode) return;
    if (!state[mode + 'Text'].trim()) { document.getElementById('essay-error').textContent = '先写下你的思考，再提交；暂时没有思路也可以点击上方“跳过”。'; document.getElementById('essay').focus(); return; }
    state[mode] = gradeEssay(state[mode + 'Text']); state[mode === 'pre' ? 'skippedPre' : 'skippedPost'] = false;
    save(); render(); document.querySelector('.result-inline').scrollIntoView({ block: 'nearest', behavior: 'instant' }); return;
  }
  if (action === 'finish-training') {
    if (state.page !== 'canvas' || state.active !== 5 || firstUnfinishedLayer(state.items) !== 5) return;
    const missing = state.links.findIndex(text => countRelations(text) === 0);
    if (missing >= 0) { document.getElementById('links-error').textContent = `第 ${missing + 1} 段的传导关系暂未识别。请补充两端的具体内容；若已完整，可用上方“跳过”保留原文待复核。`; document.getElementById(`link-${missing}`).focus(); return; }
    state.trainingFinished = true; state.trained = state.items.every(item => item.ok); state.skippedTraining = false; return go('post');
  }
  if (action === 'export' && state.page === 'report') {
    const record = { title: '知因 · 第一次鸦片战争学习记录', exportedAt: new Date().toISOString(), scoringNotice: '概念与关系规则辅助评分，无法确定的维度为 null，需复核；跳过不记零分。', pre: state.pre ? { answer: state.preText, ...state.pre } : null, post: state.post ? { answer: state.postText, ...state.post } : null, drafts: { pre: state.preText, post: state.postText }, methodHints: state.methodHints, skipped: { pre: state.skippedPre, training: state.skippedTraining, post: state.skippedPost, connections: state.skippedLinks }, layers: state.items.map((item, i) => ({ layer: layers[i].title, ...item })), connections: state.links };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = '知因-鸦片战争-学习记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('学习记录已导出，包含原文、识别依据与提示使用情况。');
  }
});
main.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'essay') { const mode = input.dataset.mode; state[mode + 'Text'] = input.value; if (state[mode]) { state[mode] = null; document.getElementById('essay-actions').innerHTML = essayActions(mode); } document.getElementById('word-count').textContent = `${input.value.length} 字 · 不限字数`; }
  if (input.dataset.layerInput !== undefined) { const i = +input.dataset.layerInput, item = state.items[i]; item.text = input.value; if (item.ok || item.feedback || item.skipped) { item.ok = false; item.skipped = false; item.feedback = null; state.trained = false; state.trainingFinished = false; document.getElementById(`layer-${i}`).classList.remove('correct'); document.querySelector('.layer-status').textContent = '待检验'; document.getElementById('layer-feedback').textContent = ''; document.getElementById('layer-check-action').innerHTML = layerCheckAction(i); } }
  if (input.dataset.link !== undefined) { state.links[+input.dataset.link] = input.value; state.trained = false; state.trainingFinished = false; }
  scheduleSave();
});
const dialog = document.getElementById('about-dialog');
document.getElementById('about-button').addEventListener('click', () => { voice.cancel(); resetArmed = false; document.getElementById('reset-help').textContent = ''; dialog.showModal(); });
document.getElementById('close-about').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.getElementById('reset-button').addEventListener('click', () => { if (!resetArmed) { resetArmed = true; document.getElementById('reset-help').textContent = '再次点击将清空本浏览器的学习记录。可先关闭此窗口导出记录。'; return; } voice.cancel(); clearTimeout(saveTimer); state = fresh(); hintsOpen = false; save(); dialog.close(); render(); toast('本机记录已清空，可以重新开始。'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) voice.cancel(); });
window.addEventListener('pagehide', () => { voice.cancel(); clearTimeout(saveTimer); save(); });
render();
