# ♚ Échec & Mat

Une application d'échecs **100 % gratuite**, sans publicité, au design soigné :
échiquier en bois et pièces 3D façon Staunton, animations fluides, sons et vibrations.

## Ce que l'on peut faire

| Mode | Description | Internet ? |
| --- | --- | --- |
| **Contre l'ordinateur** | 8 adversaires, de Léo (débutant, ~400 Elo) à Stockfish (grand maître, ~2800 Elo). Choix de la couleur, indices, annulation de coup, proposition de nulle. | Non |
| **Deux joueurs** | Sur le même téléphone, avec pendule optionnelle (3+2, 5, 10, 15+10 min) et retournement automatique de l'échiquier. | Non |
| **Inviter un ami** | Partie en ligne : créez une partie, envoyez le code par WhatsApp/SMS, votre ami le saisit et vous jouez à distance. Revanche, nulle, abandon, reconnexion automatique. | Oui |
| **Puzzles** | « Trouver l'échec et mat » : mats en 1, 2 et 3 coups vérifiés par Stockfish, avec indice et solution, plus un **défi du jour**. | Non |

Et aussi : classement Elo avec courbe de progression, niveaux et XP, historique des
parties avec relecture coup par coup, reprise automatique d'une partie interrompue,
3 échiquiers (bois clair, noyer, marbre), notation française (R, D, T, F, C).

## Installer l'application sur Android

1. Ouvrez l'onglet **Releases** du dépôt GitHub et téléchargez `echec-et-mat.apk`
   de la version la plus récente.
2. Ouvrez le fichier sur le téléphone. Android demande d'autoriser
   « Installer des applications inconnues » pour l'application qui ouvre le fichier
   (Chrome, Fichiers, WhatsApp…) : acceptez, puis **Installer**.
3. Partagez le même APK à vos amis pour jouer ensemble.

L'APK est construit automatiquement par GitHub Actions à chaque modification du
dossier `client/` (workflow `.github/workflows/build-android.yml`).

## Structure du projet

```
client/                     Application (React 19 + Vite, packagée avec Capacitor 8)
  src/
    App.jsx                 Navigation entre les écrans, bouton retour Android
    components/Board.jsx    Échiquier : pièces 3D, animations, glisser-déposer, flèches
    screens/                Accueil, parties, puzzles, en ligne, historique, réglages
    lib/engine.js           Moteur Stockfish (WebAssembly) et les 8 niveaux
    lib/store.js            Sauvegarde locale : profil, Elo, XP, historique
    lib/feedback.js         Sons synthétisés et vibrations
    data/puzzles.json       Puzzles de mat générés et vérifiés par Stockfish
  public/assets/            Pièces 3D et échiquiers (rendus à partir de modèles 3D)
  public/engine/            Stockfish 19 « lite » (WASM, fonctionne hors ligne)
  android/                  Projet Android natif (Capacitor)
server/                     Serveur temps réel pour le mode en ligne (Node + Socket.io)
```

## Développement

```bash
# Application
cd client
npm install
npm run dev          # http://localhost:5173

# Serveur du mode en ligne (dans un autre terminal)
cd server
npm install
npm run dev          # http://localhost:3001
```

En développement, l'application se connecte à `http://localhost:3001`. En production,
elle utilise `VITE_SERVER_URL` (par défaut `https://echec-et-mat-server.onrender.com`).

### Construire l'APK soi-même (Android Studio ou SDK Android requis)

```bash
cd client
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Serveur du mode en ligne

Seul le mode « Inviter un ami » a besoin d'Internet. Le serveur (`server/`) est
déployable gratuitement sur Render en un clic grâce au fichier `render.yaml` :

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/beltus2-ctrl/Echec-et-mat)

Le plan gratuit de Render met le serveur en veille après 15 minutes d'inactivité ;
le premier accès peut alors prendre jusqu'à une minute (l'application l'indique).
Le workflow `keep-alive.yml` le réveille régulièrement pour limiter cette attente.

Si vous déployez le serveur à une autre adresse, définissez la variable de dépôt
GitHub `VITE_SERVER_URL` (Settings → Secrets and variables → Actions → Variables)
puis relancez le workflow de build Android.

## Licences et crédits

- Moteur d'échecs : [Stockfish](https://stockfishchess.org/) via
  [stockfish.js](https://github.com/nmrugg/stockfish.js), licence GPL v3
  (`client/public/engine/COPYING-stockfish.txt`).
- Règles du jeu : [chess.js](https://github.com/jhlywa/chess.js).
- Polices : Oswald et Inter (SIL Open Font License).
- Pièces 3D, échiquiers, icône et sons : créés pour ce projet.
