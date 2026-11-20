# API commune de test 0.2

[Retour au README](../README.md)

Ouvrir `index.html?test=1` (ajouter `&test=1` si d’autres paramètres existent), puis utiliser la console du navigateur. L’API n’existe pas sans `test=1`. En mode test, l’état initial est `not-started` ; en mode normal, une partie aléatoire démarre automatiquement.

```js
const api = window.codeSecretTest;
api.version;     // "0.2"
api.getConfig(); // synchrone, copie de la configuration commune
await api.startGame({ secret: ["rouge", "rouge", "bleu", "vert"] });
await api.submitGuess(["rouge", "bleu", "rouge", "rouge"]);
// attempts: 1, lastResult: { wellPlaced: 1, misplaced: 2 }
api.getState();  // synchrone, copie indépendante de l’état affiché
await api.startGame(); // nouvelle partie aléatoire
```

`submitGuess` résout les refus prévus avec `lastError` ; seul ce champ change. Priorité : `game-not-started`, `game-finished`, `invalid-type`, `invalid-length`, `invalid-color`. Un `startGame` invalide rejette avec une `Error` ayant `code` et `message`, sans modifier la partie ni l’écran. Les états n’exposent aucun champ `secret` ou `solution`.

