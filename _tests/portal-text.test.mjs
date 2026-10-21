// Checks the words, links and safety rules on the client portal (portal.html, portal.js, portal-demo.js).
//
//   node _tests/portal-text.test.mjs
//
// The portal's words mostly live in its scripts (the site-text test skips scripts), so this reads
// portal.html's visible text AND every quoted string in portal.js and portal-demo.js.
//
// Fails (exit 1) if:
//   - any of it has a dash (em or en), "care" as the old name for the subscription (Oct 6 2026), trades, "on call",
//     an old price or rule,
//     or a straight apostrophe or quote in words people read (use ’ “ ”)
//   - anything from before the Oct 5 2026 pricing shows up: Maiden / Mother / Crone as words people read
//     (the lowercase keys maiden / mother / crone are fine), a subscription at anything but $12 / $45 / $90 a month,
//     $69 / $690 / $35 / $350 / $49 / $490, any hourly rate, "$25 to $50", pay as you go, the subscription as
//     optional, a yearly subscription, a founding subscription price, offers of a call or a chat (including a
//     "Let’s talk" status), or
//     do-it-yourself editing
//   - the "Change it yourself" editors come back (their section in portal.html, or their code in portal.js)
//   - portal.html links to a local file or #anchor that doesn't exist
//   - a getting-started step the portal links to (#s-<step>) is missing from start.html
//     (start.html is being worked on elsewhere: this catches a renamed step)
//   - portal.html loses its security line (Content-Security-Policy), gets an inline script, an outside
//     script, or an on...= handler; or the scripts use innerHTML, eval or document.write
//   - portal-demo.js stops being loaded only when DEMO is true, or the demo code shows up outside it
//   - the brand accent's color math (portal-brand.js, Oct 16 2026) is off: the contrast ratio, the darker shade of a
//     pale color, the fall back for white, greys and anything not a strict #rrggbb; or a brand rule in portal.css
//     applies without a brand set, or touches gold, teal, red, text colors or fonts
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const fail = (msg) => failures.push(msg);

const html = read('portal.html');
const js = read('portal.js');
const demo = read('portal-demo.js');
const cardsJs = read('portal-cards.js');

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
// Oct 21 2026: the business cards page. Its one printer price sentence says "$25 to $45" (a printer's price, not
// Web Faery's), which the old-price rule would catch, so that exact phrase is set aside before the words are checked.
const PRINTER_PRICE = 'It is usually about $25 to $45 for 50 cards with shipping.';
const cardsStrings = literals(cardsJs).map((s) => s.split(PRINTER_PRICE).join(''));
const sources = [
  ['portal.html', [htmlWords]],
  ['portal.js', jsStrings],
  ['portal-demo.js', demoStrings],
  ['portal-cards.js', cardsStrings],
];

const FORBIDDEN = [
  [/[—–]|&mdash;|&ndash;|&#821[12];/, 'a dash'],
  // "subscription" is the word since Oct 6 2026; "care" as its name is what can't come back (keys like 'care',
  // care_active and #change-care are code, and "Live, and in my care" is the ordinary phrase)
  [/\bStart (?:my|their) care\b|\bcare (?:begins|picks up)\b|Care receipt|card or care|Stripe care page|\bstop care\b|\bin care\b/i, 'the old name "care" for the subscription'],
  [/\btrad(?:e|es|ed|ing)\b/i, 'trades'],
  [/\bon call\b/i, '"on call" (care is a reply within 2 business days)'],
  [/\$444|\$666|\$888|\$588|\$25\b|\$69\b|\$690\b|\$35\b|\$350\b|\$49\b|\$490\b/, 'an old price'],
  [/quick change|update session|an hour a month|\broll(?:s|ed)? over/i, 'an old care rule'],
  [/\$\d[\d,.]* an hour|per hour|by the minute|hourly/i, 'an hourly rate (gone since Oct 5 2026: anything big is quoted first)'],
  [/pay(?:ing)? as you go|without care|optional care|care is optional|skip (?:it|care)|only if you want it|optional subscription|subscription is optional|skip (?:the |your )?subscription/i, 'the subscription as optional (it comes with every site now)'],
  [/two months free|care[^.]{0,40}\ba year\b|\ba year\b[^.]{0,40}care|subscription[^.]{0,40}\ba year\b|\ba year\b[^.]{0,40}subscription/i, 'a yearly subscription (it is monthly only)'],
  [/founding[^.]{0,60}\b(?:care|subscription)\b|\b(?:care|subscription)\b[^.]{0,60}founding/i, 'a founding subscription price (founding is half off the build only)'],
  [/\b(?:Maiden|Mother|Crone)\b/, 'an old build name (Planted / Tended / In Bloom now)'],
  [/\bchat\b|a call\b|pick a time|rather talk|on the phone|phone call|let(?:’|\\')s talk/i, 'an offer of a call or a chat (email only)'],
  [/(?:change|edit|update) (?:it|these|them|this) yourself|coming soon|do it yourself/i, 'do-it-yourself editing (Taya makes every change)'],
];
for (const [file, strings] of sources) {
  for (const s of strings) {
    for (const [re, what] of FORBIDDEN) {
      const m = s.match(re);
      if (m) fail(`${file}: ${what}: "${s.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
    }
    for (const m of s.matchAll(/\b(?:care|subscription)(?: is| at)? \$(\d+)|\$(\d+) a month subscription/gi)) {
      const n = +(m[1] || m[2]);
      if (![12, 45, 90].includes(n)) fail(`${file}: the subscription shown at $${n}: "${m[0]}"`);
    }
  }
}
// the sample client's subscription amounts are numbers, not words (its key is still 'care'), so check those too ($12 / $45 / $90 a month)
for (const m of demo.matchAll(/key: 'care', amount: (\d+), period: '(\w*)'/g)) {
  if (![12, 45, 90].includes(+m[1]) || m[2] !== 'month') fail(`portal-demo.js: the sample's subscription is $${m[1]} a ${m[2]} (it is $12 / $45 / $90 a month)`);
}
// the subscription row never offers a founding subscription price (founding is half off the build only)
if (/half off for as long as you keep (?:care|(?:your |the )?subscription)/i.test(js)) fail('portal.js: the subscription row still offers a founding price at half off');

// ---- no do-it-yourself editing (Oct 5 2026): the editors can never show ----
if (/id="sec-quick"|id="quick-list"|Change it yourself/i.test(html)) fail('portal.html: the "Change it yourself" section is back');
if (/\b(?:loadQuick|renderQuick|contentSave|contentLoad|photoUpload|flyerUpload)\b|\/content-save|#sec-quick/.test(js)) fail('portal.js: the "Change it yourself" editors are back');

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
// the tabs (Oct 14 2026): every tab's icon is in the sprite, and every section on the project page belongs to a tab
const pageBlock = (js.match(/const PAGES = \[([\s\S]*?)\];/) || [])[1] || '';
const pageIds = [...pageBlock.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
if (!pageIds.includes('home') || pageIds.length < 8) fail('portal.js: PAGES (the tabs) not found');
for (const m of pageBlock.matchAll(/icon: '(i-[a-z]+)'/g)) if (!ids.has(m[1])) fail(`portal.js: the tab icon #${m[1]} isn't in portal.html's sprite`);
const project = (html.match(/<div id="v-project" hidden>([\s\S]*?)\n  <\/div>\n<\/main>/) || [])[1] || '';
if (!project) fail('portal.html: #v-project not found');
for (const m of project.matchAll(/<section class="[^"]*" id="(sec-[a-z]+)"([^>]*)>/g)) {
  const pg = (m[2].match(/data-page="([a-z]+)"/) || [])[1];
  if (!pg) fail(`portal.html: #${m[1]} has no data-page (which tab it belongs to)`);
  else if (!pageIds.includes(pg)) fail(`portal.html: #${m[1]} belongs to a tab that doesn't exist (${pg})`);
}

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
for (const [file, src] of [['portal.js', js], ['portal-demo.js', demo], ['portal-cards.js', cardsJs]]) {
  if (/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(/.test(src)) fail(`${file}: builds the page from HTML strings or runs strings as code`);
}
if (fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('portal')) fail('sitemap.xml lists the portal (it is private)');
// the key only ever travels in a header, never in a web address
if (/[?&](token|session|key)=/.test(js)) fail('portal.js: a key in a web address');

// ---- a Studio preview (Oct 19 2026, added on purpose): the key only in the #fragment, kept for this tab only, taken
// out of the address at once; its words; no sign-out; and the reads it may send match the hub's PREVIEW_READS ----
if (!/h\.indexOf\('#preview='\) === 0\) \{\s*history\.replaceState\(null, '', location\.pathname \+ location\.search\);/.test(js)) fail('portal.js: a Studio preview key should leave the address at once');
if (/[?&]preview=/.test(js) || !/window\.sessionStorage\.setItem\(PREVIEW_STORE/.test(js) || !/DEMO \|\| PREVIEW \? window\.sessionStorage/.test(js)) fail('portal.js: a Studio preview key stays in the #fragment and in this tab only (sessionStorage)');
if (!js.includes("'. Read only: nothing here changes anything.'") || !js.includes("'Viewing as '")) fail('portal.js: the Studio preview line ("Viewing as …. Read only: nothing here changes anything.") is missing');
if (!/<h2 id="h-ended" tabindex="-1">This view has ended\. Open it again from the Studio\.<\/h2>/.test(html)) fail('portal.html: the ended Studio preview words are missing');
if (!js.includes("const RO_TITLE = 'Read only view';")) fail('portal.js: switched off controls in a Studio preview should say "Read only view"');
if (!/html\.wf-preview #b-signout-top, html\.wf-preview #foot-out, html\.wf-preview #b-signout \{ display: none !important; \}/.test(read('portal.css'))) fail('portal.css: a Studio preview should show no sign-out');
if (!/if \(PREVIEW && !previewReads\(url\)\) return stayQuiet\(\);/.test(js) || !/if \(PREVIEW\) return; \/\/ a Studio preview sends no files/.test(js)) fail('portal.js: a Studio preview should send only reads');

// ---- the preview ----
if (!/if \(DEMO\) \{\s*loadDemo\(\)/.test(js)) fail('portal.js: portal-demo.js should load only when DEMO is true');
if (/000000/.test(js)) fail('portal.js: the demo code should live only in portal-demo.js');
if (/demo@webfaery\.love|000000/.test(html.replace(/<div class="demo-hint"[\s\S]*?<\/div>/g, ''))) fail('portal.html: demo sign-in shown outside the demo boxes');
const demoOn = /const DEMO = true;/.test(js);

// ---- the brand accent (Oct 16 2026): portal-brand.js's color math, in plain Node ----
// The contrast ratio is WCAG's; a color that reads at under 4.5:1 on the paper gets a darker shade of the same hue;
// white, greys and anything that isn't a strict #rrggbb keep Web Faery's own look (pick() gives null).
{
  const B = createRequire(import.meta.url)(path.join(root, 'portal-brand.js'));
  const near = (a, b, d) => Math.abs(a - b) <= d;
  const passesAll = (hex) => B.PAPERS.every((p) => B.contrast(hex, p) >= 4.5);
  if (!near(B.contrast('#000000', '#ffffff'), 21, 1e-9)) fail('portal-brand.js: black on white should be 21:1');
  if (!near(B.contrast('#ffffff', '#000000'), 21, 1e-9)) fail('portal-brand.js: contrast should not care about order');
  if (B.contrast('#2f6b4f', '#2f6b4f') !== 1) fail('portal-brand.js: a color on itself should be 1:1');
  if (!near(B.contrast('#767676', '#ffffff'), 4.54, 0.01)) fail(`portal-brand.js: #767676 on white should be about 4.54:1 (got ${B.contrast('#767676', '#ffffff')})`);
  if (!Number.isNaN(B.contrast('red', '#ffffff'))) fail('portal-brand.js: contrast of a non-hex should be NaN');
  if (B.PAPERS.join() !== '#fcfbff,#efebf8' || B.BAR !== '#2e3271') fail('portal-brand.js: the paper, ground and bar colors drifted from wf-tokens.css');
  const tokens = read('wf-tokens.css');
  if (!/--wf-b-sheet: #fcfbff;/.test(tokens) || !/--wf-b-bg: #efebf8;/.test(tokens) || !/--wf-night: #2e3271;/.test(tokens)) fail('wf-tokens.css: the paper, ground or bar changed: update PAPERS / BAR in portal-brand.js');
  // a dark green: used as it is
  const green = B.pick('#1f5130');
  if (!green || green.text !== '#1f5130' || green.darkened || !passesAll(green.text)) fail(`portal-brand.js: a dark green should be used as it is (got ${JSON.stringify(green)})`);
  if (green && green.bar !== '') fail('portal-brand.js: a dark green does not show on the night bar, so the gold tab line should stay');
  // a pale yellow: darkened, same hue, and it passes
  const yellow = B.pick('#f4e9a0');
  if (!yellow || !yellow.darkened || !passesAll(yellow.text)) fail(`portal-brand.js: a pale yellow should get a darker shade that passes 4.5:1 (got ${JSON.stringify(yellow)})`);
  else {
    const a = B.hueOf('#f4e9a0'), b = B.hueOf(yellow.text);
    if (!near(a.h, b.h, 4) || b.l >= a.l) fail(`portal-brand.js: the pale yellow's shade should be the same hue, darker (${JSON.stringify(a)} to ${JSON.stringify(b)})`);
    // a color that already passes comes back as it is
    if (B.darken(yellow.text) !== yellow.text) fail('portal-brand.js: darken() of a passing color should give it back');
    if (yellow.bar !== '#f4e9a0') fail('portal-brand.js: a pale yellow shows on the night bar, so it can be the tab line as it is');
  }
  // the demo's clay orange is a little light: darkened
  const clay = B.pick('#b5562f');
  if (!clay || !clay.darkened || !passesAll(clay.text)) fail(`portal-brand.js: the demo accent should be darkened to pass (got ${JSON.stringify(clay)})`);
  // white, black and greys: Web Faery's own look
  for (const c of ['#ffffff', '#000000', '#808080', '#f5f5f5', '#fcfbff']) if (B.pick(c) !== null) fail(`portal-brand.js: ${c} has no hue to bring in, so it should fall back (got ${JSON.stringify(B.pick(c))})`);
  // anything that isn't a strict #rrggbb
  for (const c of ['', null, undefined, 'red', '#fff', '#12345g', '2f6b4f', ' #2f6b4f', '#2f6b4f ', '#2f6b4f;color:red', 'url(x)', '#2f6b4f80', 42, {}]) {
    if (B.pick(c) !== null) fail(`portal-brand.js: ${JSON.stringify(c)} should be dropped`);
  }
  // every saturated hue, however pale, finds a readable shade (12 hues, pale and bright)
  for (let h = 0; h < 360; h += 30) {
    for (const [s, l] of [[0.9, 0.85], [0.6, 0.5], [1, 0.95]]) {
      const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
      const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      const hex = '#' + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
      const p = B.pick(hex);
      if (!p || !passesAll(p.text)) fail(`portal-brand.js: ${hex} (hue ${h}) found no readable shade (got ${JSON.stringify(p)})`);
    }
  }
  // the darkening stops before near black: then it falls back
  if (B.darken('#8a80c0', ['#2e3271']) !== '') fail('portal-brand.js: a shade that can only pass by going near black (on a dark paper) should give up');
  // the page: loaded before portal.js, OFF until me.brand.accent, and only the small accents in portal.css
  const brandAt = html.indexOf('src="portal-brand.js'), portalAt = html.indexOf('src="portal.js');
  if (brandAt < 0 || brandAt > portalAt) fail('portal.html: portal-brand.js should load just before portal.js');
  if (!/setBrand\(c\.business \|\| '', me\.brand && me\.brand\.accent\)/.test(js)) fail('portal.js: render() should pass me.brand.accent to setBrand');
  if (!/function applyAccent\(/.test(js) || !/removeAttribute\('data-wf-brand'\)/.test(js)) fail('portal.js: applyAccent should clear the accent before it paints a new one');
  const css = read('portal.css');
  const brandCss = (css.split('/* ============ brand accent')[1] || '');
  if (!brandCss) fail('portal.css: the brand accent block is missing');
  for (const line of brandCss.split('\n').filter((l) => /\{/.test(l) && !/^\s*\/?\*/.test(l))) {
    if (!/:root\[data-wf-brand(-bar)?\]/.test(line)) fail(`portal.css: a brand rule that applies without a brand set: ${line.trim().slice(0, 90)}`);
    if (/--wf-b-(due|done|trouble|ink|link|bar\b)|font|--wf-gold|\bcolor:(?!\s*var\(--wf-b-brand)/.test(line.replace(/text-decoration-color|border-left-color/g, ''))) fail(`portal.css: a brand rule touches what stays Web Faery’s (gold, teal, red, text, fonts): ${line.trim().slice(0, 90)}`);
  }
  if (!/\.brand = \{ accent: SAMPLE_ACCENT \}/.test(demo) || !/var SAMPLE_ACCENT = '#[0-9a-f]{6}'/.test(demo)) fail('portal-demo.js: the sample client should have a sample accent');
}

// ---- Extras you can switch on (Oct 16 2026, hub DEPLOY.md section 83) ----
// Four owner switches, each a real checkbox with a visible label, a "what this does" line, one Save for the block,
// and NO switch for what stays Taya's (the no-show card, receipts, business papers, the brand color).
{
  const block = (html.match(/<form[^>]*id="f-bk-x"[\s\S]*?<\/form>/) || [''])[0];
  if (!block) fail('portal.html: the Extras you can switch on block (#f-bk-x) is missing');
  else {
    const boxes = [...block.matchAll(/<input type="checkbox" id="([^"]+)"/g)].map((m) => m[1]);
    if (boxes.join(',') !== 'in-bk-x-thanks,in-bk-x-nudge,in-bk-x-addons,in-bk-x-intake') fail(`portal.html: the extras block should switch exactly the thank-you, the book again note, add-ons and intake (got ${boxes.join(', ')})`);
    for (const id of boxes) {
      if (!new RegExp('<label class="dc-check"><input type="checkbox" id="' + id + '" aria-describedby="' + id.replace(/^in-/, '') + '-what">').test(block)) fail(`portal.html: #${id} should sit in its own visible label and point at its "what this does" line`);
      if (!block.includes('id="' + id.replace(/^in-/, '') + '-what"')) fail(`portal.html: #${id} has no "what this does" line`);
    }
    if (/card|receipt|papers|brand|stripe/i.test(block.replace(/<!--[\s\S]*?-->/g, ''))) fail('portal.html: the extras block mentions something that stays Taya’s (card, receipts, papers, brand, Stripe)');
    if ((block.match(/type="submit"/g) || []).length !== 1) fail('portal.html: the extras block should have one Save button');
    if ((block.match(/Every email has a stop link/g) || []).length !== 2) fail('portal.html: both email extras should say every email has a stop link');
    if (!/Email Taya<\/a> and I will add it\./.test(block)) fail('portal.html: the book again note should say how a missing booking page address gets added');
  }
  if (!/const X_KEYS = \['thanks', 'nudge', 'addons', 'intake'\];/.test(js)) fail('portal.js: the extras should be the four owner switches only');
}

// ---- Messages (Oct 20 2026, hub DEPLOY.md section 94; added on purpose) ----
// A Messages tab with their thread (plain text, textContent only), "Write to Taya" and a Send button; Enter is a new
// line (no key handler sends); the thread is a preview read, the write is not; the box is off in a preview; unsent
// words kept with the page's drafts (sessionStorage); and nothing hints at what Taya can see before they send.
{
  if (!pageIds.includes('messages') || !/\{ id: 'messages', label: 'Messages', icon: 'i-talk' \}/.test(js)) fail('portal.js: the Messages tab is missing from PAGES');
  const sec = (html.match(/<section class="p-card" id="sec-messages"[\s\S]*?<\/section>/) || [''])[0];
  if (!sec) fail('portal.html: the Messages section (#sec-messages) is missing');
  else {
    if (!/data-page="messages"/.test(sec) || !/ hidden>/.test(sec.split('\n')[0])) fail('portal.html: #sec-messages should belong to the messages tab and start hidden');
    if (!/<h2 id="h-messages" tabindex="-1">Messages with Taya<\/h2>/.test(sec)) fail('portal.html: the Messages heading should be “Messages with Taya”');
    if (!/<label class="field-label" for="in-msg">Write to Taya<\/label>/.test(sec)) fail('portal.html: the box should be labelled “Write to Taya”');
    if (!/<textarea id="in-msg"[^>]*maxlength="4000"/.test(sec)) fail('portal.html: the message box should be a textarea of up to 4000 characters');
    if (!/<button class="btn wide" type="submit" id="b-msg"><span>Send<\/span><\/button>/.test(sec)) fail('portal.html: the message box needs its Send button');
    // (Oct 20 2026, rich messages, hub DEPLOY.md section 95; changed on purpose) attachments come only with the rich
    // composer, which portal-rich.js makes: the page itself has no file input, the plain line still says to email files
    const plainSec = sec.replace(/<!--[\s\S]*?-->/g, '').replace(/<p class="msg-intro" id="msg-intro-rich"[\s\S]*?<\/p>/, '');
    if (/attach|<input type="file"/i.test(plainSec.replace(/photos or files, email me/, ''))) fail('portal.html: attachments outside the rich composer in Messages');
    if (!/id="msg-intro-plain"[^>]*>[^<]*photos or files, email me/.test(sec)) fail('portal.html: the plain Messages line should still say to email photos or files');
    if (!/<p class="msg-intro" id="msg-intro-rich" hidden>/.test(sec) || !/<div class="msg-composer" id="msg-rich" hidden><\/div>/.test(sec)) fail('portal.html: the rich line and the composer’s place should be in Messages, hidden');
  }
  const words = [htmlWords].concat(jsStrings).join('\n');
  const hint = words.match(/as you type|while you(?:’|')?re typing|while you type|before you send|what you(?:’|')re typing|typing indicator|Taya can see/i);
  if (hint) fail(`portal: nothing should hint at what Taya can see before they send ("${hint[0]}")`);
  if (!/make\('p', 'msg-body', m\.body\)/.test(js)) fail('portal.js: a message body should be drawn with textContent (make)');
  if (/#in-msg'\)\.addEventListener\('key/.test(js)) fail('portal.js: Enter in the message box should be a new line (no key handler sends)');
  if (!js.includes("'/api/webfaery/portal/messages'") || js.includes("'/api/webfaery/portal/message'")) fail('portal.js: the thread is a preview read and the write is not');
  if (!/if \(PREVIEW\) box\.disabled = true;/.test(js)) fail('portal.js: the message box should be off in a Studio preview');
  if (!/drafts\.set\('message', \$\('#in-msg'\)\.value\)/.test(js)) fail('portal.js: unsent message words should stay with the page’s drafts (sessionStorage)');
  if (!/plural\(unreadMsgs, 'new message', 'new messages'\)/.test(js)) fail('portal.js: Home should say “1 new message” while one of Taya’s waits');
}

// ---- Resources (Oct 21 2026, hub DEPLOY.md section 101; added on purpose) ----
// A Resources tab with the how-to videos and guides Taya approved: hidden until the server sends at least one, grouped
// by topic under plain headings, ledger rows (title, one line, Watch for a video and Read for a guide), each a plain link
// that opens in a new tab with rel noopener noreferrer. Nothing embedded (no iframe, no video tag, no outside script,
// no frame-src), only https links on the hosts the server allows, drawn with textContent; the read is a preview read.
{
  if (!pageIds.includes('resources') || !/\{ id: 'resources', label: 'Resources', icon: 'i-play' \}/.test(js)) fail('portal.js: the Resources tab is missing from PAGES');
  const sec = (html.match(/<section class="p-card" id="sec-resources"[\s\S]*?<\/section>/) || [''])[0];
  if (!sec) fail('portal.html: the Resources section (#sec-resources) is missing');
  else {
    if (!/data-page="resources"/.test(sec) || !/ hidden>/.test(sec.split('\n')[0])) fail('portal.html: #sec-resources should belong to the resources tab and start hidden');
    if (!/<h2 id="h-resources" tabindex="-1">How-to videos and guides<\/h2>/.test(sec)) fail('portal.html: the Resources heading should be “How-to videos and guides”');
    if (!/<p class="rs-lede">Short videos and guides I made for the everyday parts of being online, like your Google profile\. Each one opens in a new tab\.<\/p>/.test(sec)) fail('portal.html: the Resources line should say they open in a new tab');
    if (!/<div class="rs-groups" id="rs-groups"><\/div>/.test(sec)) fail('portal.html: the Resources groups go in #rs-groups');
    const secWords = sec.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
    if (/\bnever\b/i.test(secWords) || /\b(we|us|our)\b/i.test(secWords)) fail('portal.html: the Resources words should be I / me, without “never”');
    if (/<iframe|<video|<embed|<object/i.test(sec)) fail('portal.html: nothing embedded in Resources');
  }
  if (/frame-src|youtube|vimeo|loom/i.test((csp && csp[1]) || '')) fail('portal.html: the security line should not open frames or video hosts for Resources');
  const rsBlock = (js.match(/\/\* ---- Resources \(Oct 21 2026[\s\S]*?\/\* ================= Messages/) || [''])[0];
  if (!rsBlock) fail('portal.js: the Resources block is missing');
  if (/createElement\(|make\('(iframe|video|embed|object|script)'|window\.open|\.src =/.test(rsBlock)) fail('portal.js: Resources should embed nothing');
  if (!js.includes("'/api/webfaery/portal/resources'")) fail('portal.js: the Resources read should be on PREVIEW_READS');
  if (!/resources: \(\) => postJSON\('\/resources', \{\}, token\)/.test(js)) fail('portal.js: Resources should be one read, POST /portal/resources');
  if (!/make\('span', null, r\.kind === 'video' \? 'Watch' : 'Read'\)/.test(js)) fail('portal.js: a video says Watch, a guide says Read');
  if (!/a\.target = '_blank';\s*a\.rel = 'noopener noreferrer';\s*a\.append\(make\('span', null, r\.kind/.test(js)) fail('portal.js: a resource opens in a new tab with rel noopener noreferrer');
  if (!/make\('b', null, r\.title\)/.test(js) || !/make\('small', null, r\.summary\)/.test(js)) fail('portal.js: a resource’s title and line should be drawn with textContent (make)');
  if (!/const RS_HEADS = \{ google: 'Your Google profile', email: 'Email', site: 'Your site', shop: 'Your shop', booking: 'Bookings', other: 'More' \};/.test(js)) fail('portal.js: the Resources topic headings changed');
  if (!/if \(!resources \|\| !resources\.length\) \{ setHidden\(sec, true\); return; \}/.test(js)) fail('portal.js: Resources should stay hidden until there is at least one');
  if (!/return m && RS_HOSTS\.includes\(m\[1\]\) \? s : '';/.test(js)) fail('portal.js: only https links on the allowed hosts should become Resources links');
}

// ---- Their emails in Messages (Oct 20 2026, hub DEPLOY.md section 95; added on purpose) ----
// An email row: the subject in bold and "via email" under the time, both drawn with textContent; long words folded
// behind "Show more" after 600 characters; the whole text is a read on the same thread route (so a preview can open
// it and nothing is written); an email is never counted toward the unread dot by the page itself.
{
  if (!/make\('span', 'msg-via', 'via email'\)/.test(js)) fail('portal.js: an email row should say “via email” under the time');
  if (!/make\('b', '', m\.subject\)/.test(js)) fail('portal.js: an email’s subject should be bold, drawn with textContent (make)');
  if (!/const MSG_FOLD = 600;/.test(js) || !/make\('button', 'msg-more', 'Show more'\)/.test(js)) fail('portal.js: long words should fold behind “Show more” after 600 characters');
  if (!/messageFull: \(id\) => postJSON\('\/messages', \{ full: id \}, token\)/.test(js)) fail('portal.js: the whole text of a folded message should be a read on the thread route');
  if (/messages_unread[^\n]*email/.test(js)) fail('portal.js: emails should not change the unread count on the page');
}

// ---- Rich messages (Oct 20 2026, hub DEPLOY.md section 95; added on purpose) ----
// portal-rich.js: loaded before portal.js, no HTML from strings, its words pass the same rules; the renderer, run here in
// plain Node with a pretend document, makes nothing but p, br, strong, em, u, ul, ol, li and a (https links only, rel
// noopener noreferrer nofollow) whatever it is given; the markup comes back the same when written twice; 41 links, too
// much text and anything shaped like HTML are handled; the attachment read is a preview read, the upload is not.
{
  const richFile = 'portal-rich.js';
  if (!fs.existsSync(path.join(root, richFile)) || !fs.existsSync(path.join(root, 'portal-rich.css'))) fail('missing portal-rich.js or portal-rich.css');
  else {
    const rsrc = read(richFile);
    const richAt = html.indexOf('src="portal-rich.js'), portalAt2 = html.indexOf('src="portal.js');
    if (richAt < 0 || richAt > portalAt2) fail('portal.html: portal-rich.js should load before portal.js');
    if (!/href="portal-rich\.css\?v=/.test(html)) fail('portal.html: portal-rich.css is not linked');
    if (/\.innerHTML|outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(|createContextualFragment|DOMParser/.test(rsrc)) fail('portal-rich.js: builds the page from HTML strings or runs strings as code');
    if (/\.innerHTML|outerHTML\s*=|insertAdjacentHTML|createContextualFragment|DOMParser/.test(js)) fail('portal.js: HTML from strings');
    const richStrings = literals(rsrc).filter((s) => /[A-Za-z]{2,} [A-Za-z]{2,}/.test(s));
    for (const s of richStrings) {
      for (const [re, what] of FORBIDDEN) { const m = s.match(re); if (m) fail(`portal-rich.js: ${what}: "${s.slice(0, 80)}"`); }
      if (/\\'/.test(s)) fail(`portal-rich.js: a straight apostrophe in "${s.slice(0, 80)}" (use ’)`);
      if (/\bnever\b/i.test(s)) fail(`portal-rich.js: "never" in "${s.slice(0, 80)}"`);
      if (/\b(we|us|our)\b/i.test(s)) fail(`portal-rich.js: I / me, not we / us / our: "${s.slice(0, 80)}"`);
    }
    if (!js.includes("'/api/webfaery/portal/message-file'") || js.includes("'/api/webfaery/portal/message-upload'") || js.includes("'/api/webfaery/portal/message-unattach'")) fail('portal.js: the attachment read should be a preview read, the upload and unattach not');
    if (!/window\.WFRich\.render\(m\.body, document\)/.test(js)) fail('portal.js: rich bodies should be drawn by WFRich.render');

    const R = createRequire(import.meta.url)(path.join(root, richFile));
    // a pretend document: every element and attribute made is written down
    const fakeDoc = () => {
      const made = [], attrs = [];
      const node = (tag) => ({
        tag, kids: [],
        appendChild(c) { this.kids.push(c); return c; },
        setAttribute(k, v) { attrs.push([tag, k, String(v)]); },
        set textContent(v) { this.kids = [{ tag: '#text', text: String(v) }]; },
        get textContent() { return this.kids.map((c) => (c.tag === '#text' ? c.text : c.textContent)).join(''); },
      });
      return {
        made, attrs,
        createElement(t) { made.push(String(t).toLowerCase()); return node(String(t).toLowerCase()); },
        createTextNode(t) { return { tag: '#text', text: String(t) }; },
        createDocumentFragment() { return node('#frag'); },
      };
    };
    const ALLOWED = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'];
    if (R.ALLOWED.join() !== ALLOWED.join()) fail('portal-rich.js: ALLOWED drifted');
    const hostile = [
      '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>', '<iframe src="javascript:alert(1)">',
      '[click](javascript:alert(1))', '[click](JAVASCRIPT:alert(1))', '[x](data:text/html;base64,PHNjcmlwdD4=)', '[x](//evil.example/a)',
      '[x](http://plain.example)', '[x](https://good.example" onmouseover="alert(1))', '[x](https://good.example/a b)', '[x](https://user@evil.example)',
      '[x](https://evil.example/\u0000)', '[<b>x</b>](https://ok.example)', '**' + '*__'.repeat(3000), '['.repeat(5000) + 'x](https://ok.example)',
      '- <script>\n1. <img onerror=x>\n\n__**[a](https://a.example)**__', String.fromCharCode(0x202E) + 'gnp.exe', '&lt;script&gt;', '<a href="https://ok.example">x</a>',
      '[ok](https://ok.example/path?q=1#frag)', 'x'.repeat(30000),
    ];
    const t0 = Date.now();
    for (const h of hostile) {
      const d = fakeDoc();
      let frag = null;
      try { frag = R.render(h, d); } catch (e) { fail(`portal-rich.js: render threw on ${JSON.stringify(h.slice(0, 40))}: ${e.message}`); continue; }
      const bad = d.made.filter((t) => !ALLOWED.includes(t));
      if (bad.length) fail(`portal-rich.js: render made <${bad[0]}> from ${JSON.stringify(h.slice(0, 40))}`);
      for (const [tag, k, v] of d.attrs) {
        if (tag !== 'a' || !['href', 'rel', 'target'].includes(k)) fail(`portal-rich.js: render set ${k} on <${tag}>`);
        if (k === 'href' && !/^https:\/\/[A-Za-z0-9.-]+[^\s"'<>]*$/.test(v)) fail(`portal-rich.js: render made a link to ${JSON.stringify(v)}`);
        if (k === 'rel' && v !== 'noopener noreferrer nofollow') fail('portal-rich.js: links need rel="noopener noreferrer nofollow"');
        if (k === 'target' && v !== '_blank') fail('portal-rich.js: links open in a new tab');
      }
      if (/javascript:|data:text/i.test(JSON.stringify(d.attrs))) fail(`portal-rich.js: a javascript: or data: link from ${JSON.stringify(h.slice(0, 40))}`);
      if (h === '<script>alert(1)</script>' && frag.textContent !== '<script>alert(1)</script>') fail('portal-rich.js: a script tag in the markup should show as letters');
    }
    if (Date.now() - t0 > 3000) fail(`portal-rich.js: rendering the hostile set took ${Date.now() - t0} ms (a markup bomb?)`);
    // what it should make
    const shape = (text) => { const d = fakeDoc(); const f = R.render(text, d); return { tags: d.made.join(','), text: f.textContent, attrs: d.attrs }; };
    const s1 = shape('Hi **bold** *it* __under__ [site](https://webfaery.love/a)\nline two\n\n- one\n- two\n\n1. first\n2. second');
    if (s1.tags !== 'p,strong,em,u,a,br,ul,li,li,ol,li,li') fail(`portal-rich.js: render shape ${s1.tags}`);
    if (!s1.attrs.some(([t, k, v]) => t === 'a' && k === 'href' && v === 'https://webfaery.love/a')) fail('portal-rich.js: the https link should be a link');
    if (shape('2 \\* 3 \\_ \\[x\\]').text !== '2 * 3 _ [x]') fail('portal-rich.js: backslash escapes should show the letter');
    // the validator (the same core as the server's)
    const N = R.normalize;
    const okText = (s) => { const r = N(s); return r.ok ? r.text : '!' + r.reason; };
    if (okText('<script>alert(1)</script>hi') !== 'alert(1)hi') fail(`portal-rich.js: normalize should drop tag shapes, got ${okText('<script>alert(1)</script>hi')}`);
    if (okText('<img src=x onerror=alert(1)>') !== '!empty') fail('portal-rich.js: an img tag alone should leave nothing');
    if (okText('[x](javascript:alert(1))') !== '\\[x\\](javascript:alert(1))') fail(`portal-rich.js: a javascript: link should stay plain letters, got ${okText('[x](javascript:alert(1))')}`);
    if (okText('[x](data:text/html,hi)').includes('](data') && !okText('[x](data:text/html,hi)').startsWith('\\[')) fail('portal-rich.js: a data: link should stay plain letters');
    const links = (n) => Array.from({ length: n }, (_, i) => '[l' + i + '](https://l' + i + '.example)').join(' ');
    if (!N(links(40)).ok || N(links(41)).reason !== 'links') fail('portal-rich.js: 40 links are fine, 41 are refused');
    if (N('x'.repeat(8000)).ok !== true || N('x'.repeat(8001)).reason !== 'long') fail('portal-rich.js: 8000 characters are fine, 8001 are refused');
    if (N(42).reason !== 'type' || N('   \n ').reason !== 'empty') fail('portal-rich.js: not text or empty should be refused');
    // 'https://a.example/' is 18 characters: 18 + 481 = 499 is a link, 18 + 482 = 500 is plain letters
    if (!N('[x](https://a.example/' + 'p'.repeat(481) + ')').text.startsWith('[x](') || N('[x](https://a.example/' + 'p'.repeat(482) + ')').text.startsWith('[x](')) fail('portal-rich.js: link hrefs should be under 500 characters');
    const t1 = Date.now();
    N('**__*'.repeat(1500)); N('['.repeat(15000)); N('*'.repeat(15000)); N(('**a' + '__b').repeat(1500));
    if (Date.now() - t1 > 2000) fail(`portal-rich.js: normalizing markup bombs took ${Date.now() - t1} ms`);
    for (const s of ['***x***', '*a**b*', '**a***b*', '___x___', 'a\\*b', '- one\n- two\n\nthree\n\\- four', '1. a\n7. b', '**[x](https://a.example)** tail  ', '**un*closed', '[a\\]b](https://a.example)', ...hostile.slice(0, 20)]) {
      const a = N(s), b = a.ok ? N(a.text) : null;
      if (a.ok && (!b.ok || b.text !== a.text)) fail(`portal-rich.js: normalize should be stable: ${JSON.stringify(s.slice(0, 30))} gave ${JSON.stringify(a.text.slice(0, 40))} then ${JSON.stringify(b.ok ? b.text.slice(0, 40) : b.reason)}`);
    }
    if (okText('1. a\n7. b') !== '1. a\n2. b') fail('portal-rich.js: numbered items are numbered 1, 2, 3');
    if (R.EMOJI.length !== 60 || new Set(R.EMOJI).size !== 60) fail(`portal-rich.js: the emoji grid should be 60 different ones (got ${R.EMOJI.length})`);
  }
}

// ---- Business papers: they add their own (Oct 20 2026, hub DEPLOY.md section 98; added on purpose) ----
// "Add a paper" on the card (a file, an optional name, kind and good until day), shown only when the server says it
// takes them; Rename and Remove only on their own papers (the server's added_by, with an id), asked in the row (no
// window.confirm); the add, rename and remove are not preview reads; the email fine print stays as a second way.
{
  const sec = (html.match(/<section class="p-card" id="sec-papers"[\s\S]*?<\/section>/) || [''])[0];
  if (!sec) fail('portal.html: the business papers card (#sec-papers) is missing');
  else {
    if (!/<button type="button" class="later pp-add-open" id="b-pp-add" aria-expanded="false" aria-controls="f-pp">Add a paper<\/button>/.test(sec)) fail('portal.html: the papers card should have an “Add a paper” button');
    if (!/<div class="pp-add" id="pp-add" hidden>/.test(sec) || !/<form class="rc-form pp-form" id="f-pp" novalidate hidden>/.test(sec)) fail('portal.html: Add a paper and its form start hidden (shown only when the server takes papers)');
    if (!/<input id="in-pp-file" class="pp-file" type="file" accept="[^"]*\.pdf[^"]*\.docx[^"]*\.csv[^"]*image\/\*"/.test(sec) || /accept="[^"]*(?:\.svg|\.html|\.exe|\.zip)/.test(sec)) fail('portal.html: the paper file picker should take PDFs, photos, Office files and text, and not SVG, HTML, EXE or zip');
    if (!/<select id="in-pp-kind">\s*<option value="">Pick one<\/option>\s*<option value="insurance">Insurance<\/option>\s*<option value="license">Business license<\/option>\s*<option value="permit">Permit<\/option>\s*<option value="certification">Certification<\/option>\s*<option value="other">Something else<\/option>\s*<\/select>/.test(sec)) fail('portal.html: the paper kinds should be insurance, license, permit, certification and something else, with none picked');
    if (!/<input id="in-pp-name" type="text" maxlength="120"/.test(sec) || !/<input id="in-pp-until" type="date"/.test(sec)) fail('portal.html: the paper name (120) and the good until day should be there');
    if (!/Name <span class="opt-tag">\(optional\)<\/span>/.test(sec) || !/Good until <span class="opt-tag">\(optional\)<\/span>/.test(sec)) fail('portal.html: the name and the good until day are optional, and say so');
    if (!sec.includes('A PDF, a photo, a Word, Excel or PowerPoint file, or plain text, up to 10 MB.')) fail('portal.html: the papers hint should say what files work, up to 10 MB');
    if (!sec.includes('Email the new copy to <a href="mailto:taya@webfaery.love">taya@webfaery.love</a> and I’ll put it here.')) fail('portal.html: the “Email the new copy” fine print should stay as a second way');
    if (!sec.includes('Nothing here yet. Add your first one below, and it stays here for whenever someone asks.')) fail('portal.html: the empty papers line is missing');
  }
  if (/\bconfirm\(/.test(js)) fail('portal.js: no window.confirm (ask in the row)');
  for (const route of ["'/api/webfaery/papers/add'", "'/api/webfaery/papers/rename'", "'/api/webfaery/papers/remove'"]) if (js.includes(route)) fail('portal.js: ' + route + ' should not be a preview read');
  if (!js.includes("'/api/webfaery/papers/mine',")) fail('portal.js: papers/mine should stay a preview read');
  if (!/papersAdd: \(fields, file, onProgress\) => sendForm\('\/add', fields, \[file\], token, onProgress, PAPERS\)/.test(js)) fail('portal.js: a paper goes as one file in a form to papers/add');
  if (!/const theirs = p\.added_by === 'client' && PP_ID\.test\(str\(p\.id, 20\)\);/.test(js) || !/if \(p\.theirs\) ppOwnActs\(p, acts\);/.test(js)) fail('portal.js: Rename and Remove only on their own papers (added_by client, with an id)');
  if (!/if \(!list\.length && !ppUpload\) \{ setHidden\(sec, true\); return; \}/.test(js)) fail('portal.js: the papers card stays hidden with no papers unless the server takes their own');
  const ppStrings = ['Added by you', 'Rename', 'Remove', 'Yes, remove it', 'Keep it', 'Save the name', 'Added. It’s in your papers now.', 'Removed.', 'Renamed.',
    'Pick a file first.', 'Give it a name first, even a short one.', '” from your portal? Its file goes too.', 'more file'];
  for (const s of ppStrings) if (!js.includes("'" + s + "'")) fail(`portal.js: the papers words “${s}” are missing`);
  const ppAt = js.indexOf('/* ---- your business papers'), ppEnd = js.indexOf('/* ================= Messages', ppAt);
  if (ppAt < 0 || ppEnd < 0) fail('portal.js: the business papers part is missing');
  for (const s of literals(js.slice(ppAt, ppEnd)).filter((x) => /[A-Za-z]{2,} [A-Za-z]{2,}/.test(x))) {
    if (/\bnever\b/i.test(s)) fail(`portal.js: "never" in "${s.slice(0, 80)}"`);
    if (/\b(we|us|our)\b/i.test(s)) fail(`portal.js: I / me, not we / us / our: "${s.slice(0, 80)}"`);
  }
}

// ---- your business cards (Oct 21 2026): portal-cards.js and #sec-cards ----
// The card is drawn and the files made in the client's own browser: nothing is sent, nothing is fetched, the QR code
// is made by a small encoder in the page, the printer links open a new tab safely, and the preview (Studio) switches
// the form and the downloads off. The safe-area guide is on the screen only, never in the files.
{
  const cd = createRequire(import.meta.url)(path.join(root, 'portal-cards.js'));
  const sec = (html.match(/<section class="p-card" id="sec-cards"[\s\S]*?<\/section>/) || [''])[0];
  if (!sec || !/data-page="cards"/.test(sec)) fail('portal.html: the business cards card (#sec-cards, data-page="cards") is missing');
  if (!sec.includes('Your business cards')) fail('portal.html: the cards card should be called “Your business cards”');
  const cardsAt = html.indexOf('src="portal-cards.js'), portalAt3 = html.indexOf('src="portal.js');
  if (cardsAt < 0 || cardsAt > portalAt3) fail('portal.html: portal-cards.js should load before portal.js');
  if (/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|new Image\(|https?:\/\/(?!www\.moo\.com\/us\/business-cards\/|www\.vistaprint\.com\/business-cards)/.test(cardsJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1').replace(/'https:\/\/' \+ w|\^https\?:\\\/\\\//g, '')))
    fail('portal-cards.js: nothing goes over the network, and only MOO and Vistaprint are linked');
  if (!cardsJs.includes("const MOO = 'https://www.moo.com/us/business-cards/', VISTA = 'https://www.vistaprint.com/business-cards';")) fail('portal-cards.js: the printer links should be MOO’s and Vistaprint’s business cards pages');
  if (!/go\.target = '_blank'; go\.rel = 'noopener noreferrer'/.test(cardsJs) || !/go2\.target = '_blank'; go2\.rel = 'noopener noreferrer'/.test(cardsJs)) fail('portal-cards.js: the printer links open a new tab with rel noopener noreferrer');
  if (!/draw\(cv, side, f\.style, lk, f, false\);/.test(cardsJs)) fail('portal-cards.js: the files are drawn without the safe-area guide');
  if (!/draw\(front\.cv, 'front', f\.style, lk, f, true\)/.test(cardsJs)) fail('portal-cards.js: the on-screen preview shows the safe-area guide');
  if (!/fs\.disabled = !!c\.preview;/.test(cardsJs) || !/dlBtn\.disabled = !!c\.preview;/.test(cardsJs) || !/if \(!c\.preview\) \{ try \{ window\.localStorage\.setItem/.test(cardsJs)) fail('portal-cards.js: a Studio preview switches the form, the downloads and the saving off');
  if (cd.W !== 1125 || cd.H !== 675 || cd.BLEED !== 37.5 || cd.SAFE !== 75) fail('portal-cards.js: the files are 1125 x 675 px (3.75 x 2.25 in at 300 dpi) with 0.125 in bleed and a 0.125 in safe area');
  for (const s of ['Order at MOO', 'or try Vistaprint', 'Download print files', 'Download your two files above.', 'Upload them at the printer.', 'Pay and add your shipping address there.',
    'The printer sets the price and sends the cards to you. I do not handle the order or the money. ' + PRINTER_PRICE, 'I will add your brand here soon.']) {
    if (!cardsJs.includes(s)) fail(`portal-cards.js: the words “${s}” are missing`);
  }
  for (const s of cardsStrings.filter((x) => /[A-Za-z]{2,} [A-Za-z]{2,}/.test(x))) {
    if (/\bnever\b/i.test(s)) fail(`portal-cards.js: "never" in "${s.slice(0, 80)}"`);
    if (/\b(we|us|our)\b/i.test(s)) fail(`portal-cards.js: I / me, not we / us / our: "${s.slice(0, 80)}"`);
  }
  // the QR encoder: sizes, finder patterns, the timing line, and that the text decides the version
  const q = cd.qr('https://webfaery.love');
  if (!q || q.version !== 2 || q.size !== 25) fail(`portal-cards.js: a 21 letter address should make a version 2 QR, 25 modules wide (got ${q && q.version}, ${q && q.size})`);
  else {
    const finderOk = (x0, y0) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const edge = i === 0 || j === 0 || i === 6 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4; if (q.get(x0 + j, y0 + i) !== (edge || core)) return false; } return true; };
    if (!finderOk(0, 0) || !finderOk(18, 0) || !finderOk(0, 18)) fail('portal-cards.js: the QR finder squares are wrong');
    for (let i = 8; i < 17; i++) if (q.get(i, 6) !== (i % 2 === 0) || q.get(6, i) !== (i % 2 === 0)) fail('portal-cards.js: the QR timing line is wrong');
    if (!q.get(8, 25 - 8)) fail('portal-cards.js: the QR dark module is missing');
  }
  if (cd.qr('') !== null || cd.qr('x'.repeat(300)) !== null) fail('portal-cards.js: an empty or too long address should give no QR');
  const long = cd.qr('https://example.com/' + 'a'.repeat(150));
  if (!long || long.version < 8) fail('portal-cards.js: a long address should make a bigger QR');
  if (cd.qrUrl('webfaery.love/') !== 'https://webfaery.love' || cd.qrUrl('not a site') !== '' || cd.qrUrl('') !== '') fail('portal-cards.js: the QR address is the site as https, or nothing');
}

if (failures.length) {
  console.error(`portal-text: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`portal-text: all good (${jsStrings.length + demoStrings.length} script strings and portal.html checked; DEMO is ${demoOn ? 'ON (preview)' : 'off (live)'})`);
