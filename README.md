# Web Faery

The website for Web Faery: hand-built websites for small local businesses, paid once,
with optional care. Live at https://webfaery.love

The pricing, said the same way on every page: builds $600 / $1,200 / $1,800, paid once.
After launch, care is $69 a month (or $690 a year) and changes come whenever you ask,
or skip it and pay as you go: $100 an hour, and the client gets the price before any work starts (one email with
everything in it; most small changes come to about $25 to $50). Anything big is quoted the same way. The only other cost is the
web address, about $12 a year. Founding clients get half off the build, and care locked at
$49 a month (or $490 a year).

| File | What it is |
|---|---|
| `index.html` | Home page |
| `quiz.html` | Which-build quiz (and whether care is worth it) |
| `welcome.html` | What happens after you reach out |
| `domain.html` | Guide to getting a web address |
| `intake.html` | Getting-started questionnaire |
| `pages.css` | Shared look for the smaller pages |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | The moon icon for browser tabs, search results and phone home screens |

The founding count ("4 left") lives in one place only: the `#founding` line in `index.html`.

Tests (not published; folders starting with `_` are skipped by GitHub Pages):
`node _tests/quiz-paths.test.mjs` and `node _tests/site-text.test.mjs`
