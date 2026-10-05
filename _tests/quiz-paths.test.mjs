// Runs the real quiz script from quiz.html against a tiny fake page, clicks through every
// possible answer path, and checks the recommendation.
//
//   node _tests/quiz-paths.test.mjs
//
// Pricing as of Oct 5 2026 (web-faery-kit/pricing-oct2026.md): care comes with every site and matches the build.
// The BUILD comes from what the site needs to do (questions 1 to 3), plus the newsletter (question 4):
//   In Bloom if they said "Yes, set booking up for me" or "Yes, selling"
//   Tended   if they already use a booking app (Tended's Book button links to it), or have "Quite a bit"
//            to say, or want the site to gather something, or want a newsletter
//   Planted  otherwise
// Care is always the build's own: Planted $12, Tended $45, In Bloom $90 a month.
// Also fails (exit 1) if focus doesn't land on the new question / the result, if a price is wrong,
// if the intake link loses the build, or if an old name, price or rule (Maiden / Mother / Crone, $69, $35,
// pay as you go, $100 an hour, yearly care, optional care), "subscription", a trade or a dash sneaks in.
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'quiz.html'), 'utf8');
const script = html.match(/<script id="quiz-logic">([\s\S]*?)<\/script>/)[1];

// ---- a fake page, just big enough for the quiz script ----
class El {
  constructor(tag, id) {
    this.tag = tag; this.id = id || ''; this.children = []; this.listeners = {};
    this.hidden = false; this.style = {}; this._text = ''; this.href = ''; this.className = '';
    const cls = new Set();
    this.classList = {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c),
      toggle: (c, on) => ((on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c)),
    };
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  // no-break spaces (the quiz keeps "$25 to $50" and the like on one line) read as plain spaces
  get textContent() { return this.rawText.replace(/\u00a0/g, ' '); }
  get rawText() { return this._text + this.children.map((c) => (c.rawText !== undefined ? c.rawText : c.textContent)).join(''); }
  set innerHTML(v) { throw new Error('quiz should build text with textContent, not innerHTML'); }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach((fn) => fn({ target: this })); }
  focus() { document.activeElement = this; }
  getBoundingClientRect() { return { top: 500, left: 0, width: 300, height: 100 }; }
}
const ids = {};
const document = {
  activeElement: null,
  getElementById: (id) => (ids[id] ||= new El('div', id)),
  querySelector: (sel) => (ids['sel:' + sel] ||= new El('a', sel)),
  createElement: (tag) => new El(tag),
  createTextNode: (t) => ({ textContent: String(t) }),
};
const window = { scrollY: 0, scrollTo() {} };
const ctx = vm.createContext({ document, window, encodeURIComponent });
vm.runInContext(script, ctx);

const QUESTIONS = vm.runInContext('QUESTIONS', ctx);
const $ = (id) => document.getElementById(id);

// ---- the rules, written out independently of the page ----
const PRICES = { 'Planted': [600, 300, 12], 'Tended': [1200, 600, 45], 'In Bloom': [1800, 900, 90] };
const expectBuild = (p) => (p[2] >= 3 ? 'In Bloom' : (p[2] === 2 || p[0] === 1 || p[1] === 1 || p[3] >= 2) ? 'Tended' : 'Planted');
const usd = (n) => '$' + n.toLocaleString('en-US');

// words that must never appear: old names, prices and rules, the word Pollen dislikes, trades, dashes
const FORBIDDEN = [/\bMaiden\b/, /\bMother\b/, /\bCrone\b/, /\$69\b/, /\$690/, /\$35\b/, /\$350/, /\$49\b/, /\$490/,
  /pay(?:ing)? as you go/i, /without care/i, /an hour/i, /per hour/i, /\$25 to \$50/, /quick change/i, /update session/i,
  /a year\b[^.]{0,20}care/i, /two months free/i, /care is optional/i, /optional care/i, /skip (?:it|care)/i,
  /subscription/i, /\btrad(?:e|es|ed|ing)\b/i, /\bon call\b/i, /\bchat\b/i, /—/, /–/, /&mdash;/, /&ndash;/, /\$-/, /NaN|undefined/];
const visible = html
  .replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('quiz-logic') ? m.replace(/\/\/.*$/gm, '') : ''))
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
const failures = [];
for (const re of FORBIDDEN) if (re.test(visible)) failures.push(`quiz.html contains ${re}`);
if (!/get half off the build\./.test(visible)) failures.push('quiz.html: the founding note should say half off the build');
if (/\b\d+ (?:founding spots? )?left\b/.test(visible)) failures.push('quiz.html: shows a founding count; keep it only on the main page');

// ---- every combination of answers ----
let combos = [[]];
for (const q of QUESTIONS) combos = combos.flatMap((c) => q.answers.map((_, i) => [...c, i]));

const tally = {};
const buildRows = new Map();
const short = (qi, i) => QUESTIONS[qi].answers[i].t.slice(0, 30);

console.log(`Questions: ${QUESTIONS.length}. Checking ${combos.length} answer paths\n`);

combos.forEach((picks, n) => {
  const tag = `path ${n + 1} [${picks.join(',')}]`;
  if ($('result').classList.contains('show')) $('retake').click();
  picks.forEach((p, qi) => {
    const buttons = $('q-answers').children;
    if (buttons.length !== QUESTIONS[qi].answers.length) failures.push(`${tag}: question ${qi + 1} shows ${buttons.length} answers`);
    buttons[p].click();
    const want = qi === picks.length - 1 ? 'r-build-name' : 'q-title';
    if (!document.activeElement || document.activeElement.id !== want) failures.push(`${tag}: after question ${qi + 1}, focus is on ${document.activeElement && document.activeElement.id}, expected ${want}`);
  });
  if (!$('result').classList.contains('show')) failures.push(`${tag}: result never shown`);

  const build = $('r-build-name').textContent;
  tally[build] = (tally[build] || 0) + 1;
  if (build !== expectBuild(picks)) failures.push(`${tag}: build ${build}, expected ${expectBuild(picks)}`);
  if ((picks[2] >= 3) !== (build === 'In Bloom')) failures.push(`${tag}: In Bloom must mean booking or selling`);

  const [full, founding, care] = PRICES[build] || [0, 0, 0];
  if ($('r-build-price').textContent !== usd(full)) failures.push(`${tag}: build price shows ${$('r-build-price').textContent}`);
  if (!$('r-build-founding').textContent.includes(usd(founding))) failures.push(`${tag}: founding price missing`);
  const careName = $('r-care-name').textContent;
  if (!careName.endsWith(`${build} care, ${usd(care)} a month`)) failures.push(`${tag}: care heading is "${careName}"`);
  const costs = $('r-costs').textContent;
  const because = $('r-care-because').textContent;
  const careAlso = $('r-care-also').textContent;
  if (!costs.includes(usd(full) + ' once')) failures.push(`${tag}: cost list lacks the build price`);
  if (!/Half to start, which holds your spot, and half at launch/.test(costs)) failures.push(`${tag}: cost list lacks how paying works`);
  if (!costs.includes(`Care: ${usd(care)} a month, starting after your 30 days of settling in`)) failures.push(`${tag}: cost list lacks the care price`);
  if (!/Care comes with every site/.test(because)) failures.push(`${tag}: doesn't say care comes with every site`);
  if (!/as often as you need, usually within 2 business days/.test(careAlso)) failures.push(`${tag}: changes or the reply time missing`);
  if (!/Big new things, like a new page, I quote first/.test(careAlso)) failures.push(`${tag}: big things aren't quoted first`);
  if (!/I hand you every file and login/.test(careAlso)) failures.push(`${tag}: the hand-over promise is missing`);
  if (picks[2] === 2 && !/booking app you already use/.test(costs)) failures.push(`${tag}: booking-app cost line missing`);
  if (build === 'In Bloom' && !/about 2\.9% \+ 30¢ per payment/.test(costs)) failures.push(`${tag}: In Bloom cost list lacks the payment fee`);
  if (build === 'Planted' && (picks[3] === 1 || picks[3] === 3) && !/about \$3 a month/i.test(costs)) failures.push(`${tag}: Planted own-address email cost missing`);
  if (!/Fixes: Anything broken, always free/.test(costs)) failures.push(`${tag}: cost list lacks free fixes`);

  const text = ['r-build-what', 'r-build-founding', 'r-build-ready', 'r-build-because', 'r-build-points', 'r-build-also',
    'r-care-name', 'r-care-because', 'r-care-points', 'r-care-also', 'r-costs', 'r-start'].map((id) => $(id).textContent).join(' | ');
  for (const re of FORBIDDEN) if (re.test(text)) failures.push(`${tag}: result text contains ${re}`);

  const href = $('r-start').href;
  if (href !== `intake.html?plan=${encodeURIComponent(build)}`) failures.push(`${tag}: start link is ${href}`);

  const bKey = picks.map((p, qi) => short(qi, p)).join(' / ');
  if (!buildRows.has(bKey)) buildRows.set(bKey, build);
});

// Back button and retake also move focus to the question.
const focusedId = () => (document.activeElement ? document.activeElement.id : 'nothing');
document.activeElement = null;
$('retake').click();
if (focusedId() !== 'q-title') failures.push('Take it again: focus not on the first question');
$('q-answers').children[0].click();
document.activeElement = null;
$('back').click();
if (focusedId() !== 'q-title') failures.push('Back button: focus not on the question');

console.log('\nTotals:', Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', '));

if (failures.length) {
  console.log(`\nFAIL (${failures.length})`);
  failures.slice(0, 40).forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log('\nPASS: every path checked');
