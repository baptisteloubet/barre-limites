# barre-limites

Mod Claude Code qui affiche en continu ta consommation : durée de session, remplissage du contexte, limite 5 h, limite 7 jours, et ton avance ou ton retard sur le rythme (Δ = % consommé − % du temps écoulé dans la fenêtre). Les infos apparaissent dans un panneau « Limites », dans la ligne de statut et dans un bandeau au-dessus de la saisie. La commande `/limites` rouvre le panneau.

Les pourcentages des limites ne sont disponibles qu'avec un abonnement Pro ou Max, après la première réponse de la session.

## Installation

Dans Claude Code :

```
/plugin install barre-limites --marketplace <owner>/barre-limites
```

Réponds `y` pour ajouter le marketplace, puis choisis la portée « user » pour l'avoir dans toutes tes sessions.
