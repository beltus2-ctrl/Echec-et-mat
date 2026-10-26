# Outils de génération des ressources

Ces scripts ne sont pas nécessaires pour utiliser ou compiler l'application : ils ont
servi à produire les images et les puzzles déjà présents dans `client/`.

## Pièces 3D et échiquiers (`render/`)

Les pièces sont modélisées en 3D avec Three.js (profils tournés, opérations booléennes
pour les créneaux de la tour, la fente du fou, la couronne de la dame), habillées de
bois procédural (buis et ébène) puis rendues dans Chromium sans interface.

```bash
cd tools/render
npm install
node run.mjs out          # pièces → out/*.png (512×896, fond transparent)
node runboard.mjs         # échiquiers → boards/*.jpg
```

Le chemin de Chromium est défini en haut de `run.mjs` / `runboard.mjs`.
Les images sont ensuite converties en WebP dans `client/public/assets/`.
`icons.py` (Pillow) génère l'icône et l'écran de démarrage Android.

## Puzzles (`puzzles/`)

`gen.cjs` fait jouer Stockfish contre lui-même puis garde les positions où un mat en
1, 2 ou 3 coups existe **et** où le coup gagnant est unique.

```bash
cd tools/puzzles
npm install
WID=1 TARGET=30 node gen.cjs                 # écrit puzzles-1.jsonl
python3 build-puzzles.py ../../client/src/data/puzzles.json
```
