// Vérification du véritable site publié, sans modifier le moteur du jeu.
// Prérequis : Chrome et Playwright ; exécuter depuis la racine du projet.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.BASE_URL || 'https://blackcat98simo.github.io/code-secret/';
const expectedAssets = JSON.parse(fs.readFileSync(process.env.DEPLOYMENT_MANIFEST || 'docs/deployment-manifest.json', 'utf8'));
const report = {
  url: baseURL, startedAt: new Date().toISOString(), timezone: 'Europe/Zurich',
  codeVersion: '0.2.0', repositoryCommit: expectedAssets.commit, tag: 'jalon-1',
  tagCommit: expectedAssets.tagCommit, environment: { os: process.platform, browser: null, runner: 'Playwright', freshContext: true, serviceWorkers: 'blocked' },
  checks: [], assets: [], runtimeErrors: [], failedRequests: [], httpErrors: [], consoleErrors: [],
  limitations: ['Outil officiel enseignant non utilisé', 'Pas de téléphone physique ni de lecteur d’écran', 'Largeurs mobiles simulées, pas de validation tactile réelle']
};
async function check(id, expected, action) {
  try {
    const observed = await action();
    report.checks.push({ id, expected, observed: observed || expected, status: 'passed' });
    console.log(`PASS ${id}: ${observed || expected}`);
  } catch (error) {
    report.checks.push({ id, expected, observed: error.message, status: 'failed' });
    throw error;
  }
}
const initial = { status: 'not-started', attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
const colors = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet'];
const secret = ['rouge', 'rouge', 'bleu', 'vert'];
const reds = Array(4).fill('rouge');
const blues = Array(4).fill('bleu');
let browser;
(async () => {
  fs.mkdirSync('tmp', { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.environment.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.runtimeErrors.push(error.message));
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() }); });
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ message: message.text(), location: message.location() }); });
  const state = () => page.evaluate(() => window.codeSecretTest.getState());
  const call = (method, value) => page.evaluate(async ({ method, value }) => {
    const promise = window.codeSecretTest[method](value);
    if (!(promise instanceof Promise)) throw Error('La mutation doit retourner une Promise');
    return await promise;
  }, { method, value });
  async function coherent(s) {
    assert.equal(await page.locator('#history li').count(), s.attempts);
    assert.equal(s.attempts, s.history.length);
    const displayed = await page.locator('#history li').evaluateAll(rows => rows.map(row => ({
      colors: [...row.querySelectorAll('.swatch')].map(peg => peg.getAttribute('aria-label').toLowerCase()),
      result: row.querySelector('.result').innerText
    })));
    s.history.forEach((row, i) => {
      assert.deepEqual(displayed[i].colors, row.guess);
      assert.equal(displayed[i].result, `${row.result.wellPlaced} bien placée(s)\n${row.result.misplaced} mal placée(s)`);
    });
    assert.equal(await page.locator('#submit').isDisabled(), s.status !== 'playing');
    const expectedCounter = s.status === 'playing' ? `Essai ${s.attempts + 1} / 10` : s.status === 'won' ? 'Code trouvé !' : s.status === 'lost' ? 'Partie terminée' : 'À démarrer';
    assert.equal(await page.locator('#counter').innerText(), expectedCounter);
    assert.equal(await page.locator('#remaining').innerText(), `${10 - s.attempts} restant${s.attempts === 9 ? '' : 's'}`);
    if (s.lastError && s.status === 'playing') assert.equal(await page.locator('#message').innerText(), s.lastError.message);
    assert.equal('secret' in s || 'solution' in s, false);
    assert.equal(await page.locator('#secret, #reveal').count(), 0);
    JSON.parse(JSON.stringify(s));
  }
  await check('P01-assets', 'HTTP 200 et contenu des quatre fichiers identique au manifeste du dépôt', async () => {
    for (const asset of expectedAssets.assets) {
      const response = await context.request.get(new URL(asset.path, baseURL).href, { headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200, asset.path);
      const bytes = await response.body();
      const gitBlobSha = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      report.assets.push({ path: asset.path, status: response.status(), gitBlobSha, expected: asset.sha });
      assert.equal(gitBlobSha, asset.sha, asset.path);
    }
    return '4/4 fichiers identiques : index.html, style.css, game.js, app.js';
  });
  await check('P02-jeu-normal', 'Partie immédiate, API absente, trois couleurs refusées puis quatre acceptées', async () => {
    assert.equal((await page.goto(baseURL)).status(), 200);
    assert.equal(await page.evaluate(() => 'codeSecretTest' in window), false);
    assert.equal(await page.locator('#counter').innerText(), 'Essai 1 / 10');
    await page.locator('#submit').click();
    assert.equal(await page.locator('#history li').count(), 0);
    for (let i = 0; i < 3; i++) await page.locator('select').nth(i).selectOption(colors[i]);
    await page.locator('#submit').click();
    assert.equal(await page.locator('#counter').innerText(), 'Essai 1 / 10');
    assert.equal(await page.locator('#history li').count(), 0);
    assert.equal(await page.locator('#message.error').count(), 1);
    await page.locator('select').nth(3).selectOption('jaune');
    await page.locator('#submit').click();
    assert.equal(await page.locator('#history li').count(), 1);
    assert.equal(await page.locator('#remaining').innerText(), '9 restants');
    await page.screenshot({ path: 'tmp/pages-desktop.png', fullPage: true });
  });
  await check('P03-clavier', 'Nouvelle partie, focus, quatre choix au clavier puis un essai par Entrée', async () => {
    await page.locator('#restart').click();
    assert.equal(await page.locator('#history li').count(), 0);
    assert.equal(await page.locator('select').first().evaluate(el => el === document.activeElement), true);
    for (let i = 0; i < 4; i++) {
      if (i) await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.locator('select').nth(i).inputValue(), 'rouge');
    }
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#history li').count(), 1);
  });
  await check('P04-mode-test', 'API 0.2, état initial exact et autres paramètres URL conservés', async () => {
    const url = new URL(baseURL); url.searchParams.set('verification', 'pages'); url.searchParams.set('test', '1');
    await page.goto(url.href); await page.waitForFunction(() => window.codeSecretTest);
    assert.equal(new URL(page.url()).searchParams.get('verification'), 'pages');
    assert.equal(await page.evaluate(() => codeSecretTest.version), '0.2');
    assert.deepEqual(await state(), initial); await coherent(initial);
    const refused = await call('submitGuess', null);
    assert.equal(refused.lastError.code, 'game-not-started');
    assert.deepEqual({ ...refused, lastError: null }, initial);
  });
  await check('P05-configuration', 'Configuration exacte, synchrone, JSON et copie indépendante', async () => {
    const expected = { apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0', secretLength: 4, maxAttempts: 10, allowDuplicates: true, colors };
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getConfig()), expected);
    await page.evaluate(() => { const c = codeSecretTest.getConfig(); if (c instanceof Promise) throw Error('Getter asynchrone'); c.colors.fill('changed'); });
    assert.deepEqual(await page.evaluate(() => codeSecretTest.getConfig()), expected);
  });
  const standard = ['rouge', 'bleu', 'vert', 'jaune'];
  const examples = [
    [standard, ['rouge', 'vert', 'bleu', 'orange'], 1, 2],
    [standard, ['orange', 'violet', 'rouge', 'bleu'], 0, 2],
    [standard, ['bleu', 'rouge', 'jaune', 'vert'], 0, 4],
    [standard, ['rouge', 'bleu', 'jaune', 'vert'], 2, 2],
    [standard, standard, 4, 0], [secret, reds, 2, 0],
    [secret, ['rouge', 'bleu', 'rouge', 'vert'], 2, 2], [secret, secret, 4, 0],
    [secret, ['rouge', 'bleu', 'rouge', 'rouge'], 1, 2]
  ];
  for (let i = 0; i < examples.length; i++) {
    const [secret, guess, wellPlaced, misplaced] = examples[i];
    await check(`T${String(i + 1).padStart(2, '0')}`, `${wellPlaced} bien / ${misplaced} mal, un essai, écran et état cohérents`, async () => {
      await call('startGame', { secret });
      const s = await call('submitGuess', guess);
      assert.deepEqual(s.history, [{ guess, result: { wellPlaced, misplaced } }]);
      assert.deepEqual(s.lastGuess, guess); assert.deepEqual(s.lastResult, { wellPlaced, misplaced });
      assert.equal(s.status, wellPlaced === 4 ? 'won' : 'playing'); assert.equal(s.lastError, null);
      await coherent(s);
    });
  }
  await check('P06-refus', 'Type avant longueur avant couleur ; refus atomiques et messages visibles', async () => {
    await call('startGame', { secret });
    const before = await call('submitGuess', reds);
    const results = await page.evaluate(async () => {
      const cases = [
        [null, 'invalid-type'], ['rouge', 'invalid-type'], [new Array(3), 'invalid-type'],
        [['rouge', null], 'invalid-type'], [['rouge', undefined], 'invalid-type'],
        [[], 'invalid-length'], [['rose'], 'invalid-length'], [['rouge'], 'invalid-length'],
        [Array(5).fill('rouge'), 'invalid-length'],
        ...['Violet', 'violet ', 'purple', '#ff0000', ''].map(c => [['rouge', 'bleu', 'vert', c], 'invalid-color'])
      ];
      const results = [];
      for (const [guess, expected] of cases) {
        const s = await codeSecretTest.submitGuess(guess);
        results.push({ s, expected, displayed: document.getElementById('message').textContent });
      }
      return results;
    });
    for (const { s, expected, displayed } of results) {
      assert.equal(s.lastError.code, expected); assert.ok(s.lastError.message.length > 0);
      assert.equal(displayed, s.lastError.message); assert.deepEqual({ ...s, lastError: null }, before);
    }
    const valid = await call('submitGuess', Array(4).fill('violet'));
    assert.equal(valid.lastError, null); assert.equal(valid.attempts, 2); await coherent(valid);
    return `${results.length} saisies invalides refusées, puis quatre violets acceptés`;
  });
  await check('P07-demarrage-invalide', 'Error codée rejetée, état complet et interface inchangés', async () => {
    await call('startGame', { secret }); await call('submitGuess', ['rouge']);
    const before = await state(); const html = await page.locator('main').innerHTML();
    const results = await page.evaluate(async () => {
      const cases = [
        [null, 'invalid-options'], [[], 'invalid-options'], [false, 'invalid-options'], ['x', 'invalid-options'],
        [new Date(), 'invalid-options'], [{ extra: true, secret: null }, 'invalid-options'],
        [{ secret: undefined }, 'invalid-type'], [{ secret: null }, 'invalid-type'],
        [{ secret: new Array(4) }, 'invalid-type'], [{ secret: ['rouge', null] }, 'invalid-type'],
        [{ secret: ['rose'] }, 'invalid-length'], [{ secret: ['rouge', 'bleu', 'vert', 'Violet'] }, 'invalid-color']
      ];
      const results = [];
      for (const [options, expected] of cases) {
        try { await codeSecretTest.startGame(options); results.push({ expected, rejected: false }); }
        catch (error) { results.push({ expected, rejected: error instanceof Error, code: error.code, message: error.message, state: codeSecretTest.getState(), html: document.querySelector('main').innerHTML }); }
      }
      return results;
    });
    for (const r of results) {
      assert.equal(r.rejected, true); assert.equal(r.code, r.expected); assert.ok(r.message);
      assert.deepEqual(r.state, before); assert.equal(r.html, html);
    }
    assert.equal((await call('submitGuess', secret)).status, 'won');
    return `${results.length} démarrages invalides rejetés sans changer même lastError ni le secret en cours`;
  });
  await check('P08-copies-getters', 'Entrées et sorties indépendantes, getters synchrones sans effet sur écran et erreur', async () => {
    const observed = await page.evaluate(async () => {
      const imposed = ['rouge', 'rouge', 'bleu', 'vert'];
      await codeSecretTest.startGame({ secret: imposed }); imposed.fill('violet');
      const guess = ['rouge', 'bleu', 'rouge', 'vert'];
      const returned = await codeSecretTest.submitGuess(guess); guess.fill('orange');
      const before = codeSecretTest.getState();
      returned.history[0].guess.fill('jaune'); returned.history[0].result.wellPlaced = 99;
      returned.lastGuess.fill('orange'); returned.lastResult.misplaced = 99;
      const after = codeSecretTest.getState();
      const errorState = await codeSecretTest.submitGuess(null);
      const errorBefore = codeSecretTest.getState(); const html = document.querySelector('main').innerHTML;
      errorState.lastError.code = 'changed';
      const copy = codeSecretTest.getState(); if (copy instanceof Promise) throw Error('Getter asynchrone');
      copy.lastError.message = 'changed'; codeSecretTest.getConfig();
      return { before, after, errorBefore, errorAfter: codeSecretTest.getState(), unchangedUI: html === document.querySelector('main').innerHTML };
    });
    assert.deepEqual(observed.before, observed.after);
    assert.deepEqual(observed.before.lastResult, { wellPlaced: 2, misplaced: 2 });
    assert.deepEqual(observed.errorBefore, observed.errorAfter); assert.equal(observed.unchangedUI, true);
    assert.equal((await call('submitGuess', secret)).status, 'won');
  });
  await check('P09-ui-vers-api', 'Choix et validation par les contrôles visibles relus exactement par l’API', async () => {
    await call('startGame', { secret });
    for (let i = 0; i < 4; i++) await page.locator('select').nth(i).selectOption(secret[i]);
    await page.locator('#submit').click();
    const s = await state(); assert.equal(s.status, 'won'); assert.equal(s.attempts, 1);
    assert.deepEqual(s.lastGuess, secret); assert.match(await page.locator('#message').innerText(), /Bravo/); await coherent(s);
  });
  for (const ending of ['won', 'lost']) {
    await check(`P10-cycle-${ending}`, ending === 'won' ? 'Refus à 9 essais, victoire au dixième, blocage puis remise à zéro' : 'Défaite à 10 essais, blocage puis remise à zéro', async () => {
      await call('startGame', { secret: reds });
      for (let i = 0; i < 9; i++) await call('submitGuess', blues);
      const ninth = await state(); const refused = await call('submitGuess', ['rouge']);
      assert.equal(refused.lastError.code, 'invalid-length'); assert.deepEqual({ ...refused, lastError: null }, ninth);
      const end = await call('submitGuess', ending === 'won' ? reds : blues);
      assert.equal(end.status, ending); assert.equal(end.attempts, 10); assert.equal(end.lastError, null);
      assert.deepEqual(end.lastResult, { wellPlaced: ending === 'won' ? 4 : 0, misplaced: 0 });
      await coherent(end);
      assert.equal(await page.locator('select:disabled').count(), 4);
      assert.match(await page.locator('#message').innerText(), ending === 'won' ? /Bravo/ : /dix essais/);
      for (const guess of [null, reds]) {
        const refused = await call('submitGuess', guess);
        assert.equal(refused.lastError.code, 'game-finished'); assert.deepEqual({ ...refused, lastError: null }, end);
        await coherent(refused);
      }
      const restart = await call('startGame', { secret });
      assert.deepEqual(restart, { ...initial, status: 'playing' }); await coherent(restart);
      assert.equal(await page.locator('select').first().inputValue(), '');
    });
  }
  await check('P11-redemarrage-aleatoire', 'startGame(), undefined, {} et bouton réinitialisent les données et l’écran', async () => {
    for (const mode of ['omitted', 'undefined', 'empty']) {
      await call('startGame', { secret }); await call('submitGuess', secret);
      const s = await page.evaluate(async mode => mode === 'omitted' ? await codeSecretTest.startGame() : mode === 'undefined' ? await codeSecretTest.startGame(undefined) : await codeSecretTest.startGame({}), mode);
      assert.deepEqual(s, { ...initial, status: 'playing' }); await coherent(s);
    }
    await call('submitGuess', blues); await page.locator('#restart').click();
    assert.deepEqual(await state(), { ...initial, status: 'playing' });
  });
  await check('P12-responsive', 'Historique de 10 essais lisible, aucun débordement à 320/390/720 px', async () => {
    await call('startGame', { secret: reds });
    for (let i = 0; i < 10; i++) await call('submitGuess', blues);
    for (const width of [320, 390, 720]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await coherent(await state());
      if (width === 390) await page.screenshot({ path: 'tmp/pages-mobile.png', fullPage: true });
    }
  });
  await check('P13-rechargement', 'Rechargement = not-started ; test=0 et absence du paramètre = API absente', async () => {
    await page.reload(); await page.waitForFunction(() => window.codeSecretTest);
    assert.deepEqual(await state(), initial); await coherent(initial);
    const url = new URL(baseURL); url.searchParams.set('test', '0');
    await page.goto(url.href); assert.equal(await page.evaluate(() => 'codeSecretTest' in window), false);
    await page.goto(baseURL); assert.equal(await page.evaluate(() => 'codeSecretTest' in window), false);
  });
  await check('P14-erreurs-techniques', 'Aucune erreur JavaScript ni requête réseau échouée ; ressources du jeu sans erreur HTTP', async () => {
    assert.deepEqual(report.runtimeErrors, []); assert.deepEqual(report.failedRequests, []);
    const requiredFailures = report.httpErrors.filter(r => !r.url.endsWith('/favicon.ico'));
    assert.deepEqual(requiredFailures, []);
    const unexpectedConsole = report.consoleErrors.filter(r => !r.location.url.endsWith('/favicon.ico'));
    assert.deepEqual(unexpectedConsole, []);
    return `0 erreur JavaScript, 0 requête échouée, 0 erreur HTTP de ressource applicative ; ${report.consoleErrors.length} message(s) console pour favicon.ico uniquement`;
  });
  report.status = 'passed';
})().catch(error => {
  report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
  console.error(error.message);
}).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(c => c.status === 'passed').length, failed: report.checks.filter(c => c.status === 'failed').length };
  fs.writeFileSync('docs/tests-pages.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, ...report.summary }));
});
