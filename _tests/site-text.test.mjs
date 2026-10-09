// Checks the words and links on every page, so an old price or a broken link can't slip through.
//
//   node _tests/site-text.test.mjs
//
// The pricing model (Oct 5 2026, per Pollen; the source of truth is web-faery-kit/pricing-oct2026.md):
//   builds Planted $600 / Tended $1,200 / In Bloom $1,800 (founding $300 / $600 / $900, half off the
//     build only, 5 spots through Dec 31, 2026), half to start, half at launch;
//   a subscription comes with every site (called "care" until Oct 6 2026, when Pollen switched the word), monthly
//     only, matching the build: $12 / $45 / $90 a month, starting after the 30 days of settling in; changes are the
//     same in every tier (socials first, or email, as often as needed, reply within 2 business days, "I watch over your site:
//     if it goes down, I know before you do, and if anything breaks, I fix it", big new things quoted first);
//   the subscription is part of every new site; if they ever cancel it, the site is still theirs, every file and
//     login handed over;
//   anyone quoted before Oct 5 keeps their quote, and the new subscription price if it's lower for them (one quiet
//     line on the main page).
//
// Fails (exit 1) if any page (or a string in its scripts, faery.js or mark.js):
//   - shows an old name or price (Maiden / Mother / Crone, $69, $690, $35, $350, $49, $490, $22 / $44 / $66,
//     $400 / $650 / $950, $95), the subscription as optional, pay as you go, an hourly rate, a yearly subscription,
//     the old name "care" for the subscription ("Tended care", "then care", "care comes with every site"...),
//     trades, self-editing, a retired offer (Photo Day, tending visits, Wildflower, Websites by Taya, half off
//     care, free hosting forever), an offer of a call or chat (email only), Stripe at "about 3%", or a dash
//     (mark.js keeps its "as sent" words on purpose: the already-emailed mockups show what they were sent)
//   - shows a monthly price other than the subscription's $12 / $45 / $90, or a side cost "paid by you" (email from their
//     own address comes with Tended and In Bloom; a Planted client who wants it moves up to Tended, Oct 5 2026)
//   - (the main page) leaves out the three subscription prices, the reply time, "quoted first", the settling-in start,
//     the quoted-before-October-5 line, or the hand-over promise; or the plan cards, the "Every plan's subscription
//     also includes" card under them (Oct 6 2026) and the "What does your subscription include?" answer stop listing
//     the same lines in the same words, or a card's list stops pointing down to that card; or any page brings back
//     the old holiday line ("a heads-up before holidays so your hours stay right")
//   - drifts from the small rules decided Oct 5 2026 (pricing-oct2026.md): the booking ladder (1, Oct 6 2026
//     afternoon, Pollen: "yes add the booking link to planted", which reversed that morning's "no Book button on
//     Planted"): every build's Book button opens the booking app they already use, Planted too (with no app, people
//     call, text or email); a free Cal.com set up for them is Tended and In Bloom; In Bloom puts booking right on the
//     site (their own app if it can sit on a website, or Cal.com: their choice); email forwarding free on
//     Planted (3); the Instagram feed Tended and up (6); no phone field on intake.html (7); texts.html's
//     "Replies" line kept exactly as is, since it matches the texting registration (8)
//   - shows the founding count ("N left") anywhere but once, inside id="founding" on the main page
//   - has JSON-LD that doesn't parse, or offers that don't match the page
//   - lists a noindex page, a mockup (peek/) or the portal in sitemap.xml
//   - links to a local file or #anchor that doesn't exist
//   - (the main page) grows back the removed sections, or its questions stop being 6 to 8 closed accordions
//   - shows a straight quote or apostrophe instead of a curly one
//   - drifts from the account setup flow (pricing-oct2026.md, "Account setup flow", Oct 5 2026): Taya sets up
//     the newsletter (Buttondown) and booking (Cal.com) in the client's name, with the client's email, and hands
//     over the logins at launch, each with its own strong password the client changes; she never asks for a
//     password they already use; the old "Please do it for me" / forward-me-the-code / sign-up-yourself steps
//     are gone; Google: the owner adds Taya as a manager, or Taya builds it and makes them its owner at launch;
//     Stripe the client makes, then adds Taya as a Developer; hosting: GitHub Pages, or Cloudflare Pages for an
//     In Bloom site that takes payments or runs a shop
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// 404.html (Oct 7 2026): what GitHub Pages shows at any address that isn't on the site, a mockup not pushed yet too
const PAGES = ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'domain.html', 'start.html', 'texts.html', '404.html'];
const CARE_PAGES = ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'start.html'];
const TIERS = { 'Planted': [600, 300, 12], 'Tended': [1200, 600, 45], 'In Bloom': [1800, 900, 90] };
const CARE = Object.values(TIERS).map((t) => t[2]);

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const fail = (msg) => failures.push(msg);

// What a visitor (or a screen reader, or Google) can see: the HTML minus styles, comments and
// scripts, except the quiz's own logic, whose strings end up on screen (its // comments are dropped).
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('id="quiz-logic"') ? m.replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '') : ''))
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}
// the same, as plain words: tags dropped, the common entities turned into their characters
const plainOf = (text) => text.replace(/<[^>]+>/g, ' ').replace(/&cent;/g, '¢').replace(/&rsquo;/g, '’').replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ').replace(/\s+([.,;:)])/g, '$1').replace(/\s+/g, ' ');

const FORBIDDEN = [
  [/\bMaiden\b|\bMother\b|\bCrone\b/, 'an old tier name (Planted, Tended, In Bloom now)'],
  [/\$69\b|\$690|\$35\b|\$350|\$49\b|\$490|\$444|\$666|\$888|\$588|\$22\b|\$44\b|\$66\b|\$400\b|\$650\b|\$950\b|\$95\b/, 'an old price'],
  [/care is optional|optional care|care,? optional|skip care|with or without care|without care|no care\b|subscription is optional|optional subscription|subscription,? optional|skip (?:the |your )?subscription|with or without a subscription|no subscription\b/i, 'the subscription as optional (it comes with every site now)'],
  [/looked after if you like|care,? if you (?:like|want)|subscription,? if you (?:like|want)|only if you want it/i, 'the subscription as optional (it comes with every site now)'],
  [/Photo Day|tending visit|Wildflower|Websites by Taya|half off care|free hosting forever|Message Taya/i, 'a retired name or offer'],
  [/edit your own site|swappable photos?/i, 'self-editing (not offered)'],
  [/\$3 a month/i, 'the old $3 a month own-address email (it comes with Tended and In Bloom)'],
  [/\babout 3%/i, 'Stripe at "about 3%" (it’s about 2.9% + 30¢ per payment)'],
  [/\ba year after launch\b/i, 'a yearly total (care is monthly only)'],
  [/pay(?:ing)? as you go/i, 'pay as you go'],
  [/\$\d[\d,.]* an hour|per hour|by the minute|per minute/i, 'an hourly rate'],
  [/\$25 to \$50/, 'the old "most small changes" estimate'],
  [/two months free|paid yearly|yearly care|care[^.]{0,30}a year\b|yearly subscription|subscription[^.]{0,30}a year\b/i, 'a yearly subscription (monthly only now)'],
  [/quick change|update session|change it yourself|change these yourself|coming soon/i, 'self-editing (not offered)'],
  // the monthly part is a "subscription" since Oct 6 2026 (Pollen: "subscription makes more sense to people"), so the
  // old rule against that word is retired, and "care" as the plan's name is what can't come back. Ordinary care
  // (skin care, aftercare, "I take care of it", the Garden care eyebrow) is fine.
  [/\b(?:Planted|Tended|In Bloom)(?:’s)? care\b|\bcare (?:comes with|is part of) every site|\bthen care\b|\bmonthly care\b|\bcare plan\b|What does care include|What (?:each )?care includes|\bstop care\b/i, 'the old name "care" for the subscription (it’s "subscription" since Oct 6 2026)'],
  [/paid by you/i, 'a side cost "paid by you" (no add-ons: own-address email comes with Tended and In Bloom)'],
  [/\btrad(?:e|es|ed|ing)\b/i, 'trades (only ever offered privately)'],
  [/founding spots last/i, 'open-ended founding wording (show the count and the deadline)'],
  [/\bon call\b/i, '"on call"'],
  [/\b(?:book a call|a quick call|45-minute call|want to chat|a chat|hop on a call|video call|phone call|chat with|free chat|30-minute chat|rather talk)\b|Let’s talk/i, 'an offer of a call or chat (email only)'],
  [/setting up booking for you is part of In Bloom|booking fully set up for you|In Bloom sets it all up/i, 'booking setup tied to In Bloom (Cal.com booking is set up with Tended and In Bloom; small rule 1)'],
  // the booking ladder's Oct 6 morning version (no Book button on Planted) was reversed that afternoon (Pollen: "yes add
  // the booking link to planted"): every build's Book button opens the booking app they already use
  [/no Book (?:now )?button|skips the Book (?:now )?button|Book (?:now )?button (?:comes with|is part of) Tended|Book (?:now )?button is part of Tended and In Bloom/i, 'the old “no Book button on Planted” rule (since Oct 6 2026 afternoon, every build’s Book button opens the booking app they already use)'],
  // the holiday line every plan includes since Oct 6 2026 ("Holiday heads-ups, with your hours updated on your site
  // and your Google profile") replaced the old "a heads-up before holidays so your hours stay right"
  // the two every-plan lines "Anything broken, I fix free" and "I keep an eye on your site, and if it goes down, I know
  // before you do" became one line on Oct 6 2026, with no "free": "I watch over your site: if it goes down, I know before
  // you do, and if anything breaks, I fix it"; and the magic link is "your magic site" in anything people read
  [/Anything broken, I fix free|I keep an eye on your site|your own magic link|tap it right on your site and type me a note/i, 'an old every-plan or magic link line (since Oct 6 2026: “I watch over your site: if it goes down, I know before you do, and if anything breaks, I fix it” and “Your magic site, yours for good”)'],
  // and the fixes promise lost its "free" everywhere too (start.html's terms and summary, welcome.html; Oct 6 2026)
  [/fix(?:ed|es)?[^.]{0,40}\bfree\b|always free/i, 'fixes called free (since Oct 6 2026: “if anything breaks, I fix it”, no “free”)'],
  [/heads-up before holidays|before holidays,? so your hours stay right/i, 'the old holiday line (it’s “Holiday heads-ups, with your hours updated on your site and your Google profile” since Oct 6 2026)'],
  [/[—–]|&mdash;|&ndash;|&#821[12];/, 'a dash'],
];

const texts = {};
const plain = {};
for (const page of PAGES) {
  const html = read(page);
  const text = visibleText(html);
  texts[page] = text;
  plain[page] = plainOf(text);
  for (const [re, what] of FORBIDDEN) {
    const m = text.match(re);
    if (m) fail(`${page}: contains ${what}: "${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}"`);
  }
  // every monthly price is care's ($12 / $45 / $90); no side costs (the old $3 own-address email for Planted is gone)
  for (const m of plain[page].matchAll(/\$(\d+) a month/g)) {
    if (!CARE.includes(+m[1])) fail(`${page}: shows $${m[1]} a month: "${plain[page].slice(Math.max(0, m.index - 60), m.index + 20)}"`);
  }
}

// the words that live in scripts (each page's own scripts, Bramble in faery.js, the build picker in mark.js):
// every '...' string, comments dropped first (a string never holds //, except web addresses)
function literals(src) {
  const out = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const re = /'((?:\\.|[^'\\\n])*)'/g;
  let m;
  while ((m = re.exec(code))) out.push({ s: m[1], before: code.slice(Math.max(0, m.index - 12), m.index) });
  return out;
}
const scriptStrings = [];
for (const page of PAGES) {
  // the quiz's own logic is already read as visible text above; JSON-LD is checked below
  for (const m of read(page).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/id="quiz-logic"|application\/ld\+json/.test(m[1])) continue;
    for (const l of literals(m[2])) scriptStrings.push([page, l.s]);
  }
}
// Bramble's answers (her keys: are only words she listens for, never shown)
for (const l of literals(read('faery.js'))) if (!/keys:\s*$/.test(l.before)) scriptStrings.push(['faery.js', l.s]);
// mark.js keeps the "as sent" names, words and old "Care is optional" line for the mockups already emailed (never change those)
{
  const mark = read('mark.js');
  const AS_SENT_CARE = 'Care is optional, and every cost is written out at ';
  if (!/const AS_SENT = \{[\s\S]*?name: 'Maiden'[\s\S]*?name: 'Mother'[\s\S]*?name: 'Crone'/.test(mark) || !mark.includes(`'${AS_SENT_CARE}'`)) {
    fail('mark.js: the "as sent" words are gone (already-emailed mockups must keep the names, prices and care line they were sent with)');
  }
  const rest = mark.replace(/const AS_SENT = \{[\s\S]*?\n\s*\};/, '').replace(/const NAMES = \{[^}]*\};/, '');
  for (const l of literals(rest)) if (l.s !== AS_SENT_CARE) scriptStrings.push(['mark.js', l.s]);
  // mark.js is public (Oct 7 2026, with "Your notes", Taya's own notes on a mockup before it goes out): no helper's or
  // tool's name anywhere in it, comments too, no dashes in its comments either, and her notes key stays in one tab only
  const who = mark.match(/\b(Moss|Claude|Anthropic)\b/);
  if (who) fail(`mark.js: names ${who[1]} (a public file: keep it out, comments too)`);
  if (/[—–]|&mdash;|&ndash;/.test(mark)) fail('mark.js: has an em or en dash (comments too)');
  if (!/const STORE = 'wf-pre-v1:' \+ PAGE;/.test(mark) || /localStorage\.(?:setItem|getItem|removeItem)\(STORE[,)]/.test(mark)) {
    fail('mark.js: her notes key (wf-pre-v1:/peek/SLUG/) must stay in sessionStorage, this tab only');
  }
  // Light and dark in her notes bar (Oct 7 2026, Pollen: "I want to be able to see the site in dark and light mode when
  // editing"): a Light / Dark / Auto switch in her part only, the Light / Dark pill on each mockup kept reachable, and each
  // note saved with the look it was made in. (The hub's own rehearsal lists the bar's .wfm-btn buttons as "My notes, Pause,
  // Close" and reads a pin's text as its number, so the switch is not a .wfm-btn and the chip on a pin is not text.)
  const cut = mark.indexOf('if (window.__wfMark) return; window.__wfMark = true;');
  const hers = cut > 0 ? mark.slice(0, cut) : mark, clients = cut > 0 ? mark.slice(cut) : '';
  if (cut < 0) fail('mark.js: can not tell her part from the client part (the second part starts with window.__wfMark = true)');
  if (!/const LOOK_STORE = 'wf-pre-theme-v1:' \+ PAGE;/.test(hers) || /localStorage\.(?:setItem|getItem|removeItem)\(LOOK_STORE[,)]/.test(hers)) {
    fail('mark.js: her light or dark choice (wf-pre-theme-v1:/peek/SLUG/) must stay in sessionStorage, this tab only');
  }
  for (const w of ['Light', 'Dark', 'Auto']) if (!new RegExp(`\\['${w.toLowerCase()}', '${w}', '[^']+'\\]`).test(hers)) fail(`mark.js: her bar has no "${w}" button in the light or dark switch`);
  if (!/lookBox = el\('div', 'wfm-seg'\)/.test(hers) || !/el\('button', '', x\[1\]\)/.test(hers) || !/role', 'group'/.test(hers) || !/aria-pressed/.test(hers)) {
    fail('mark.js: her light or dark switch is a group of plain buttons (not .wfm-btn) with aria-pressed');
  }
  if (!/root\.setAttribute\('data-theme', v\)/.test(hers) || !/root\.removeAttribute\('data-theme'\)/.test(hers)) fail('mark.js: her switch must set data-theme on <html> (and take it off for Auto), like the pill on each mockup');
  if (!/#theme-tab \[data-theme\], #theme-panel \[data-theme\]/.test(hers)) fail('mark.js: her switch must keep the pill’s (and a pill panel’s) aria-pressed in step');
  if (!/withLook\(spot, look\)/.test(hers) || !/const pre = look \+ ' mode: ', room = 150 - pre\.length;/.test(hers) || !/const LOOK_RE = \/\^\(dark\|light\) mode: \/;/.test(hers)) {
    fail('mark.js: a note must go to the server as "dark mode: " or "light mode: " in front of its spot, trimmed to the 150 characters the server keeps');
  }
  if (!/data-look/.test(hers) || !/wfm-look/.test(hers)) fail('mark.js: a note’s look must show as a small chip on its pin and in My notes');
  if (!/pin\.style\.left = Math\.min\(window\.scrollX \+ r\.right - 4, window\.scrollX \+ root\.clientWidth - 22\)/.test(hers)) {
    fail('mark.js: a pin on an edge to edge photo or section (and its light or dark chip) must be kept on screen, so it does not push the page sideways');
  }
  const control = (hers.match(/const CONTROL = '[^;]*;/) || [''])[0];
  if (!/#theme-tab/.test(control) || !/\.theme-panel/.test(control) || !/button\[data-theme\]/.test(control)) fail('mark.js: the Light / Dark pill and its panel must count as controls in her part (a tap on them is not a note)');
  if (/(?:^|[',]\s*)\[data-theme\]/.test(control.replace(/(?:button|a)\[data-theme\]/g, ''))) fail('mark.js: a bare [data-theme] among her controls would match <html data-theme> and turn the whole page into a control');
  for (const word of ['wfm-seg', 'wfm-look', 'wfm-lift', 'wf-pre-theme-v1', 'LOOK_STORE']) if (clients.includes(word)) fail(`mark.js: "${word}" belongs to her part only (the clients’ magic mockup stays as it was)`);
}
for (const [file, s] of scriptStrings) {
  for (const [re, what] of FORBIDDEN) {
    const m = s.match(re);
    if (m) fail(`${file} (script): contains ${what}: "${s.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
  }
}

// the main page says the model plainly
{
  const t = plain['index.html'];
  for (const n of CARE) if (!t.includes(`$${n} a month`)) fail(`index.html: never shows the subscription at $${n} a month`);
  if (!/2 business days/.test(t)) fail('index.html: doesn’t give the reply time (2 business days)');
  if (!/as often as you need/.test(t)) fail('index.html: doesn’t say changes come as often as you need');
  if (!/big[^.]{0,60}quote/i.test(t)) fail('index.html: doesn’t say big new things are quoted first');
  if (!/half off the build/i.test(t)) fail('index.html: doesn’t say founding clients get half off the build');
  if (!/every file and login/.test(t)) fail('index.html: doesn’t say cancelling the subscription means every file and login handed over');
  if (!/If you ever cancel your subscription, your site is still yours/.test(t)) fail('index.html: doesn’t say the site is still theirs if they ever cancel the subscription');
  if (!t.includes('Quoted before October 5? Your quote stands, just as I wrote it, and if the new subscription price is lower for you, it’s yours 💛')) fail('index.html: lacks the quoted-before-October-5 line (with the lower-subscription-price offer)');
  for (const name of Object.keys(TIERS)) if (!t.includes(name)) fail(`index.html: never names ${name}`);
}
// the subscription starts after the settling-in days, wherever it is priced
for (const page of ['index.html', 'quiz.html', 'start.html']) {
  if (!/starts? after (?:your|the) 30 days of settling in|starting after your 30 days of settling in/i.test(plain[page])) fail(`${page}: doesn’t say the subscription starts after the 30 days of settling in`);
}

// the founding count lives in exactly one place: inside id="founding" on the main page
let countSpots = 0;
for (const page of PAGES) {
  for (const m of plain[page].matchAll(/\b\d+ (?:founding spots? |spots? )?left\b/g)) {
    countSpots++;
    if (page !== 'index.html') fail(`${page}: shows a founding count ("${m[0]}"); keep it only on the main page`);
  }
}
if (countSpots !== 1) fail(`the founding count appears ${countSpots} times; it should appear exactly once`);
const foundingEl = texts['index.html'].match(/<(\w+)[^>]*\sid="founding"[^>]*>([\s\S]*?)<\/\1>/);
if (!foundingEl) fail('index.html: no element with id="founding" (the quiz and intake link to index.html#founding)');
else {
  const f = plainOf(foundingEl[2]);
  if (!/\d+ left/.test(f)) fail('index.html #founding: no "N left" count');
  if (!/Dec 31, 2026/.test(f)) fail('index.html #founding: no deadline (Dec 31, 2026)');
}

// JSON-LD parses, matches the page, and says nothing the page wouldn't
for (const page of PAGES) {
  for (const m of read(page).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { fail(`${page}: JSON-LD doesn't parse (${e.message})`); continue; }
    for (const [re, what] of FORBIDDEN) if (re.test(m[1])) fail(`${page}: JSON-LD contains ${what}`);
    const offers = data.makesOffer || [];
    for (const [name, [full, , care]] of Object.entries(TIERS)) {
      const o = offers.find((x) => x.name.startsWith(name + ':'));
      if (!o || +o.price !== full) fail(`${page}: JSON-LD ${name} offer isn't $${full}`);
      const c = offers.find((x) => x.name === name + ' subscription');
      if (!c || +c.price !== care || !c.priceSpecification || +c.priceSpecification.price !== care || c.priceSpecification.unitText !== 'MONTH') fail(`${page}: JSON-LD ${name} subscription offer isn't $${care} a month`);
    }
    if (offers.some((o) => o.priceSpecification && o.priceSpecification.unitText !== 'MONTH')) fail(`${page}: JSON-LD has a non-monthly price (the subscription is monthly only)`);
  }
}

// sitemap: every listed page exists and is indexable
const sitemap = read('sitemap.xml');
for (const m of sitemap.matchAll(/<loc>https:\/\/webfaery\.love\/([^<]*)<\/loc>/g)) {
  const file = m[1] || 'index.html';
  if (!fs.existsSync(path.join(root, file))) { fail(`sitemap.xml lists ${file}, which doesn't exist`); continue; }
  if (/<meta name="robots" content="[^"]*noindex/.test(read(file))) fail(`sitemap.xml lists ${file}, which is marked noindex`);
  if (/^peek\/|portal/.test(file)) fail(`sitemap.xml lists ${file} (mockups and the portal stay out of search)`);
}

// local links, images and #anchors all exist
const idsOf = (file) => new Set([...read(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const page of PAGES) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, '');
  const refs = [];
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) refs.push(m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const [pathPart, hash] = ref.split('#');
    const file = (pathPart.split('?')[0]) || page;
    if (!fs.existsSync(path.join(root, file))) { fail(`${page}: links to ${ref}, which doesn't exist`); continue; }
    if (hash && /\.html$/.test(file) && !idsOf(file).has(hash)) fail(`${page}: links to ${ref}, but ${file} has no id="${hash}"`);
  }
}

// ---- policy decisions, said plainly wherever they matter ----
const atLeast = (page, re, n, what) => {
  const count = (plain[page].match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
  if (count < n) fail(`${page}: ${what} (found ${count}, want at least ${n})`);
};
for (const page of ['index.html', 'welcome.html']) {
  // a project that closes at 60 days: the deposit covers the work so far, and counts toward finishing within a year
  atLeast(page, /deposit covers the work (?:done )?so far[^.]*within a year/i, 1, 'doesn’t say what happens to the deposit if a project closes');
  atLeast(page, /(?:from|after) (?:when|the day) you say yes|days after you say yes/i, 1, 'doesn’t say the 30 and 60 days count from when you say yes');
}
// more rounds of changes during the build are quoted first
atLeast('index.html', /more rounds[^.]{0,60}quote/i, 1, 'doesn’t say extra rounds of changes are quoted first');
// card fees: Stripe's rate, said the same way everywhere
for (const page of PAGES) {
  for (const m of plain[page].matchAll(/\d+(?:\.\d+)?% \+ 30¢[^.]*/g)) {
    if (!/^2\.9% \+ 30¢ per payment/.test(m[0])) fail(`${page}: card fee isn't worded "about 2.9% + 30¢ per payment": "${m[0].slice(0, 90)}"`);
  }
}
// leaving is easy and free, and never takes the site down
if (!/easy and free/i.test(plain['index.html']) || !/within a week/i.test(plain['index.html'])) fail('index.html: the "What if I want to leave?" answer lacks "easy and free" / "within a week"');
// the web address hand-over: Porkbun needs a username, an ID check, and an Accept within 72 hours
if (!/Porkbun username/.test(plain['domain.html'])) fail('domain.html: the push needs the Porkbun username, not an email');
if (!/ID check/.test(plain['domain.html'])) fail('domain.html: doesn’t mention the new-account ID check');
if (!/Accept within 3 days/.test(plain['domain.html'])) fail('domain.html: doesn’t give the 3-day window to accept');
if ((plain['domain.html'].match(/2606:50c0:800[0-3]::153/g) || []).length !== 4) fail('domain.html: needs the four GitHub Pages AAAA records');

// ---- the account setup flow (pricing-oct2026.md, "Account setup flow", Oct 5 2026) ----
// gone everywhere: the old opt-in "do it for me", forwarding sign-in codes, one shared password, and the
// sign-up-yourself steps for Buttondown and Cal.com (Taya makes those now, with the client's email)
for (const page of PAGES) {
  const raw = texts[page]; // what a visitor sees (and the links they'd tap), comments and scripts dropped
  for (const [re, what] of [
    [/do it for me|do-it-for-me/i, 'the old "Please do it for me" opt-in (setting accounts up for them is simply how it works now)'],
    [/forward me[^.]{0,40}code/i, 'forwarding sign-in codes to Taya (accounts are made with their own email)'],
    [/generic password|same password|one password for/i, 'one shared password (every account gets its own)'],
    [/cal\.com\/signup|Your Cal\.com username|Your Buttondown username/i, 'a sign-up-yourself step for Cal.com or Buttondown (Taya makes them)'],
    [/A helper invite or a username is all I ever need/, 'the old password note'],
  ]) {
    const m = raw.match(re);
    if (m) fail(`${page}: still has ${what}: "${raw.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}"`);
  }
}
{
  const need = (page, re, what) => { if (!re.test(plain[page])) fail(`${page}: ${what}`); };
  need('index.html', /in your name and with your email, then hand you the logins at launch/, 'doesn’t say I set up their accounts with their email and hand over the logins at launch');
  need('index.html', /confirm-your-email/, 'doesn’t tell them to expect a confirm-your-email message or two');
  need('index.html', /at launch I make you its owner/, 'doesn’t say a Google profile I build becomes theirs at launch');
  need('start.html', /won’t ask for a password you already use/, 'doesn’t promise I won’t ask for a password they already use');
  need('start.html', /its own strong password/, 'doesn’t say every account I set up gets its own strong password');
  need('start.html', /hand you the logins/, 'doesn’t say I hand over the logins at launch');
  need('start.html', /ID, tax number and bank account/, 'doesn’t say why Stripe has to be them (their own ID, tax number and bank account)');
  need('start.html', /Developer/, 'doesn’t ask them to add me to Stripe as a Developer');
  need('start.html', /GitHub Pages[^.]*Cloudflare Pages/, 'the agreement doesn’t say where sites are hosted (GitHub Pages; Cloudflare Pages for In Bloom with payments or a shop)');
  need('welcome.html', /won’t ask for a password you already use/, 'doesn’t promise I won’t ask for a password they already use');
  need('welcome.html', /logins to the accounts I set up for you/, 'doesn’t say the logins come at launch');
  need('intake.html', /Buttondown account \(it’s your list\), which I set up for you with your email/, 'doesn’t say I set up their Buttondown with their email');
  need('intake.html', /Cal\.com account, free for one person, which I set up for you with your email/, 'doesn’t say I set up their Cal.com with their email');
  need('domain.html', /GitHub Pages[^.]*\. An In Bloom site that takes payments or runs a shop lives on Cloudflare Pages/, 'doesn’t say In Bloom sites with payments or a shop live on Cloudflare Pages');
  need('domain.html', /register it with your own email/, 'doesn’t say the web address is registered with their own email');
}

// ---- the small rules decided Oct 5 2026 (pricing-oct2026.md, Pollen: "yes to all") ----
{
  const need = (page, re, what) => { if (!re.test(plain[page])) fail(`${page}: ${what}`); };
  // 1. the booking ladder (Oct 6 2026 afternoon): Cal.com booking is set up for Tended and In Bloom (booking tied to
  // In Bloom alone is caught by FORBIDDEN); every build's Book button, Planted's too, opens the app they already use;
  // with no app, a Planted page says call, text or email; In Bloom puts booking right on the site, their own app or
  // Cal.com, their choice
  need('index.html', /free Cal\.com I set up for you/, 'the Tended card doesn’t offer a free Cal.com I set up (small rule 1)');
  need('index.html', /With Tended and In Bloom, I set you up with Cal\.com/, 'doesn’t say Cal.com is set up with Tended and In Bloom (small rule 1)');
  need('index.html', /Whichever build you pick, your Book button opens the booking app you already use/, 'doesn’t say every build’s Book button opens the booking app they already use (the booking ladder, Oct 6 2026 afternoon)');
  need('index.html', /keep it simple with Planted: people call, text or email you/, 'doesn’t say a Planted page with no booking app has people call, text or email (the booking ladder)');
  need('intake.html', /Whichever build you pick, your Book now button opens it/, 'doesn’t say every build’s Book now button opens the booking app they already use (the booking ladder)');
  need('start.html', /Whichever build you pick, your Book now button opens it/, 'doesn’t say every build’s Book now button opens the booking app they already use (the booking ladder)');
  need('index.html', /With In Bloom, booking sits right on your site[^.]*Cal\.com[^.]*\. That’s your choice/, 'doesn’t say In Bloom puts booking right on the site, their own app or Cal.com, their choice (the booking ladder)');
  // 2. (folded into 1 on Oct 6 2026)
  // every tier card on the main page lists everything its subscription includes (pricing-oct2026.md; Tended's
  // "Post once, show up everywhere" replaced "Your Google profile kept fresh" on Oct 6 2026), and what every plan's
  // subscription also includes (Oct 6 2026) is said once, in its own card right under the three, so the cards don't
  // crowd ("I follow your socials and update your site as you post, or you email me" (Oct 7 2026; it was "Email me anytime and I make your changes") moved there from the Planted card, and "Holiday heads-ups"
  // replaced Planted's "A heads-up before holidays")
  {
    const cards = [...read('index.html').matchAll(/<article class="tier (maiden|mother|crone)\b[\s\S]*?<\/article>/g)].map((m) => [m[1], plainOf(m[0])]);
    const INCLUDES = {
      maiden: [/Hosting, your web address, security and backups/, /Your magic site, yours for good: whenever something small needs changing, you just message me through it/, /your changes are up/, /monthly check-in/, /New reviews/],
      mother: [/Everything in Planted/, /Post once, show up everywhere/, /I only post what you’ve made or said yes to/, /newsletter sign-up, with sending covered/, /Instagram feed/, /Email from your own address/, /seasonal refresh/],
      crone: [/Everything in Tended/, /booking, payments or shop kept running/i, /Order direct for food businesses/, /flyer for one event a month/, /Private visitor counts/, /yearly refresh/],
    };
    if (cards.length !== 3) fail(`index.html: found ${cards.length} tier cards; want 3`);
    for (const [k, t] of cards) for (const re of INCLUDES[k] || []) if (!re.test(t)) fail(`index.html: the ${{ maiden: 'Planted', mother: 'Tended', crone: 'In Bloom' }[k]} card doesn’t list ${re}`);
    const planted = (cards.find((c) => c[0] === 'maiden') || [])[1] || '';
    if (/Cal\.com/.test(planted)) fail('index.html: the Planted card mentions Cal.com (setting one up is Tended and In Bloom; the booking ladder)');
    if (!/call, text or email/.test(planted)) fail('index.html: the Planted card doesn’t say people call, text or email');
    if (!/Book button to the booking app you already use, if you have one/.test(planted)) fail('index.html: the Planted card doesn’t offer a Book button to the booking app they already use (the booking ladder, Oct 6 2026 afternoon)');
    // what every plan's subscription also includes: once, right under the three cards, word for word
    const EVERY_PLAN = ['I follow your socials and update your site as you post, or you email me', 'Changes usually within 2 business days',
      'I watch over your site: if it goes down, I know before you do, and if anything breaks, I fix it',
      'Holiday heads-ups, with your hours updated on your site and your Google profile', 'If a host changes its rules, moving your site is on me'];
    const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
    const every = html.match(/<\/article>\s*<\/div>\s*<div class="every-plan\b[^>]*>([\s\S]*?)<\/div>\s*<div class="panel\b/);
    if (!every) fail('index.html: no "Every plan’s subscription also includes" card right under the three plan cards');
    const lisOf = (chunk) => [...chunk.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => plainOf(m[1]).trim());
    if (every) {
      if (!/Every plan’s subscription also includes/.test(plainOf(every[1]))) fail('index.html: the every-plan card lacks its label, “Every plan’s subscription also includes”');
      const got = lisOf(every[1]);
      if (got.join('|') !== EVERY_PLAN.join('|')) fail(`index.html: the every-plan card lists ${JSON.stringify(got)}; want ${JSON.stringify(EVERY_PLAN)}`);
    }
    for (const [, t] of cards) for (const line of EVERY_PLAN) if (t.includes(line)) fail(`index.html: a plan card repeats “${line}” (it’s said once, under the cards)`);
    // each card's list ends with a small pointer down to that card, so on a phone, where it comes after all three
    // moons, the shared lines still read as part of every plan
    for (const m of html.matchAll(/<article class="tier (maiden|mother|crone)\b[\s\S]*?<\/article>/g)) {
      if (!/<\/ul>\s*<p class="gets-more">[^<]*every plan[^<]*<\/p>/i.test(m[0])) fail(`index.html: the ${{ maiden: 'Planted', mother: 'Tended', crone: 'In Bloom' }[m[1]]} card’s list doesn’t end with the pointer to what every plan includes (class="gets-more")`);
    }
    // the "What does your subscription include?" answer: bullets, plan by plan, the same lines in the same words as
    // the cards and the every-plan card (the costs and accounts lines stay plain text after them)
    const answer = html.match(/<details id="care-includes">([\s\S]*?)<\/details>/);
    if (!answer) fail('index.html: no “What does your subscription include?” answer (id="care-includes")');
    else {
      const faqLis = lisOf(answer[1]);
      const cardLis = [...html.matchAll(/<article class="tier (?:maiden|mother|crone)\b[\s\S]*?<\/article>/g)].flatMap((m) => lisOf(m[0]));
      const want = cardLis.concat(every ? lisOf(every[1]) : []);
      if (faqLis.join('|') !== want.join('|')) fail('index.html: the “What does your subscription include?” bullets don’t match the plan cards and the every-plan card, line for line');
      for (const name of ['🌱 Planted, $12 a month', '🌿 Tended, $45 a month', '🌸 In Bloom, $90 a month', 'Every plan’s subscription also includes']) {
        if (!plainOf(answer[1]).includes(name)) fail(`index.html: the “What does your subscription include?” answer lacks “${name}”`);
      }
    }
    // Oct 7 2026 (Pollen: "media first then email just cause it's one less thing they need to do"): the same plan line
    // is in start.html's list and in the main page's JSON-LD, so the three places can't drift apart
    const startEvery = (read('start.html').match(/const CARE_EVERY = \[([\s\S]*?)\];/) || [])[1];
    if (!startEvery) fail('start.html: no CARE_EVERY list (what every plan’s subscription includes)');
    else if ([...startEvery.matchAll(/'([^']*)'/g)].map((m) => m[1]).join('|') !== EVERY_PLAN.join('|')) fail('start.html: CARE_EVERY doesn’t match the every-plan card on the main page, line for line');
    const ld = (read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '';
    if (!ld.includes('Every plan’s subscription also includes: ' + EVERY_PLAN[0])) fail('index.html: the Planted subscription JSON-LD doesn’t carry the every-plan card’s first line (socials first, then email)');
  }
  // 3. Planted gets free email forwarding; only sending from their own address needs Tended
  if (!/Email forwarding[\s\S]{0,200}?<td data-col="Planted">Free<\/td>/.test(read('domain.html'))) fail('domain.html: email forwarding isn’t Free for Planted (small rule 3: only sending needs Tended)');
  need('domain.html', /Sending from your own address[^.]*Tended/, 'doesn’t say sending from their own address comes with Tended (small rule 3)');
  // 6. the Instagram feed is Tended and up: never in a Planted line or list item
  for (const page of PAGES) {
    for (const m of texts[page].matchAll(/<(p|li|small|td)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const t = plainOf(m[2]).trim();
      if (/^(?:🌱\s*)?Planted\b/.test(t) && /Instagram/.test(t)) fail(`${page}: a Planted line mentions the Instagram feed (Tended and up; small rule 6): "${t.slice(0, 90)}"`);
    }
  }
  // 7. intake.html asks for no phone number (email only), and nothing reads or sends one
  if (/id="f-phone"|type="tel"|autocomplete="tel"|f-phone|'Phone: '/.test(read('intake.html'))) fail('intake.html: still has a phone field, or code that reads or sends one (small rule 7: email only)');
  // 8. texts.html's "Replies" line stays exactly as is: it matches the texting registration
  if (!read('texts.html').includes('<li>Replies, if you text me and I answer.</li>')) fail('texts.html: the “Replies, if you text me and I answer.” line changed; it must match the texting registration (small rule 8)');
}

// ---- the main page stays simple: what do you make, what does it cost, how do I start ----
{
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const t = plain['index.html'];
  if (/<table\b/i.test(html)) fail('index.html: has a table again (the cost table was removed; every cost lives in the questions)');
  for (const [re, what] of [
    [/Every cost, upfront/i, 'the "Every cost, upfront" section'],
    [/Why hand-built/i, 'the "Why hand-built" section'],
    [/rule of thumb/i, 'the rule of thumb'],
    [/Growing later/i, 'the "Growing later" band'],
  ]) if (re.test(t)) fail(`index.html: brings back ${what}`);
  const details = [...html.matchAll(/<details\b([^>]*)>/g)];
  if (details.length < 6 || details.length > 8) fail(`index.html: has ${details.length} question accordions; want 6 to 8`);
  if (details.some((d) => /\bopen\b/.test(d[1]))) fail('index.html: a question accordion starts open; they start closed');
  if ([...html.matchAll(/<details\b[^>]*>(?!\s*<summary)/g)].length) fail('index.html: a <details> without a <summary> first');
  for (const [re, what] of [[/other costs/i, '"Any other costs?"'], [/subscription include/i, '"What does your subscription include?"'],
    [/want to leave/i, '"What if I want to leave?"'], [/Google/, 'the Google (SEO) question']]) {
    const summaries = [...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => plainOf(m[1])).join(' | ');
    if (!re.test(summaries)) fail(`index.html: the questions lack ${what}`);
  }
  const sections = (html.match(/<section\b/g) || []).length;
  if (sections > 9) fail(`index.html: has ${sections} sections; the simple page has about 7`);
}

// curly quotes and apostrophes in everything a visitor reads (the quiz's strings are checked by their own test)
for (const page of PAGES) {
  const outside = read(page).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '\n');
  for (const line of outside.split('\n')) {
    if (/['"]|&quot;|&#39;|&apos;/.test(line)) fail(`${page}: straight quote in "${line.trim().slice(0, 80)}"`);
  }
}

// buttons and the contact links are flex boxes, which drop the spaces around a child element
// ("Answer thegetting-startedquestions"), so their words must sit inside a single wrapper
for (const page of PAGES) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, '');
  const flexLinks = [...html.matchAll(/<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => m[1]);
  for (const list of html.matchAll(/<ul class="(?:contact-links|more-links)">([\s\S]*?)<\/ul>/g)) {
    for (const m of list[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) flexLinks.push(m[1]);
  }
  for (const inner of flexLinks) {
    const t = inner.trim();
    if (/<(?!svg|\/svg)/.test(t) && (/^[^<]*[^<\s][^<]*</.test(t) || />[^<>]*[^<>\s][^<>]*$/.test(t))) fail(`${page}: a flex link mixes bare words with a tag, so the spaces vanish; wrap it in one <span>: "${t.slice(0, 80)}"`);
  }
}

// 404.html is shown at the missing address itself (/peek/slug/ for a mockup not pushed yet), so every link and file in
// it starts with "/"; on a mockup address it says so (and, on Taya's own notes link, to tap Leave notes again once it's
// pushed), takes her #pre= key out of the address bar, and stays out of search
{
  const nf = read('404.html').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of nf.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const ref = part.trim().split(/\s+/)[0];
      if (!/^(\/|https:|mailto:)/.test(ref)) fail(`404.html: ${ref} doesn't start with "/", so it breaks at a missing address like /peek/slug/`);
    }
  }
  if (!/<meta name="robots" content="noindex">/.test(nf)) fail('404.html: not marked noindex');
  if (!nf.includes("'This mockup isn’t live yet'") || !nf.includes("'Once it’s pushed, tap Leave notes again.'") || !/history\.replaceState\(history\.state, '', path \+ location\.search\)/.test(nf)) {
    fail('404.html: on a mockup address it must say the mockup isn’t live yet (Taya’s notes link: tap Leave notes again once it’s pushed) and take her #pre= key out of the address');
  }
  if (/mycelium\.js|faery\.js|peek-open|beacon/.test(nf)) fail('404.html: loads a script that fetches from the missing address or counts an open');
}

// the shared stylesheet: no dashes in anything it could put on screen
const css = read('pages.css').replace(/\/\*[\s\S]*?\*\//g, '');
if (/[—–]/.test(css)) fail('pages.css: contains a dash outside a comment');

if (failures.length) {
  console.log(`FAIL (${failures.length})`);
  failures.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log(`PASS: ${PAGES.length} pages, sitemap and links checked`);
