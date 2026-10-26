# Fiche Google Play — Échec & Mat

Tout ce qu'il faut copier-coller dans la Google Play Console
(**Croissance → Présentation sur le Play Store → Fiche principale**).

---

## Nom de l'application *(30 caractères max)*

```
Échec & Mat – Jeu d'échecs
```

> Google interdit les mots promotionnels dans le titre et les visuels du Store
> (« gratuit », « sans pub », « n°1 », « meilleur »…). On les garde pour la
> description.

## Description courte *(80 caractères max)*

```
Échecs contre l'ordi, à deux ou en ligne. Pièces 3D en bois et 101 puzzles.
```

## Description complète *(4000 caractères max)*

```
Échec & Mat, c'est le jeu d'échecs comme tu ne l'as jamais vu : un échiquier en bois, des pièces 3D sculptées, des animations fluides et de vrais sons de bois. Entièrement gratuit, sans publicité, sans achat intégré et sans compte à créer.

♟️ CONTRE L'ORDINATEUR, MÊME SANS INTERNET
Affronte 8 adversaires, de Léo le débutant (400 Elo) jusqu'au redoutable Stockfish (2800 Elo), l'un des moteurs d'échecs les plus forts au monde. Choisis tes couleurs, demande un indice quand tu bloques, annule un coup ou propose la nulle.

👥 À DEUX SUR LE MÊME TÉLÉPHONE
Pose le téléphone sur la table et affronte un proche face à face. Pendule au choix (3+2, 5, 10 ou 15+10 minutes) et retournement automatique de l'échiquier à chaque coup.

🌍 DÉFIE TES AMIS À DISTANCE
Crée une partie, envoie le code à 6 caractères par WhatsApp ou SMS, et joue en temps réel avec un ami à l'autre bout du pays. Revanche en un geste, reconnexion automatique si ton téléphone se met en veille.

🧩 101 PUZZLES « TROUVE L'ÉCHEC ET MAT »
Mats en 1, 2 et 3 coups, tous vérifiés par Stockfish. Un indice si tu bloques, la solution si tu abandonnes, et un nouveau défi du jour chaque jour.

📈 PROGRESSE À TON RYTHME
• Classement Elo avec ta courbe de progression
• Niveaux et points d'expérience
• Historique de tes parties, à revoir coup par coup
• Reprise automatique d'une partie interrompue

🎨 UN DESIGN SOIGNÉ
• Pièces 3D en buis et en ébène
• 3 échiquiers : bois clair, noyer et marbre
• Coups possibles, dernier coup surligné, échec mis en évidence
• Notation française (R, D, T, F, C)
• Sons et vibrations désactivables

✅ 100 % GRATUIT, POUR DE VRAI
Pas de publicité, pas d'abonnement, pas d'achat intégré, pas de compte. Tes données restent sur ton téléphone.

Que tu débutes ou que tu sois un joueur confirmé, Échec & Mat t'accompagne. Installe-le, et défie tes amis !
```

## Notes de version *(500 caractères max)*

```
Première version d'Échec & Mat !
• 8 niveaux contre l'ordinateur (Stockfish), hors ligne
• Mode deux joueurs avec pendule
• Parties en ligne avec un code à partager
• 101 puzzles de mat et un défi du jour
• Classement Elo, niveaux et historique
```

---

## Visuels (dossier `playstore/`)

| Élément | Fichier | Format exigé par Google |
| --- | --- | --- |
| Icône | `icone-512.png` | 512 × 512 px, PNG 32 bits |
| Image principale (feature graphic) | `feature-graphic.png` | 1024 × 500 px, sans transparence |
| Captures d'écran téléphone | `captures-telephone/store-1.png` à `store-8.png` | 1080 × 1920 px (9:16), 2 à 8 images |
| Vidéo promotionnelle (facultatif) | `../videos/bande-annonce-16x9.mp4` | Lien YouTube (mets la vidéo en ligne en « Non répertoriée ») |

Ordre conseillé des captures : 1 (beau plateau) → 3 (puzzles) → 2 (niveaux) →
5 (en ligne) → 4 (à deux) → 6 (progression) → 7 (hors ligne) → 8 (historique).
Les 3 premières sont les plus vues : elles doivent donner envie en une seconde.

## Catégorie et coordonnées

- **Type** : Jeu
- **Catégorie** : Société *(Board)*
- **Tags** (5 max) : Échecs · Jeux de société · Stratégie · Réflexion · Casse-tête
- **Adresse e-mail** : *ton adresse de contact* (obligatoire, visible sur la fiche)
- **Site web** : `https://github.com/beltus2-ctrl/Echec-et-mat` (facultatif)
- **Règles de confidentialité** (URL obligatoire) :
  `https://github.com/beltus2-ctrl/Echec-et-mat/blob/main/docs/confidentialite.md`
  *(le lien fonctionnera une fois la branche fusionnée dans `main`)*

---

## Questionnaires de la Play Console (contenu de l'application)

Réponses suggérées : relis-les avant de valider, c'est toi qui engages ta
responsabilité auprès de Google.

**Publicités** : Non, l'application ne contient pas de publicité.

**Accès à l'application** : Toutes les fonctionnalités sont disponibles sans
restriction (aucun identifiant nécessaire).

**Classification du contenu (IARC)** : catégorie « Jeu » ; aucune violence, peur,
sexualité, langage grossier, drogue ni jeu d'argent. À la question sur
l'interaction entre utilisateurs : oui (le mode en ligne affiche le nom choisi par
l'adversaire), mais sans messagerie ni partage de contenu. Résultat attendu :
PEGI 3 / Tout public.

**Public cible** : 13 ans et plus *(recommandé : inclure les moins de 13 ans
impose les règles « Familles », beaucoup plus strictes)*.

**Sécurité des données** :
- L'application collecte-t-elle des données ? **Oui** (mode en ligne uniquement).
- Données concernées, toutes **non partagées**, **traitées de manière éphémère**,
  pour la **fonctionnalité de l'application** :
  - *Informations personnelles → Nom* (pseudo choisi, facultatif) ;
  - *Identifiants de l'appareil ou autres → Autres identifiants* (identifiant
    aléatoire de joueur) ;
  - *Activité dans l'application → Autre contenu généré par l'utilisateur* (coups
    joués).
- Données chiffrées en transit : **Oui**.
- Possibilité de demander la suppression : rien n'est conservé sur le serveur
  après la partie ; les données locales s'effacent depuis les réglages ou en
  désinstallant l'application.

**Application d'actualités / santé / finance / gouvernement** : Non.
