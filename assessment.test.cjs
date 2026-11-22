const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateLayer, gradeEssay, resolvePage, firstUnfinishedLayer } = require('./logic.js');

test('punctuation-only input is not a submitted answer', () => {
  for (const answer of ['', '   ', '。', '，！？… ——\n', '...!?', '🎓']) {
    assert.equal(gradeEssay(answer), null);
    assert.equal(validateLayer(0, answer).type, 'empty');
  }
});

const paraphrases = [
  [0, '虎门消烟'], [0, '林则徐烧掉了缴获的烟土'], [0, '在虎门把收缴的鸦片销毁了'],
  [1, '英方以保护鸦片贸易为名，借中国禁烟之机派舰队来华'],
  [1, '英国拿禁烟当借口，决定出兵'],
  [1, '英国为报复禁烟发动战争'],
  [2, '大烟换走了中国的银子，国库越来越空'],
  [2, '鸦片流入，银两流失，军队和财政受到损害'],
  [2, '洋烟走私造成白银大量外流'],
  [3, '英国买中国的东西多，卖给中国的东西少'],
  [3, '英国商品在中国卖不动'], [3, '英国对华贸易入超'],
  [4, '机器制造使商品增加，需要更多外国买家和原材料'],
  [4, '资本主义发展需要开拓海外市场'],
  [4, '工业化后要把商品卖出去，还要获取原料']
];
for (const [index, answer] of paraphrases) test(`accepts paraphrase: ${answer}`, () => assert.equal(validateLayer(index, answer).ok, true));

const essays = [
  '工业化让英国需要海外市场和原料。但英国商品在中国卖不动，贸易逆差促使商人走私鸦片。鸦片换走大量白银，财政危机推动清朝禁烟。林则徐虎门销烟以后，英国拿禁烟当借口出兵。战败使清政府签下南京条约，被迫割地赔款。',
  '有人说：“虎门销烟是根本原因”。这个观点不正确。英国机器生产发展，需要寻找商品销路和工业原料。英国对华贸易入超，因而贩卖鸦片。烟毒导致银两外流，财政困难于是促使政府查禁鸦片。英国以禁烟为由发动侵华战争。战争结束后，中国被迫签订南京条约。',
  '英国借禁烟冲突发动侵华战争，战后清朝被迫签订南京条约。禁烟又是因为鸦片输入引发白银外流和财政危机。英国走私鸦片，是为了改变贸易逆差。再往深处看，工业革命使英国急需更多海外市场和原料。'
];
for (const [i, essay] of essays.entries()) test(`complete argument ${i + 1} receives full credit without fixed wording or order`, () => assert.deepEqual(gradeEssay(essay).dimensions, [4, 3, 3]));
test('every valid essay receives bounded numeric dimension scores and a summed total', () => {
  const answers = ['秦始皇修建长城。', '因为所以因此推动', '1840', '虎门销烟是导火索。', '英国工业革命后需要开拓市场。', ...essays];
  for (const answer of answers) {
    const result = gradeEssay(answer);
    result.dimensions.forEach((score, i) => assert.ok(Number.isInteger(score) && score >= 0 && score <= [4, 3, 3][i]));
    assert.equal(result.total, result.dimensions.reduce((sum, n) => sum + n, 0));
  }
});
test('answers without recognized scoring points receive zero instead of pending review', () => {
  assert.equal(validateLayer(4, '机器带来的经济外向性改变了帝国的资源获取策略').type, 'incorrect');
  const result = gradeEssay('生产结构变迁与帝国利益的外向投射，在外交危机中交汇。');
  assert.equal(result.total, 0);
  assert.deepEqual(result.dimensions, [0, 0, 0]);
  assert.equal(result.needsTeacherReview, false);
});
test('wrong trade direction and denied economic harm never pass', () => {
  assert.equal(validateLayer(3, '中国对英贸易逆差').ok, false);
  assert.equal(validateLayer(2, '鸦片并未造成白银外流和财政危机').ok, false);
});
test('mentioning all years does not excuse reversed dates', () => {
  const result = gradeEssay('英国工业革命后需要海外市场。1839年战争爆发。1840年虎门销烟导致英国出兵。1842年签订南京条约。');
  assert.equal(result.dimensions[1], 0);
});
test('an unrelated rejection does not cancel a later root-cause error', () => {
  const result = gradeEssay('说英国没有工业革命是不正确的。虎门销烟是根本原因。');
  assert.equal(result.dimensions[0], 0);
});
test('separate trigger and root-cause clauses do not manufacture a root-cause error', () => {
  for (const separator of ['，', ',']) {
    const distinction = `虎门销烟是导火索${separator}根本动因是工业发展带来的扩张需求。`;
    assert.deepEqual(gradeEssay(essays[0] + distinction).dimensions, [4, 3, 3]);
  }
  assert.equal(gradeEssay('贸易逆差是中间矛盾，虎门销烟是战争的根本原因。').dimensions[0], 0);
});
test('a leading causal word does not turn a noun list into a full argument', () => {
  const result = gradeEssay('因为工业革命、海外市场、贸易逆差、鸦片、财政危机、虎门销烟、发动侵华战争、南京条约。');
  assert.notEqual(result.total, 10);
  assert.notEqual(result.dimensions[2], 3);
});
test('an explicit denial of the trigger does not pass as the trigger', () => assert.equal(validateLayer(0, '没有虎门销烟').ok, false));
test('future pages stay gated until completion or an explicit skip', () => {
  const state = { items: Array.from({length:5}, () => ({ok:false, skipped:false})) };
  assert.equal(resolvePage(state, 'report'), 'pre');
  state.skippedPre = true; assert.equal(resolvePage(state, 'post'), 'canvas');
  state.skippedTraining = true; assert.equal(resolvePage(state, 'report'), 'post');
  state.skippedPost = true; assert.equal(resolvePage(state, 'report'), 'report');
  assert.equal(resolvePage(state, 'map'), 'report');
  state.submissions = { post: { attempts: [{ text: '后测已提交' }] } };
  assert.equal(resolvePage(state, 'map'), 'map');
  state.items[0].skipped = true; assert.equal(firstUnfinishedLayer(state.items), 1);
  state.items[1].ok = true; assert.equal(firstUnfinishedLayer(state.items), 2);
});
