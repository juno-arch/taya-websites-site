// Checks the words, links and safety rules on the client portal (portal.html, portal.js, portal-demo.js).
//
//   node _tests/portal-text.test.mjs
//
// The portal's words mostly live in its scripts (the site-text test skips scripts), so this reads
// portal.html's visible text AND every quoted string in portal.js and portal-demo.js.
//
// Fails (exit 1) if:
//   - any of it has a dash (em or en), the word "subscription", trades, "on call", an old price or rule,
//     or a straight apostrophe or quote in words people read (use ’ “ ”)
//   - $35 or $350 shows up without "founding" close by, or care at anything but $69 / $690 ($35 / $350 founding),
//     or the old founding care price ($49 / $490) shows up at all
//   - "$100 an hour" shows up without the price coming before I start
//   - portal.html links to a local file or #anchor that doesn't exist
//   - a getting-started step the portal links to (#s-<step>) is missing from start.html
//     (start.html is being worked on elsewhere: this catches a renamed step)
//   - portal.html loses its security line (Content-Security-Policy), gets an inline script, an outside
//     script, or an on...= handler; or the scripts use innerHTML, eval or document.write
//   - portal-demo.js stops being loaded only when DEMO is true, or the demo code shows up outside it
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const fail = (msg) => failures.push(msg);

const html = read('portal.html');
const js = read('portal.js');
const demo = read('portal-demo.js');

// ---- the words people read ----
const visible = html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
const htmlWords = visible.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
// the text between tags (attribute values like class="x" are code, not words)
const htmlText = visible.replace(/<[^>]+>/g, '\n');

// every '...' string in a script, comments dropped first (a string never holds //, except web addresses)
function literals(src) {
  const out = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const re = /'((?:\\.|[^'\\\n])*)'/g;
  let m;
  while ((m = re.exec(code))) out.push(m[1]);
  return out;
}
const jsStrings = literals(js);
const demoStrings = literals(demo);
const sources = [
  ['portal.html', [htmlWords]],
  ['portal.js', jsStrings],
  ['portal-demo.js', demoStrings],
];

const FORBIDDEN = [
  [/[—–]|&mdash;|&ndash;|&#821[12];/, 'a dash'],
  [/subscription/i, 'the word "subscription"'],
  [/\btrad(?:e|es|ed|ing)\b/i, 'trades'],
  [/\bon call\b/i, '"on call" (care is a reply within 2 business days)'],
  [/\$444|\$666|\$888|\$588|\$25\b(?! to \$50)/, 'an old price'],
  [/\$49(?:0)?\b/, 'the old founding care price ($49 / $490; founding care is half off now, $35 / $350)'],
  [/quick change|update session|an hour a month|\broll(?:s|ed)? over/i, 'an old care rule'],
  [/\$(?!100 an hour)\d[\d,.]* an hour|per hour|by the minute/i, 'an hourly rate other than $100 an hour'],
];
for (const [file, strings] of sources) {
  for (const s of strings) {
    for (const [re, what] of FORBIDDEN) {
      const m = s.match(re);
      if (m) fail(`${file}: ${what}: "${s.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
    }
    // $35 / $350 are only ever the founding care price
    for (const m of s.matchAll(/\$35(?:0)?\b/g)) {
      const around = s.slice(Math.max(0, m.index - 200), m.index + 60);
      if (!/founding/i.test(around)) fail(`${file}: ${m[0]} without "founding" nearby: "${around}"`);
    }
    for (const m of s.matchAll(/\bcare(?: is| at)? \$(\d+)/gi)) {
      if (![69, 690, 35, 350].includes(+m[1])) fail(`${file}: care shown at $${m[1]}: "${m[0]}"`);
    }
    if (/\$100 an hour/.test(s) && !/price (?:before I start|first)/i.test(s)) fail(`${file}: "$100 an hour" without the price coming first: "${s}"`);
  }
}
// the page's own care amounts are built from numbers, so check the numbers too
if (!/founding price: half off for as long as you keep care/i.test(js)) fail('portal.js: the care row no longer says the founding price is half off for as long as they keep care');

// ---- straight quotes in words people read ----
// portal.html: between tags only. The scripts: a \' inside a string is almost always a word like don\'t.
for (const line of htmlText.split('\n')) {
  if (/[A-Za-z]'[A-Za-z]|(^|\s)'[A-Za-z]|[A-Za-z]'(\s|$)/.test(line)) fail(`portal.html: a straight apostrophe in "${line.trim().slice(0, 80)}"`);
  if (/(^|\s)"[A-Za-z]|[A-Za-z.,!?]"(\s|$)/.test(line)) fail(`portal.html: straight quotes in "${line.trim().slice(0, 80)}"`);
}
for (const [file, strings] of [['portal.js', jsStrings], ['portal-demo.js', demoStrings]]) {
  for (const s of strings) {
    if (/\\'/.test(s)) fail(`${file}: a straight apostrophe in "${s.slice(0, 80)}" (use ’)`);
    // prose (words and spaces) with a straight double quote in it
    if (/[A-Za-z]{2,} [A-Za-z]{2,}/.test(s) && /(^|\s)"[A-Za-z]|[A-Za-z.,!?]"(\s|$)/.test(s)) fail(`${file}: straight quotes in "${s.slice(0, 80)}" (use “ ”)`);
  }
}

// ---- links ----
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
  for (const part of m[1].split(',')) {
    const url = part.trim().split(/\s+/)[0];
    if (!url || /^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    if (url.startsWith('#')) { if (url.length > 1 && !ids.has(url.slice(1))) fail(`portal.html: #${url.slice(1)} doesn't exist`); continue; }
    const file = url.split(/[?#]/)[0];
    if (file && !fs.existsSync(path.join(root, file))) fail(`portal.html: links to ${file}, which doesn't exist`);
  }
}
for (const f of ['portal.css', 'portal.js', 'portal-demo.js', 'faery.js', 'faery.css', 'soil.css', 'pages.css', 'taya.jpg', 'start.html']) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing ${f}`);
}
// the icons the scripts draw must be in portal.html's sprite
for (const m of js.matchAll(/icon\('(i-[a-z]+)'/g)) if (!ids.has(m[1])) fail(`portal.js uses #${m[1]}, which isn't in portal.html's sprite`);

// every getting-started step the portal links into must exist in start.html (read only, never edited here)
const startHtml = read('start.html');
const stepBlock = js.match(/const START_STEPS = \{([\s\S]*?)\};/);
if (!stepBlock) fail('portal.js: START_STEPS not found');
else {
  for (const m of stepBlock[1].matchAll(/'(s-[a-z]+)'/g)) {
    if (!new RegExp(`id="${m[1]}"`).test(startHtml)) fail(`start.html has no #${m[1]} (the portal links a list item there)`);
  }
}
if (!/const START_PAGE = 'start\.html'/.test(js)) fail('portal.js: START_PAGE should be start.html');

// ---- safety ----
const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
if (!csp) fail('portal.html: the Content-Security-Policy line is missing');
else {
  const c = csp[1];
  for (const need of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    if (!c.includes(need)) fail(`portal.html: the security line lost ${need}`);
  }
  if (/script-src[^;]*(unsafe-inline|unsafe-eval|https?:)/.test(c)) fail('portal.html: scripts may come from somewhere other than this site');
  const connect = (c.match(/connect-src ([^;]+)/) || [])[1] || '';
  const server = (js.match(/const SERVER = '([^']+)'/) || [])[1];
  if (!server || !connect.includes(server)) fail(`portal.html: connect-src (${connect}) doesn't allow SERVER (${server})`);
}
if (!/<meta name="referrer" content="no-referrer">/.test(html)) fail('portal.html: referrer meta missing');
if (!/<meta name="robots" content="noindex/.test(html)) fail('portal.html: should be noindex');
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!/\ssrc="/.test(m[1]) || m[2].trim()) fail('portal.html: an inline script (the security line forbids them)');
  const src = (m[1].match(/\ssrc="([^"]+)"/) || [])[1] || '';
  if (/^(https?:)?\/\//.test(src)) fail(`portal.html: an outside script (${src})`);
}
if (/\son[a-z]+=/i.test(html.replace(/<!--[\s\S]*?-->/g, ''))) fail('portal.html: an on...= handler (inline code is blocked)');
for (const [file, src] of [['portal.js', js], ['portal-demo.js', demo]]) {
  if (/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(src)) fail(`${file}: builds the page from HTML strings or runs strings as code`);
}
if (fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('portal')) fail('sitemap.xml lists the portal (it is private)');
// the key only ever travels in a header, never in a web address
if (/[?&](token|session|key)=/.test(js)) fail('portal.js: a key in a web address');

// ---- the preview ----
if (!/if \(DEMO\) \{\s*loadDemo\(\)/.test(js)) fail('portal.js: portal-demo.js should load only when DEMO is true');
if (/000000/.test(js)) fail('portal.js: the demo code should live only in portal-demo.js');
if (/demo@webfaery\.love|000000/.test(html.replace(/<div class="demo-hint"[\s\S]*?<\/div>/g, ''))) fail('portal.html: demo sign-in shown outside the demo boxes');
const demoOn = /const DEMO = true;/.test(js);

if (failures.length) {
  console.error(`portal-text: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`portal-text: all good (${jsStrings.length + demoStrings.length} script strings and portal.html checked; DEMO is ${demoOn ? 'ON (preview)' : 'off (live)'})`);
