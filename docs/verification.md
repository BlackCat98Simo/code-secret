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

## Vérification sur GitHub Pages

Le 20 novembre 2026, la suite [tests/published.cjs](../tests/published.cjs) a exécuté **24 scénarios avec succès** sur https://blackcat98simo.github.io/code-secret/. Chrome **157.0.8103.79**, Windows, Playwright, contexte neuf et service workers bloqués. Il s’agit de tests sur l’application distante, sans remplacement du moteur ni du générateur aléatoire.

La version publiée testée correspond au commit `5513df463a1fddce4b487c6df2ecb7029119d561`. Les empreintes des quatre fichiers exécutés sont comparées au [manifeste de référence](deployment-manifest.json) : réponses HTTP 200 et contenus identiques au dépôt, également identiques aux fichiers du jeu dans le tag `jalon-1` (`ccd7755`). Les modifications de documentation et de tests ultérieures ne changent pas ces fichiers.

Le [rapport JSON](tests-pages.json) conserve pour chaque scénario son identifiant, l’attendu, l’observé et le statut, ainsi que les versions, horaires UTC et empreintes contrôlées. Il comprend T01–T09, les refus (14 saisies, 12 démarrages invalides), les copies indépendantes, les getters, les promesses de mutation, la synchronisation écran/API dans les deux sens, les fins de partie, les redémarrages et le rechargement. Le jeu normal est aussi contrôlé au clavier ; l’interface est vérifiée aux largeurs 320, 390 et 720 px, avec un historique de dix essais pour le contrôle étroit.

Aucune erreur JavaScript d’exécution, requête échouée ou erreur HTTP de ressource applicative n’a été observée. Le message de console 404 pour `favicon.ico` est enregistré séparément : il concerne l’icône du site, sans effet observé sur les scénarios fonctionnels. Les captures de l’interface sur ordinateur et à 390 px ont été inspectées ; elles restent dans `tmp/`.

Pour reproduire, depuis la racine, avec Chrome et Playwright disponibles selon les mêmes prérequis que le test local :

```sh
node tests/published.cjs
```

La cible par défaut est le site GitHub Pages. `BASE_URL` permet de choisir une autre cible. Le manifeste décrit la version attendue : s’il y a une modification intentionnelle des fichiers du jeu, vérifier le nouveau commit puis actualiser ce manifeste avant de tester cette nouvelle version. La commande réécrit `docs/tests-pages.json` et les captures de travail ; conserver les anciennes preuves dans Git.

## Non vérifié

Appareil tactile réel, lecteur d’écran, outil officiel de l’enseignant et relecture par un camarade. La présence et le contenu d’AGENTS.md sont contrôlés ; sa découverte et son application dans une nouvelle session restent à vérifier. La vérification en ligne ci-dessus remplace la précédente limite concernant l’URL publiée.
