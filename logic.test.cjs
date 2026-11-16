const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateLayer, gradeEssay, countRelations } = require('./logic.js');

test('all five layers accept concept-equivalent answers', () => {
  const answers = ['林则徐在虎门销毁鸦片', '英国借禁烟冲突为借口，发动侵华战争', '鸦片走私引发白银外流，造成财政危机和社会危机', '中英贸易中英国进口多于出口，长期入超', '英国工业化后需要海外销路与原料'];
  answers.forEach((text, i) => assert.equal(validateLayer(i, text).ok, true, text));
});
test('wrong levels and empty answers never pass', () => {
  assert.equal(validateLayer(4, '虎门销烟').type, 'level');
  assert.equal(validateLayer(0, '英国完成工业革命需要市场').ok, false);
  assert.equal(validateLayer(2, '').type, 'empty');
  assert.equal(validateLayer(4, '英国没有完成工业革命，不需要海外市场').ok, false);
});
test('a complete causal essay can score 4+3+3', () => {
  const text = '英国完成工业革命，急需海外市场与原料，这是根本原因。工业扩张与中英贸易逆差相交织，促使英国商人扩大鸦片走私。鸦片输入导致白银外流和财政危机。危机推动清朝禁烟，1839年虎门销烟是导火索。英国借禁烟冲突为借口，于1840年发动侵华战争。清朝战败导致1842年南京条约签订，被迫割地赔款，开放通商口岸。';
  assert.deepEqual(gradeEssay(text).dimensions, [4, 3, 3]);
});
test('a bare list gains no causal-transmission points', () => {
  assert.equal(gradeEssay('工业革命；市场；逆差；鸦片；白银；虎门销烟；1840；南京条约').dimensions[2], 0);
});
test('misidentifying the root cause and reversing events loses points', () => {
  const result = gradeEssay('虎门销烟是根本原因。战争爆发导致虎门销烟。南京条约引发战争爆发。');
  assert.equal(result.dimensions[0], 0);
  assert.equal(result.dimensions[1], 0);
});
test('missing baseline remains absent, not a zero score', () => assert.equal(gradeEssay(''), null));
test('connections need actual concepts and a relationship', () => {
  assert.equal(countRelations('因为所以因此推动'), 0);
  assert.equal(countRelations('贸易逆差促使英国商人扩大鸦片走私'), 1);
});
