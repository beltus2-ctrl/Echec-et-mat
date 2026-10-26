# Kit marketing — Échec & Mat

```
marketing/
  videos/                  6 vidéos MP4 (envoyées à part, ou régénérées avec le studio)
  reseaux-sociaux/
    images/                posts Instagram/Facebook (1080×1350) et statut WhatsApp (1080×1920)
    legendes-et-plan.md    légendes, hashtags, solutions et plan de publication sur 2 semaines
  playstore/
    icone-512.png          icône 512×512
    feature-graphic.png    image principale 1024×500
    captures-telephone/    8 captures d'écran 1080×1920 avec accroches
    fiche-play-store.md    titre, descriptions, notes de version, questionnaires
    publier-sur-google-play.md   le guide complet de publication
  captures/                captures brutes de l'appli (1170×2532)
  studio/                  le code qui génère vidéos et visuels
```

## Les vidéos

| Fichier | Durée | Idée |
| --- | --- | --- |
| `defi-mat-en-1.mp4` | 17 s | « Tu trouves le mat en 1 ? », chrono de 5 s, solution animée |
| `defi-mat-en-2.mp4` | 21 s | Mat en 2 avec sacrifice de dame, chrono de 7 s |
| `defi-mat-en-3.mp4` | 26 s | « Niveau expert », mat en 3, chrono de 9 s |
| `coup-du-berger.mp4` | 23 s | Tuto : gagner en 4 coups, et comment l'éviter |
| `bande-annonce.mp4` | 27 s | Présentation de l'appli (vertical) |
| `bande-annonce-16x9.mp4` | 27 s | Même présentation en horizontal (YouTube, Google Play) |

Toutes les animations utilisent les vraies pièces 3D et les vrais échiquiers de
l'appli. Musique et bruitages sont synthétisés : libres de droits.

## Régénérer ou créer de nouveaux contenus

Il faut Node.js, Python 3 avec numpy, ffmpeg et Chromium.

```bash
cd marketing/studio
npm install
node render-all.mjs            # toutes les vidéos → marketing/videos
node images.mjs                # tous les visuels → marketing/playstore et reseaux-sociaux
node render.mjs defi-mat-en-2 apercu --preview 3,10,14   # quelques images fixes pour vérifier
```

Pour un nouveau défi, ajoute une entrée dans `SCENES` (fichier `studio/scenes.js`)
avec l'identifiant d'un puzzle de `client/src/data/puzzles.json`, une accroche et
une explication : la mise en scène, le chrono, la solution et le son sont
automatiques. Si tu modifies l'appli, recapture les écrans dans `captures/`.
