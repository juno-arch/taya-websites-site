# Web Faery

The website for Web Faery: hand-built websites for small local businesses, paid once,
with optional care. Live at https://webfaery.love

The pricing, said the same way on every page: builds $600 / $1,200 / $1,800, paid once.
After launch, care is $69 a month (or $690 a year) and changes come whenever you ask,
or skip it and pay as you go: $100 an hour, and the client gets the price before any work starts (one email with
everything in it; most small changes come to about $25 to $50). Anything big is quoted the same way. The only other cost is the
web address, about $12 a year. Founding clients get half off the build, and half off care for as long as they keep it:
$35 a month (or $350 a year). Every build also comes with the Google profile set up and a one-page brand
sheet (colors and fonts, and their logo if they have one); care keeps the Google profile fresh (hours and holidays, new photos,
a monthly post, and a review card for the counter).

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

The founding count ("4 left") lives in one place only: the `#founding` line in `index.html`.

The free 30-minute chat link lives in one place only: `FREE_CHAT` in the first script after the hero in
`index.html` (still a placeholder, `https://cal.com/webfaery/free-chat`: swap in the real Cal.com link).
Both "Book a free 30-minute chat" buttons and the faery take it from there. It's a plain link that opens
in a new tab, with no Cal.com script on the site, so "No trackers" stays true.

Tests (not published; folders starting with `_` are skipped by GitHub Pages):
`node _tests/quiz-paths.test.mjs` and `node _tests/site-text.test.mjs`
