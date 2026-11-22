/* 知因 · Sequential learning demo. Answers remain in the current browser. */
'use strict';
const { layers, hasAnswerContent, validateLayer, gradeEssay, gradeConnection, resolvePage, firstUnfinishedLayer, referenceAnswers } = HistoryLogic;
const { submitAttempt, revealAnswer, revealAfterPost, scoreLayer } = HistoryPractice;
const fresh = () => HistoryPractice.createSession(layers);
let state = fresh();
let toastTimer, resetArmed = false, hintsOpen = false;
const main = document.getElementById('main');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const rubricNames = ['区分根本原因与直接诱因', '事件时序与先后关系', '阐明因果传导关系'];
const showScore = result => result.total;
const dimension = (result, i) => result ? result.dimensions[i] : '未完成';
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
function go(page) { voice.cancel(); hintsOpen = false; state.page = resolvePage(state, page); render(); main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
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
const pageHeader = (eyebrow, title, intro, meta) => `<div class="page-top"><span class="eyebrow">${eyebrow}</span><div class="page-tools"><span class="quiet-meta">${meta}</span>${['pre', 'canvas', 'post'].includes(state.page) ? `<button class="hint-button header-hint" data-action="toggle-hints" aria-controls="page-hints" aria-expanded="${hintsOpen}">${hintButtonText()}</button><button class="skip-button" data-action="skip-stage" aria-label="跳过当前阶段">跳过 <span aria-hidden="true">↗</span></button>` : ''}</div></div><h2 class="page-heading">${title}</h2><p class="intro">${intro}</p>${['pre', 'canvas', 'post'].includes(state.page) ? hintPanel() : ''}`;
const footer = () => '<div class="bottom-caption"><span>知其然，也知其所以然。</span><span>刷新后重新开始第一遍作答 · 教学演示版</span></div>';
function rubric() { return `<div class="rubric-strip">${rubricNames.map((name, i) => `<div class="rubric-item"><strong>${name}</strong><span>${[4, 3, 3][i]}<small> 分</small></span></div>`).join('')}</div>`; }
function stageNavigation(backAction, backLabel, skipLabel) {
  return `<div class="layer-bottom stage-bottom"><p class="quiet-meta">返回或跳过会保留已填写的内容。</p><div class="layer-nav"><button type="button" class="button secondary small previous-layer" data-action="${backAction}"><span aria-hidden="true">←</span>${backLabel}</button><button type="button" class="button secondary small skip-layer" data-action="skip-stage">${skipLabel}<span aria-hidden="true">→</span></button></div></div>`;
}
function submission(key) {
  if (/^layer-[0-4]$/.test(key)) return state.items[+key.slice(-1)];
  return state.submissions[key];
}
function answerPanel(target, answers, key) {
  if (!target.attempts.length && !state.submissions.post.attempts.length) return '';
  return `<section class="reference-panel" aria-label="参考答案"><button type="button" class="button secondary small" data-action="toggle-reference" data-reference="${key}" aria-expanded="${target.answerVisible}" aria-controls="reference-${key}">${target.answerVisible ? '收起参考答案' : '查看参考答案'}</button><div class="reference-answer" id="reference-${key}" ${target.answerVisible ? '' : 'hidden'}><h3>参考答案</h3>${answers.map((answer, i) => `<p>${answers.length > 1 ? `<strong>${i + 1}.</strong> ` : ''}${esc(answer)}</p>`).join('')}<p class="quiet-meta">这是参考表达，意思正确即可，不要求逐字一致。</p></div></section>`;
}
function essayActions(mode) {
  const result = state[mode], pre = mode === 'pre', record = state.submissions[mode];
  const answers = answerPanel(record, [referenceAnswers[mode]], mode);
  if (!result) return `<div class="test-bottom"><p class="quiet-meta">${record.attempts.length ? '修改后请重新提交评分。' : pre ? '前测提交后显示得分，可自行选择查看参考答案。' : '后测提交后显示得分，并自动展开参考答案。'}</p><button class="button" data-action="submit-${mode}">${record.attempts.length ? '再次' : ''}提交${pre ? '前测' : '后测'} <span aria-hidden="true">→</span></button></div>${answers}`;
  return `<section class="result-inline" aria-label="参考评分"><h3>参考得分 ${result.total} / 10 <span class="quiet-meta">· 第 ${record.attempts.length} 次提交</span></h3><table class="score-table"><caption>本题各项得分</caption><thead><tr><th scope="col">评分项</th><th scope="col">得分</th></tr></thead><tbody>${rubricNames.map((name, i) => `<tr><th scope="row">${name}</th><td>${result.dimensions[i]} / ${[4, 3, 3][i]}</td></tr>`).join('')}</tbody></table>${result.notes.map(note => `<p>${esc(note)}</p>`).join('')}<div class="result-actions"><button class="button small" data-action="continue-essay">${pre ? '开始推演' : '查看因果推理图'} →</button>${pre ? '' : '<button class="button secondary small" data-action="open-report">查看得分回顾</button>'}<button class="button secondary small" data-action="submit-${mode}">再次提交${pre ? '前测' : '后测'}</button>${pre && result.total >= 8 ? '<button class="button secondary small" data-action="skip-training">跳过训练，进入后测</button>' : ''}</div></section>${answers}`;
}
function testPage(mode) {
  const pre = mode === 'pre';
  const question = pre ? '请梳理第一次鸦片战争爆发的因果逻辑链条，说明哪些深层因素、中间矛盾、直接事件，最终导致战争爆发与后续影响，并写出各要素之间的推动关系。' : '有人说：“虎门销烟是鸦片战争爆发的根本原因。”这个说法是否正确？请结合历史因果逻辑，层层梳理并论证你的观点，写出完整的因果链条。';
  return pageHeader(pre ? 'BEFORE LEARNING / 前测' : 'TRANSFER / 后测', pre ? '战争，为什么会发生？' : '换个角度，还能推导吗？', pre ? '先用自己的语言，连接你已知的历史。暂时想不出来也没关系，可以选择跳过。' : '离开填空的提示，重新组织你的论证。试着把事件、矛盾与时代背景连接起来。', '主观简答 · 满分 10 分') + `<div class="divider"></div><section class="prompt-card" aria-label="${pre ? '前测' : '后测'}题目"><p class="prompt-caption">${pre ? '写下你的初始理解' : '请论证，而不只给判断'}</p><p class="prompt-text">${question}</p></section>${rubric()}<div class="answer-head"><label for="essay">${pre ? '我的初始思考' : '我的完整论证'}</label><span id="word-count">${state[mode + 'Text'].length} 字 · 不限字数</span></div><textarea id="essay" data-mode="${mode}" placeholder="${pre ? '你可以从最熟悉的一个事件出发，试着写下：因为……，所以……，进而……' : '先作出判断，再说明根本动因如何逐层推动冲突，最终转化为战争。'}">${esc(state[mode + 'Text'])}</textarea>${voiceControls('essay')}<p class="field-feedback" id="essay-error" role="status"></p><div id="essay-actions">${essayActions(mode)}</div><p class="under-note">参考评分不要求固定措辞。按正确要点给分，错误或未答到的要点计 0 分。</p>${pre ? '' : stageNavigation('return-training', '返回推演', '跳过后测')}${footer()}`;
}
function previousLayerButton() { return `<button type="button" class="button secondary small previous-layer" data-action="previous-layer" ${state.active === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span>返回上一层</button>`; }
function layerCard(i) {
  const layer = layers[i], item = state.items[i];
  return `<section class="layer-card current ${item.ok ? 'correct' : ''}" id="layer-${i}"><div class="layer-head"><div class="layer-name"><div><h3>${layer.title}</h3><small>${layer.subtitle}</small></div></div><span class="layer-status">${item.ok ? '✓ 已通过' : '当前探索'}</span></div><div class="layer-body"><label class="layer-question" for="layer-input-${i}">${layer.question}</label><textarea id="layer-input-${i}" data-layer-input="${i}" placeholder="写下你的理解，也可以点击麦克风直接说。">${esc(item.text)}</textarea>${voiceControls(`layer-input-${i}`)}<div class="layer-actions"><span class="quiet-meta">需要线索？点击顶部的“提示”。</span><div id="layer-check-action">${layerCheckAction(i)}</div></div><p class="field-feedback ${item.feedback?.ok ? 'success' : ''}" role="status" id="layer-feedback">${item.feedback ? esc(item.feedback.message) : ''}</p><div id="layer-score">${item.feedback ? `<p class="question-score">本题得分：${scoreLayer(item.feedback)} / 1 · 第 ${item.attempts.length} 次提交</p>` : ''}</div>${answerPanel(item, [referenceAnswers.layers[i]], `layer-${i}`)}</div></section><div class="layer-bottom"><p class="quiet-meta">检验通过后继续；暂时没有思路也可以跳过。</p><div class="layer-nav">${previousLayerButton()}<button class="button secondary small skip-layer" data-action="skip-layer">跳过这一层 <span aria-hidden="true">→</span></button></div></div>`;
}
function layerCheckAction(i) { return `<div class="result-actions layer-submit"><button class="button ${state.items[i].ok ? 'secondary ' : ''}small" data-check="${i}">${state.items[i].attempts.length ? '再次提交这一层' : '提交这一层'} →</button>${state.items[i].ok ? '<button class="button small" data-action="next-layer">继续推导 →</button>' : ''}</div>`; }
function connectionFeedback() {
  if (!state.linkResults) return '';
  return `<section class="result-inline" aria-label="连接题得分"><h3>各连接题得分 · 第 ${state.submissions.connections.attempts.length} 次提交</h3><table class="score-table"><thead><tr><th scope="col">题目</th><th scope="col">得分</th></tr></thead><tbody>${state.linkResults.map((result, i) => `<tr><th scope="row">连接题 ${i + 1}</th><td>${result === null ? '未作答' : result + ' / 1'}</td></tr>`).join('')}</tbody></table><p>关系正确得 1 分，错误或未说明所问关系得 0 分；未作答不计零分。</p>${state.linkResults.every(n => n === 1) ? '<div class="result-actions"><button class="button small" data-action="continue-training">进入后测 →</button></div>' : ''}</section>`;
}
function canvasPage() {
  if (state.active === 5) return connections();
  const resolved = state.items.filter(item => item.ok || item.skipped).length;
  return pageHeader('REASONING CANVAS / 推演画布', '沿着事件，向深处追问。', '每次专注一层，先写下理解，再检验自己的因果定位。后面的内容会随推演逐步展开。', '自主推演 · 阶梯提示') + `<div class="progress-summary"><span>已探索 ${resolved} 层</span><div class="progress-track" role="progressbar" aria-label="五层推演进度" aria-valuenow="${resolved}" aria-valuemin="0" aria-valuemax="5"><div class="progress-fill" style="width:${resolved * 20}%"></div></div></div>${layerCard(state.active)}${footer()}`;
}
function connections() {
  const names = [['深层动因', '贸易矛盾'], ['贸易矛盾', '国内危机'], ['国内危机', '禁烟行动'], ['禁烟冲突', '战争爆发']];
  const skipped = state.items.filter(item => item.skipped).length;
  return pageHeader('CONNECT THE DOTS / 连接因果', '把理解，连成一条因果链。', `从深层向事件复述，用自己的话说明“为什么 A 会推动 B”。${skipped ? `有 ${skipped} 层曾被跳过，可先按现有理解继续。` : ''}`, '从要素，到推动关系') + `<div class="divider"></div><div class="connection-back">${previousLayerButton()}</div><section>${names.map(([a, b], i) => `<div class="connection"><label for="link-${i}">${a} <span aria-hidden="true">→</span> ${b}</label><textarea id="link-${i}" data-link="${i}" placeholder="说清两端的具体内容，以及它们如何相互推动。">${esc(state.links[i])}</textarea>${voiceControls(`link-${i}`)}</div>`).join('')}<p id="links-error" class="field-feedback" role="status"></p><div class="finish-row"><p class="quiet-meta">不必使用固定连接词，只要推动关系清楚。</p><button class="button" data-action="finish-training">提交连接题 →</button></div><div id="connection-feedback">${connectionFeedback()}</div>${answerPanel(state.submissions.connections, referenceAnswers.connections, 'connections')}</section>${stageNavigation('previous-layer', '返回上一层', '跳过连接')}${footer()}`;
}
function questionReview() {
  return `<section class="report-details question-review"><h3>各问题得分与参考答案</h3>${['pre', ...state.items.map((_, i) => `layer-${i}`), 'connections', 'post'].map(key => {
    const record = submission(key);
    const index = key.startsWith('layer-') ? +key.slice(-1) : -1;
    const title = index >= 0 ? layers[index].title : { pre: '前测', post: '后测', connections: '因果连接' }[key];
    const scores = index >= 0 ? !record.attempts.length ? '未提交' : !record.feedback ? '已修改，待重交' : scoreLayer(record.feedback) + ' / 1' : key === 'connections' ? state.linkResults ? state.linkResults.map((n, i) => `第${i + 1}题 ${n === null ? '未作答' : n + '/1'}`).join(' · ') : '未提交或已修改' : state[key] ? `参考得分 ${state[key].total} / 10 · ` + state[key].dimensions.map((n, i) => `${['层级', '时序', '传导'][i]} ${n + '/' + [4, 3, 3][i]}`).join(' · ') : '未提交或已修改';
    const answers = index >= 0 ? [referenceAnswers.layers[index]] : key === 'connections' ? referenceAnswers.connections : [referenceAnswers[key]];
    return `<div class="question-review-item"><h4>${title}</h4><p>${scores}</p>${answerPanel(record, answers, key)}</div>`;
  }).join('')}</section>`;
}
function causalMapPage() {
  return pageHeader('CAUSAL MAP / 因果复盘', '把五层原因，连成完整推导。', '作答时，从事件向深处追问；复盘时，从根本动因出发，看看矛盾如何一步步推动历史。', '五层动因 → 战争 → 影响') + HistoryCausalMap.renderCausalMap(state) + `<div class="report-footer"><button class="button" data-action="open-report">查看得分回顾 →</button><button class="button secondary" data-action="review-post"><span aria-hidden="true">←</span>返回后测</button></div>${footer()}`;
}
function reportPage() {
  const before = state.pre, after = state.post;
  const comparable = before && after;
  const delta = comparable ? after.total - before.total : null;
  const difference = n => n > 0 ? `+${n}` : String(n);
  const hints = state.items.reduce((n, item) => n + item.hints, 0);
  const title = delta === null ? '每一次思考，都有迹可循。' : delta > 0 ? `比起最初，前进了 ${delta} 分。` : delta === 0 ? '得分相同，再看看论证的质量。' : '回到薄弱的环节，再推导一次。';
  return pageHeader('REFLECTION / 学习回顾', '从记住事件，到理解因果。', !before || !after ? '本次有测验被跳过或未提交，保留为未完成，不计零分，也不计算提升。' : '不同设问，同一套评分维度。看看你的论述在哪里变得更清晰。', '按要点评分 · 前后测对照') + `${state.submissions.post.attempts.length ? '<div class="map-entry"><p><strong>再把整个推导过程连起来。</strong><span>从根本动因到战争后果，沿箭头复盘。</span></p><button class="button" data-action="open-map">查看因果推理图 →</button></div>' : ''}<div class="result-hero"><div><p>${delta === null ? '本次学习记录' : '参考总分变化'}</p><h2>${title}</h2><p>${state.skippedTraining ? '本次选择跳过部分或全部推演' : `通过 ${state.items.filter(x => x.ok).length} 层 · 跳过 ${state.items.filter(x => x.skipped).length} 层 · 使用 ${hints} 次提示`}</p></div><div class="score-pair"><div><div class="score-label">前测</div><span class="score">${before ? showScore(before) : '—'}<small>${before ? '/10' : ''}</small></span></div><span class="score-arrow" aria-hidden="true">→</span><div><div class="score-label">后测</div><span class="score">${after ? showScore(after) : '—'}<small>${after ? '/10' : ''}</small></span></div></div></div><table class="score-table"><caption class="quiet-meta">同维度参考评分对照</caption><thead><tr><th scope="col">评分维度</th><th scope="col">前测</th><th scope="col">后测</th><th scope="col">变化</th></tr></thead><tbody>${rubricNames.map((name, i) => { const a = before?.dimensions[i], b = after?.dimensions[i]; return `<tr><th scope="row">${name}（${[4, 3, 3][i]} 分）</th><td>${dimension(before, i)}</td><td>${dimension(after, i)}</td><td class="delta">${typeof a === 'number' && typeof b === 'number' ? difference(b - a) : '—'}</td></tr>`; }).join('')}</tbody></table>${after ? `<section class="report-details"><h3>这次论证的识别结果</h3>${after.notes.map(note => `<p>${esc(note)}</p>`).join('')}</section>` : ''}<div class="notice">系统按概念含义、传导关系和时序证据辅助判断，不要求原句或指定连接词。正确要点给分，错误或未答到的要点计 0 分；未提交与跳过不计零分。可导出原文、分项得分和识别依据。</div>${questionReview()}<details class="report-details"><summary>回看我的两次作答</summary><p>前测${before ? '' : ' · 未提交'}</p><div class="answer-record">${esc(state.preText || '本次未作答，不计为 0 分。')}</div><p>后测${after ? '' : ' · 未提交'}</p><div class="answer-record">${esc(state.postText || '本次未作答，不计为 0 分。')}</div></details><details class="report-details"><summary>回看推演与提示使用情况</summary>${state.items.map((item, i) => `<p><strong>${layers[i].title}</strong> · ${item.ok ? '已通过' : item.skipped ? '已跳过' : '未完成'} · 提示 ${item.hints}/2 · 检验 ${item.attempts.length} 次</p><div class="answer-record">${esc(item.text || '本次未填写')}</div>`).join('')}</details><div class="report-footer"><button class="button" data-action="export">导出学习记录 ↓</button><button class="button secondary" data-action="review-post" title="${after ? '修改后测作答' : '补做后测'}"><span aria-hidden="true">←</span>返回后测</button></div>${footer()}`;
}
function render() {
  voice.cancel(); state.page = resolvePage(state, state.page);
  document.getElementById('current-stage').textContent = { pre: '当前 · 初始思考', canvas: state.active === 5 ? '当前 · 连接因果' : '当前 · 因果推演', post: '当前 · 迁移检验', report: '当前 · 学习回顾', map: '当前 · 因果复盘' }[state.page];
  main.innerHTML = state.page === 'pre' ? testPage('pre') : state.page === 'canvas' ? canvasPage() : state.page === 'post' ? testPage('post') : state.page === 'map' ? causalMapPage() : reportPage();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.voice) return voice.start(button.dataset.voice);
  if (button.dataset.action === 'toggle-hints' && ['pre', 'canvas', 'post'].includes(state.page)) {
    const hint = currentHint();
    hintsOpen = !hintsOpen;
    if (hintsOpen && hint.owner[hint.key] === 0) { hint.owner[hint.key] = 1; }
    voice.cancel(); updateHints();
    return;
  }
  if (button.dataset.action === 'deepen-hint' && ['pre', 'canvas', 'post'].includes(state.page) && hintsOpen) {
    const hint = currentHint();
    if (hint.owner[hint.key] !== 1) return;
    hint.owner[hint.key] = 2; voice.cancel(); updateHints();
    document.querySelector('[data-action="toggle-hints"]').focus({ preventScroll: true });
    return;
  }
  if (button.dataset.check !== undefined) {
    const i = +button.dataset.check; if (state.page !== 'canvas' || state.active !== i) return;
    const item = state.items[i], result = validateLayer(i, item.text); if (result.type === 'empty') { document.getElementById('layer-feedback').textContent = result.message; return; } item.ok = result.ok; item.skipped = false; item.feedback = result;
    submitAttempt(item, { text: item.text, ok: result.ok, type: result.type, score: scoreLayer(result), hintsUsed: item.hints, at: new Date().toISOString() }); render();
    if (!result.ok && !item.answerVisible && result.type !== 'empty') { document.getElementById('feedback-text').textContent = result.message; document.getElementById('feedback-dialog').showModal(); }
    else document.querySelector(item.answerVisible ? '.reference-answer' : '.question-score').scrollIntoView({ block: 'nearest', behavior: 'instant' }); return;
  }
  const action = button.dataset.action;
  if (action === 'toggle-reference') {
    const record = submission(button.dataset.reference); if (!record || !record.attempts.length && !state.submissions.post.attempts.length) return;
    if (record.answerVisible) record.answerVisible = false; else revealAnswer(record, state.submissions.post.attempts.length > 0);
    const panel = document.getElementById(`reference-${button.dataset.reference}`);
    panel.hidden = !record.answerVisible; button.setAttribute('aria-expanded', String(record.answerVisible));
    button.textContent = record.answerVisible ? '收起参考答案' : '查看参考答案'; return;
  }
  if (action === 'return-training' && state.page === 'post') return go('canvas');
  if (action === 'skip-stage') {
    if (state.page === 'pre') { state.skippedPre = !state.pre; return go('canvas'); }
    if (state.page === 'canvas') { state.skippedTraining = true; if (state.active === 5) state.skippedLinks = true; return go('post'); }
    if (state.page === 'post') { state.skippedPost = !state.post; return go('report'); }
  }
  if (action === 'previous-layer') {
    if (state.page !== 'canvas' || state.active <= 0 || state.active > 5) return;
    state.active--; return go('canvas');
  }
  if (action === 'skip-layer' || action === 'next-layer') {
    if (state.page !== 'canvas' || state.active >= 5) return; const item = state.items[state.active];
    if (action === 'next-layer' && !item.ok) return;
    if (action === 'skip-layer' && !item.ok) item.skipped = true;
    state.active++; return go('canvas');
  }
  if (action === 'continue-essay' && state[state.page]) return go(state.page === 'pre' ? 'canvas' : 'map');
  if (action === 'skip-training' && state.pre?.total >= 8) { state.skippedTraining = true; return go('post'); }
  if (action === 'open-map' && state.page === 'report' && state.submissions.post.attempts.length) return go('map');
  if (action === 'open-report' && (state.page === 'map' || state.page === 'post' && state.post)) return go('report');
  if (action === 'review-post' && ['report', 'map'].includes(state.page)) return go('post');
  if (action === 'submit-pre' || action === 'submit-post') {
    const mode = action.endsWith('pre') ? 'pre' : 'post'; if (state.page !== mode) return;
    if (!hasAnswerContent(state[mode + 'Text'])) { document.getElementById('essay-error').textContent = '请填写作答文字，只有标点或空格无法评分。暂时没有思路也可以点击上方“跳过”。'; document.getElementById('essay').focus(); return; }
    state[mode] = gradeEssay(state[mode + 'Text']); submitAttempt(state.submissions[mode], { text: state[mode + 'Text'], result: state[mode], at: new Date().toISOString() }); state[mode === 'pre' ? 'skippedPre' : 'skippedPost'] = false;
    if (mode === 'post') revealAfterPost(state);
    render(); document.querySelector(state.submissions[mode].answerVisible ? '.reference-answer' : '.result-inline').scrollIntoView({ block: 'nearest', behavior: 'instant' }); return;
  }
  if (action === 'finish-training') {
    if (state.page !== 'canvas' || state.active !== 5 || firstUnfinishedLayer(state.items) !== 5) return;
    if (!state.links.some(hasAnswerContent)) { document.getElementById('links-error').textContent = '请先填写至少一段关系，只有标点或空格无法评分；也可以跳过。'; return; }
    state.linkResults = state.links.map((text, i) => gradeConnection(i, text));
    submitAttempt(state.submissions.connections, { texts: [...state.links], scores: [...state.linkResults], at: new Date().toISOString() });
    state.trainingFinished = state.linkResults.every(n => n === 1);
    state.trained = state.trainingFinished && state.items.every(item => item.ok);
    render(); document.querySelector(state.submissions.connections.answerVisible ? '.reference-answer' : '#connection-feedback').scrollIntoView({ block: 'nearest', behavior: 'instant' }); return;
  }
  if (action === 'continue-training' && state.page === 'canvas' && state.active === 5 && state.trainingFinished) { state.skippedTraining = false; return go('post'); }
  if (action === 'export' && state.page === 'report') {
    const record = { title: '知因 · 第一次鸦片战争学习记录', exportedAt: new Date().toISOString(), scoringNotice: '按正确概念与传导关系给分，错误或未答到的要点计0分；未作答与跳过不记零分。', pre: state.pre ? { answer: state.preText, ...state.pre } : null, post: state.post ? { answer: state.postText, ...state.post } : null, drafts: { pre: state.preText, post: state.postText }, methodHints: state.methodHints, skipped: { pre: state.skippedPre, training: state.skippedTraining, post: state.skippedPost, connections: state.skippedLinks }, submissions: state.submissions, connectionScores: state.linkResults, layers: state.items.map((item, i) => ({ layer: layers[i].title, ...item })), connections: state.links };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = '知因-鸦片战争-学习记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('学习记录已导出，包含原文、识别依据与提示使用情况。');
  }
});
main.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'essay') { document.getElementById('essay-error').textContent = ''; const mode = input.dataset.mode; state[mode + 'Text'] = input.value; if (state[mode]) { state[mode] = null; document.getElementById('essay-actions').innerHTML = essayActions(mode); } document.getElementById('word-count').textContent = `${input.value.length} 字 · 不限字数`; }
  if (input.dataset.layerInput !== undefined) { const i = +input.dataset.layerInput, item = state.items[i]; item.text = input.value; if (item.ok || item.feedback || item.skipped) { item.ok = false; item.skipped = false; item.feedback = null; state.trained = false; state.trainingFinished = false; document.getElementById(`layer-${i}`).classList.remove('correct'); document.querySelector('.layer-status').textContent = '待检验'; document.getElementById('layer-feedback').textContent = ''; document.getElementById('layer-score').innerHTML = ''; document.getElementById('layer-check-action').innerHTML = layerCheckAction(i); } }
  if (input.dataset.link !== undefined) { document.getElementById('links-error').textContent = ''; state.links[+input.dataset.link] = input.value; state.linkResults = null; document.getElementById('connection-feedback').innerHTML = ''; state.trained = false; state.trainingFinished = false; }
});
const dialog = document.getElementById('about-dialog');
document.getElementById('about-button').addEventListener('click', () => { voice.cancel(); resetArmed = false; document.getElementById('reset-help').textContent = ''; dialog.showModal(); });
document.getElementById('close-about').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.getElementById('reset-button').addEventListener('click', () => { if (!resetArmed) { resetArmed = true; document.getElementById('reset-help').textContent = '再次点击将重新开始本次练习。可先关闭此窗口导出记录。'; return; } voice.cancel(); state = fresh(); hintsOpen = false; dialog.close(); render(); toast('已回到第一遍作答。'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) voice.cancel(); });
window.addEventListener('pagehide', () => voice.cancel());
window.addEventListener('pageshow', event => { if (event.persisted) { state = fresh(); hintsOpen = false; render(); window.scrollTo({ top: 0, behavior: 'instant' }); } });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
render();
window.scrollTo({ top: 0, behavior: 'instant' });
