# Consignes de travail : Code secret

## Repères

- Lire [README.md](README.md), puis les fichiers concernés. Pour le moteur ou l’API, consulter aussi [docs/api.md](docs/api.md) et les références du cours citées dans le README. Signaler une source inaccessible et toute ambiguïté qui change le résultat attendu, sans inventer de règle.
- Conserver l’organisation simple : `game.js` pour les règles, `app.js` pour l’interface et l’API, `index.html` et `style.css` pour la page. L’API doit commander la même instance que les boutons.
- Écrire l’interface et la documentation en français. Respecter les identifiants exacts du contrat API. Garder les chemins relatifs compatibles avec l’ouverture locale et un sous-dossier de site statique.

## Manière de travailler

- Limiter les changements à la demande, préserver le travail existant et avancer par étapes faciles à relire et à annuler. Proposer un choix motivé quand une décision manque ; signaler les questions encore ouvertes.
- Préserver les règles et le contrat décrits dans le README et le guide API. Pour une modification du score, contrôler les répétitions et éviter de compter deux fois un même pion. Ne pas charger `docs/score-before.js` dans le jeu : c’est une preuve historique défectueuse.
- Garder le jeu sans dépendance externe à l’exécution, serveur applicatif, compte, paiement, données personnelles, service d’IA ni clé d’accès. Ne pas publier de conversation ni de chemin personnel dans les preuves.
- Après un changement important vérifié, créer un commit descriptif dans le périmètre autorisé. Distinguer commit local et publication distante ; conserver les tags existants sans les déplacer.
- Avancer sur les actions réversibles autorisées. Une publication exige une autorisation de la session, qui reste valable pour son périmètre ; ne pas la redemander à chaque fichier. Ce document n’accorde aucun accès à un compte ou à un outil.

## Vérification proportionnée

- Avant une correction, écrire l’attendu et conserver un exemple reproductible du défaut. Après, rejouer le même cas et un cas valide. Préserver les preuves avant/après, comme décrit dans [docs/verification.md](docs/verification.md).
- Depuis la racine, avec Node.js disponible : `node --test tests/game.test.cjs tests/score-regression.cjs`. Exécuter ces tests pour un changement du moteur ou pour contrôler cette commande documentée.
- Pour l’interface ou l’API, utiliser `node tests/browser.cjs` si Chrome et Playwright sont disponibles ; voir les prérequis dans le guide de vérification. Comparer état et écran, y compris saisie invalide, nouvelle partie et fin de partie. Vérifier le clavier et une largeur mobile pour un changement d’interface.
- Pour la documentation seule, contrôler les chemins, liens internes, commandes modifiées et rendu Markdown ; ne pas relancer toute la suite sans raison. Conserver les résultats historiques et identifier la version de code qu’ils concernent.
- Ne jamais inventer un succès : distinguer test réussi, échec et contrôle non réalisé. Indiquer l’attendu, l’obtenu, la version et l’environnement ; une simulation mobile ne vaut pas un essai tactile réel.

## Restitution et entretien

- Résumer le changement et sa raison, les contrôles réellement exécutés et les limites restantes. Garder le README cohérent avec l’usage disponible ; déplacer les détails longs vers une documentation ciblée.
- Garder ce fichier court et durable. Ajouter une règle seulement si un problème concret justifie son utilité future ; retirer les chemins ou consignes devenus faux.
