const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../game.js');
const { score, createGame } = globalThis.CodeSecret;
const secret = ['rouge', 'rouge', 'bleu', 'vert'];

test('exemple 1 : ordre des couleurs', () => {
  assert.deepEqual(score(['rouge', 'bleu', 'vert', 'jaune'], ['rouge', 'vert', 'bleu', 'orange']), { wellPlaced: 1, misplaced: 2 });
});
test('exemple 2 : rouges supplémentaires ignorés', () => {
  assert.deepEqual(score(secret, Array(4).fill('rouge')), { wellPlaced: 2, misplaced: 0 });
});
test('répétitions mal placées : chaque occurrence compte une fois', () => {
  assert.deepEqual(score(secret, ['bleu', 'bleu', 'rouge', 'rouge']), { wellPlaced: 0, misplaced: 3 });
});
test('propositions invalides : aucun essai ni historique modifié', () => {
  const game = createGame(); game.start({ secret });
  const before = game.snapshot();
  for (const guess of [[], ['rouge'], ['rouge', 'rouge', 'bleu', 'rose'], new Array(4), null, 'rrrr']) {
    assert.ok(game.submit(guess).lastError);
    assert.deepEqual({ ...game.snapshot(), lastError: null }, before);
  }
});
test('victoire au dixième essai prioritaire et partie verrouillée', () => {
  const game = createGame(); game.start({ secret });
  for (let i = 0; i < 9; i++) game.submit(Array(4).fill('violet'));
  assert.equal(game.submit(secret).status, 'won');
  const before = game.snapshot();
  assert.equal(game.submit(null).lastError.code, 'game-finished');
  assert.deepEqual({ ...game.snapshot(), lastError: null }, before);
});
test('défaite au dixième essai, secret absent et blocage', () => {
  const game = createGame(); game.start({ secret });
  assert.equal(Object.hasOwn(game.snapshot(), 'secret'), false);
  for (let i = 0; i < 10; i++) game.submit(Array(4).fill('violet'));
  assert.equal(game.snapshot().status, 'lost');
  assert.equal(Object.hasOwn(game.snapshot(), 'secret'), false);
  assert.equal(game.submit(secret).lastError.code, 'game-finished');
  assert.equal(game.snapshot().attempts, 10);
});
test('redémarrage et protection des copies', () => {
  const game = createGame(); const code = [...secret]; game.start({ secret: code }); code.fill('violet');
  const guess = [...secret]; game.submit(guess); guess.fill('violet');
  const state = game.snapshot(); state.history[0].guess.fill('orange');
  assert.deepEqual(game.snapshot().history[0].guess, secret);
  game.start();
  assert.deepEqual(game.snapshot(), { status: 'playing', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null });
});

test('état initial et priorité game-not-started', () => {
  const game = createGame();
  assert.deepEqual(game.snapshot(), { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null });
  assert.equal(game.submit(null).lastError.code, 'game-not-started');
  assert.equal(game.snapshot().status, 'not-started');
});
test('priorité type, longueur, couleur et identifiants exacts', () => {
  const game = createGame(); game.start({ secret });
  const cases = [
    [null, 'invalid-type'], [['rouge', null], 'invalid-type'], [new Array(3), 'invalid-type'],
    [['rouge', undefined, 'bleu', 'vert'], 'invalid-type'],
    [['rose'], 'invalid-length'], [[], 'invalid-length'],
    [['rouge', 'bleu', 'vert', 'jaune', 'orange'], 'invalid-length'],
    ...['Violet', 'violet ', 'purple', '#ff0000', ''].map(color => [['rouge', 'bleu', 'vert', color], 'invalid-color'])
  ];
  for (const [guess, code] of cases) {
    const result = game.submit(guess);
    assert.equal(result.lastError.code, code);
    assert.ok(result.lastError.message.length > 0);
    assert.equal(result.attempts, 0);
  }
  assert.equal(game.submit(Array(4).fill('violet')).lastError, null);
});
test('démarrage invalide atomique, même avec lastError existante', () => {
  const game = createGame(); game.start({ secret }); game.submit(['rouge']);
  const before = game.snapshot();
  const cases = [
    [null, 'invalid-options'], [[], 'invalid-options'], ['x', 'invalid-options'],
    [new Date(), 'invalid-options'], [Object.create(null), 'invalid-options'],
    [{ secret, extra: true }, 'invalid-options'],
    [{ secret: null, extra: true }, 'invalid-options'],
    [{ secret: undefined }, 'invalid-type'], [{ secret: null }, 'invalid-type'],
    [{ secret: ['rouge', null] }, 'invalid-type'], [{ secret: ['rose'] }, 'invalid-length'],
    [{ secret: ['rouge', 'bleu', 'vert', 'Violet'] }, 'invalid-color']
  ];
  for (const [options, code] of cases) {
    assert.throws(() => game.start(options), error => error instanceof Error && error.code === code && !!error.message);
    assert.deepEqual(game.snapshot(), before);
  }
  assert.equal(game.submit(secret).status, 'won'); // The previous secret was also preserved.
});
test('refus au neuvième essai puis victoire au dixième', () => {
  const game = createGame(); game.start({ secret });
  for (let i = 0; i < 9; i++) game.submit(Array(4).fill('violet'));
  const before = game.snapshot();
  assert.equal(game.submit(['rouge']).lastError.code, 'invalid-length');
  assert.deepEqual({ ...game.snapshot(), lastError: null }, before);
  const won = game.submit(secret);
  assert.equal(won.status, 'won'); assert.equal(won.attempts, 10); assert.equal(won.lastError, null);
});
test('copies profondes et getters sans effet', () => {
  const game = createGame(); game.start({ secret });
  game.submit(['rouge', 'bleu', 'rouge', 'vert']);
  const before = game.snapshot();
  const copy = game.snapshot(); copy.lastGuess.fill('violet'); copy.lastResult.wellPlaced = 99;
  copy.history[0].guess.fill('orange'); copy.history[0].result.misplaced = 99;
  assert.deepEqual(game.snapshot(), before);
  const refused = game.submit(null); refused.lastError.code = 'changed';
  assert.equal(game.snapshot().lastError.code, 'invalid-type');
  assert.equal(JSON.parse(JSON.stringify(game.snapshot())).attempts, 1);
});
test('start sans options, undefined et objet vide réinitialisent', () => {
  const game = createGame();
  for (const args of [[], [undefined], [{}]]) {
    game.start({ secret }); game.submit(secret);
    assert.deepEqual(game.start(...args), { status: 'playing', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null });
  }
});
const standard = ['rouge', 'bleu', 'vert', 'jaune'];
const examples = [
  [standard, ['rouge', 'vert', 'bleu', 'orange'], 1, 2],
  [standard, ['orange', 'violet', 'rouge', 'bleu'], 0, 2],
  [standard, ['bleu', 'rouge', 'jaune', 'vert'], 0, 4],
  [standard, ['rouge', 'bleu', 'jaune', 'vert'], 2, 2],
  [standard, standard, 4, 0],
  [secret, Array(4).fill('rouge'), 2, 0],
  [secret, ['rouge', 'bleu', 'rouge', 'vert'], 2, 2],
  [secret, secret, 4, 0],
  [secret, ['rouge', 'bleu', 'rouge', 'rouge'], 1, 2]
];
examples.forEach(([code, guess, wellPlaced, misplaced], i) => {
  test(`contrat T${String(i + 1).padStart(2, '0')}`, () => {
    const game = createGame(); game.start({ secret: code });
    const state = game.submit(guess);
    assert.deepEqual(state.lastResult, { wellPlaced, misplaced });
    assert.deepEqual(state.history, [{ guess, result: { wellPlaced, misplaced } }]);
    assert.deepEqual(state.lastGuess, guess);
    assert.equal(state.attempts, 1); assert.equal(state.lastError, null);
    assert.equal(state.status, wellPlaced === 4 ? 'won' : 'playing');
  });
});
