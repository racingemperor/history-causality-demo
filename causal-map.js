(function (scope) {
  'use strict';
  const { layers, referenceAnswers } = typeof module !== 'undefined' && module.exports ? require('./logic.js') : scope.HistoryLogic;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  // Read in the direction of causation; the exercise explores these layers in reverse.
  const nodes = [
    { layer: 4, title: '英国工业革命', summary: '工业产能扩大，推动海外市场、原料与殖民扩张需求。' },
    { layer: 3, title: '对华贸易逆差', summary: '英国工业品在中国销路受限，寻求改变贸易处境。' },
    { layer: 2, title: '白银外流与国内危机', summary: '鸦片走私和输入，加重清朝财政与社会压力。' },
    { layer: 0, title: '清政府禁烟 · 虎门销烟', summary: '1839 年，林则徐主持销烟，禁烟冲突走向台前。' },
    { layer: 1, title: '英国借禁烟冲突出兵', summary: '英国政府以保护贸易和商人利益为借口，选择动武。' },
    { label: '战争爆发', title: '第一次鸦片战争', summary: '1840 年，英国发动侵华战争。', reference: '长期扩张动因、贸易与鸦片矛盾，经由禁烟冲突和英国政府的出兵决策，转化为侵华战争。虎门销烟是导火索，不能代替根本动因。' },
    { label: '战后结果', title: '清政府战败 ·《南京条约》', summary: '1842 年签订条约，中国主权受到损害。', reference: '清政府战败后被迫签订《南京条约》。割地、赔款、开放通商口岸及协定关税等条款，损害了中国的领土、经济与关税主权。' }
  ];
  const edges = [
    '扩张需求与销路受限交织',
    '借鸦片走私扭转贸易处境',
    '国内危机促使清政府禁烟',
    '英国将禁烟冲突作为借口',
    '出兵决策转化为军事行动',
    '清政府战败，被迫签约'
  ];
  function ownAnswer(session, layer) {
    const item = session.items[layer];
    const status = item.feedback ? `本层得分 ${item.feedback.ok ? 1 : 0} / 1` : item.attempts.length ? '已修改，待重新提交' : item.skipped || session.skippedTraining ? '本层已跳过，未计分' : '本层未提交';
    return `<h4>我的作答 <span>${status}</span></h4><p class="map-own-answer">${esc(item.text || '本次未填写。')}</p>`;
  }
  function renderCausalMap(session) {
    return `<figure class="causal-map" aria-labelledby="causal-map-caption"><figcaption id="causal-map-caption"><strong>沿箭头，读懂每一步“为什么”。</strong><span>点击节点展开解释，对照自己的作答；再次点击可收起。</span></figcaption><div class="causal-flow" role="group" aria-label="从根本动因到战争后果的因果推理图">${nodes.map((node, i) => `<details class="causal-node causal-node-${i}"><summary><span class="causal-role">${node.layer === undefined ? node.label : layers[node.layer].title}</span><strong>${node.title}</strong><span class="causal-summary">${node.summary}</span><span class="causal-expand"><span class="causal-open-label">展开${node.layer === undefined ? '解释' : '作答对照'}</span><span class="causal-close-label">收起${node.layer === undefined ? '解释' : '作答对照'}</span><span class="causal-expand-icon" aria-hidden="true"></span></span></summary><div class="causal-node-detail"><h4>参考解释</h4><p>${esc(node.layer === undefined ? node.reference : referenceAnswers.layers[node.layer])}</p>${node.layer === undefined ? '' : ownAnswer(session, node.layer)}</div></details>${i < edges.length ? `<div class="causal-edge causal-edge-${i}"><span class="causal-arrow" aria-hidden="true"></span><p>${edges[i]}</p></div>` : ''}`).join('')}</div><section class="causal-outcomes" aria-labelledby="outcomes-heading"><h3 id="outcomes-heading">条约带来的影响</h3><div class="outcome-branches"><div><h4>领土主权</h4><p>割让香港岛，领土完整遭到破坏。</p></div><div><h4>经济负担</h4><p>巨额赔款，加重清政府财政与人民负担。</p></div><div><h4>通商与关税</h4><p>五口通商、协定关税，中国经济与关税主权受到损害。</p></div></div></section></figure><p class="causal-takeaway"><strong>复盘关键</strong>根本动因解释“为什么长期向外扩张”，导火索解释“冲突为何在此时激化”，政府决策说明“冲突如何变成战争”。</p><p class="quiet-meta map-footnote">这是一条帮助学习的主要因果链。历史还涉及多重条件，图中的箭头不表示战争必然发生。</p>`;
  }
  scope.HistoryCausalMap = { renderCausalMap };
  if (typeof module !== 'undefined' && module.exports) module.exports = scope.HistoryCausalMap;
})(typeof window !== 'undefined' ? window : globalThis);
