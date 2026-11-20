// Optional: npm install --no-save playwright, then node tests/browser.cjs.
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
require('node:fs').mkdirSync('tmp', { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.locator('#submit').click();
    assert.match(await page.locator('#message').innerText(), /quatre couleurs/);
    assert.equal(await page.locator('#history li').count(), 0);
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption('rouge');
    await page.locator('#submit').click();
    assert.equal(await page.locator('#history li').count(), 1);
    await page.screenshot({ path: 'tmp/desktop.png', fullPage: true });
    await page.locator('#restart').click();
    assert.equal(await page.locator('#history li').count(), 0);
    assert.equal(await page.locator('select').first().evaluate(el => el === document.activeElement), true);
    // All 1296 secrets are equally likely: make the random draw deterministic only in this test page.
    await page.evaluate(() => { Math.random = () => 0; });
    await page.locator('#restart').click();
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption('violet');
    for (let i = 0; i < 9; i++) await page.locator('#submit').click();
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption('rouge');
    await page.locator('#submit').click();
    assert.match(await page.locator('#message').innerText(), /Bravo/);
    assert.equal(await page.locator('#submit').isDisabled(), true);
    assert.equal(await page.locator('#history li').count(), 10);
    await page.locator('#restart').click();
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption('bleu');
    for (let i = 0; i < 10; i++) await page.locator('#submit').click();
    assert.match(await page.locator('#message').innerText(), /dix essais/);
    assert.equal(await page.locator('#reveal, #secret').count(), 0);
    await page.locator('#restart').click();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('select').first().inputValue(), 'rouge');
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown'); }
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#history li').count(), 1);
    for (const width of [320, 390, 720]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (width === 390) await page.screenshot({ path: 'tmp/mobile.png', fullPage: true });
    }

    // The public test API must act on the exact game shown by the interface.
    assert.equal(await page.evaluate(() => 'codeSecretTest' in window), false);
    const url = new URL(page.url()); url.search = '?other=kept&test=1';
    await page.goto(url.href);
    await page.waitForFunction(() => window.codeSecretTest);
    const initial = { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getState()), initial);
    assert.equal(await page.locator('#submit').isDisabled(), true);
    assert.equal(await page.evaluate(() => codeSecretTest.version), '0.2');
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getConfig()), {
      apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0', secretLength: 4,
      maxAttempts: 10, allowDuplicates: true, colors: ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']
    });
    await page.evaluate(() => { codeSecretTest.getConfig().colors.fill('changed'); });
    assert.equal(await page.evaluate(() => codeSecretTest.getConfig().colors[0]), 'rouge');
    const call = (method, value) => page.evaluate(async ({ method, value }) => {
      const pending = codeSecretTest[method](value);
      if (!(pending instanceof Promise)) throw Error('Mutation must return a Promise');
      return await pending;
    }, { method, value });
    const secret = ['rouge', 'rouge', 'bleu', 'vert'];
    assert.equal((await call('submitGuess', null)).lastError.code, 'game-not-started');
    const standard = ['rouge', 'bleu', 'vert', 'jaune'];
    const examples = [
      [standard, ['rouge', 'vert', 'bleu', 'orange'], 1, 2],
      [standard, ['orange', 'violet', 'rouge', 'bleu'], 0, 2],
      [standard, ['bleu', 'rouge', 'jaune', 'vert'], 0, 4],
      [standard, ['rouge', 'bleu', 'jaune', 'vert'], 2, 2],
      [standard, standard, 4, 0], [secret, Array(4).fill('rouge'), 2, 0],
      [secret, ['rouge', 'bleu', 'rouge', 'vert'], 2, 2], [secret, secret, 4, 0],
      [secret, ['rouge', 'bleu', 'rouge', 'rouge'], 1, 2]
    ];
    for (const [secret, guess, wellPlaced, misplaced] of examples) {
      await call('startGame', { secret });
      const state = await call('submitGuess', guess);
      assert.deepEqual(state.lastResult, { wellPlaced, misplaced });
      assert.equal(state.attempts, 1); assert.equal(state.history.length, 1);
      assert.equal(state.lastError, null);
      assert.equal(state.status, wellPlaced === 4 ? 'won' : 'playing');
      assert.equal(await page.locator('#history li').count(), 1);
      assert.match(await page.locator('#history li').innerText(), new RegExp(`${wellPlaced} bien placée\\(s\\)\\n${misplaced} mal placée\\(s\\)`));
    }
    await call('startGame', { secret });
    assert.match(await page.locator('#counter').innerText(), /1 \/ 10/);
    assert.equal(await page.locator('#history li').count(), 0);
    assert.equal(await page.locator('#submit').isDisabled(), false);
    let state = await call('submitGuess', ['rouge', 'bleu', 'rouge', 'vert']);
    assert.deepEqual(state.lastResult, { wellPlaced: 2, misplaced: 2 });
    assert.equal(await page.locator('#history li').count(), state.attempts);
    assert.match(await page.locator('#history li').innerText(), /2 bien placée\(s\)\n2 mal placée\(s\)/);
    assert.match(await page.locator('#counter').innerText(), /2 \/ 10/);
    assert.equal('secret' in state || 'solution' in state, false);
    const beforeRefusal = state;
    state = await call('submitGuess', ['rouge', null]);
    assert.equal(state.lastError.code, 'invalid-type');
    assert.deepEqual({ ...state, lastError: null }, beforeRefusal);
    assert.equal(await page.locator('#message').evaluate(el => el.classList.contains('error')), true);
    const htmlBefore = await page.locator('main').innerHTML();
    const rejection = await page.evaluate(async () => {
      try { await codeSecretTest.startGame({ secret: null }); }
      catch (error) { return { code: error.code, isError: error instanceof Error, message: error.message }; }
    });
    assert.equal(rejection.code, 'invalid-type'); assert.equal(rejection.isError, true); assert.ok(rejection.message);
    assert.equal(await page.locator('main').innerHTML(), htmlBefore);
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getState()), state);
    // Getters and copies cannot mutate state or the UI.
    await page.evaluate(() => {
      const state = codeSecretTest.getState(); state.history[0].guess.fill('orange');
      state.history[0].result.wellPlaced = 99; state.lastError.code = 'changed';
      codeSecretTest.getConfig(); codeSecretTest.getState();
    });
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getState()), state);
    assert.equal(await page.locator('main').innerHTML(), htmlBefore);
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption(secret[i]);
    await page.locator('#submit').click();
    state = await page.evaluate(() => codeSecretTest.getState());
    assert.equal(state.status, 'won'); assert.equal(state.attempts, 2); assert.equal(state.lastError, null);
    assert.match(await page.locator('#message').innerText(), /Bravo/);
    const won = state;
    state = await call('submitGuess', null);
    assert.equal(state.lastError.code, 'game-finished');
    assert.deepEqual({ ...state, lastError: null }, won);
    await call('startGame', { secret: Array(4).fill('rouge') });
    for (let i = 0; i < 9; i++) await call('submitGuess', Array(4).fill('bleu'));
    assert.equal((await call('submitGuess', ['rouge'])).attempts, 9);
    state = await call('submitGuess', Array(4).fill('rouge'));
    assert.equal(state.status, 'won'); assert.equal(state.attempts, 10);
    assert.equal(await page.locator('#history li').count(), 10);
    assert.match(await page.locator('#message').innerText(), /Bravo/);
    await call('startGame', { secret: Array(4).fill('rouge') });
    for (let i = 0; i < 10; i++) state = await call('submitGuess', Array(4).fill('bleu'));
    assert.equal(state.status, 'lost'); assert.deepEqual(state.lastResult, { wellPlaced: 0, misplaced: 0 });
    assert.match(await page.locator('#message').innerText(), /dix essais/);
    assert.equal(await page.locator('select:disabled').count(), 4);
    assert.equal(await page.locator('#reveal, #secret').count(), 0);
    await page.locator('#restart').click();
    state = await page.evaluate(() => codeSecretTest.getState());
    assert.deepEqual(state, { ...initial, status: 'playing' });
    assert.equal(await page.locator('select').first().inputValue(), '');
    assert.equal(await page.locator('#history li').count(), 0);
    await page.reload();
    await page.waitForFunction(() => window.codeSecretTest);
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getState()), initial);
    url.search = '?test=0'; await page.goto(url.href);
    assert.equal(await page.evaluate(() => 'codeSecretTest' in window), false);
    assert.deepEqual(errors, []);
    console.log('PASS: interface (invalid input, history, restart/focus, win on tenth, loss, locking, keyboard, widths 320/390/720); API 0.2 (T01-T09, conditional exposure, initial state, config, Promises, imposed secret, UI/API synchronization both directions, atomic rejection, error priorities, independent copies, lifecycle, reload); no JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
