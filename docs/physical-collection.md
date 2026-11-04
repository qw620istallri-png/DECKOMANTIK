# Collection physique — brief confirmé

Statut : V1 implémentée et couverte par des tests métier.

## Objectif

Permettre au joueur d’indiquer combien d’exemplaires de chaque set complet il possède, de marquer les decks physiquement assemblés et de voir quels autres decks sont réalisables avec les cartes restantes.

## Règles métier confirmées

1. Chaque achat d’un set apporte une copie de chacune des cartes de ce set.
2. Un deck personnel assemblé réserve ses cartes.
3. Les decks de base officiels figurent parmi les decks assemblables et réservent leurs cartes lorsqu’ils sont cochés, sans être ajoutés à « Mes decks ».
4. La sideboard réserve ses cartes par défaut. Une option propre à chaque deck permet de ne pas la compter.
5. Modifier un deck assemblé ne le désassemble pas. Si sa nouvelle liste n’est plus couverte par l’inventaire, il passe en état de conflit.
6. La faisabilité d’un deck non assemblé est calculée individuellement à partir de l’inventaire restant. Plusieurs decks marqués « Réalisable » ne sont donc pas nécessairement réalisables simultanément.

## Modèle de calcul

Pour chaque carte :

```text
quantité possédée = nombre d’exemplaires du set contenant la carte
quantité réservée = occurrences dans les decks assemblés
                    + occurrences dans leurs sideboards comptées
quantité disponible = possédée - réservée
```

Un candidat est réalisable lorsque chaque carte de sa liste demande au plus la quantité encore disponible.

## Accès et navigation

### Bibliothèque

Le troisième onglet ouvre directement le gestionnaire de decks unifié :

```text
Cartes | Classeur | Mes decks
```

« Mes decks » et « Tous les decks » mènent à la même surface. Le Classeur conserve son sens actuel de collection numérique et de raretés obtenues. Une action voisine de celle des effets de rareté permet d’afficher les cartes sans exemplaire physique libre en niveaux de gris. Leur aperçu indique les decks assemblés qui les réservent. Dans le constructeur uniquement, une seconde action permet aussi de griser les cartes déjà présentes dans le deck en cours.

### Accueil

Dans l’en-tête de « Mes decks », renommer l’ancien accès « Ma collection » en « Mes decks », à côté de « Tout exporter ». Cet accès et la tuile « Tous les decks » ouvrent le même gestionnaire unifié.

Fusionner les deux actions d’import de decks dans un bouton :

```text
Importer ▾
  Importer une liste
  Importer un deck PDF / JSON
```

L’import de tableaux reste dans la section « Mes tableaux ».

## Structure de l’écran

### Collection physique

Sous le panneau « Dossiers », afficher un second panneau « Collection physique ». Une ligne par set connu associe son visuel officiel à un compteur direct `−  nombre  +` et au ratio `cartes prises / cartes possédées`. La V1 contient au minimum Beta et Inner Deserts et accepte de futurs sets depuis les données existantes, sans liste codée en dur dans l’interface.

Le panneau contient quatre filtres : « Tous », « Réalisables », « Assemblés » et « Non réalisables ». Le tri général propose « Réalisables d’abord » et « Non réalisables d’abord ».

### Assemblage

Le gestionnaire conserve le langage des dossiers existants et ajoute un dossier dédié :

- « Decks de base ».

« Tous les decks » affiche d’abord les decks personnels, puis les decks de base à la fin. Les mêmes filtres physiques s’appliquent aux deux groupes, notamment « Assemblés ». Un deck de base accepte plusieurs exemplaires assemblés ; chaque exemplaire réserve une fois sa liste complète.

Chaque ligne, qu’elle corresponde à un deck personnel ou à un deck de base, présente : nom, composition, sideboard éventuelle, quantité ou case « Assemblé », statut de disponibilité et accès au détail des cartes manquantes. Le détail utilise l’identifiant `extension-numéro` ; le survol d’une carte affiche son visuel et le set manquant lorsque son compteur vaut zéro, sinon les decks assemblés qui la réservent.

Un deck de base peut être ouvert dans le constructeur sans être ajouté aux decks personnels. Sa première modification crée une copie nommée `Nom - Modifié` ; une simple consultation ne sauvegarde rien. Depuis le constructeur, « Mes decks » revient directement au gestionnaire unifié.

## États

- **Assemblé** : le deck réserve effectivement ses cartes.
- **Réalisable** : toutes les cartes nécessaires sont actuellement libres.
- **Incomplet** : une ou plusieurs cartes manquent ; le détail donne leurs noms et identifiants `extension-numéro`.
- **Conflit** : le deck est déclaré assemblé, mais l’inventaire renseigné ne couvre plus sa liste.

Le statut ne doit pas reposer uniquement sur la couleur. Utiliser également une icône et un libellé explicite.

## Sideboard

- Comptée par défaut.
- Le contrôle individuel n’apparaît que pour les decks ayant une sideboard.
- Le choix reste mémorisé lorsque le deck est désassemblé puis réassemblé.
- Modifier ce choix recalcule immédiatement les disponibilités de tous les decks.

## Comportements importants

- Archiver un deck assemblé ne libère pas ses cartes.
- Dupliquer ou importer un deck crée un deck non assemblé.
- Désassembler un deck libère immédiatement ses cartes.
- Supprimer un deck assemblé doit avertir que ses cartes seront libérées.
- Une modification de liste recalcule les disponibilités sans changer automatiquement la case « Assemblé ».
- L’inventaire physique, les decks assemblés et les options de sideboard font partie de la sauvegarde complète.
- « Tout exporter » reste un export de decklists et n’est pas transformé en sauvegarde de l’inventaire physique.

## Direction UI

La fonction étend l’interface existante en mode opératoire : bordures franches, papier crème, trames, typographie et accents actuels. Les compteurs de sets peuvent évoquer des contrôles mécaniques et la liste d’assemblage reprend légèrement le vocabulaire de dossiers PC rétro déjà présent dans le gestionnaire de decks.

Sur mobile, les panneaux « Dossiers » et « Collection physique » précèdent la liste. Les compteurs restent compacts et les détails des manques s’ouvrent en accordéon.

## Hors périmètre V1 / notes pour une prochaine version

- Ajustements carte par carte pour les exemplaires achetés séparément, perdus, prêtés ou provenant d’un produit incomplet.
- Planification simultanée d’un groupe de decks et résolution des conflits entre plusieurs candidats.
- Emplacement physique des cartes : boîte, pochette ou classeur.
- Liste imprimable des cartes à sortir ou à ranger.
- Proxies et cartes prêtées.

La future gestion individuelle devra compléter les quantités issues des sets, et non remplacer ce modèle simple.
