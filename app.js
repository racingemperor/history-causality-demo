/* 知因 · GitHub Pages interaction demo. No student data is sent to a server. */
'use strict';
const { layers, validateLayer, gradeEssay, countRelations } = HistoryLogic;
const KEY = 'zhiyin-history-v1';
const fresh = () => ({ version: 1, page: 'pre', preText: '', postText: '', pre: null, post: null, skippedPre: false, skippedTraining: false, active: 0, items: layers.map(() => ({ text: '', hints: 0, ok: false, attempts: [], feedback: null })), links: ['', '', '', ''], trained: false });
let storageAvailable = true;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    // Validate browser storage once, at its boundary. Scores are recomputed, never trusted from storage.
    if (data.version !== 1 || !['pre', 'canvas', 'post', 'report'].includes(data.page) || !Array.isArray(data.items) || data.items.length !== 5 || !data.items.every(item => typeof item.text === 'string' && [0, 1, 2].includes(item.hints) && Array.isArray(item.attempts)) || !Array.isArray(data.links) || data.links.length !== 4 || !data.links.every(x => typeof x === 'string') || typeof data.preText !== 'string' || typeof data.postText !== 'string') return fresh();
    const base = fresh();
    base.page = data.page; base.preText = data.preText; base.postText = data.postText;
    base.pre = data.pre ? gradeEssay(data.preText) : null; base.post = data.post ? gradeEssay(data.postText) : null;
    base.skippedPre = !!data.skippedPre; base.skippedTraining = !!data.skippedTraining && !!base.pre && base.pre.total >= 8;
    base.active = Number.isInteger(data.active) && data.active >= 0 && data.active < 5 ? data.active : 0;
    base.items = data.items.map((item, i) => ({ text: item.text, hints: item.hints, ok: !!item.ok && validateLayer(i, item.text).ok, attempts: item.attempts, feedback: null }));
    base.links = data.links; base.trained = !!data.trained && base.items.every(item => item.ok) && base.links.every(x => x.trim().length >= 8 && countRelations(x) > 0);
    return base;
  } catch { storageAvailable = false; return fresh(); }
}
let state = load();
let saveTimer;
let toastTimer;
let resetArmed = false;
const main = document.getElementById('main');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const rubricNames = ['区分根本原因与直接诱因', '事件时序与先后关系', '阐明因果传导关系'];
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { if (storageAvailable) toast('浏览器暂不能保存记录，本次仍可继续学习。'); storageAvailable = false; } }
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4500); }
function go(page) { state.page = page; save(); render(); main.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function nav() {
  const pages = [['pre', '初始思考', '前测 · 看见起点'], ['canvas', '因果推演', '五层 · 自主探索'], ['post', '迁移检验', '后测 · 换个角度'], ['report', '学习回顾', '对照 · 看见变化']];
  document.getElementById('step-nav').innerHTML = pages.map(([page, name, sub], i) => { const done = page === 'pre' ? !!state.pre : page === 'canvas' ? state.trained : page === 'post' ? !!state.post : false; return `<button class="step ${state.page === page ? 'active' : ''} ${done ? 'done' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="step"' : ''}><span class="step-index">${done ? '✓' : i + 1}</span><span class="step-label">${name}<small>${sub}</small></span></button>`; }).join('');
}
const pageHeader = (eyebrow, title, intro, meta) => `<div class="page-top"><span class="eyebrow">${eyebrow}</span><span class="quiet-meta">${meta}</span></div><h2 class="page-heading">${title}</h2><p class="intro">${intro}</p>`;
const footer = () => `<div class="bottom-caption"><span>知其然，也知其所以然。</span><span>${storageAvailable ? '记录仅保存在当前浏览器' : '本次记录未持久保存'} · 教学演示版</span></div>`;
function rubric() { return `<div class="rubric-strip">${rubricNames.map((name, i) => `<div class="rubric-item"><strong>${name}</strong><span>${[4, 3, 3][i]}<small> 分</small></span></div>`).join('')}</div>`; }
function testPage(mode) {
  const pre = mode === 'pre';
  const result = state[mode];
  const question = pre ? '请梳理第一次鸦片战争爆发的因果逻辑链条，说明哪些深层因素、中间矛盾、直接事件，最终导致战争爆发与后续影响，并写出各要素之间的推动关系。' : '有人说：“虎门销烟是鸦片战争爆发的根本原因。”这个说法是否正确？请结合历史因果逻辑，层层梳理并论证你的观点，写出完整的因果链条。';
  return pageHeader(pre ? 'BEFORE LEARNING / 前测' : 'TRANSFER / 后测', pre ? '战争，为什么会发生？' : '换个角度，还能推导吗？', pre ? '先用自己的语言，连接你已知的历史。暂时想不出来也没关系，这只是起点。' : '离开填空的提示，重新组织你的论证。试着把事件、矛盾与时代背景连接起来。', '主观简答 · 满分 10 分') + `<div class="divider"></div><section class="prompt-card" aria-label="${pre ? '前测' : '后测'}题目"><p class="prompt-caption">${pre ? '写下你的初始理解' : '请论证，而不只给判断'}</p><p class="prompt-text">${question}</p></section>${rubric()}<div class="answer-head"><label for="essay">${pre ? '我的初始思考' : '我的完整论证'}</label><span id="word-count">${state[mode + 'Text'].length} 字 · 不限字数</span></div><textarea id="essay" data-mode="${mode}" placeholder="${pre ? '你可以从最熟悉的一个事件出发，试着写下：因为……，所以……，进而……' : '先作出判断，再说明：根本动因是什么？怎样逐层推动冲突，最终转化为战争？'}">${esc(state[mode + 'Text'])}</textarea><p class="field-feedback" id="essay-error" role="status"></p>${result ? inlineResult(mode, result) : `<div class="test-bottom">${pre ? '<button class="text-button" data-action="skip-pre"><strong>暂时没有思路，直接开始推演 <span aria-hidden="true">↗</span></strong><small>不记为 0 分，保留前测未完成状态</small></button>' : '<button class="text-button" data-page="canvas">返回我的推演画布</button>'}<button class="button" data-action="submit-${mode}">提交${pre ? '前测' : '后测'} <span aria-hidden="true">→</span></button></div>`}<p class="under-note">${result ? '修改上方作答后，可重新提交。' : '无须查资料，写下此刻的理解即可。'}评分为规则辅助参考，正式结果需教师复核。</p>${footer()}`;
}
function inlineResult(mode, result) {
  const pre = mode === 'pre';
  return `<section class="result-inline" aria-label="参考评分"><h3>参考得分 ${result.total} / 10 <span class="quiet-meta">· 待教师复核</span></h3><p>${result.dimensions.map((n, i) => `${['层级', '时序', '传导'][i]} ${n}/${[4, 3, 3][i]}`).join('　·　')}</p><p>${pre && result.total >= 8 ? '你已表现出较完整的因果思路。可以继续巩固，也可以自主跳过这个知识点。' : pre ? '现在，把最初的思考带进画布，一层一层追问。' : '你已经完成这次迁移作答，接下来查看同维度对照。'}</p><div class="result-actions">${pre ? '<button class="button small" data-page="canvas">进入五层推演 →</button>' : '<button class="button small" data-page="report">查看学习回顾 →</button>'}${pre && result.total >= 8 ? '<button class="button secondary small" data-action="skip-training">跳过训练，进入后测</button>' : ''}</div></section>`;
}
function layerCard(layer, i) {
  const item = state.items[i], open = state.active === i;
  return `<section class="layer-card ${open ? 'current' : ''} ${item.ok ? 'correct' : ''}" id="layer-${i}"><div class="layer-head"><button class="layer-toggle" data-layer-toggle="${i}" aria-expanded="${open}" aria-controls="layer-body-${i}"><span class="layer-name"><span class="layer-num">${String(i + 1).padStart(2, '0')}</span><span><h3>${layer.title}</h3><small>${layer.subtitle}</small></span></span><span class="layer-status">${item.ok ? '✓ 已通过' : item.text ? '待检验' : open ? '正在推导' : '待探索'} ${open ? '−' : '+'}</span></button></div><div class="layer-body" id="layer-body-${i}" ${open ? '' : 'hidden'}><label class="answer-head" for="layer-input-${i}"><span>${layer.question}</span></label><textarea id="layer-input-${i}" data-layer-input="${i}" placeholder="用自己的语言写下理解，不必拘泥于课本原句。">${esc(item.text)}</textarea><div class="layer-actions"><button class="hint-button" data-hint="${i}" ${item.hints >= 2 ? 'disabled' : ''}>${item.hints === 0 ? '给我一点线索' : item.hints === 1 ? '再深入想一想' : '两级提示已展开'} <span>${item.hints}/2</span></button><button class="button small" data-check="${i}">检验这一层 <span aria-hidden="true">→</span></button></div>${layer.hints.slice(0, item.hints).map((hint, h) => `<div class="hint-box"><strong>${h === 0 ? '一级 · 轻提示' : '二级 · 深提示'}</strong>${hint}</div>`).join('')}${item.feedback ? `<p class="field-feedback ${item.feedback.ok ? 'success' : ''}" role="status">${esc(item.feedback.message)}</p>` : ''}</div></section>`;
}
function canvasPage() {
  const done = state.items.filter(x => x.ok).length;
  const order = [4, 3, 2, 0, 1];
  return pageHeader('REASONING CANVAS / 推演画布', '沿着事件，向深处追问。', '从眼前的事件开始，逐层探索背后的矛盾。没有标准答案按钮，只有帮助你继续思考的线索。', '五层因果 · 两阶提示') + `<div class="progress-summary"><span>已推导 <strong>${done} / 5</strong> 层 <span>· 可点击任意层修改</span></span><div class="progress-track" role="progressbar" aria-label="五层推演进度" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="5"><div class="progress-fill" style="width:${done * 20}%"></div></div></div><div class="canvas-layout"><div class="layer-list">${layers.map(layerCard).join('')}</div><aside class="margin-note"><h3>事件 ≠ 根本动因</h3><p>一根火柴能解释火焰何时点燃，但还需要追问：可燃物为何早已堆积？</p><div class="mini-rule"></div><p>先向深处探索，再从根源向事件复述。<br>层级是思考的工具，不是五个互不关联的标签。</p><div class="layer-map" aria-label="从深层到事件的复述方向">${order.map((i, n) => `<div class="${state.items[i].ok ? 'map-done' : ''}"><span>${layers[i].title}</span><span>${state.items[i].ok ? '✓' : '·'}</span></div>${n < 4 ? '<span aria-hidden="true">↓</span>' : ''}`).join('')}</div><p>提示只在当前层展开。<br>先想一想，再向系统求助。</p></aside></div>${done === 5 ? connections() : `<div class="notice">当五层都完成后，这里会解锁“连接因果”：从深层动因出发，用你自己的话说明每一步是怎样发生的。</div>`}${footer()}`;
}
function connections() {
  const names = [['深层根本原因', '贸易矛盾'], ['贸易矛盾', '国内危机'], ['国内危机', '禁烟行动'], ['禁烟冲突', '战争爆发']];
  return `<section class="connector-section"><span class="eyebrow">CONNECT THE DOTS</span><h2>把五层，连成一条因果链。</h2><p>填对名词只是开始。现在从深层向表层复述，每一格写清“为什么 A 会推动 B”。</p>${names.map(([a, b], i) => `<div class="connection"><label for="link-${i}">${a} <span aria-hidden="true">→</span> ${b}</label><textarea id="link-${i}" data-link="${i}" placeholder="因为……，推动／导致……（请包含两端的具体内容）">${esc(state.links[i])}</textarea></div>`).join('')}<p id="links-error" class="field-feedback" role="status"></p><div class="finish-row"><p class="quiet-meta">${state.trained ? '✓ 因果连接已完成，可以继续修改。' : '试着写出因果关系，而不只是按顺序罗列。'}</p><button class="button" data-action="finish-training">完成推演，进入后测 <span aria-hidden="true">→</span></button></div></section>`;
}
function postPage() {
  if (state.trained || state.skippedTraining) return testPage('post');
  return `<section class="empty-state"><span class="eyebrow">TRANSFER / 后测</span><h2>先让因果链完整起来。</h2><p>完成五层和传导关系后，再用新的设问检验理解。前测达到 8 分，也可选择跳过训练。</p><button class="button" data-page="canvas">继续我的推演 →</button></section>${footer()}`;
}
function reportPage() {
  if (!state.post) return `<section class="empty-state"><span class="eyebrow">REFLECTION / 回顾</span><h2>你的变化，值得被看见。</h2><p>完成后测后，这里会呈现前后测同维度对照和你的学习记录。</p><button class="button" data-page="post">前往迁移检验 →</button></section>${footer()}`;
  const before = state.pre, after = state.post;
  const delta = before ? after.total - before.total : null;
  const difference = n => n > 0 ? `+${n}` : String(n);
  const hints = state.items.reduce((n, item) => n + item.hints, 0);
  return pageHeader('REFLECTION / 学习回顾', '从记住事件，到理解因果。', before ? '两次不同设问，同一套评分维度。看看你的论述在哪里变得更清晰。' : '本次未完成前测，暂不计算提升分数。保留这次后测，作为新的思考起点。', '规则辅助评分 · 待教师复核') + `<div class="result-hero"><div><p>${delta === null ? '本次后测记录' : '参考总分变化'}</p><h2>${delta === null ? '每一次推导，都有迹可循。' : delta > 0 ? `比起最初，前进了 ${delta} 分。` : delta === 0 ? '得分相同，再看看论证的质量。' : '回到薄弱的环节，再推导一次。'}</h2><p>${state.skippedTraining ? '本次根据前测结果选择跳过训练' : `完成 ${state.items.filter(x => x.ok).length} 层推演 · 使用 ${hints} 次提示`}</p></div><div class="score-pair"><div><div class="score-label">前测</div><span class="score">${before ? before.total : '—'}<small>/10</small></span></div><span class="score-arrow" aria-hidden="true">→</span><div><div class="score-label">后测</div><span class="score">${after.total}<small>/10</small></span></div></div></div><table class="score-table"><caption class="quiet-meta">同维度参考评分对照（非正式成绩）</caption><thead><tr><th scope="col">评分维度</th><th scope="col">前测</th><th scope="col">后测</th><th scope="col">变化</th></tr></thead><tbody>${rubricNames.map((name, i) => `<tr><th scope="row">${name}（${[4, 3, 3][i]} 分）</th><td>${before ? before.dimensions[i] : '未完成'}</td><td>${after.dimensions[i]}</td><td class="delta">${before ? difference(after.dimensions[i] - before.dimensions[i]) : '—'}</td></tr>`).join('')}</tbody></table><section class="report-details"><h3>接下来，关注这三件事</h3>${after.notes.map((note, i) => `<p>${i + 1}. ${esc(note)}</p>`).join('')}</section><div class="notice">得分依据文字中的关键词、时序证据与连接词，不能替代对史实及论证质量的判断。更高的分数不直接等于教学效果，也不应把规则误判当作学生能力不足。可以导出原文与记录，交给教师按相同维度复核。</div><details class="report-details"><summary>回看我的两次作答</summary><p>前测</p><div class="answer-record">${before ? esc(state.preText) : '本次未完成前测，不计为 0 分。'}</div><p>后测</p><div class="answer-record">${esc(state.postText)}</div></details><details class="report-details"><summary>回看推演与提示使用情况</summary>${state.items.map((item, i) => `<p><strong>${layers[i].title}</strong> · 提示 ${item.hints}/2 · 检验 ${item.attempts.length} 次</p><div class="answer-record">${esc(item.text || '本次未填写')}</div>`).join('')}</details><div class="timeline"><div><b>1839</b>禁烟与虎门销烟</div><div><b>1840</b>英国发动战争</div><div><b>1842</b>《南京条约》签订</div></div><div class="report-footer"><button class="button" data-action="export">导出学习记录 <span aria-hidden="true">↓</span></button><button class="button secondary" data-page="canvas">回到推演画布</button><button class="text-button" data-page="post">修改后测作答</button></div>${footer()}`;
}
function render() { nav(); main.innerHTML = state.page === 'pre' ? testPage('pre') : state.page === 'canvas' ? canvasPage() : state.page === 'post' ? postPage() : reportPage(); }
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.page) return go(button.dataset.page);
  if (button.dataset.layerToggle !== undefined) { state.active = +button.dataset.layerToggle; save(); render(); return; }
  if (button.dataset.hint !== undefined) { const i = +button.dataset.hint; if (state.items[i].hints < 2) state.items[i].hints++; save(); render(); document.querySelector(`[data-hint="${i}"]`).focus({ preventScroll: true }); return; }
  if (button.dataset.check !== undefined) {
    const i = +button.dataset.check, item = state.items[i], result = validateLayer(i, item.text);
    item.ok = result.ok; item.feedback = result; item.attempts.push({ text: item.text, ok: result.ok, type: result.type, hintsUsed: item.hints, at: new Date().toISOString() });
    if (!result.ok) state.trained = false;
    save(); render();
    if (result.ok) toast(state.items.every(x => x.ok) ? '五层都已完成！向下连接你的因果链。' : '这一层已通过。点击下一层，继续推导。');
    if (!result.ok && result.type !== 'empty') { document.getElementById('feedback-text').textContent = result.message; document.getElementById('feedback-dialog').showModal(); }
    else document.getElementById(`layer-input-${i}`).focus({ preventScroll: true }); return;
  }
  const action = button.dataset.action;
  if (action === 'skip-pre') { state.skippedPre = !state.pre; go('canvas'); }
  if (action === 'skip-training' && state.pre && state.pre.total >= 8) { state.skippedTraining = true; go('post'); }
  if (action === 'submit-pre' || action === 'submit-post') {
    const mode = action.endsWith('pre') ? 'pre' : 'post';
    if (!state[mode + 'Text'].trim()) { document.getElementById('essay-error').textContent = '先写下你的思考，再提交。暂时不会可以从前测直接开始推演。'; document.getElementById('essay').focus(); return; }
    state[mode] = gradeEssay(state[mode + 'Text']); if (mode === 'pre') state.skippedPre = false;
    save(); render(); document.querySelector('.result-inline').scrollIntoView({ block: 'nearest', behavior: 'instant' }); return;
  }
  if (action === 'finish-training') {
    const missing = state.links.findIndex(text => text.trim().length < 8 || countRelations(text) === 0);
    if (missing >= 0) { document.getElementById('links-error').textContent = `第 ${missing + 1} 段还缺少完整的推动关系。请写出具体的两端要素，并用“导致、推动、因此”等词连接。`; document.getElementById(`link-${missing}`).focus(); return; }
    state.trained = true; state.skippedTraining = false; go('post');
  }
  if (action === 'export') {
    const record = { title: '知因 · 第一次鸦片战争学习记录', exportedAt: new Date().toISOString(), scoringNotice: '规则辅助参考，需教师复核；无前测时不计算提升。', pre: state.pre ? { answer: state.preText, ...state.pre } : null, post: { answer: state.postText, ...state.post }, skippedTraining: state.skippedTraining, layers: state.items.map((item, i) => ({ layer: layers[i].title, ...item })), connections: state.links };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = '知因-鸦片战争-学习记录.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('学习记录已导出，包含原文、评分与提示使用情况。');
  }
});
main.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'essay') {
    const mode = input.dataset.mode; state[mode + 'Text'] = input.value;
    if (state[mode]) { state[mode] = null; if (mode === 'pre') state.skippedTraining = false; const result = main.querySelector('.result-inline'); if (result) { result.outerHTML = `<div class="test-bottom"><button class="text-button" data-page="${mode === 'pre' ? 'canvas' : 'canvas'}">返回推演画布</button><button class="button" data-action="submit-${mode}">重新提交${mode === 'pre' ? '前测' : '后测'} →</button></div>`; } nav(); }
    document.getElementById('word-count').textContent = `${input.value.length} 字 · 不限字数`;
  }
  if (input.dataset.layerInput !== undefined) { const i = +input.dataset.layerInput; state.items[i].text = input.value; if (state.items[i].ok || state.items[i].feedback) { state.items[i].ok = false; state.items[i].feedback = null; state.trained = false; const card = document.getElementById(`layer-${i}`); card.classList.remove('correct'); card.querySelector('.layer-status').textContent = '待检验 −'; const message = card.querySelector('.field-feedback'); if (message) message.remove(); const connectors = main.querySelector('.connector-section'); if (connectors) connectors.remove(); const done = state.items.filter(x => x.ok).length; main.querySelector('.progress-summary > span').innerHTML = `已推导 <strong>${done} / 5</strong> 层 <span>· 可点击任意层修改</span>`; main.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', done); main.querySelector('.progress-fill').style.width = `${done * 20}%`; const mapItems = main.querySelectorAll('.layer-map div'); if (mapItems.length) { const mapIndex = [4, 3, 2, 0, 1].indexOf(i); mapItems[mapIndex].classList.remove('map-done'); mapItems[mapIndex].lastElementChild.textContent = '·'; } nav(); } }
  if (input.dataset.link !== undefined) { state.links[+input.dataset.link] = input.value; state.trained = false; nav(); }
  scheduleSave();
});
const dialog = document.getElementById('about-dialog');
document.getElementById('about-button').addEventListener('click', () => { resetArmed = false; document.getElementById('reset-help').textContent = ''; dialog.showModal(); });
document.getElementById('close-about').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.getElementById('reset-button').addEventListener('click', () => { if (!resetArmed) { resetArmed = true; document.getElementById('reset-help').textContent = '再次点击上方按钮，将清空本浏览器的作答与提示记录。可先关闭此窗口导出记录。'; return; } clearTimeout(saveTimer); state = fresh(); save(); dialog.close(); render(); toast('本机记录已清空，可以重新开始。'); });
window.addEventListener('pagehide', () => { clearTimeout(saveTimer); save(); });
render();
