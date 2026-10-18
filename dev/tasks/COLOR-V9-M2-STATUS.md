# COLOR-V9-M2 STATUS

Job cm9-m2. Branch `color-v9-m2`. Original vector art only (paths in code). No existing color file was edited. yoga/, tiles/, and home/ were not touched. No merge, no deploy, no new dependencies.

## Pictures

Region count is the number of shapes. Color count is the palette length. A picture is big when it has 40–80 shapes. Min area is the smallest shape's filled area inside the 2048 canvas, as a percent of 2048×2048. The 1% rule applies to big pictures only.

### Rainbow Skies (id `rainbow`, order 7) — 10 pictures

| id | name | regions | colors | stars | big | min area |
|---|---|---:|---:|---:|---|---:|
| rh1 | Rainbow Over Hills | 47 | 14 | 2 | yes | 1.078% |
| rh2 | Unicorn with Rainbow | 48 | 14 | 3 | yes | 1.043% |
| rh3 | Rainbow with Clouds | 16 | 10 | 1 | | 1.767% |
| rh4 | Rainbow Bridge Castle | 42 | 14 | 3 | yes | 1.135% |
| rh5 | Rainbow Waterfall | 46 | 14 | 2 | yes | 1.068% |
| rh6 | Rainbow Balloon | 18 | 11 | 1 | | 0.348% |
| rh7 | Rainbow Kite Day | 35 | 14 | 2 | | 0.191% |
| rh8 | Double Rainbow Lake | 43 | 14 | 2 | yes | 1.159% |
| rh9 | Rainbow Butterfly | 25 | 10 | 1 | | 0.020% |
| rh10 | Rainbow Cake | 27 | 12 | 2 | | 0.137% |

Big pictures in this pack: 5.

### Magic Garden (id `garden`, order 8) — 8 pictures

| id | name | regions | colors | stars | big | min area |
|---|---|---:|---:|---:|---|---:|
| gd1 | Flower Gate | 47 | 14 | 2 | yes | 1.159% |
| gd2 | Tulip Fountain | 50 | 14 | 3 | yes | 1.207% |
| gd3 | Mushroom Parade | 50 | 14 | 2 | yes | 1.134% |
| gd4 | Sunflower Friends | 39 | 9 | 1 | | 0.020% |
| gd5 | Rose Arch | 30 | 14 | 2 | | 0.127% |
| gd6 | Lily Pond | 39 | 14 | 2 | | 0.014% |
| gd7 | Watering Day | 26 | 9 | 1 | | 0.113% |
| gd8 | Lantern Garden | 50 | 14 | 3 | yes | 1.116% |

Big pictures in this pack: 4.

### Space Party (id `space`, order 9) — 7 pictures

| id | name | regions | colors | stars | big | min area |
|---|---|---:|---:|---:|---|---:|
| sp1 | Rocket Parade | 42 | 14 | 3 | yes | 1.159% |
| sp2 | Planet Party | 42 | 14 | 2 | yes | 1.147% |
| sp3 | Alien Dance | 41 | 14 | 2 | yes | 1.116% |
| sp4 | Moon Picnic | 17 | 9 | 1 | | 0.095% |
| sp5 | Comet Friends | 22 | 14 | 2 | | 0.330% |
| sp6 | Star Balloon | 13 | 8 | 1 | | 0.240% |
| sp7 | Galaxy Cupcakes | 28 | 14 | 3 | | 0.085% |

Big pictures in this pack: 3.

Totals: 25 pictures, 883 regions. Every picture uses 6–14 colors and stars 1, 2, or 3. Ids are lowercase alphanumeric.

## File size

Pack source (paths only):

| file | bytes |
|---|---:|
| color/packs/kit2.js | 2,052 |
| color/packs/rainbow.js | 11,847 |
| color/packs/garden.js | 10,170 |
| color/packs/space.js | 8,926 |
| **JS total** | **32,995** |

Review PNGs under `dev/qa/color-v9-m2/out/`: 25 pictures at 2048×2048 plus one contact sheet (2156×3122). Combined PNG bytes: 12,441,808.

## Art-rule checks

Ran `node dev/qa/color-v9-m2/render.mjs` (headless Chrome, no new packages, no network fetch of assets).

| check | result |
|---|---|
| Provenance header on rainbow.js, garden.js, space.js, kit2.js | PASS |
| Paths only: no images, fonts, urls, or external assets in the pack files | PASS |
| Picture ids and pack ids match `[a-z0-9]+` | PASS |
| World size 2048×2048, palette hex, shape tuples `[color, path, clip?]` | PASS |
| 6–14 colors and stars 1–3 on every picture | PASS |
| Pack order 7, 8, 9 after the existing six | PASS |
| Rainbow Skies contains the 10 named scenes | PASS |
| At least 3 big pictures (40–80 shapes) in each pack | PASS (5, 4, 3) |
| Every shape in a big picture is at least 1% of the canvas | PASS (smallest big-picture shape 1.043%) |
| kit.js, index.html, sw.js, and other existing files unchanged | PASS |
| yoga/, tiles/, home/ untouched | PASS |
| No AI raster, no traced art, no real people, no letters or logos in the pictures | PASS (contact-sheet review) |

Outlines in the PNGs are the app's own stroke (`#b2346f`, width 10), drawn by the review script the same way `color/render.js` strokes a finished picture.

## Unfinished

Nothing in this card's scope is unfinished. M4 still has to add the script tags (`kit2.js`, then `rainbow.js`, `garden.js`, `space.js`) and the service-worker shell list. Number spots are not prebaked; the app computes them when `pic.lab` is absent.

## Tokens

This agent session does not expose a token meter. The card's cost-guard estimate was 500k.
