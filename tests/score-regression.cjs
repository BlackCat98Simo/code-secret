// Historical J1 correction: BEFORE=1 selects the preserved first implementation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
require(process.env.BEFORE === '1' ? '../docs/score-before.js' : '../game.js');
test('un rouge ne peut pas être compté deux fois', () => {
  assert.deepEqual(CodeSecret.score(['rouge', 'rouge', 'bleu', 'vert'], Array(4).fill('rouge')),
    { wellPlaced: 2, misplaced: 0 });
});
