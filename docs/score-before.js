/* Règles communes code-couleurs-1.0. Moteur indépendant de l'affichage. */
(function (root) {
  'use strict';
  const PALETTE = Object.freeze(['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet']);
  const valid = code => Array.isArray(code) && code.length === 4 &&
    Array.from(code).every(color => PALETTE.includes(color));

  function score(secret, guess) {
    let wellPlaced = 0;
    let misplaced = 0;
    guess.forEach((color, i) => {
      if (color === secret[i]) wellPlaced++;
      else if (secret.includes(color)) misplaced++;
    });
    return { wellPlaced, misplaced };
  }

  function createGame() {
    let secret;
    let history;
    let status;
    function snapshot() {
      return {
        status, attempts: history.length, remaining: 10 - history.length,
        history: history.map(row => ({ ...row, guess: [...row.guess] })),
        secret: status === 'playing' ? null : [...secret]
      };
    }
    function start(code) {
      if (code !== undefined && !valid(code)) throw new Error('Code de test invalide.');
      secret = code ? [...code] : Array.from({ length: 4 }, () => PALETTE[Math.floor(Math.random() * 6)]);
      history = [];
      status = 'playing';
      return snapshot();
    }
    function submit(guess) {
      if (status !== 'playing') return { ok: false, error: 'Partie terminée. Lancez une nouvelle partie.' };
      if (!valid(guess)) return { ok: false, error: 'Choisissez quatre couleurs autorisées avant de valider.' };
      const result = score(secret, guess);
      history.push({ guess: [...guess], ...result });
      if (result.wellPlaced === 4) status = 'won';
      else if (history.length === 10) status = 'lost';
      return { ok: true, ...result, state: snapshot() };
    }
    start();
    return Object.freeze({ start, submit, snapshot });
  }
  root.CodeSecret = Object.freeze({ PALETTE, score, createGame });
})(globalThis);
