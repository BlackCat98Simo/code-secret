# Vérifications et correction

[Retour au README](../README.md)

Version du code testée : **0.2.0**, [commit df1dfe7](https://github.com/BlackCat98Simo/code-secret/commit/df1dfe7c88d496f344f69d807c6a2f909d3b7328). Date : **20 novembre 2026**. Tests automatisés avec Node.js et Chrome piloté par Playwright sur Windows. Les sorties avant/après sont historiques ; le prototype défectueux n’est pas utilisé par le jeu.

## Correction du comptage des répétitions

Le premier prototype utilisait `secret.includes(couleur)` pour les mal placées : il réutilisait des occurrences déjà comptées. Pour le secret rouge–rouge–bleu–vert et la proposition rouge–rouge–rouge–rouge, **attendu : 2 bien / 0 mal ; obtenu avant : 2 bien / 2 mal**. Le moteur corrigé retire d’abord les bien placées, puis retire chaque occurrence restante dès qu’elle est utilisée : **obtenu après : 2 bien / 0 mal**.

Preuves conservées : [prototype avant correction](score-before.js), [première exécution : 5 succès / 2 échecs](tests-before.txt), [mêmes 7 tests après correction : 7 succès](tests-after.txt). Le prototype archivé n’est pas chargé par le jeu. Pour reproduire le cas isolé avec Node.js :

```powershell
$env:BEFORE='1'; node --test tests/score-regression.cjs # échec attendu : 2/2
Remove-Item Env:BEFORE
node --test tests/score-regression.cjs # succès attendu : 2/0
```

Autre adaptation : la première interface révélait le code en fin de partie. Le contrat 0.2 interdit cette révélation indépendante ; elle a été retirée de l’écran et de l’état retourné. Le test navigateur contrôle son absence après défaite.

## Vérifications automatisées

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

**23 tests réussis** sur le moteur de la version 0.2.0, commit `df1dfe7`, résultat conservé dans [tests-api.txt](tests-api.txt). Les anciennes sorties avant/après documentent la version initiale ; les preuves courantes sont `tests-api.txt` et `tests-browser-api.txt`.

Test d’intégration avec Chrome et le module Node.js Playwright disponibles : depuis la racine, `node tests/browser.cjs`. Le module doit être résolu par Node.js, ou désigné par la variable `PLAYWRIGHT_MODULE`. Dans l’environnement de développement, le module fourni a été utilisé ; l’installation des prérequis sur une machine vierge n’a pas été essayée. Il ouvre le fichier local, vérifie l’interface, les neuf cas via l’API, le cycle de vie et le clavier ; [résultat](tests-browser-api.txt). Les captures générées dans `tmp/` servent à l’inspection visuelle et ne sont pas publiées.

## Contrôle ciblé de la documentation

Parcours automatisé dans Chrome : ouvrir le fichier local, choisir trois couleurs, valider, puis choisir la quatrième et valider. Attendu : refus sans essai ni historique à trois couleurs ; un essai et une entrée à quatre. Résultat et version consignés dans [test-documentation.txt](test-documentation.txt).

## Non vérifié

URL GitHub Pages, appareil tactile réel, lecteur d’écran, outil officiel de l’enseignant et relecture par un camarade. La présence et le contenu d’AGENTS.md sont contrôlés ; sa découverte et son application dans une nouvelle session restent à vérifier.
