# barre-limites

Mod Claude qui affiche en continu ta consommation : durée de session, remplissage du contexte, limite 5 h, limite 7 jours (avec une barre de progression), et ton avance ou ton retard sur le rythme (Δ = % consommé − % du temps écoulé dans la fenêtre). Les infos apparaissent dans un panneau « Limites » et dans la ligne de statut, plus un bandeau au-dessus de la saisie dans le terminal et l'app desktop. La commande `/limites` rouvre le panneau.

Dans les conversations de l'app Claude, aucun panneau ne peut s'afficher : le mod fournit à Claude un outil `limites`, et `/limites` (ou « où en sont mes limites ? ») fait afficher les barres directement dans la réponse.

Les pourcentages des limites ne sont disponibles qu'avec un abonnement Pro ou Max, après la première réponse de la session.

## Installation

Dans Claude Code :

```
/plugin install barre-limites --marketplace baptisteloubet/barre-limites
```

Réponds `y` pour ajouter le marketplace, puis choisis la portée « user » pour l'avoir dans toutes tes sessions.

Dans l'app Claude : enregistre le fichier `barre-limites.plugin` (bouton « Save plugin » sur sa carte, puis « Continue »), ou, dans l'app desktop, + à côté de la saisie → Plugins → Add marketplace avec `baptisteloubet/barre-limites`, puis Add plugin.
