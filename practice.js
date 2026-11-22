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
  function revealAnswer(target) {
    target.answerVisible = true;
    return true;
  }
  function revealAfterPost(session) {
    if (!session.submissions.post.attempts.length) return;
    [...Object.values(session.submissions), ...session.items].forEach(target => { target.answerVisible = true; });
  }
  const scoreLayer = result => result.type === 'empty' ? null : result.ok ? 1 : 0;
  function summarizePractice(session) {
    const scores = [...session.items.map(item => item.feedback ? scoreLayer(item.feedback) : null), ...(session.linkResults || [null, null, null, null])].filter(score => score !== null);
    return { earned: scores.length ? scores.reduce((sum, score) => sum + score, 0) : null, graded: scores.length, maximum: 9 };
  }
  const api = { createSession, submitAttempt, revealAnswer, revealAfterPost, scoreLayer, summarizePractice };
  scope.HistoryPractice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
