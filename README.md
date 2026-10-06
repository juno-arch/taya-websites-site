# Web Faery

The website for Web Faery: hand-built websites for small local businesses, paid once,
with care that keeps them running. Live at https://webfaery.love

The pricing (Oct 5 2026; source of truth: web-faery-kit/pricing-oct2026.md), said the same way on every page:
Planted (one page) $600, Tended (a full site) $1,200, In Bloom (booking, payments or a small shop) $1,800, paid once.
Founding clients (5 spots, through Dec 31 2026) get half off the build: $300 / $600 / $900. Care comes with every
site, monthly only, matching the build: $12 / $45 / $90 a month, starting after the 30 days of settling in. Changes
are the same in every tier: email anytime, as often as needed, anything broken fixed free, big new things quoted first.
Care is required for new clients. If they ever stop it, the site is still theirs, with every file and login handed over.
Internal keys stay maiden / mother / crone. Anyone quoted before Oct 5 2026 keeps their quote as written: care stays
optional for them, and if they choose it, they can take the new care price when it's lower.

What comes with which build (the small rules, Oct 5 2026, and the booking ladder, Oct 6 2026):
- Planted has no Book button: people call, text or email them.
- Tended has a Book button that opens their booking page: the app they already use, or a free Cal.com Taya sets up
  for them, in their name.
- In Bloom has booking right on the site: their own app, where it really offers a website booking embed, or a free
  Cal.com if they'd rather switch. It's their choice, asked when they pick In Bloom.
- Anything that takes payments (deposits, gift certificates, a shop, booking with payments) is In Bloom.
- Interactive pieces that take no bookings or payments (a matcher or a planner) are Tended.
- The Instagram feed on a site is Tended and up.
- Email forwarding to their usual inbox is free on Planted. Sending from their own address comes with Tended and In Bloom.

Accounts are all in the client's name. Taya sets up their newsletter (Buttondown) and booking (Cal.com) with their
email during the build and hands over the logins at launch, each with its own password they change. Their Google
profile and Stripe are theirs too, with Taya added as a helper. Their web address lists them as the legal owner, and
Taya holds it and renews it as part of care. Sites live on GitHub Pages; an In Bloom site that takes payments or runs
a shop lives on Cloudflare Pages.

| File | What it is |
|---|---|
| `index.html` | Home page |
| `quiz.html` | Which-build quiz (which build fits, the care that comes with it, and every cost) |
| `welcome.html` | What happens after you reach out |
| `domain.html` | How your web address works: held for you, legally yours, renewed by care; pointing or moving one you already have |
| `intake.html` | Getting-started questionnaire (email only, so it asks for no phone number) |
| `start.html` | The getting-started page for someone who said yes: the agreement, the deposit and their accounts (not in search) |
| `texts.html` | Texts from Web Faery: what's sent, how often, how to stop. Its wording matches the texting registration, so keep it as is |
| `portal.html`, `portal.js`, `portal.css` | A client's private project page (not in search) |
| `mark.js` | Notes and the build picker on a private mockup link (`peek/KEY/?mark=1`) |
| `peek/` | Mockups for prospects, kept out of search by `robots.txt` |
| `pages.css` | Shared look for the smaller pages |
| `soil.css` | The charcoal soil behind every page and the mycelium living in it: how the threads grow in and rest, and the tiny gold lights that travel along them (shared by every page) |
| `mycelium.svg`, `mycelium.js` | The mycelium network itself (one file every page shares) and the small script that lays it into the soil and grows it in once a visit. Without JavaScript or with reduced motion it simply shows, still |
| `_mycelium/` | Not published: the scripts that grow the network and build `mycelium.svg` and the lights in `soil.css` (`python3 _mycelium/grow.py && python3 _mycelium/build.py`) |
| `faery.js`, `faery.css`, `images/faery/` | Bramble, the little faery in the corner of every page (tap her, ask her things); how to swap in Taya's drawings is at the top of `faery.js` |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` | The moon icon for browser tabs, search results and phone home screens |

The look (Taya's pick, Sep 30, 2026, the Mycelium palette): charcoal soil `#0e0e0c`, warm charcoal cards `#1c1b18`,
bone ink `#ece6da`, and chanterelle gold: `#f2c77c` for links and the italic words, `#f0b867` for labels and lines,
`#e6a852` as a fill with `#1c1209` on it. No purple anywhere. The colors are tokens at the top of `index.html`,
`pages.css` and `start.html` (and `faery.css` for her bubble); every word on the soil is checked against the brightest
thread and light (the notes are in `soil.css`).

The founding count (like "3 left") lives in one place only: the `#founding` line in `index.html`.

Clients reach Taya by email only (no calls, no chat). There's no chat or call link anywhere on the site: to get
in touch, every page points to the free mockup (`intake.html`) or to taya@webfaery.love.

Tests (not published; folders starting with `_` are skipped by GitHub Pages):
`node _tests/quiz-paths.test.mjs`, `node _tests/site-text.test.mjs` and `node _tests/portal-text.test.mjs`
