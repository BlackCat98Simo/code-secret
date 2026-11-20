# Code secret

Jeu solo inspiré du Mastermind, réalisé avec Codex. Version **0.2.0**, jalon **J1**, tag de référence : **`jalon-1`**.

- Dépôt : https://github.com/BlackCat98Simo/code-secret
- Application : ouvrir `index.html` dans un navigateur, sans serveur ni installation.
- GitHub Pages : publication reportée ; aucun lien d’application en ligne disponible à ce stade.

## Règles et sources

Retrouver quatre couleurs ordonnées parmi **rouge, bleu, vert, jaune, orange, violet**, avec répétitions, en dix essais. Une proposition invalide ne consomme aucun essai. Chaque indice compte les bien placées, puis les mal placées parmi les occurrences restantes ; chaque pion compte une fois. Quatre bien placées gagnent, même au dixième essai. Après victoire ou défaite, les propositions sont bloquées ; une nouvelle partie efface l’historique.

Sources du cours : *Projet — Code secret en couleurs, inspiré du Mastermind*, édition 2.2, annexe **code-couleurs-1.0** ; *API commune de test — Code secret en couleurs*, contrat **0.2**, édition Google 1.5. La solution n’est pas révélée séparément, conformément au contrat API.

## Choix effectué avec Codex

La décision retenue est de séparer le moteur (`game.js`) de l’affichage (`app.js`), tout en conservant **une seule instance de partie** pour les commandes visibles et l’API. Cela permet de vérifier les règles séparément et évite qu’un jeu destiné seulement aux tests donne des résultats différents de l’écran. L’adaptateur expose des promesses qui se résolvent après la mise à jour de l’interface. Les listes natives de couleurs offrent un choix modifiable au clavier et au toucher ; lettres et noms complètent les couleurs. Aucun compte, serveur applicatif, service d’IA ou accès externe n’est nécessaire pendant une partie.

## API de test 0.2

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

## Correction expliquée et preuves avant/après

Le premier prototype utilisait `secret.includes(couleur)` pour les mal placées : il réutilisait des occurrences déjà comptées. Pour le secret rouge–rouge–bleu–vert et la proposition rouge–rouge–rouge–rouge, **attendu : 2 bien / 0 mal ; obtenu avant : 2 bien / 2 mal**. Le moteur corrigé retire d’abord les bien placées, puis retire chaque occurrence restante dès qu’elle est utilisée : **obtenu après : 2 bien / 0 mal**.

Preuves conservées : [prototype avant correction](docs/score-before.js), [première exécution : 5 succès / 2 échecs](docs/tests-before.txt), [mêmes 7 tests après correction : 7 succès](docs/tests-after.txt). Le prototype archivé n’est pas chargé par le jeu. Pour reproduire le cas isolé avec Node.js :

```powershell
$env:BEFORE='1'; node --test tests/score-regression.cjs # échec attendu : 2/2
Remove-Item Env:BEFORE
node --test tests/score-regression.cjs # succès attendu : 2/0
```

Autre adaptation : la première interface révélait le code en fin de partie. Le contrat 0.2 interdit cette révélation indépendante ; elle a été retirée de l’écran et de l’état retourné. Le test navigateur contrôle son absence après défaite.

## Vérifications du 20 novembre 2026

Résultats attendus écrits dans les assertions avant exécution :

| Vérification | Attendu | Obtenu |
| --- | --- | --- |
| T01 à T09 du contrat | Indices et états du tableau officiel | Conforme dans le moteur et via l’API du navigateur |
| Saisie invalide, priorité type/longueur/couleur | Refus, aucun essai ajouté | Conforme |
| Refus au 9e, victoire au 10e | 9 essais puis `won` à 10 | Conforme |
| Défaite et proposition après fin | `lost` à 10, puis `game-finished` ; historique inchangé | Conforme |
| Démarrage invalide | Promesse rejetée, état et écran inchangés | Conforme |
| API et interface | Même historique, indices et compteur dans les deux sens | Conforme |
| Rechargement en mode test | `not-started`, aucun ancien secret imposé | Conforme |
| Copies et getters | Aucune mutation indirecte du jeu ou de l’écran | Conforme |
| Clavier, redémarrage, largeurs 320/390/720 px | Commandes utilisables, historique remis à zéro, aucun débordement horizontal | Conforme dans Chrome automatisé |

Exécuter les tests du moteur (Node.js, sans dépendance) :

```sh
node --test tests/game.test.cjs tests/score-regression.cjs
```

**23 tests réussis**, résultat conservé dans [tests-api.txt](docs/tests-api.txt). Les anciennes sorties avant/après documentent la version initiale ; les preuves courantes sont `tests-api.txt` et `tests-browser-api.txt`.

Test d’intégration facultatif avec Chrome installé : `npm install --no-save playwright`, puis `node tests/browser.cjs`. Il ouvre le fichier local, vérifie l’interface, les neuf cas via l’API, le cycle de vie et le clavier ; [résultat](docs/tests-browser-api.txt). Les captures générées dans `tmp/` servent à l’inspection visuelle et ne sont pas publiées.

## Limites et suite

GitHub Pages est volontairement reporté : l’API n’a donc pas encore été vérifiée sur une URL publiée. Les essais de conformité sont ceux du projet, pas l’outil officiel de l’enseignant. Les dimensions mobiles sont simulées dans Chrome : essai tactile sur un vrai smartphone et vérification avec lecteur d’écran restent à faire. Aucune sauvegarde de partie, PWA ou installation hors ligne n’est fournie. Pour J2 : publier l’application, vérifier l’API en ligne, tester un vrai smartphone et recueillir le retour sur le jeu d’un camarade. Le lien public demandé pour J1 restera à compléter après activation de Pages.
