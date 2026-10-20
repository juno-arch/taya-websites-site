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
for (const [file, src] of [['portal.js', js], ['portal-demo.js', demo]]) {
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
    if (/attach|<input type="file"/i.test(sec.replace(/<!--[\s\S]*?-->/g, '').replace(/photos or files, email me/, ''))) fail('portal.html: no attachments in Messages (phase 1)');
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

if (failures.length) {
  console.error(`portal-text: ${failures.length} problem(s)`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`portal-text: all good (${jsStrings.length + demoStrings.length} script strings and portal.html checked; DEMO is ${demoOn ? 'ON (preview)' : 'off (live)'})`);
