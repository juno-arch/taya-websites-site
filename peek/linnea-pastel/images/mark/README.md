# Linnea Pastel: tribal swirl marks

Three standalone marks that sit beside her blackletter "pastel" wordmark (the wordmark is never redrawn or replaced). Every shape comes from her own art: the swirl flourish in `pastel-logo-pink.png` and the tribal print on her windbreakers (`p-cyberpurple.webp`, `p-cyberbw.webp`). All are clean vectors (Bezier paths only, no pixels, no fonts, no text, no background).

| | What it is | Shape |
|---|---|---|
| **A** | The flourish lifted straight out of her logo, spiral and tapered tips intact | wide banner, about 4.5 : 1 |
| **B** | A round seal: one windbreaker lobe rotated 4 times around a hub spiral from the logo | square, round |
| **C** | A tribal-swirl "P": bowl is the logo spiral, stem is the barbed stem from the windbreaker print | tall, about 0.8 : 1 |

## Colors

| Name | Hex | Where it comes from |
|---|---|---|
| Pink | `#f595c8` | sampled from `pastel-logo-pink.png` |
| Flash black | `#1a1420` | the site's ink, used for outlines |
| Lilac | `#c9a7f2` | her jacket lilac (the site's `--lav` is `#c7b3f2`, same family) |
| White | `#ffffff` | for dark grounds |
| Paper | `#fdf3f7` | the site's ground, used inside the A sticker |

## File naming

- `mark-x.svg` has no color suffix and uses `currentColor`. It only takes the text color when the SVG is pasted inline in the page (or used as a CSS `mask-image`). Loaded through `<img>` or a CSS background it renders black.
- `-pink`, `-black`, `-white`, `-lilac`: the same geometry with a hard color. Safe in `<img>`, email, Canva, print.
- `-1024`, `-512`, `-180` PNGs: transparent, long side in px (A is wide, so 1024 / 512 / 180 px wide).
- `-sticker`: flash-black outline, pink offset shadow, flat fill. Use on any light or dark ground.

## Concept A (banner)

| File | Use |
|---|---|
| `mark-a.svg`, `-pink`, `-black`, `-white`, `-lilac` | the real mark, tight viewBox (1000 x 261, 24 unit margin). Use at 160 px wide and up |
| `mark-a-bold*.svg` | same shape with the hairline tips thickened. Use between 120 and 160 px wide, and for small renders |
| `mark-a-outline.svg`, `mark-a-outline-pink.svg` | line-art version for neon signs and window decals |
| `mark-a-sticker.svg` + PNG 1024 / 512 | paper-colored die-cut sticker, flash-black outline, pink shadow |
| `mark-a-{pink,black,white,lilac}-1024.png` | 1024 px wide from the regular cut |
| `mark-a-{pink,black,white,lilac}-512.png`, `-180.png` | rendered from the bold cut so the hairline tips do not break into specks |

A is a banner, so it is not a favicon or an avatar. Under 120 px wide it turns into a smear. For square slots use C or B.

## Concept B (round seal)

| File | Use |
|---|---|
| `mark-b.svg`, `-pink`, `-black`, `-white`, `-lilac` + PNGs | the full seal, with the four eye dots. Use at 96 px and up: stickers, merch, footer seal, neon emblem |
| `mark-b-bold*.svg` | small-size cut of the same four lobes, closed up so they hold. Eye dots dropped, hub spiral kept. Use from 32 to 96 px |
| `mark-b-tile.svg` + PNG 1024 / 512 / 180 | flash-black disc with the pink small-size cut. Reads as a round badge down to 16 px. Use for avatars and 16 to 48 px slots |
| `mark-b-sticker.svg` + PNGs | lilac sticker with flash-black outline and pink offset shadow |

Below 32 px the lobes turn into texture. The outline of the disc is what carries the mark at 16 px.

## Concept C (swirl P)

| File | Use |
|---|---|
| `mark-c.svg`, `-pink`, `-black`, `-white`, `-lilac` + PNGs | the bare P. Holds as a distinct silhouette down to 16 px. Nav mark, footer seal, Instagram highlight covers |
| `mark-c-sticker.svg` + PNGs | lilac P, flash-black outline, pink offset shadow |

## Favicon

| File | Use |
|---|---|
| `favicon.svg` | concept C on a pink rounded tile, hard colors. Checked at 16 and 32 px on light and dark tab bars. `<link rel="icon" type="image/svg+xml" href="images/mark/favicon.svg">` |
| `favicon-32.png` | fallback for browsers that skip SVG icons |
| `favicon-180.png` | `apple-touch-icon` |

## Which one where

| Where | Use |
|---|---|
| Browser tab | `favicon.svg` |
| Nav, beside the wordmark (32 px tall) | C, or A bold (about 120 px wide) |
| Footer seal | B at 96 px and up, or C |
| Instagram highlight covers, avatar | C or B tile on a pastel ground |
| Stickers, merch | any `-sticker`, or B on a hat or tote |
| Neon sign | `mark-a-outline-pink.svg` or B |
| Newsletter header | A at 200 px wide or more |

## Minimum sizes and clear space

| Mark | Minimum |
|---|---|
| A | 120 px wide (160 px for the regular cut) |
| B full | 96 px, B bold 32 px, B tile 16 px |
| C | 16 px |

Leave clear space of one eighth of the mark's longest side on every side, and never less than 6 px.
