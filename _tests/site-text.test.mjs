// Checks the words and links on every page, so an old price or a broken link can't slip through.
//
//   node _tests/site-text.test.mjs
//
// The pricing model (simplified Sep 29, per Pollen), said the same way everywhere:
//   builds $600 / $1,200 / $1,800, paid once (founding $300 / $600 / $900), half to start, half at launch;
//   care $69 a month or $690 a year: "I make your changes whenever you ask", reply within 2 business days,
//     web address, sending email and newsletter covered, anything big quoted first, no hour limits;
//   without care (changed Sep 29 evening, per Pollen): $100 an hour, and the price comes before I start: one email
//     with everything in it, a price back, nothing starts until they say yes (never a running clock); most small
//     changes come to about $25 to $50; anything big is quoted the same way;
//   founding clients: half off the build, half off care, $35 a month or $350 a year, 5 spots through Dec 31, 2026.
//
// Fails (exit 1) if any page:
//   - shows an old price or rule ($25 quick changes, 15 minutes, update sessions, an hour a month, rolling over,
//     extra time, $100 a round, the flat $50 a change, "a change is one email"), an hourly rate other than
//     $100 an hour, a running clock, "subscription", trades, the old update schedule, or a dash
//   - shows care at anything but $69 a month / $690 a year ($35 / $350 only for founding clients), or the old
//     founding care price ($49 / $490)
//   - talks about care without the $100 an hour and the price coming before I start, the reply time, or
//     "quoted first" for big jobs (the main page also needs "price before I start", one email with everything
//     in it, and the usual $25 to $50)
//   - promises someone "on call" (care is a reply within 2 business days)
//   - shows the founding count ("4 left") anywhere but once, inside id="founding" on the main page
//   - has JSON-LD that doesn't parse, or offers that don't match the page (changes: 100 USD an hour, priced before I start)
//   - lists a noindex page in sitemap.xml
//   - links to a local file or #anchor that doesn't exist
//   - leaves out one of the Sep 29 policy decisions (a closed project's deposit, extra rounds of changes at $100
//     an hour with the price first,
//     care billing after settling in, the card fee range, the free-move promise for hosting, leaving is easy
//     and free), or the Porkbun hand-over details
//   - (the main page) grows back the removed sections: the cost table, "Every cost, upfront", "Why hand-built",
//     the rule of thumb, "Growing later"; or its questions stop being 6 to 8 closed accordions
//   - shows a straight quote or apostrophe instead of a curly one
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'domain.html', 'start.html'];
const CARE_PAGES = ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'start.html'];
const CARE_MONTH = 69;
const CARE_YEAR_PREPAID = 690;
const FOUNDING_CARE = 35;
const FOUNDING_CARE_YEAR = 350;

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
  // ($25 alone was the old quick change; "about $25 to $50" is what most small changes come to now)
  [/\$444|\$666|\$888|\$111\b|\$22\b|\$33\b|\$44\b|\$66\b|\$11\b|\$588|\$25\b(?! to \$50)/, 'an old price'],
  [/\$100 (?:a round|update|for an update)/i, 'the old $100 price for a round of changes or an update session'],
  [/quick change|update session|\b15[- ]?min/i, 'the old quick change / update session'],
  [/an hour a month|\broll(?:s|ed)? over|extra time/i, 'an hour limit on care (care has none now)'],
  [/\$(?!100 an hour)\d[\d,.]* an hour|per hour|by the minute|per minute/i, 'an hourly rate other than $100 an hour, or a running clock'],
  [/(?<!\$25 to )\$50 (?:a change|each|a round|per change)|\ba change\b[^.]{0,30}\bone email\b|counts? as one change/i, 'the old flat $50 a change ("a change is one email")'],
  [/seasonal check/i, 'the old seasonal check'],
  [/equinox|solstice|four times a year/i, 'the old update schedule'],
  [/subscription/i, 'the word "subscription"'],
  [/\btrad(?:e|es|ed|ing)\b/i, 'trades (only ever offered privately)'],
  [/founding spots last/i, 'open-ended founding wording (show the count and the deadline)'],
  [/\bon call\b/i, '"on call" (care is a reply within 2 business days, so say "someone looking after it")'],
  [/\$49(?:0)?\b/, 'the old founding care price ($49 / $490; founding care is half off now, $35 / $350)'],
  [/[—–]|&mdash;|&ndash;|&#821[12];/, 'a dash'],
];

const texts = {};
const plain = {};
for (const page of PAGES) {
  const html = read(page);
  const text = visibleText(html);
  texts[page] = text;
  plain[page] = plainOf(text);
  for (const [re0, what] of FORBIDDEN) {
    // start.html (the getting-started page) gives each step's time, and the accounts step is "about 15 minutes":
    // a time estimate, not the old 15-minute quick change, so only the words "quick change" and "update session" count there
    const re = page === 'start.html' && what === 'the old quick change / update session' ? /quick change|update session/i : re0;
    const m = text.match(re);
    if (m) fail(`${page}: contains ${what}: "${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}"`);
  }

  // $35 and $350 are only ever the founding clients' care price
  for (const m of plain[page].matchAll(/\$35(?:0)?\b/g)) {
    const around = plain[page].slice(Math.max(0, m.index - 200), m.index + 40);
    if (!/founding/i.test(around)) fail(`${page}: ${m[0]} shown without "founding" nearby: "${around.slice(-120)}"`);
  }
  // any care price next to the word care is $69 / $690 (or the founding $35 / $350)
  for (const m of plain[page].matchAll(/(?<!without |no |skip )\bcare(?: optional)?,? (?:is |at |stays |locked at )?\$(\d+)/gi)) {
    if (![CARE_MONTH, CARE_YEAR_PREPAID, FOUNDING_CARE, FOUNDING_CARE_YEAR].includes(+m[1])) fail(`${page}: care shown at $${m[1]}: "${m[0]}"`);
  }
}

// every page that talks about care says it the same way
for (const page of CARE_PAGES) {
  const t = plain[page];
  const q = page === 'quiz.html' ? texts[page] : t; // the quiz builds some prices from constants
  if (!t.includes(`$${CARE_MONTH} a month`) && !q.includes('CARE_MONTH = ' + CARE_MONTH)) fail(`${page}: never shows care at $${CARE_MONTH} a month`);
  if (!t.includes(`$${CARE_YEAR_PREPAID}`) && !q.includes('CARE_PREPAID = ' + CARE_YEAR_PREPAID)) fail(`${page}: never shows care at $${CARE_YEAR_PREPAID} a year`);
  // without care: $100 an hour, and the price comes before any work starts
  if (!/\$100 an hour/.test(t)) fail(`${page}: never says changes without care are "$100 an hour"`);
  if (!/(?:the|a) price (?:before I start|first)/i.test(t)) fail(`${page}: doesn't say the price comes before I start`);
  if (!/2 business days/.test(t)) fail(`${page}: doesn't give the care reply time (2 business days)`);
  if (!/whenever you ask/.test(t)) fail(`${page}: doesn't say care means changes whenever you ask`);
  if (!/big[^.]{0,60}quote/i.test(t)) fail(`${page}: doesn't say anything big is quoted first`);
}
// founding clients: half off the build, half off care, $35 a month or $350 a year
for (const page of ['index.html', 'quiz.html', 'intake.html', 'welcome.html', 'start.html']) {
  if (!/\$35 a month/.test(plain[page]) || !/\$350 a year/.test(plain[page])) fail(`${page}: doesn't give the founding care price both ways ($35 a month, $350 a year)`);
}
if (!/half off the build/i.test(plain['index.html'])) fail('index.html: doesn’t say founding clients get half off the build');
// the main page says the new no-care model the way Pollen put it: one email, a price before I start, $100 an hour,
// and what most small changes come to
{
  const t = plain['index.html'];
  if (!/\$100 an hour/.test(t)) fail('index.html: doesn’t say changes without care are $100 an hour');
  if (!/price before I start/.test(t)) fail('index.html: doesn’t say "price before I start"');
  if (!/one email with everything/i.test(t)) fail('index.html: doesn’t say to send one email with everything you’d like changed');
  if (!/about \$25 to \$50/.test(t)) fail('index.html: doesn’t say most small changes come to about $25 to $50');
  if (!/Nothing starts until you say yes/i.test(t)) fail('index.html: doesn’t say nothing starts until you say yes');
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
    const monthly = offers.find((o) => /care/i.test(o.name) && o.priceSpecification && o.priceSpecification.unitText === 'MONTH');
    const yearly = offers.find((o) => /care/i.test(o.name) && o.priceSpecification && o.priceSpecification.unitText === 'YEAR');
    if (!monthly || +monthly.price !== CARE_MONTH || +monthly.priceSpecification.price !== CARE_MONTH) fail(`${page}: JSON-LD monthly care offer isn't $${CARE_MONTH}`);
    if (!yearly || +yearly.price !== CARE_YEAR_PREPAID) fail(`${page}: JSON-LD yearly care offer isn't $${CARE_YEAR_PREPAID}`);
    const builds = { Maiden: 600, Mother: 1200, Crone: 1800 };
    for (const [name, price] of Object.entries(builds)) {
      const o = offers.find((x) => x.name.startsWith(name));
      if (!o || +o.price !== price) fail(`${page}: JSON-LD ${name} offer isn't $${price}`);
    }
    // changes without care: 100 USD an hour, priced before any work starts
    const changeOffers = offers.filter((o) => /change/i.test(o.name));
    if (page === 'index.html' && !changeOffers.length) fail(`${page}: JSON-LD has no offer for changes without care`);
    for (const o of changeOffers) {
      const ps = o.priceSpecification || {};
      if (+o.price !== 100 || +ps.price !== 100 || ps.priceCurrency !== 'USD' || !(/^hour$/i.test(ps.unitText || '') || ps.unitCode === 'HUR')) {
        fail(`${page}: JSON-LD offer "${o.name}" isn't 100 USD an hour (a UnitPriceSpecification with unitText "hour" or unitCode HUR)`);
      }
      if (!/before (?:I start|any work starts|work starts)|quoted first|price first/i.test(`${o.name} ${o.description || ''}`)) fail(`${page}: JSON-LD offer "${o.name}" doesn't say it's priced before work starts`);
    }
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

// ---- policy decisions (Sep 29), said plainly wherever they matter ----
const atLeast = (page, re, n, what) => {
  const count = (plain[page].match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || []).length;
  if (count < n) fail(`${page}: ${what} (found ${count}, want at least ${n})`);
};
for (const page of ['index.html', 'welcome.html']) {
  // 1. a project that closes at 60 days: the deposit covers the work so far, and counts toward finishing within a year;
  //    the 30 and 60 days count from the day they say yes
  atLeast(page, /deposit covers the work (?:done )?so far[^.]*within a year/i, 1, 'doesn’t say what happens to the deposit if a project closes');
  atLeast(page, /(?:from|after) (?:when|the day) you say yes|days after you say yes/i, 1, 'doesn’t say the 30 and 60 days count from when you say yes');
  // 2. more rounds of changes during the build are priced like any change: $100 an hour, with the price first
  atLeast(page, /(?:more rounds|third round)[^.]{0,60}\$100 an hour[^.]{0,60}price/i, 1, 'doesn’t say extra rounds of changes are $100 an hour, with the price first');
}
// 3. care billing starts after the 30 days of settling in
for (const page of CARE_PAGES) atLeast(page, /starts after (?:your|the) 30 days of settling in/i, 1, 'doesn’t say care billing starts after the 30 days of settling in');
// 4. card fees: never one company's exact rate; always the same honest range
const FEE = 'about 3% + 30¢ per payment (it varies a little by payment company)';
for (const page of PAGES) {
  if (/2\.9%|3\.3%|2\.6%/.test(plain[page])) fail(`${page}: shows one payment company's exact card rate; use "${FEE}"`);
  for (const m of plain[page].matchAll(/\d+(?:\.\d+)?% \+ 30¢[^.]*/g)) {
    if (!/^3% \+ 30¢ (?:per payment|each) \(it varies a little by payment company\)/.test(m[0])) fail(`${page}: card fee isn't worded "${FEE}": "${m[0].slice(0, 90)}"`);
  }
}
// 5. hosting is free, forever, and wherever hosting is explained, Taya would move the site for free if that changed
for (const page of PAGES) {
  if (/hosting[^.]{0,30}free|free, forever/i.test(plain[page]) && !/if that ever changed,? I’d move your site for free/i.test(plain[page])) {
    fail(`${page}: explains hosting but not that I’d move the site for free if that ever changed`);
  }
}
// 6. leaving is easy and free, and never takes the site down
if (!/easy and free/i.test(plain['index.html']) || !/within a week/i.test(plain['index.html'])) fail('index.html: the "What if I want to leave?" answer lacks "easy and free" / "within a week"');
// the web address: about $12 a year, said on the main page
if (!/about \$12 a year/.test(plain['index.html'])) fail('index.html: doesn’t give the web address cost (about $12 a year)');
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
