// Checks the private-link pages (Oct 10 2026: every client has one private link, webfaery.love/my/#wf=KEY): the
// door (my/index.html, my/door.js), "Lost your link?" (link-again.js), the note bar (mark.js v5) and its loader, and
// the versioned agreement. (portal.html stays as it is, for now the shop owners' sign-in; portal-text.test.mjs checks it.)
//
//   node _tests/door-text.test.mjs
//   HUB_DIR=/path/to/garden-faery-hub/pocketbase node _tests/door-text.test.mjs   (the hub beside this repo by default)
//
// Fails (exit 1) if:
//   - the words people read on these pages have a dash (em or en), "never", a straight apostrophe or quote, an old
//     build name, or "Moss", "Claude" or "Anthropic" anywhere in the new public files
//   - the exact words change: the house-key line, the busy-day and full doors, "Lost your link?" and its answer,
//     the door's replaced, resting and nothing-yet cards, "Add to my home screen" and its steps
//   - a page loses its security line, gets an inline script, an outside script or an on...= handler, or a script
//     builds the page from HTML strings; webfaery.love's own pages (my/, start.html, the peek pages) load a script
//     from anywhere but webfaery.love
//   - a page links to a local file that doesn't exist
//   - the agreement: agreement/<agreementVersion>.html is missing, its sha256 isn't CONFIG.agreementSha256, its words
//     don't match start.html's, or either differs from the server's AGREEMENT (pb_hooks/webfaery-portal-lib.js)
//   - start.html's BUILDS prices, CARE and CONFIG.depositLinks differ from the server's PRICES and DEPOSIT_LINKS
//   - the note bar loader (_tests/note-bar/loader.html) differs from its documented sha256, or mark.js's own storage
//     names, address and key pattern drift from the loader's
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const failures = [];
const fail = (msg) => failures.push(msg);
let checks = 0;
const check = (cond, msg) => { checks++; if (!cond) fail(msg); };

const PAGES = ['my/index.html'];
const SCRIPTS = ['my/door.js', 'link-again.js'];
for (const f of PAGES.concat(SCRIPTS, ['mark.js'])) check(exists(f), `missing ${f}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }

// ---- the words people read
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
const textOf = (html) => visible(html).replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ');
// every '...' string in a script, comments dropped first
function literals(src) {
  const out = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  for (const m of code.matchAll(/'((?:\\.|[^'\\\n])*)'/g)) out.push(m[1]);
  return out;
}
// mark.js: only the client's part (the second half; Taya's own notes come first and have their own words)
const markSrc = read('mark.js');
const markClient = markSrc.slice(markSrc.indexOf("const BASE = 'https://bookings.gardenfaery.love/api/webfaery/portal'"));
const agreementFiles = exists('agreement') ? fs.readdirSync(path.join(root, 'agreement')).filter((f) => f.endsWith('.html')).map((f) => 'agreement/' + f) : [];
const words = [];
for (const f of PAGES.concat(agreementFiles)) for (const line of textOf(read(f)).split('\n')) if (line.trim()) words.push([f, line.trim()]);
for (const f of SCRIPTS) for (const s of literals(read(f))) words.push([f, s]);
for (const s of literals(markClient)) words.push(['mark.js', s]);
const FORBIDDEN = [
  [/[—–]|&mdash;|&ndash;|&#821[12];/, 'a dash'],
  [/\bnever\b/i, '“never”'],
  [/\b(?:Maiden|Mother|Crone)\b/, 'an old build name'],
  [/\bsign(?:ed)? in\b|sign-in code|\bcodes?\b(?! (?:check|for))/i, 'the old sign-in'],
];
for (const [f, s] of words) {
  for (const [re, what] of FORBIDDEN) {
    if (f === 'mark.js' && what === 'an old build name') continue; // (the "as sent" mockup names stay in mark.js on purpose)
    if (f.startsWith('agreement/') && what === 'the old sign-in') continue;
    if (/^(?:the old sign-in)$/.test(what) && /No sign-in needed|no sign-in needed|No codes|not a sign-in/.test(s)) continue;
    const m = s.match(re);
    checks++;
    if (m) fail(`${f}: ${what}: "${s.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
  }
  checks++;
  if (/[A-Za-z]'[A-Za-z]|(^|\s)'[A-Za-z]/.test(s.replace(/\\'/g, "'")) && !/^[a-z-]+$/.test(s) && /\s/.test(s)) fail(`${f}: a straight apostrophe in "${s.slice(0, 80)}" (use ’)`);
}
// the new public files: no names of the helpers that built them, and no dashes even in comments
for (const f of PAGES.concat(SCRIPTS, agreementFiles, ['mark.js'])) {
  const src = read(f);
  check(!/\b(?:Moss|Claude|Anthropic)\b/.test(src), `${f}: mentions Moss, Claude or Anthropic`);
  check(!/[—–]/.test(src), `${f}: an em or en dash`);
}

// ---- the exact words (Pollen's, NO-LOGIN-DESIGN.md 2.2, 2.8, 2.9, 3.3 and 5)
const door = read('my/door.js'), la = read('link-again.js'), my = read('my/index.html');
const EXACT = [
  [door, 'my/door.js', 'This link was replaced with a new one.'],
  [door, 'my/door.js', 'This link is resting for now. Anything you need, just email me at taya@webfaery.love 💛'],
  [door, 'my/door.js', 'Nothing new to look at just yet. I’ll email you as soon as there is 💛 Anything you need, just email me at taya@webfaery.love.'],
  [door, 'my/door.js', 'To leave me a note there, just email me at taya@webfaery.love for now.'],
  [door, 'my/door.js', 'I can’t reach my server right now. Try again in a minute, or email me at taya@webfaery.love.'],
  [la, 'link-again.js', 'If that email is one I have, your link is on its way. Peek in spam if it’s shy.'],
  [la, 'link-again.js', 'That’s a lot of tries for now. Try again in an hour, or email me at taya@webfaery.love.'],
  [my, 'my/index.html', 'It’s like a house key, just for you, so please keep passwords out of notes.'],
  [my, 'my/index.html', 'Lost your link?'],
  [markClient, 'mark.js', 'Busy day! I’ve got everything so far. For the rest, just email me at taya@webfaery.love 💛'],
  [markClient, 'mark.js', 'That’s everything I can hold for your site right now. Just email me and I’ll make room 💛'],
  [markClient, 'mark.js', 'That didn’t go through, but your note is safe right here.'],
  [markClient, 'mark.js', 'That one’s too big for here. Email me and I’ll send you an easy way to share it.'],
  [markClient, 'mark.js', 'It’s like a house key, just for you, so please keep passwords out of notes.'],
  [markClient, 'mark.js', 'This link was replaced with a new one. Check your email, or get it again here.'],
  [markClient, 'mark.js', 'This page is resting now. Your link opens your newest things.'],
  [markClient, 'mark.js', 'Tap Share, then Add to Home Screen. Just that one, since for a moment this address holds your private link.'],
  [markClient, 'mark.js', 'Tap ⋮, then Add to Home screen. Just that one, since for a moment this address holds your private link.'],
  [markClient, 'mark.js', 'Tap your link in any of my emails to come back here.'],
  [markClient, 'mark.js', 'Nothing to sign or pay yet. I’ll email you first.'],
];
for (const [src, f, w] of EXACT) check(src.includes(w), `${f}: the words "${w.slice(0, 70)}" are gone or changed`);

// ---- safety
for (const f of PAGES) {
  const html = read(f);
  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  check(!!csp, `${f}: the Content-Security-Policy line is missing`);
  if (csp) {
    const c = csp[1];
    for (const need of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) check(c.includes(need), `${f}: the security line lost ${need}`);
    check(!/script-src[^;]*(unsafe-inline|unsafe-eval|https?:)/.test(c), `${f}: scripts may come from somewhere other than this site`);
    check(/connect-src [^;]*https:\/\/bookings\.gardenfaery\.love/.test(c), `${f}: connect-src doesn't allow the server`);
    check(!/127\.0\.0\.1|localhost/.test(c), `${f}: the security line allows a local address`);
  }
  check(/<meta name="referrer" content="no-referrer">/.test(html), `${f}: referrer meta missing`);
  check(/<meta name="robots" content="noindex/.test(html), `${f}: should be noindex`);
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    check(/\ssrc="/.test(m[1]) && !m[2].trim(), `${f}: an inline script (the security line forbids them)`);
    const src = (m[1].match(/\ssrc="([^"]+)"/) || [])[1] || '';
    check(!/^(https?:)?\/\//.test(src), `${f}: an outside script (${src})`);
  }
  check(!/\son[a-z]+=/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), `${f}: an on...= handler`);
  // local links exist
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
    const file = url.split(/[?#]/)[0];
    const rel = file.startsWith('/') ? file.slice(1) : path.join(path.dirname(f), file);
    if (file && !exists(rel) && !exists(path.join(rel, 'index.html'))) fail(`${f}: links to ${file}, which doesn't exist`);
  }
}
for (const f of SCRIPTS) check(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(read(f)), `${f}: builds the page from HTML strings or runs strings as code`);
check(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(markSrc), 'mark.js: builds the page from HTML strings or runs strings as code');
// the key travels in the # part or a header, and goes out of the address bar
check(/history\.replaceState\(null, '', location\.pathname \+ location\.search\)/.test(door), 'my/door.js: the key no longer leaves the address bar');
check(/location\.replace\(/.test(door) && !/location\.href\s*=/.test(door), 'my/door.js: forwarding should use location.replace (no key in their back history)');
check(/'X-WF-Key': key/.test(markClient) && !/fd\.append\('k'/.test(markClient), 'mark.js: uploads carry the key in the X-WF-Key header, never in the body');
check(!fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').match(/\/my\/|portal|agreement/), 'sitemap.xml lists a private page');
// webfaery.love's own pages load scripts only from webfaery.love
const own = ['my/index.html', 'start.html'].concat(fs.readdirSync(path.join(root, 'peek')).filter((d) => exists('peek/' + d + '/index.html')).map((d) => 'peek/' + d + '/index.html'));
for (const f of own) {
  for (const m of read(f).matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)) {
    checks++;
    if (/^(https?:)?\/\//.test(m[1]) && !/^https:\/\/webfaery\.love\//.test(m[1])) fail(`${f}: loads a script from outside webfaery.love (${m[1]})`);
  }
  // (and a peek page's own loader line adds only webfaery.love's mark.js)
  for (const m of read(f).matchAll(/createElement\(['"]script['"]\)[^;]*;[^;]*\.src\s*=\s*['"]([^'"]+)['"]/g)) { checks++; if (/^https?:/.test(m[1]) && !/^https:\/\/webfaery\.love\//.test(m[1])) fail(`${f}: adds a script from outside webfaery.love (${m[1]})`); }
}

// ---- the agreement, the prices: the page and the server agree
const start = read('start.html');
const version = (start.match(/agreementVersion: '([^']+)'/) || [])[1];
const sha = (start.match(/agreementSha256: '([a-f0-9]{64})'/) || [])[1];
check(!!version && !!sha, 'start.html: CONFIG.agreementVersion or agreementSha256 missing');
const agFile = 'agreement/' + version + '.html';
check(exists(agFile), `${agFile} is missing (every agreement version has its own public page)`);
if (exists(agFile)) {
  const ag = read(agFile);
  check(sha256(fs.readFileSync(path.join(root, agFile))) === sha, `${agFile}: its sha256 isn't CONFIG.agreementSha256 (a changed file needs a new version)`);
  // every fixed piece of the agreement's words on start.html is in the page (the build-specific spots are spelled out there)
  const doc = (start.match(/<div class="agreement-doc">([\s\S]*?)<\/div>\s*<\/details>/) || [])[1] || '';
  const ol = (doc.match(/<ol>([\s\S]*?)<\/ol>/) || [])[1] || '';
  const norm = (t) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const agText = norm(ag);
  const pieces = ol.split(/<span data-a="[a-z-]+">[\s\S]*?<\/span>/).map(norm).flatMap((p) => p.split(/(?<=\.)\s/)).map((p) => p.trim()).filter((p) => p.length > 24)
    .map((p) => p.replace(/the answers on this page/, 'the answers on your getting-started page'));
  check(pieces.length > 20, 'start.html: could not read the agreement’s words');
  for (const p of pieces) check(agText.includes(p), `${agFile}: doesn't match start.html’s words at "${p.slice(0, 70)}"`);
  const vm = (doc.match(/Version of ([A-Za-z]+ \d+, \d{4})/) || [])[1];
  check(!!vm && ag.includes('Version of ' + vm), `${agFile}: its version date doesn't match start.html’s ("${vm}")`);
}
// the server's copy (the hub beside this repo, or HUB_DIR): fails loudly when it can't be read
const HUB = process.env.HUB_DIR || [path.join(root, '..', 'garden-faery-hub', 'pocketbase'), '/Users/moe/Documents/Garden-Faery/garden-faery-hub/pocketbase'].find((d) => fs.existsSync(path.join(d, 'pb_hooks')));
let lib = '';
try { lib = fs.readFileSync(path.join(HUB, 'pb_hooks', 'webfaery-portal-lib.js'), 'utf8'); } catch (e) { fail(`can't read the server's webfaery-portal-lib.js (set HUB_DIR): ${e.message}`); }
if (lib) {
  const ag = lib.match(/const AGREEMENT = \{ version: '([^']+)', sha256: '([a-f0-9]{64})' \}/);
  check(!!ag, 'the server lib has no AGREEMENT');
  if (ag) check(ag[1] === version && ag[2] === sha, `the server's AGREEMENT (${ag && ag[1]}, ${ag && ag[2].slice(0, 8)}) differs from start.html's (${version}, ${(sha || '').slice(0, 8)})`);
  for (const k of ['maiden', 'mother', 'crone']) {
    const pg = start.match(new RegExp(k + ":\\s+\\{ name: '([^']+)', price: (\\d+),"));
    const care = (start.match(/const CARE = \{([^}]*)\}/) || [])[1] || '';
    const pc = (care.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1];
    const sv = lib.match(new RegExp(k + ": \\{ name: '([^']+)', build: (\\d+), sub: (\\d+) \\}"));
    check(!!pg && !!sv && pg[1] === sv[1] && pg[2] === sv[2] && pc === sv[3], `${k}: start.html's price (${pg && pg[2]}, ${pc} a month) differs from the server's PRICES (${sv && sv[2]}, ${sv && sv[3]})`);
    const pl = start.match(new RegExp(k + ":\\s+\\{ regular: '([^']+)', founding: '([^']+)' \\}"));
    const sl = lib.match(new RegExp(k + ":\\s+\\{ regular: '([^']+)', founding: '([^']+)' \\}"));
    check(!!pl && !!sl && pl[1] === sl[1] && pl[2] === sl[2], `${k}: start.html's deposit links differ from the server's DEPOSIT_LINKS`);
  }
}

// ---- the note bar loader: one identical block for every client site and draft, with a documented sha256
const LOADER = '_tests/note-bar/loader.html';
check(exists(LOADER), `${LOADER} is missing`);
if (exists(LOADER)) {
  const ld = read(LOADER);
  const block = (ld.match(/<script>\/\* Web Faery: the owner's note bar[\s\S]*?<\/script>/) || [])[0] || '';
  const doc = (ld.match(/sha256 of the block: ([a-f0-9]{64})/) || [])[1];
  check(!!block && !!doc && sha256(block) === doc, `${LOADER}: the block's sha256 isn't the documented one (a change needs a new hash in every client site's CSP and test)`);
  check(/"wf-key-v1"/.test(block) && /'wf-key-v1'/.test(markClient), 'the loader and mark.js disagree on the storage name (wf-key-v1)');
  check(/https:\/\/webfaery\.love\/mark\.js\?v=5/.test(block), 'the loader should load https://webfaery.love/mark.js?v=5');
  check(/\[A-Za-z0-9\]\{24,64\}/.test(block) && /\[A-Za-z0-9\]\{24,64\}/.test(markClient), 'the loader and mark.js disagree on the key pattern');
  check(/wf-arrived/.test(block) && /wf-arrived/.test(markClient), 'the loader and mark.js disagree on wf-arrived');
}

if (failures.length) {
  console.error(`door-text: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`door-text: all good (${checks} checks: the door, Lost your link?, the note bar and its loader, the agreement ${version}, prices against the server)`);
