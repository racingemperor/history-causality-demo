const { test } = require('node:test');
const assert = require('node:assert/strict');
const { layers, validateLayer, gradeEssay, gradeConnection, referenceAnswers } = require('./logic.js');
const { createSession, submitAttempt, revealAnswer, revealAfterPost, scoreLayer, essayScoreSummary } = require('./practice.js');

test('partial scores remain visible without treating unresolved dimensions as zero', () => {
  const result = gradeEssay('英国工业革命后需要开拓市场。');
  assert.deepEqual(result.dimensions, [2, null, 1]);
  assert.equal(result.total, null);
  const summary = essayScoreSummary(result);
  assert.equal(summary.heading, '已识别得分 3 分');
  assert.equal(summary.compact, '3–6');
  assert.match(summary.description, /3 分待复核/);
  assert.match(summary.description, /不按零分/);
});

test('unknown wording is explained without inventing a zero or a final score', () => {
  const result = gradeEssay('生产结构变迁与帝国利益的外向投射，在外交危机中交汇。');
  assert.equal(essayScoreSummary(result).heading, '暂未识别到可评分依据');
  assert.equal(essayScoreSummary(result).compact, '待补充');
  assert.match(essayScoreSummary(result).description, /补充/);
  assert.equal(essayScoreSummary(gradeEssay(referenceAnswers.pre)).heading, '参考得分 10 / 10');
});

test('pre-test offers optional answers and repeated pre-test submissions never force them open', () => {
  const session = createSession(layers), target = session.submissions.pre;
  assert.equal(revealAnswer(target), false);
  submitAttempt(target, { text: '第一次作答', result: { total: 2 } });
  assert.equal(target.answerVisible, false);
  assert.equal(session.submissions.post.attempts.length, 0);
  assert.equal(revealAnswer(target), true);
  target.answerVisible = false;
  submitAttempt(target, { text: '第二次作答', result: { total: 4 } });
  assert.equal(target.answerVisible, false);
  assert.equal(target.attempts[0].result.total, 2);
  assert.equal(session.submissions.post.answerVisible, false);
});

test('the first post-test submission reveals every answer including skipped questions', () => {
  const session = createSession(layers);
  revealAfterPost(session);
  assert.ok(session.items.every(item => !item.answerVisible));
  submitAttempt(session.submissions.post, { text: '后测作答', result: { total: 10 } });
  revealAfterPost(session);
  assert.ok([...Object.values(session.submissions), ...session.items].every(item => item.answerVisible));
  assert.equal(session.items[0].attempts.length, 0);
  session.items[0].answerVisible = false;
  assert.equal(revealAnswer(session.items[0], true), true);
  assert.equal(session.submissions.post.attempts.length, 1);
});

test('a new page session starts at the first blank attempt without sharing old answers or hints', () => {
  const prior = createSession(layers);
  prior.page = 'report'; prior.preText = '旧答案'; prior.items[0].hints = 2;
  submitAttempt(prior.items[0], { text: '首次' }); submitAttempt(prior.items[0], { text: '重交' });
  const fresh = createSession(layers);
  assert.equal(fresh.page, 'pre'); assert.equal(fresh.preText, ''); assert.equal(fresh.active, 0);
  assert.ok(fresh.items.every(item => item.attempts.length === 0 && !item.answerVisible && item.hints === 0));
  assert.ok(Object.values(fresh.submissions).every(record => record.attempts.length === 0 && !record.answerVisible));
});

test('layer scores accept equivalent wording and keep unknown semantics pending', () => {
  assert.equal(scoreLayer(validateLayer(0, '林则徐烧掉了缴获的烟土')), 1);
  assert.equal(scoreLayer(validateLayer(4, '虎门销烟')), 0);
  assert.equal(scoreLayer(validateLayer(4, '生产结构的外向投射改变了外交取向')), null);
});

test('connection scores require the requested causal link and distinguish unknown from factual error', () => {
  const answers = [
    '英国工业革命使海外市场需求扩大，但英国对华贸易逆差，所以要求改变贸易局面。',
    '为了改变英国对华贸易逆差，商人走私鸦片。鸦片导致白银外流和财政危机。',
    '鸦片导致白银外流，财政危机促使清政府禁烟。',
    '英国借禁烟冲突发动侵华战争。'
  ];
  answers.forEach((answer, i) => assert.equal(gradeConnection(i, answer), 1));
  assert.equal(gradeConnection(0, '英国借禁烟冲突发动侵华战争'), null);
  assert.equal(gradeConnection(1, '中国对英贸易逆差导致财政危机'), 0);
  assert.equal(gradeConnection(2, ''), null);
});

test('reference essays and five layer answers satisfy their own published scoring criteria', () => {
  assert.equal(gradeEssay(referenceAnswers.pre).total, 10);
  assert.equal(gradeEssay(referenceAnswers.post).total, 10);
  referenceAnswers.layers.forEach((answer, i) => assert.equal(validateLayer(i, answer).ok, true));
  referenceAnswers.connections.forEach((answer, i) => assert.equal(gradeConnection(i, answer), 1));
});
