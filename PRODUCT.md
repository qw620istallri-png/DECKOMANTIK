# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Joueurs de KartomantiK qui composent des decks numériques dans DeckomantiK et veulent aussi savoir quels decks ils peuvent réellement maintenir assemblés avec leurs cartes physiques.

## Product Purpose

DeckomantiK réunit la construction, l’organisation, l’analyse, le test et le partage de decks KartomantiK dans une interface visuelle. Il donne également accès aux cartes, au classeur, aux règles et aux decks de base officiels.

La gestion physique doit permettre d’indiquer les sets possédés, de déclarer les decks réellement assemblés et de connaître les autres decks encore réalisables avec les cartes restantes.

## Positioning

DeckomantiK connaît directement les cartes, les sets complets et les decks de base officiels de KartomantiK. L’inventaire physique peut donc être saisi par achats de sets plutôt que carte par carte, puis rapproché automatiquement des decklists de l’utilisateur.

## Operating Context

- Les données vivent dans le navigateur et font partie de la sauvegarde complète.
- Un achat d’un set physique contient exactement une copie de chaque carte de ce set.
- Les cartes d’un deck déclaré assemblé sont considérées comme physiquement réservées et ne sont plus disponibles pour un autre deck.
- Les decks personnels et les decks de base officiels peuvent tous être déclarés assemblés, mais un deck de base n’est pas ajouté à « Mes decks ».

## Capabilities and Constraints

- La collection numérique du Classeur et l’inventaire physique sont deux notions séparées.
- La sideboard est comptée par défaut dans les cartes réservées, avec une option mémorisée pour l’exclure deck par deck.
- Un deck assemblé reste assemblé lorsqu’il est modifié. Si le nouvel état dépasse l’inventaire physique, l’interface signale un conflit au lieu de le désassembler silencieusement.
- Les decks non assemblés sont évalués individuellement contre les cartes encore disponibles.
- La gestion et les corrections individuelles de cartes sont explicitement reportées à une version ultérieure.

## Brand Commitments

- Nom du produit : DeckomantiK.
- La nouvelle fonction prolonge le thème actuel : papier crème, encre sombre, accent turquoise, trames imprimées et touches d’interface PC rétro.
- La gestion des decks physiques peut reprendre le langage des dossiers déjà utilisé pour les decks, sans créer une identité visuelle parallèle.

## Evidence on Hand

- Interface principale : `index.html`, `styles/`, `js/deckomantik.js`.
- Sets connus : `data/extensions-data.js` (`Beta`, 300 cartes ; `Inner Deserts`, 150 cartes).
- Decks de base officiels : `data/starter-decks.js`.
- Sideboard et validation des decks : `js/deckomantik.js`.

## Product Principles

- Séparer clairement collection numérique et possession physique.
- Faire de l’état physique déclaré par l’utilisateur la source de vérité ; signaler les incohérences sans le corriger silencieusement.
- Expliquer immédiatement pourquoi un deck est réalisable, incomplet ou en conflit.
- Garder la saisie proportionnée au produit : compter des sets complets avant de demander des détails carte par carte.
- Préserver les données physiques dans la sauvegarde complète et les migrations futures.
