# ♟️ Échec et Mat

Application d'échecs multijoueur en temps réel : créez une salle, partagez son code
avec un adversaire, et jouez aux échecs en direct dans le navigateur.

## Stack technique

- **Client** : React 19 (Vite), [react-chessboard](https://www.npmjs.com/package/react-chessboard) pour l'échiquier, `socket.io-client` pour le temps réel.
- **Serveur** : Node.js, Express, Socket.io, [chess.js](https://www.npmjs.com/package/chess.js) comme arbitre faisant autorité (validation des coups, détection d'échec/mat/pat).

Le serveur est la seule source de vérité sur l'état de la partie : chaque coup est
validé côté serveur avant d'être diffusé aux deux joueurs.

## Fonctionnalités

- Création de salle avec code à partager (6 caractères)
- Rejoindre une salle par code
- Échiquier interactif (glisser-déposer)
- Validation des coups et tour par tour
- Détection : échec, échec et mat, pat, nulle par matériel insuffisant / répétition
- Abandon, proposition et acceptation de nulle
- Revanche (nouvelle partie dans la même salle)
- Support spectateur (au-delà de 2 joueurs dans une salle)
- Historique des coups (notation SAN)

## Démarrage local

### Serveur

```bash
cd server
npm install
cp .env.example .env   # optionnel, valeurs par défaut déjà adaptées au dev local
npm run dev
```

Le serveur écoute par défaut sur `http://localhost:3001`.

### Client

Dans un autre terminal :

```bash
cd client
npm install
cp .env.example .env   # optionnel, pointe déjà vers http://localhost:3001
npm run dev
```

Ouvrez `http://localhost:5173`, créez une salle, puis ouvrez un second onglet
(ou partagez le code) pour rejoindre en tant que second joueur.

## Structure du projet

```
server/   API temps réel (Express + Socket.io + chess.js)
  src/
    index.js   Point d'entrée, gestion des événements socket
    rooms.js    Gestion des salles et de l'état de partie
client/   Interface React (Vite)
  src/
    App.jsx              Écran d'accueil (créer / rejoindre une salle)
    components/Game.jsx  Écran de jeu (échiquier, contrôles, historique)
    socket.js             Instance socket.io-client partagée
```

## Déploiement

- **Serveur** : toute plateforme Node.js (Render, Railway, Fly.io, etc.). Définir
  `CLIENT_ORIGIN` sur l'URL du client déployé pour restreindre les CORS.
- **Client** : `npm run build` produit un dossier `dist/` statique, déployable sur
  Vercel, Netlify, etc. Définir `VITE_SERVER_URL` sur l'URL du serveur déployé.

## Application mobile Android (Capacitor)

Le client est packagé en application Android native avec
[Capacitor](https://capacitorjs.com/). Le projet natif se trouve dans
`client/android/`.

**Important** : l'application mobile a besoin du serveur temps réel (Socket.io)
pour fonctionner — ce n'est pas une appli hors-ligne. Le serveur doit être
déployé quelque part en **HTTPS** (Android bloque le trafic non chiffré par
défaut) et accessible depuis Internet, avant de builder l'APK.

### Récupérer l'APK automatiquement (recommandé)

Un workflow GitHub Actions (`.github/workflows/build-android.yml`) build un
APK de débogage installable à chaque push sur `client/**`, et le publie comme
**Release** GitHub (onglet *Releases* du dépôt) et comme artefact de build.

1. Déployez `server/` (voir ci-dessus) et notez son URL HTTPS.
2. Dans les paramètres du dépôt GitHub : **Settings → Secrets and variables →
   Actions → Variables → New repository variable**, créez `VITE_SERVER_URL`
   avec cette URL.
3. Relancez le workflow (`Actions → Build Android APK → Run workflow`, ou un
   nouveau push sur `client/`).
4. Téléchargez `echec-et-mat.apk` depuis la Release publiée, transférez-le sur
   un téléphone Android et installez-le (autoriser "Installer des
   applications inconnues" pour l'app utilisée pour l'ouvrir).

L'APK est signé avec la clé de débogage par défaut : parfait pour tester sur
vos propres appareils, mais pas destiné à une publication sur le Play Store
(qui nécessite une signature de release dédiée).

### Builder localement (nécessite Android Studio / le SDK Android)

```bash
cd client
npm install
echo "VITE_SERVER_URL=https://votre-serveur.example.com" > .env
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# APK généré dans android/app/build/outputs/apk/debug/app-debug.apk
```

Vous pouvez aussi ouvrir `client/android` dans Android Studio
(`npx cap open android`) pour lancer l'app sur un émulateur ou builder l'APK
depuis l'IDE.
