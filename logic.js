(function (scope) {
  'use strict';
  const layers = [
    { id: 'spark', title: '表层诱因', subtitle: '最直观、即刻引发局势变化的事件', question: '是哪一个具体事件，让禁烟冲突走到了台前？', hints: ['把目光放到 1839 年的广东：一场公开销毁违禁品的行动，引起英国方面的强烈反应。', '想想林则徐在珠江口主持的那次行动。请写出事件，而不是发动战争的长期目的。'] },
    { id: 'direct', title: '直接原因', subtitle: '冲突怎样被转化为开战的借口与行动', question: '英国如何对待禁烟冲突，又作出了什么选择？', hints: ['一次冲突不会自动变成战争。想想英国政府如何回应中国的禁烟行动。', '从“禁烟冲突”到“军事行动”，中间有谁的主动决策？它如何把保护贸易利益作为出兵的借口？'] },
    { id: 'crisis', title: '中层核心矛盾', subtitle: '长期积累的财政压力与社会危机', question: '鸦片输入，给清朝内部造成了怎样的压力？', hints: ['换一个视角，观察清朝国内：这种走私商品，如何影响钱、国家财政和人的生活？', '把两条线连起来：购买鸦片使用的贵金属流向哪里？长期吸食又如何影响社会与军队？'] },
    { id: 'trade', title: '间接原因', subtitle: '中英贸易格局中的长期冲突', question: '正常商品贸易中，英国面临什么困境？', hints: ['战前，英国大量购买中国的茶叶、丝绸等商品。反过来，英国工业品在中国的销路如何？', '比较英国的买入与卖出：当进口多、出口少，贵金属流向对方时，这种贸易处境叫什么？注意说明是哪一方。'] },
    { id: 'root', title: '深层根本原因', subtitle: '时代与生产力背后的扩张动因', question: '回到英国：什么变化，催生了持续的对外扩张需求？', hints: ['18 世纪后期以来，英国经历了一场改变生产力的重大变革。想想它怎样改变了对外需求。', '这场变革大幅提升工业产能。更多的产品需要卖到哪里？机器生产所需的原料，又从哪里获得？'] }
  ];
  const assessment = typeof module !== 'undefined' && module.exports ? require('./assessment.js') : scope.HistoryAssessment;
  const api = { layers, ...assessment };
  scope.HistoryLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
