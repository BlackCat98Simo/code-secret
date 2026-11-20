/* Règles communes code-couleurs-1.0. Moteur indépendant de l'affichage. */
(function (root) {
  'use strict';
  const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
  const messages = {
    'invalid-options': 'Options invalides : seul un objet avec la clé secret est autorisé.',
    'invalid-type': 'Utilisez un tableau complet de noms de couleurs, sans élément absent.',
    'invalid-length': 'Choisissez exactement quatre couleurs avant de valider.',
    'invalid-color': 'Choisissez quatre couleurs autorisées : rouge, bleu, vert, jaune, orange ou violet.',
    'game-not-started': 'Démarrez une partie avant de proposer un code.',
    'game-finished': 'Partie terminée. Lancez une nouvelle partie.'
  };
  function validate(code) {
    if (!Array.isArray(code)) return 'invalid-type';
    for (let i = 0; i < code.length; i++) {
      if (!Object.hasOwn(code, i) || typeof code[i] !== 'string') return 'invalid-type';
    }
    if (code.length !== 4) return 'invalid-length';
    if (code.some(color => !PALETTE.includes(color))) return 'invalid-color';
    return null;
  }

  function score(secret, guess) {
    let wellPlaced = 0;
    let misplaced = 0;
    const remaining = [];
    const unmatched = [];
    guess.forEach((color, i) => {
      if (color === secret[i]) wellPlaced++;
      else { remaining.push(secret[i]); unmatched.push(color); }
    });
    unmatched.forEach(color => {
      const index = remaining.indexOf(color);
      if (index !== -1) { misplaced++; remaining.splice(index, 1); }
    });
    return { wellPlaced, misplaced };
  }

  function createGame() {
    let secret = null;
    let history = [];
    let status = 'not-started';
    let lastError = null;
    function snapshot() {
      const copy = row => row ? { guess: [...row.guess], result: { ...row.result } } : null;
      const last = copy(history.at(-1));
      return {
        status, attempts: history.length,
        history: history.map(copy),
        lastGuess: last ? last.guess : null,
        lastResult: last ? last.result : null,
        lastError: lastError ? { ...lastError } : null
      };
    }
    function start(options = {}) {
      let error = null;
      if (options === null || typeof options !== 'object' ||
          Object.getPrototypeOf(options) !== Object.prototype ||
          Reflect.ownKeys(options).some(key => key !== 'secret')) error = 'invalid-options';
      const imposed = !error && Object.hasOwn(options, 'secret');
      if (!error && imposed) error = validate(options.secret);
      if (error) throw Object.assign(new Error(messages[error]), { code: error });
      // Validate everything before changing even lastError or the current secret.
      secret = imposed ? [...options.secret] : Array.from({ length: 4 }, () => PALETTE[Math.floor(Math.random() * 6)]);
      history = [];
      status = 'playing';
      lastError = null;
      return snapshot();
    }
    function submit(guess) {
      const error = status === 'not-started' ? 'game-not-started' :
        status !== 'playing' ? 'game-finished' : validate(guess);
      if (error) {
        lastError = { code: error, message: messages[error] };
        return snapshot();
      }
      const result = score(secret, guess);
      history.push({ guess: [...guess], result });
      lastError = null;
      if (result.wellPlaced === 4) status = 'won';
      else if (history.length === 10) status = 'lost';
      return snapshot();
    }
    return Object.freeze({ start, submit, snapshot });
  }
  root.CodeSecret = Object.freeze({ PALETTE, score, createGame });
})(globalThis);
