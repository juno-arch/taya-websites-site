// Checks the words and links on every page, so an old price or a broken link can't slip through.
//
//   node _tests/site-text.test.mjs
//
// The pricing model (Oct 5 2026, per Pollen; the source of truth is web-faery-kit/pricing-oct2026.md):
//   builds Planted $600 / Tended $1,200 / In Bloom $1,800, paid once (founding $300 / $600 / $900, half off the
//     build only, 5 spots through Dec 31, 2026), half to start, half at launch;
//   care comes with every site, monthly only, matching the build: $12 / $45 / $90 a month, starting after the
//     30 days of settling in; changes are the same in every tier (email anytime, as often as needed, reply within
//     2 business days, anything broken fixed free, big new things quoted first);
//   stop care anytime: the site is still theirs, every file and login handed over;
//   anyone quoted before Oct 5 keeps their quote (one quiet line on the main page).
//
// Fails (exit 1) if any page:
//   - shows an old name or price (Maiden / Mother / Crone, $69, $690, $35, $350, $49, $490), care as optional,
//     pay as you go, an hourly rate, yearly care, "subscription", trades, self-editing, an offer of a call or
//     chat (email only), or a dash
//   - shows a monthly price other than care's $12 / $45 / $90 (or the $3 own-address email)
//   - (the main page) leaves out the three care prices, the reply time, "quoted first", the settling-in start,
//     the quoted-before-October-5 line, or the hand-over promise
//   - shows the founding count ("4 left") anywhere but once, inside id="founding" on the main page
//   - has JSON-LD that doesn't parse, or offers that don't match the page
//   - lists a noindex page in sitemap.xml
//   - links to a local file or #anchor that doesn't exist
//   - (the main page) grows back the removed sections, or its questions stop being 6 to 8 closed accordions
//   - shows a straight quote or apostrophe instead of a curly one
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'domain.html', 'start.html'];
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
  [/\$69\b|\$690|\$35\b|\$350|\$49\b|\$490|\$444|\$666|\$888|\$588/, 'an old price'],
  [/care is optional|optional care|care,? optional|skip care|with or without care|without care|no care\b/i, 'care as optional (it comes with every site now)'],
  [/pay(?:ing)? as you go/i, 'pay as you go'],
  [/\$\d[\d,.]* an hour|per hour|by the minute|per minute/i, 'an hourly rate'],
  [/\$25 to \$50/, 'the old "most small changes" estimate'],
  [/two months free|paid yearly|yearly care|care[^.]{0,30}a year\b/i, 'yearly care (monthly only now)'],
  [/quick change|update session|change it yourself|change these yourself|coming soon/i, 'self-editing (not offered)'],
  [/subscription/i, 'the word "subscription"'],
  [/\btrad(?:e|es|ed|ing)\b/i, 'trades (only ever offered privately)'],
  [/founding spots last/i, 'open-ended founding wording (show the count and the deadline)'],
  [/\bon call\b/i, '"on call"'],
  [/\b(?:book a call|a quick call|45-minute call|want to chat|a chat|hop on a call|video call)\b/i, 'an offer of a call or chat (email only)'],
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
  // every monthly price is care's ($12 / $45 / $90), or the $3 own-address email
  for (const m of plain[page].matchAll(/\$(\d+) a month/g)) {
    if (![...CARE, 3].includes(+m[1])) fail(`${page}: shows $${m[1]} a month: "${plain[page].slice(Math.max(0, m.index - 60), m.index + 20)}"`);
  }
}

// the main page says the model plainly
{
  const t = plain['index.html'];
  for (const n of CARE) if (!t.includes(`$${n} a month`)) fail(`index.html: never shows care at $${n} a month`);
  if (!/2 business days/.test(t)) fail('index.html: doesn’t give the reply time (2 business days)');
  if (!/as often as you need/.test(t)) fail('index.html: doesn’t say changes come as often as you need');
  if (!/big[^.]{0,60}quote/i.test(t)) fail('index.html: doesn’t say big new things are quoted first');
  if (!/half off the build/i.test(t)) fail('index.html: doesn’t say founding clients get half off the build');
  if (!/every file and login/.test(t)) fail('index.html: doesn’t say stopping care means every file and login handed over');
  if (!t.includes('Quoted before October 5? Your quote stands, just as I wrote it 💛')) fail('index.html: lacks the quoted-before-October-5 line');
  for (const name of Object.keys(TIERS)) if (!t.includes(name)) fail(`index.html: never names ${name}`);
}
// care starts after the settling-in days, wherever care is priced
for (const page of ['index.html', 'quiz.html', 'start.html']) {
  if (!/starts? after (?:your|the) 30 days of settling in|starting after your 30 days of settling in/i.test(plain[page])) fail(`${page}: doesn’t say care starts after the 30 days of settling in`);
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
      const c = offers.find((x) => x.name === name + ' care');
      if (!c || +c.price !== care || !c.priceSpecification || +c.priceSpecification.price !== care || c.priceSpecification.unitText !== 'MONTH') fail(`${page}: JSON-LD ${name} care offer isn't $${care} a month`);
    }
    if (offers.some((o) => o.priceSpecification && o.priceSpecification.unitText !== 'MONTH')) fail(`${page}: JSON-LD has a non-monthly price (care is monthly only)`);
  }
}

// sitemap: every listed page exists and is indexable
const sitemap = read('sitemap.xml');
for (const m of sitemap.matchAll(/<loc>https:\/\/webfaery\.love\/([^<]*)<\/loc>/g)) {
  const file = m[1] || 'index.html';
  if (!fs.existsSync(path.join(root, file))) { fail(`sitemap.xml lists ${file}, which doesn't exist`); continue; }
  if (/<meta name="robots" content="[^"]*noindex/.test(read(file))) fail(`sitemap.xml lists ${file}, which is marked noindex`);
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
  for (const [re, what] of [[/other costs/i, '"Any other costs?"'], [/care include/i, '"What does care include?"'],
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

// the shared stylesheet: no dashes in anything it could put on screen
const css = read('pages.css').replace(/\/\*[\s\S]*?\*\//g, '');
if (/[—–]/.test(css)) fail('pages.css: contains a dash outside a comment');

if (failures.length) {
  console.log(`FAIL (${failures.length})`);
  failures.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log(`PASS: ${PAGES.length} pages, sitemap and links checked`);
