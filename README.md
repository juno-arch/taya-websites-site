# Web Faery

The website for Web Faery: hand-built websites for small local businesses, paid once,
with care that keeps them running. Live at https://webfaery.love

The pricing (Oct 5 2026; source of truth: web-faery-kit/pricing-oct2026.md), said the same way on every page:
Planted (one page) $600, Tended (a full site) $1,200, In Bloom (booking, payments or a small shop) $1,800, paid once.
Founding clients (5 spots, through Dec 31 2026) get half off the build: $300 / $600 / $900. Care comes with every
site, monthly only, matching the build: $12 / $45 / $90 a month, starting after the 30 days of settling in. Changes
are the same in every tier: email anytime, as often as needed, anything broken fixed free, big new things quoted first.
Stop care anytime and the site is still theirs, with every file and login handed over. Internal keys stay
maiden / mother / crone. Anyone quoted before Oct 5 2026 keeps their quote as written.

| File | What it is |
|---|---|
| `index.html` | Home page |
| `quiz.html` | Which-build quiz (and whether care is worth it) |
| `welcome.html` | What happens after you reach out |
| `domain.html` | Guide to getting a web address |
| `intake.html` | Getting-started questionnaire |
| `pages.css` | Shared look for the smaller pages |
| `soil.css` | The charcoal soil behind every page and the mycelium living in it: how the threads grow in and rest, and the tiny gold lights that travel along them (shared by every page) |
| `mycelium.svg`, `mycelium.js` | The mycelium network itself (one file every page shares) and the small script that lays it into the soil and grows it in once a visit. Without JavaScript or with reduced motion it simply shows, still |
| `_mycelium/` | Not published: the scripts that grow the network and build `mycelium.svg` and the lights in `soil.css` (`python3 _mycelium/grow.py && python3 _mycelium/build.py`) |
| `faery.js`, `faery.css`, `images/faery/` | The little faery in the corner of every page (tap her, ask her things); how to swap in Pollen's drawings is at the top of `faery.js` |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | The moon icon for browser tabs, search results and phone home screens |

The look (Pollen's pick, Sep 30, 2026, the Mycelium palette): charcoal soil `#0e0e0c`, warm charcoal cards `#1c1b18`,
bone ink `#ece6da`, and chanterelle gold: `#f2c77c` for links and the italic words, `#f0b867` for labels and lines,
`#e6a852` as a fill with `#1c1209` on it. No purple anywhere. The colors are tokens at the top of `index.html`,
`pages.css` and `start.html` (and `faery.css` for her bubble); every word on the soil is checked against the brightest
thread and light (the notes are in `soil.css`).

The founding count ("3 left") lives in one place only: the `#founding` line in `index.html`.

The free 30-minute chat link lives in one place only: `FREE_CHAT` in the first script after the hero in
`index.html` (still a placeholder, `https://cal.com/webfaery/free-chat`: swap in the real Cal.com link).
Both "Book a free 30-minute chat" buttons and the faery take it from there. It's a plain link that opens
in a new tab, with no Cal.com script on the site, so "No trackers" stays true.

Tests (not published; folders starting with `_` are skipped by GitHub Pages):
`node _tests/quiz-paths.test.mjs` and `node _tests/site-text.test.mjs`
