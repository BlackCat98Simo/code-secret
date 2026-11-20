/* L'interface et les vérifications de développement utilisent ce même moteur. */
'use strict';
const game = CodeSecret.createGame();
const testMode = new URLSearchParams(window.location.search).get('test') === '1';
const $ = id => document.getElementById(id);
const labels = ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Orange', 'Violet'];
const symbols = ['R', 'B', 'V', 'J', 'O', 'Vi'];
function peg(color) {
  const span = document.createElement('span');
  const index = CodeSecret.PALETTE.indexOf(color);
  span.className = `swatch ${color || ''}`;
  span.textContent = index < 0 ? '?' : symbols[index];
  span.setAttribute('aria-label', index < 0 ? 'À choisir' : labels[index]);
  span.title = index < 0 ? 'À choisir' : labels[index];
  return span;
}
const selects = CodeSecret.PALETTE.slice(0, 4).map((_, i) => {
  const label = document.createElement('label'); label.className = 'choice';
  const text = document.createElement('span'); text.className = 'position'; text.textContent = `POSITION ${i + 1}`;
  const preview = document.createElement('span'); preview.setAttribute('aria-hidden', 'true'); preview.append(peg());
  const select = document.createElement('select'); select.setAttribute('aria-label', `Couleur en position ${i + 1}`);
  select.add(new Option('Choisir…', ''));
  CodeSecret.PALETTE.forEach((color, index) => select.add(new Option(labels[index], color)));
  select.addEventListener('change', () => preview.replaceChildren(peg(select.value)));
  label.append(text, preview, select); $('choices').append(label);
  return select;
});
CodeSecret.PALETTE.forEach((color, i) => {
  const item = document.createElement('span'); item.className = 'palette-item';
  item.append(peg(color), document.createTextNode(labels[i])); $('palette').append(item);
});
function render() {
  const state = game.snapshot();
  const ended = state.status === 'won' || state.status === 'lost';
  const unstarted = state.status === 'not-started';
  const remaining = 10 - state.attempts;
  $('counter').textContent = unstarted ? 'À démarrer' : ended ? (state.status === 'won' ? 'Code trouvé !' : 'Partie terminée') : `Essai ${state.attempts + 1} / 10`;
  $('remaining').textContent = `${remaining} restant${remaining === 1 ? '' : 's'}`;
  $('submit').disabled = ended || unstarted; selects.forEach(select => select.disabled = ended || unstarted);
  $('restart').textContent = unstarted ? 'Démarrer une partie' : '↻ Nouvelle partie';
  $('empty').hidden = state.history.length > 0;
  $('history').replaceChildren();
  state.history.forEach((row, i) => {
    const li = document.createElement('li'); li.className = 'history-row';
    const number = document.createElement('span'); number.className = 'row-number'; number.textContent = String(i + 1).padStart(2, '0');
    const colors = document.createElement('div'); colors.className = 'pegs'; row.guess.forEach(color => colors.append(peg(color)));
    const result = document.createElement('div'); result.className = 'result';
    result.append(document.createTextNode(`${row.result.wellPlaced} bien placée(s)`), document.createElement('br'), document.createTextNode(`${row.result.misplaced} mal placée(s)`));
    li.append(number, colors, result); $('history').append(li);
  });
  $('message').classList.toggle('error', Boolean(state.lastError));
  if (state.lastError) $('message').textContent = state.lastError.message;
  else if (ended) $('message').textContent = state.status === 'won' ? `Bravo ! Vous avez trouvé le code en ${state.attempts} essai(s).` : 'Les dix essais sont écoulés. Retentez votre chance avec un nouveau code !';
  else if (unstarted) $('message').textContent = 'Mode test : démarrez une partie avec l’API ou le bouton ci-dessous.';
  else if (state.lastResult) $('message').textContent = `${state.lastResult.wellPlaced} bien placée(s), ${state.lastResult.misplaced} mal placée(s). À vous de déduire la suite.`;
  else $('message').textContent = 'Le code est prêt. À vous de le découvrir.';
}
function startGame(options) {
  const state = game.start(options);
  selects.forEach(select => { select.value = ''; select.dispatchEvent(new Event('change')); });
  render();
  return state;
}
function submitGuess(guess) {
  const state = game.submit(guess);
  render();
  return state;
}
$('guess-form').addEventListener('submit', event => {
  event.preventDefault();
  submitGuess(selects.map(select => select.value));
});
$('restart').addEventListener('click', () => {
  startGame(); selects[0].focus();
});
if (!testMode) startGame();
render();
// Expose only after the interface is ready; mutations resolve after rendering.
if (testMode) window.codeSecretTest = Object.freeze({
  version: '0.2',
  getConfig: () => ({
    apiVersion: '0.2', rulesVersion: 'code-couleurs-1.0',
    secretLength: 4, maxAttempts: 10, allowDuplicates: true,
    colors: [...CodeSecret.PALETTE]
  }),
  getState: () => game.snapshot(),
  startGame: async options => startGame(options),
  submitGuess: async guess => submitGuess(guess)
});
