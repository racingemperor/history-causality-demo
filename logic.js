(function (scope) {
  'use strict';
  const layers = [
    { id: 'spark', title: '表层诱因', subtitle: '最直观、即刻引发局势变化的事件', question: '是哪一个具体事件，让禁烟冲突走到了台前？', hints: ['把目光放到 1839 年的广东：一场公开销毁违禁品的行动，引起英国方面的强烈反应。', '想想林则徐在珠江口主持的那次行动。请写出事件，而不是发动战争的长期目的。'], groups: [[/虎门销烟/, /林则徐.{0,12}(销毁|销烟|焚烧).{0,6}鸦片/, /虎门.{0,8}(销毁|焚烧).{0,5}鸦片/]] },
    { id: 'direct', title: '直接原因', subtitle: '冲突怎样被转化为开战的借口与行动', question: '英国如何对待禁烟冲突，又作出了什么选择？', hints: ['一次冲突不会自动变成战争。想想英国政府如何回应中国的禁烟行动。', '从“禁烟冲突”到“军事行动”，中间有谁的主动决策？它如何把保护贸易利益作为出兵的借口？'], groups: [[/英国/, /英政府/, /英方/], [/禁烟/, /销烟/, /鸦片冲突/], [/借口/, /借机/, /借此/, /以.{0,15}为由/, /蓄意/, /保护.{0,8}(贸易|利益)/], [/发动.{0,8}(战争|侵华|进攻)/, /出兵/, /侵略/, /侵华/, /开战/, /军事行动/]] },
    { id: 'crisis', title: '中层核心矛盾', subtitle: '长期积累的财政压力与社会危机', question: '鸦片输入，给清朝内部造成了怎样的压力？', hints: ['换一个视角，观察清朝国内：这种走私商品，如何影响钱、国家财政和人的生活？', '把两条线连起来：购买鸦片使用的贵金属流向哪里？长期吸食又如何影响社会与军队？'], groups: [[/鸦片/, /烟毒/, /毒品/], [/白银.{0,8}(外流|流出|流失)/, /银两.{0,8}(外流|流出)/, /银荒/], [/财政/, /军队/, /军纪/, /民生/, /社会/, /健康/, /国库/, /银贵钱贱/]] },
    { id: 'trade', title: '间接原因', subtitle: '中英贸易格局中的长期冲突', question: '正常商品贸易中，英国面临什么困境？', hints: ['战前，英国大量购买中国的茶叶、丝绸等商品。反过来，英国工业品在中国的销路如何？', '比较英国的买入与卖出：当进口多、出口少，贵金属流向对方时，这种贸易处境叫什么？注意说明是哪一方。'], groups: [[/英国/, /英方/, /中英/, /英对华/], [/逆差/, /入超/, /(进口|买入).{0,8}(大于|多于|超过).{0,8}(出口|卖出)/, /(出口|卖出).{0,8}(小于|少于).{0,8}(进口|买入)/, /中国.{0,6}顺差/, /工业品.{0,8}(滞销|难以|受阻|打不开)/]] },
    { id: 'root', title: '深层根本原因', subtitle: '时代与生产力背后的扩张动因', question: '回到英国：什么变化，催生了持续的对外扩张需求？', hints: ['18 世纪后期以来，英国经历了一场改变生产力的重大变革。想想它怎样改变了对外需求。', '这场变革大幅提升工业产能。更多的产品需要卖到哪里？机器生产所需的原料，又从哪里获得？'], groups: [[/英国/, /英方/], [/工业革命/, /工业化/, /机器大生产/, /工业产能/], [/市场/, /销路/, /原料/, /殖民/, /对外扩张/, /海外扩张/]] }
  ];
  const matches = (text, groups) => groups.every(group => group.some(pattern => pattern.test(text)));
  const normalized = text => String(text).replace(/\s+/g, '').replace(/[，,]/g, '，');
  function validateLayer(index, raw) {
    const text = normalized(raw);
    if (!text) return { ok: false, type: 'empty', message: '先写下你的想法，不确定也没关系。你也可以先查看一级轻提示。' };
    if (/(没有|未曾|不曾|未|不需要|无需|并非|不是).{0,5}(完成工业革命|工业革命|扩张市场|海外市场|白银外流|贸易逆差|虎门销烟)/.test(text)) return { ok: false, type: 'fact', message: '再检查一下判断方向：你的否定表述与这一层的历史事实可能有冲突。请重新组织因果关系。' };
    const belongs = layers.findIndex(layer => matches(text, layer.groups));
    if (index > 0 && /虎门销烟.{0,7}(根本原因|根本动因)/.test(text)) return { ok: false, type: 'level', message: '【逻辑层级错误】一个具体事件能解释长期的扩张动因吗？请区分事件与根本动因，再试一次。' };
    if (matches(text, layers[index].groups)) return { ok: true, type: 'success', message: '这一层的关键关系已识别。保留你的表述，继续追问下一层。' };
    if (belongs >= 0 && belongs !== index) return { ok: false, type: 'level', message: '【逻辑层级错误】你当前填写的内容更接近其他维度。请重新思考本层的因果定位，也可以点击提示获取启发。' };
    return { ok: false, type: 'incomplete', message: '暂未识别出本层完整的关键关系。试着补充“谁、发生了什么、带来什么变化”。若意思已完整，可保留原文交由教师复核。' };
  }
  const conceptPatterns = [/工业革命|工业化|机器生产/, /市场|原料|扩张|殖民/, /逆差|入超|滞销|销路/, /鸦片|走私/, /白银|财政|军纪|民生/, /禁烟|虎门销烟/, /发动.{0,5}战争|侵华|开战|出兵|战争爆发/, /南京条约|赔款|割地|通商口岸|半殖民地/];
  function countRelations(raw) {
    const clauses = String(raw).split(/[。；;\n]/).filter(Boolean);
    return clauses.filter(clause => /(导致|推动|促使|迫使|引发|造成|因此|因而|于是|从而|加剧|使得|使|借口|借机|为.{0,12}以|→|所以)/.test(clause) && conceptPatterns.filter(pattern => pattern.test(clause)).length >= 2).length;
  }
  function gradeEssay(raw) {
    const text = normalized(raw);
    if (!text) return null;
    const sentences = text.split(/[。；;\n]/);
    const rejectsClaim = /不正确|不准确|不成立|错误|并非|不是|不能认为|不认同/.test(text);
    const root = sentences.some(s => /工业革命|工业化/.test(s) && /市场|原料|扩张|殖民/.test(s) && /根本|深层|底层/.test(s));
    const trigger = sentences.some(s => /(虎门销烟|禁烟)/.test(s) && /(导火索|直接诱因|表层|借口|触发)/.test(s));
    const wrongRoot = /虎门销烟.{0,8}(是|为).{0,3}根本原因/.test(text) && !rejectsClaim;
    const distinction = wrongRoot ? 0 : (root ? 2 : 0) + (trigger ? 2 : 0);
    // Evaluate narrated order using the concrete event/decision phrases, not every mention of “战争”.
    const anchors = [text.search(/工业革命|工业化/), text.search(/逆差|入超|滞销/), text.search(/白银.{0,8}(外流|流出)|财政危机/), text.search(/林则徐.{0,6}(禁烟|销烟)|1839|虎门销烟/), text.search(/1840|发动.{0,8}(战争|侵华)|出兵侵华|战争爆发/), text.search(/1842|南京条约/)];
    const positions = anchors.filter(value => value >= 0);
    const hasReversal = /战争.{0,8}(导致|引发|促使|之后才).{0,6}虎门销烟|南京条约.{0,8}(导致|引发|促使).{0,6}(战争爆发|开战)/.test(text);
    let chronology = 0;
    if (!hasReversal && positions.length >= 3) {
      // Argument essays can open with the disputed event; date and event-order evidence are also accepted.
      const chronological = positions.every((value, i) => i === 0 || value >= positions[i - 1]);
      if (chronological) chronology = positions.length >= 5 ? 3 : 2;
      else if (/1839/.test(text) && /1840/.test(text) && /1842/.test(text)) chronology = 3;
      else chronology = 1;
    } else if (!hasReversal && positions.length === 2 && positions[1] > positions[0]) chronology = 1;
    const relations = Math.min(3, countRelations(raw));
    return { total: distinction + chronology + relations, dimensions: [distinction, chronology, relations], notes: [wrongRoot ? '仍把具体事件认定为根本原因，需重新区分层级。' : `根本动因的明确论述${root ? '已识别' : '待补充'}；导火索的明确定位${trigger ? '已识别' : '待补充'}。`, hasReversal ? '发现事件倒置的表述，请核对先后关系。' : chronology === 3 ? '已识别较完整的时序证据。' : '可补充连续事件顺序或明确年份；论证倒叙可能需要教师复核。', `已识别 ${countRelations(raw)} 处含两个以上要素的推动关系。请关注关系是否成立。`], method: 'local-rules-v1', needsTeacherReview: true };
  }
  const api = { layers, validateLayer, gradeEssay, countRelations };
  scope.HistoryLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
