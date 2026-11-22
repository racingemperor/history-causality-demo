(function (scope) {
  'use strict';
  // Domain-specific concept and relation rules, not edit distance against a reference sentence.
  const patterns = {
    industry: /工业革命|工业化|机器.{0,5}(生产|制造)|机器代替手工|机器取代手工|大机器|工厂.{0,5}(生产|兴起)|工业.{0,5}(产能|发展|发达|生产)|资本主义.{0,6}(发展|扩张)/,
    expansion: /市场|销路|买家|消费者|销售|卖到|卖给|卖出去|原料|原材料|殖民|对外扩张|海外扩张|海外利益/,
    trade: /逆差|入超|贸易失衡|贸易不平衡|进口.{0,6}(大于|多于|超过).{0,6}出口|出口.{0,6}(小于|少于).{0,6}进口|买.{0,12}多.{0,12}卖.{0,12}少|卖.{0,12}少.{0,12}买.{0,12}多|工业品.{0,12}(滞销|受阻|卖不|销路|难以|难卖)|商品.{0,8}(滞销|卖不|难卖)|卖不进中国|中国.{0,8}(不买|不愿买|不需要).{0,8}(英|商品)/,
    opium: /鸦片|鴉片|阿片|烟土|烟毒|毒品|洋烟|毒烟|大烟/,
    crisis: /白银.{0,10}(外流|流失|流出|运走)|银两.{0,8}(外流|流失|流出)|银子.{0,8}(流出|流走|外流)|(?:换走|赚走|带走).{0,8}(白银|银子|银两)|银荒|银贵钱贱|财政.{0,6}(危机|困难|紧张|亏空|恶化|压力)|国库.{0,6}(空虚|亏空|减少|没钱)|军纪.{0,5}(败坏|涣散)|军队.{0,6}(衰弱|战斗力|腐败)|民生.{0,5}(凋敝|危机|恶化)|社会.{0,5}(危机|问题)|税收.{0,5}(减少|困难)|(?:这些|上述|国内)?危机/,
    ban: /虎门[销消焚烧]烟|林则徐.{0,12}(禁烟|销烟|销毁|烧毁|烧掉)|禁烟|销毁.{0,8}(鸦片|毒品)|查禁.{0,5}鸦片|打击.{0,5}鸦片|禁止.{0,5}鸦片|虎门.{0,10}(销毁|烧毁|焚毁|毁掉)/,
    war: /侵华|侵略中国|发动.{0,8}(战争|进攻)|开战|出兵|战争爆发|战争.{0,3}(爆发|打响)|攻打中国|进攻中国|派.{0,6}(军队|舰队)|军事进攻|武力.{0,8}(进攻|打开|攻打)|打仗|战败|战后|战争结束/,
    aftermath: /南京条约|不平等条约|割地|赔款|割让香港|通商口岸|五口通商|半殖民地|主权.{0,5}(受损|破坏)|中国.{0,6}战败|清朝.{0,6}战败/
  };
  const normalize = raw => String(raw).normalize('NFKC').replace(/[\t ]+/g, '').replace(/工業/g, '工业').replace(/英國/g, '英国').replace(/戰爭/g, '战争');
  const hasAnswerContent = raw => /[\p{L}\p{N}]/u.test(String(raw));
  const sentences = raw => normalize(raw).split(/[。！？!?；;\n]+/).filter(Boolean);
  const concepts = text => Object.keys(patterns).filter(key => patterns[key].test(text));
  const relationCue = /导致|推动|促使|迫使|引发|造成|扩大|增加|签订|借|因此|因而|于是|从而|加剧|使得|使|借口|借机|借此|借题发挥|为由|所以|因为|由于|缘于|源于|出于|为了|为.{0,12}而|以便|以此|带来|带走|换走|赚走|换取|涌入|损害|危及|威胁|刺激|满足|打开|急需|需要|寻找|寻求|获取|抢占|决定|要求|被迫|→/;
  const negativeRelation = /并未|并没有|没有|不会|不能|不曾|不可能|并非|无关|不是|不导致|未导致|未推动/;
  function affirmativeConcept(text, key) {
    if (!patterns[key].test(text)) return false;
    const matches = [...text.matchAll(new RegExp(patterns[key].source, 'g'))];
    return matches.some(match => {
      const before = text.slice(Math.max(0, match.index - 10), match.index).split(/[，,。；;]/).at(-1);
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 12).split(/[，,。；;]/)[0];
      return !/(没有|并未|不曾|未曾|无需|不需要|未完成|没有完成|并非|不是)$/.test(before) && !/^(并未|没有|并没有|不曾).{0,5}(发生|出现|完成|带来|推动|促使|导致)/.test(after);
    });
  }
  function analyze(raw) {
    const text = normalize(raw), clauses = sentences(raw);
    const found = Object.fromEntries(Object.keys(patterns).map(key => [key, affirmativeConcept(text, key)]));
    const relations = [];
    // Bridge “因为 A。……所以 B” without treating unrelated neighboring noun lists as causal.
    const units = [...clauses];
    clauses.forEach((clause, i) => { if (i > 0 && /^(所以|因此|因而|于是|这使|这让|为此)/.test(clause)) units.push(clauses[i - 1] + '，' + clause); });
    for (const unit of units) {
      const ids = concepts(unit);
      if (ids.length < 2 || !relationCue.test(unit)) continue;
      const parts = unit.split(/[，,]/);
      const denied = parts.some(part => negativeRelation.test(part) && relationCue.test(part));
      if (denied) continue;
      const mentions = ids.flatMap(id => [...unit.matchAll(new RegExp(patterns[id].source, 'g'))].map(match => ({ id, index: match.index, end: match.index + match[0].length }))).sort((a, b) => a.index - b.index);
      for (let i = 0; i < mentions.length - 1; i++) {
        if (mentions[i].id === mentions[i + 1].id) continue;
        // A single “因为” before a noun list must not manufacture a whole causal chain.
        const local = unit.slice(mentions[i].index, mentions[i + 1].end);
        const prefix = unit.slice(Math.max(0, mentions[i].index - 4), mentions[i].index);
        const borrowedPretext = mentions[i].id === 'ban' && mentions[i + 1].id === 'war' && /借|以/.test(prefix);
        const borrowedPurpose = mentions[i].id === 'trade' && mentions[i + 1].id === 'opium' && /^为(?:了)?.{0,12}(改变|扭转|解决).{0,15}(逆差|入超)/.test(unit);
        if (!relationCue.test(local) && !/因为|由于|为了/.test(prefix) && !borrowedPretext && !borrowedPurpose) continue;
        const pair = [mentions[i].id, mentions[i + 1].id].sort().join(':');
        if (!relations.some(item => item.pair === pair)) relations.push({ pair, evidence: unit });
      }
    }
    return { text, clauses, found, relations };
  }
  function countRelations(raw) { return analyze(raw).relations.length; }
  function gradeConnection(index, raw) {
    if (!hasAnswerContent(raw)) return null;
    const a = analyze(raw), { found: f, relations } = a;
    if (contradictions(a.text).length || chronologyIssues(a.text).length || wrongRoot(a.text)) return 0;
    const related = (x, y) => relations.some(r => r.pair === [x, y].sort().join(':'));
    const correct = [
      f.trade && (f.industry || f.expansion) && (related('industry', 'trade') || related('expansion', 'trade')),
      f.trade && f.crisis && (related('trade', 'crisis') || related('trade', 'opium') && related('opium', 'crisis')),
      f.crisis && f.ban && related('crisis', 'ban'),
      f.ban && f.war && related('ban', 'war')
    ];
    return correct[index] ? 1 : 0;
  }
  function wrongRoot(text) {
    const clauses = sentences(text);
    return clauses.some((sentence, i) => {
      if (/有人说|有人认为|有观点认为/.test(sentence) && /不正确|不准确|错误|不成立|并非|不是|不认同/.test(clauses[i + 1] || '')) return false;
      if (/不正确|不准确|错误|不成立|不能.{0,6}(认为|看作|归结)|并非|不是|不认同/.test(sentence)) return false;
      return /(?:虎门[销消]烟|禁烟)(?:就是|才是|是|为|属于)[^，,：:、]{0,4}(?:根本原因|根本动因|深层原因)|(?:根本原因|根本动因)(?:就是|是|为)[^，,：:、]{0,4}(?:虎门[销消]烟|禁烟)/.test(sentence);
    });
  }
  function contradictions(text) {
    const issues = [];
    for (const sentence of sentences(text)) {
      // A rejection of the quoted claim does not cancel a later, independent false claim.
      const parts = sentence.split(/[，,]/);
      for (const part of parts) {
        if (/(并非|不是|不能说|并不是|不等于)/.test(part)) continue;
        if (/(中国|清朝|清政府).{0,7}(对英|贸易).{0,4}(逆差|入超)|英国.{0,7}(对华|贸易).{0,4}(顺差|出超)/.test(part)) issues.push('战前正常商品贸易的顺逆差方向可能颠倒。');
        if (/(没有|未|不曾).{0,5}(完成工业革命|工业革命|发生工业革命)|不需要.{0,6}(海外市场|对外扩张)/.test(part)) issues.push('工业发展与扩张需求的判断方向存在冲突。');
        if (/鸦片.{0,10}(没有|未|不会).{0,6}(白银外流|财政危机)|白银.{0,5}(没有|并未).{0,4}(外流|流失)/.test(part)) issues.push('鸦片输入与财政压力的判断方向存在冲突。');
        if (/英国.{0,5}(没有|并未|未曾).{0,8}(借|出兵|发动)/.test(part)) issues.push('英国借禁烟冲突发动战争的判断方向存在冲突。');
        if (/(鸦片|禁烟|战争).{0,8}(导致|促使|引发).{0,8}工业革命/.test(part)) issues.push('长期工业动因与后续事件的推动方向颠倒。');
      }
    }
    return [...new Set(issues)];
  }
  function chronologyIssues(text) {
    const issues = [];
    if (/战争(?:爆发)?(?:导致|引发|促使|之后才).{0,8}虎门[销消]烟|南京条约(?:的签订)?(?:导致|引发|促使).{0,8}(战争爆发|开战)|虎门[销消]烟.{0,5}(发生在|是在|晚于).{0,5}(战争之后|开战之后)/.test(text)) issues.push('禁烟、战争爆发与战后条约的先后关系存在倒置。');
    const dateChecks = [[/虎门[销消]烟|林则徐.{0,4}销烟/, 1839], [/战争爆发|发动侵华战争|鸦片战争爆发/, 1840], [/签订.{0,5}南京条约|南京条约.{0,3}签订/, 1842]];
    // Inspect local event/date pairs. Merely listing three years is never evidence of correctness.
    for (const clause of text.split(/[，,。；;\n]/)) {
      const date = clause.match(/(18\d{2})年/);
      if (!date) continue;
      for (const [pattern, expected] of dateChecks) if (pattern.test(clause) && +date[1] !== expected) issues.push('具体事件的年份与史实不一致。');
    }
    return [...new Set(issues)];
  }
  function layerConcepts(index, analysis) {
    const { found: f, text } = analysis;
    if (index === 0) return f.ban && /虎门[销消焚烧]烟|林则徐.{0,15}(销毁|烧毁|焚毁|毁掉|烧掉).{0,8}(鸦片|毒品|烟土)|虎门.{0,15}(销毁|烧毁|焚毁|毁掉)/.test(text);
    if (index === 1) return f.ban && f.war && /英|殖民者/.test(text) && /借|为由|以.{0,18}(名义|为名)|报复|保护.{0,8}(贸易|利益|商人)|利益.{0,6}(受损|损害)|决定|蓄意/.test(text);
    if (index === 2) return f.opium && f.crisis;
    if (index === 3) return f.trade;
    return f.industry && f.expansion;
  }
  function validateLayer(index, raw) {
    const analysis = analyze(raw), { text } = analysis;
    if (!hasAnswerContent(raw)) return { ok: false, type: 'empty', message: '请填写作答文字，只有标点或空格无法评分。也可以查看一级轻提示。' };
    const issues = contradictions(text);
    if (issues.length || wrongRoot(text)) return { ok: false, type: 'fact', message: `再核对一下：${issues[0] || '具体禁烟事件与长期扩张动因不能放在同一层级。'}请检查因果方向。` };
    if (layerConcepts(index, analysis)) return { ok: true, type: 'success', message: '意思与本层关键概念相符，已通过。无须改写成标准原句。' };
    if ([0, 1, 2, 3, 4].some(i => i !== index && layerConcepts(i, analysis))) return { ok: false, type: 'level', message: '【逻辑层级错误】当前内容更接近其他层级。请回到本层的问题，想想它要解释的是什么。' };
    return { ok: false, type: 'incorrect', message: '本次作答未答到这一层的关键要点，本题得分为 0 分。请结合本层问题补充说明，也可以查看提示后再试。' };
  }
  function gradeEssay(raw) {
    if (!hasAnswerContent(raw)) return null;
    const a = analyze(raw), { text, found: f, relations } = a;
    const facts = contradictions(text), orderIssues = chronologyIssues(text), rootError = wrongRoot(text);
    const related = (x, y) => relations.some(r => r.pair === [x, y].sort().join(':'));
    const root = f.industry && f.expansion && (related('industry', 'expansion') || /根本|深层|底层/.test(text));
    const trigger = f.ban && (related('ban', 'war') || a.clauses.some(c => patterns.ban.test(c) && /导火索|诱因|借口|触发|直接原因/.test(c) && !wrongRoot(c)));
    // Award recognized scoring points; incorrect or missing points receive zero.
    let distinction = rootError ? 0 : root && trigger ? 4 : root || trigger ? 2 : 0;
    if (facts.length) distinction = 0;
    const eventCount = ['crisis', 'ban', 'war', 'aftermath'].filter(key => f[key]).length;
    const chronology = orderIssues.length ? 0 : eventCount >= 3 && related('ban', 'war') && (f.aftermath ? related('war', 'aftermath') : related('crisis', 'ban')) ? 3 : eventCount >= 2 && relations.some(r => /ban|war|aftermath/.test(r.pair)) ? 2 : 0;
    const causalEdges = [['industry', 'expansion'], ['expansion', 'trade'], ['trade', 'opium'], ['opium', 'crisis'], ['crisis', 'ban'], ['ban', 'war'], ['war', 'aftermath']];
    const identified = causalEdges.filter(([x, y]) => related(x, y));
    // Three distinct, relevant links meet the 3-point rubric, regardless of sentence boundaries.
    let transmission = Math.min(3, identified.length);
    if (orderIssues.length || facts.length || rootError) transmission = Math.min(transmission, 1);
    const dimensions = [distinction, chronology, transmission];
    return {
      total: dimensions.reduce((sum, n) => sum + n, 0), dimensions,
      notes: [rootError ? '发现将禁烟事件认作根本动因的表述。' : facts[0] || `长期动因${root ? '已答到' : '未答到'}；禁烟事件与开战的联系${trigger ? '已答到' : '未答到'}。`, orderIssues[0] || (chronology === 3 ? '已识别事件间的先后证据；论证倒叙不单独扣分。' : '事件先后关系尚未完整说明，请补充事件间的联系，不要求必须写年份。'), `已识别 ${identified.length} 组相关传导关系，错误或未答到的要点计 0 分。不按指定句式或固定连接词评分。`],
      evidence: { concepts: Object.keys(f).filter(key => f[key]), relations, issues: [...facts, ...orderIssues, ...(rootError ? ['将禁烟事件认作根本动因'] : [])] },
      method: 'concept-relations-v3', needsTeacherReview: false
    };
  }
  function firstUnfinishedLayer(items) { const i = items.findIndex(item => !item.ok && !item.skipped); return i < 0 ? items.length : i; }
  function resolvePage(state, requested) {
    if (requested === 'pre') return 'pre';
    if (!state.pre && !state.skippedPre) return 'pre';
    if (requested === 'canvas') return 'canvas';
    if (!state.trained && !state.trainingFinished && !state.skippedTraining) return 'canvas';
    if (requested === 'post') return 'post';
    if (requested === 'map' && (state.skippedPost || state.submissions?.post.attempts.length)) return 'map';
    return state.post || state.skippedPost ? 'report' : 'post';
  }
  const api = { analyze, hasAnswerContent, validateLayer, gradeEssay, gradeConnection, countRelations, firstUnfinishedLayer, resolvePage };
  scope.HistoryAssessment = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
