# Code secret

Jeu solo de déduction inspiré du Mastermind, réalisé avec Codex dans le cadre de l’atelier techno. Retrouvez quatre couleurs en dix essais, en utilisant les indices de chaque proposition.

## État actuel

- **Disponible :** version **0.2.0**, jeu local, historique, commandes au clavier et API commune de test **0.2** (fonctions JavaScript pour vérifier la partie affichée).
- **Dépôt :** [BlackCat98Simo/code-secret](https://github.com/BlackCat98Simo/code-secret). Le code vérifié correspond au [commit df1dfe7](https://github.com/BlackCat98Simo/code-secret/commit/df1dfe7c88d496f344f69d807c6a2f909d3b7328).
- **À compléter pour J1 :** GitHub Pages est reporté, donc pas encore de lien public pour jouer. Le tag `jalon-1` existe seulement localement sur `df1dfe7` et reste à publier. Les modifications de documentation suivantes ne déplacent pas ce tag.

## Commencer et jouer

Aucune installation pour jouer. Téléchargez le dépôt avec **Code > Download ZIP**, extrayez tout le dossier, puis ouvrez [index.html](index.html) dans un navigateur récent. Gardez les fichiers du dossier ensemble. Le démarrage a été vérifié dans Chrome sur Windows.

1. Une partie aléatoire démarre : quatre positions à choisir, compteur **Essai 1 / 10**, historique vide.
2. Choisissez une couleur dans chacune des quatre listes, puis cliquez sur **Valider la proposition**. Les choix restent modifiables avant validation.
3. Lisez les deux nombres, **bien placées** et **mal placées**, puis ajustez votre proposition. **Nouvelle partie** efface les essais et tire un code.

Clavier : Tab pour parcourir les commandes, flèches pour les listes, Entrée pour valider. Les noms et lettres accompagnent les couleurs. Exemple : choisir trois couleurs puis valider doit afficher un refus, sans modifier le compteur ni l’historique ; compléter la quatrième permet de compter un essai.

## Règles et sources

Le secret contient quatre couleurs ordonnées parmi **rouge, bleu, vert, jaune, orange, violet**, avec répétitions. Dix propositions valides au maximum. Les indices comptent d’abord les bien placées, puis les mal placées parmi les occurrences restantes, chacune une seule fois. Ils ne désignent aucune position. Quatre bien placées donnent la victoire, même au dixième essai ; sinon, la partie est perdue après dix essais. Les propositions sont ensuite bloquées. Le code n’est pas révélé séparément.

Références fournies dans le cours : *Projet — Code secret en couleurs, inspiré du Mastermind*, édition 2.2, annexe **code-couleurs-1.0** ; *API commune de test — Code secret en couleurs*, contrat **0.2**, édition Google 1.5. Les PDF ne sont pas inclus au dépôt et leur lien public n’a pas été fourni. Les guides README/AGENTS, version 1.0, et l’*Atelier 4 du 11 novembre 2026*, édition 1.25, guident la documentation ; les exercices bonus sont exclus.

## Choix fait avec Codex

Le moteur et l’affichage sont séparés, mais l’interface et l’API utilisent **la même partie** : les tests peuvent ainsi contrôler ce que voit le joueur. Les listes natives, les noms et les lettres facilitent le choix au clavier et l’identification des couleurs. Ces choix d’interface sont distincts des règles du jeu.

## Vérifier

Depuis la racine du dossier, avec **Node.js** disponible, exécutez :

```sh
node --test tests/game.test.cjs tests/score-regression.cjs
```

Le 20 novembre 2026, **23 tests automatisés réussis**, dont les neuf exemples du contrat, les erreurs et les fins de partie. Les tests du navigateur vérifient aussi la synchronisation de l’API avec l’écran. [Attendus, résultats, environnement et preuves](docs/verification.md).

Correction documentée : pour le secret rouge–rouge–bleu–vert et quatre rouges proposés, attendu **2 bien / 0 mal** ; le prototype donnait **2 / 2**, le moteur corrigé donne **2 / 0**. Les preuves avant/après et le cas reproductible sont conservés dans le guide de vérification.

## Se repérer

| Fichier | Rôle |
| --- | --- |
| [index.html](index.html), [style.css](style.css) | Page, règles affichées et présentation |
| [game.js](game.js) | Moteur : validation, indices, état de la partie |
| [app.js](app.js) | Commandes visibles et API sur la même instance |
| [AGENTS.md](AGENTS.md) | Consignes durables pour travailler sur le projet |
| [tests/](tests/) | Tests du moteur et du navigateur |
| [Guide API](docs/api.md) | Accès avec `?test=1`, appels et erreurs |
| [Vérifications](docs/verification.md) | Tests et correction avant/après |

## Limites, questions ouvertes et reprise

L’API est vérifiée localement, pas encore sur une URL publiée ni avec l’outil officiel de l’enseignant. Les largeurs mobiles sont simulées : téléphone réel, lecteur d’écran et relecture par un camarade restent à vérifier. Aucune sauvegarde de partie ni installation PWA (application web installable) n’est fournie.

Questions ouvertes : l’interface reste-t-elle confortable sur un vrai téléphone ? L’API passera-t-elle l’outil enseignant sur la future version publiée ? Prochaines étapes : publier le tag et l’application, puis effectuer ces vérifications pour J2. La prise en compte d’AGENTS.md devra être contrôlée dans une nouvelle tâche ; sa seule présence ne garantit pas le résultat.

Projet individuel maintenu dans le dépôt de **BlackCat98Simo**. Pour signaler un problème : [ouvrir une issue](https://github.com/BlackCat98Simo/code-secret/issues) avec les étapes, le résultat attendu, le résultat observé et la version utilisée, sans donnée privée. Aucun compte, paiement, service d’IA ou clé d’accès n’est intégré au jeu.
