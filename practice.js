(function (scope) {
  'use strict';
  const record = () => ({ attempts: [], answerVisible: false });
  function createSession(layers) {
    return {
      page: 'pre', preText: '', postText: '', pre: null, post: null,
      skippedPre: false, skippedPost: false, skippedTraining: false, skippedLinks: false,
      trainingFinished: false, trained: false, active: 0,
      items: layers.map(() => ({ text: '', hints: 0, ok: false, skipped: false, feedback: null, ...record() })),
      methodHints: { pre: 0, post: 0, connections: 0 }, links: ['', '', '', ''], linkResults: null,
      submissions: { pre: record(), post: record(), connections: record() }
    };
  }
  function submitAttempt(target, attempt) {
    target.attempts.push(attempt);
  }
  function revealAnswer(target, postSubmitted = false) {
    if (target.attempts.length === 0 && !postSubmitted) return false;
    target.answerVisible = true;
    return true;
  }
  function revealAfterPost(session) {
    if (!session.submissions.post.attempts.length) return;
    [...Object.values(session.submissions), ...session.items].forEach(target => { target.answerVisible = true; });
  }
  const scoreLayer = result => result.ok ? 1 : ['fact', 'level'].includes(result.type) ? 0 : null;
  function essayScoreSummary(result) {
    if (result.total !== null) return { heading: `参考得分 ${result.total} / 10`, compact: String(result.total), description: '' };
    if (result.dimensions.every(n => n === null)) return {
      heading: '暂未识别到可评分依据', compact: '待补充',
      description: '目前无法确认这段表述中的历史要素与推动关系，不记为零分。请补充具体事件、背景或它们之间的联系，再提交评分；也可查看提示或保留原文供教师复核。'
    };
    const confirmed = result.dimensions.reduce((sum, n) => sum + (n ?? 0), 0);
    const pending = result.dimensions.reduce((sum, n, i) => sum + (n === null ? [4, 3, 3][i] : 0), 0);
    return {
      heading: `已识别得分 ${confirmed} 分`, compact: `${confirmed}–${confirmed + pending}`,
      description: `另有 ${pending} 分待复核，当前参考范围 ${confirmed}–${confirmed + pending} / 10。待复核的部分不按零分处理，可补充论证后再次提交。`
    };
  }
  const api = { createSession, submitAttempt, revealAnswer, revealAfterPost, scoreLayer, essayScoreSummary };
  scope.HistoryPractice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
