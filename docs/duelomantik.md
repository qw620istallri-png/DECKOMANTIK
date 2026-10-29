# Duelomantik

Compagnon pour les parties physiques, accessible depuis le premier lien en haut à gauche de la home ou directement à `duelomantik/`. Interface FR/EN/IT, papier et thème sombre de DK, mobile et ordinateur.

L’écran est partagé entre deux joueurs face à face, la moitié supérieure étant tournée de 180°. Chaque joueur peut se nommer, ajouter les sept essences avec les symboles de puissance de DK et toucher une essence de sa réserve pour en dépenser une unité. Chaque type est regroupé en une icône précédée de sa quantité. Les deux côtés utilisent des fonds bleu et ocre distincts. Les réserves sont indépendantes (0 à 99 de chaque essence).

Les **points bonus** commencent à zéro et peuvent être négatifs. Les boutons ajoutent ou retirent cinq points ; toucher le total permet de le corriger à l’unité. Ce compteur ne représente pas la valeur des cartes ni les points de classement d’un tournoi.

Le centre contient un chrono partagé, le lancer d’un dé six faces et l’annulation de la dernière action et un compteur de tours partagé. Le compteur commence à 1, se règle par −/+ ou par saisie directe, et revient à 1 à la nouvelle partie. Le dé utilise les valeurs aléatoires du navigateur avec rejet du reste pour éviter un biais. L’annulation porte sur les points, essences, noms, dé et tours, en conservant le chrono en cours.

Toucher le chrono règle sa durée (50 minutes initialement). Il gère départ, pause et overtime à partir d’horodatages ; revenir d’un onglet en arrière-plan rattrape le temps écoulé. Le menu en haut à droite propose la remise à zéro du chrono, une nouvelle partie avec confirmation, le plein écran lorsque disponible et le maintien de l’écran allumé.

La partie est enregistrée dans `deckomantik-duel-v1`, séparément des decks et tournois. Les onglets de ce même navigateur se synchronisent ; leurs écritures utilisent Web Locks lorsque disponible. Recevoir une modification d’un autre onglet efface l’historique local d’annulation. La langue, le thème et le choix de veille ont leurs propres préférences. Aucun serveur ni compte n’est nécessaire ; l’usage hors connexion après fermeture du navigateur n’est pas garanti.

Le maintien d’écran utilise [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) sur HTTPS, demandé automatiquement et repris au retour dans la page. Le système peut le refuser ou le libérer, notamment en économie d’énergie. L’état apparaît dans le menu et le bouton permet de le libérer ou de réessayer. Il est libéré en quittant la page.

Vérification : `npm test`, puis `node scripts/duel-tournament-browser-test.cjs` avec Playwright et `PLAYWRIGHT_CHROMIUM_EXECUTABLE` si nécessaire.


« Historique » dans le menu … affiche les modifications de points bonus et de tours, ainsi que leurs annulations. Chaque opération conserve la date et l’heure à la seconde, le numéro de partie et le tour au moment de l’action, le temps de jeu écoulé (hors pauses), le temps restant ou dépassé et l’état du chrono. Les points indiquent le joueur, le gain ou la perte et le total avant/après ; les tours indiquent leur valeur avant/après. Les noms sont ceux enregistrés lors de la modification.

Les départs, pauses, reprises, remises à zéro et réglages du chrono sont également tracés pour expliquer les changements de référence temporelle. Une nouvelle partie est signalée et conserve le journal des précédentes parties ; elle réinitialise toujours les compteurs de jeu. Les 5 000 dernières opérations sont conservées localement et synchronisées entre onglets. L’historique reste consultable après rechargement ; les anciennes sauvegardes reçoivent un journal vide, sans reconstituer des actions antérieures.
