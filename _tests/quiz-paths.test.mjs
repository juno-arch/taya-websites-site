// Runs the real quiz script from quiz.html against a tiny fake page, clicks through every
// possible answer path, and checks both halves of the recommendation.
//
//   node _tests/quiz-paths.test.mjs
//
// The BUILD comes only from what the site needs to do (questions 1 to 3):
//   Crone  if they said "Yes, set booking up for me" or "Yes, selling"
//   Mother if they already use a booking app (Mother's Book now button links to it),
//          or have "Quite a bit" to say, or want the site to gather something
//   Maiden otherwise
// CARE vs WITHOUT CARE comes only from the after-launch answers (questions 4 to 6):
//   without care (Sep 29 evening, per Pollen) is $100 an hour with the price given before I start; most small
//   changes come to about $25 to $50, so the math counts each change at the middle, $37.50:
//   without care = changes a year x $37.50 + the web address ($12) + the extras they want (own-address email
//   about $36 a year; a newsletter $0 to $108 a year), compared with care paid yearly ($690).
//   $690 or more: care. From $450 (a close call, about a change a month): "One bill, and someone looking after it"
//   tips it to care, and so does wanting the email or newsletter care covers when they have "No idea yet";
//   "Keep my costs as low as possible" never gets care unless the math says so.
// So: a change or two a year, or a few, never gets care; every week or two always does; about once a month
// depends on the extras and what they'd like.
// Also fails (exit 1) if focus doesn't land on the new question / the result, if a price is wrong,
// if the intake link loses the build, or if an old price or rule (the $25 quick change, the 15-minute cap,
// the $100 update session, the hour a month, extra time, $100 a round, the flat $50 a change, "a change is one
// email"), an hourly rate other than $100, "subscription", a trade or a dash sneaks in.
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
const PRICES = { Maiden: [600, 300], Mother: [1200, 600], Crone: [1800, 900] };
const PER_YEAR = [[1, 2], [3, 4], [12, 12], [26, 52]];
const EXTRAS = [[0, 0], [36, 36], [0, 108], [36, 144]];
const CHANGE = 37.5; // the middle of about $25 to $50 a change ($100 an hour, priced first)
const WEB_ADDRESS = 12;
const CARE_PREPAID = 690;
const CARE_YEAR = 69 * 12; // $828
const CLOSE_CALL = 450;
const expectBuild = (p) => (p[2] >= 3 ? 'Crone' : (p[2] === 2 || p[0] === 1 || p[1] === 1) ? 'Mother' : 'Maiden');
const range = (p) => [0, 1].map((i) => PER_YEAR[p[3]][i] * CHANGE + WEB_ADDRESS + EXTRAS[p[4]][i]);
const paygMid = (p) => (range(p)[0] + range(p)[1]) / 2;
const expectCare = (p) => {
  const mid = paygMid(p);
  if (mid >= CARE_PREPAID) return 'care';
  if (mid >= CLOSE_CALL && (p[5] === 1 || (p[5] === 2 && p[4] > 0))) return 'care';
  return 'payg';
};
const usd = (n) => '$' + n.toLocaleString('en-US');
// estimates are shown rounded to the nearest $10
const about = (n) => usd(Math.max(10, Math.round(n / 10) * 10));
const rangeWords = (r) => (about(r[0]) === about(r[1]) ? `about ${about(r[0])} a year` : `about ${about(r[0])} to ${about(r[1])} a year`);

// words that must never appear: old prices and rules, the old update schedule, the word Pollen dislikes,
// trades (only ever offered privately), dashes
const FORBIDDEN = [/\$444/, /\$666/, /\$888/, /\$22\b/, /\$44\b/, /\$66\b/, /\$111/, /\$33\b/, /\$11\b/, /\$588/,
  /\$25\b(?! to \$50)/, /\$100 (?:a round|update|for an update)/, /\b15[- ]?min/i, /quick change/i, /update session/i, /an hour a month/i, /roll(?:s|ed)? over/i,
  /extra time/i, /\$(?!100 an hour)\d[\d,.]* an hour/, /per hour/i, /by the minute/i, /a round\b/i, /seasonal check/i,
  /(?<!\$25 to )\$50 (?:a change|each|a round)/, /\ba change\b[^.]{0,30}\bone email\b/i, /counts? as one change/i, /\$\d+\.\d/,
  /equinox/i, /solstice/i, /four times a year/i, /subscription/i, /\btrad(?:e|es|ed|ing)\b/i,
  /founding spots last/i, /Care, \$35/, /\bon call\b/i, /—/, /–/, /&mdash;/, /&ndash;/, /2\.9%/, /\$-/, /NaN|undefined/];
const visible = html
  .replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('quiz-logic') ? m.replace(/\/\/.*$/gm, '') : ''))
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
const failures = [];
for (const re of FORBIDDEN) if (re.test(visible)) failures.push(`quiz.html contains ${re}`);
// founding clients' care price, both ways, and never the founding count (it lives only on the main page)
if (!/\$35 a month \(or \$350 a year\)/.test(visible)) failures.push('quiz.html: the founding note lacks "$35 a month (or $350 a year)"');
if (/\b\d+ (?:founding spots? )?left\b/.test(visible)) failures.push('quiz.html: shows a founding count; keep it only on the main page');

// ---- every combination of answers ----
let combos = [[]];
for (const q of QUESTIONS) combos = combos.flatMap((c) => q.answers.map((_, i) => [...c, i]));

const tally = {};
const buildRows = new Map();
const careRows = new Map();
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
  const careName = $('r-care-name').textContent;
  const care = careName === 'Care, $69 a month' ? 'care' : careName === 'Without care, $100 an hour' ? 'payg' : '?';
  tally[`${build} + ${care}`] = (tally[`${build} + ${care}`] || 0) + 1;

  if (build !== expectBuild(picks)) failures.push(`${tag}: build ${build}, expected ${expectBuild(picks)}`);
  if (care !== expectCare(picks)) failures.push(`${tag}: after launch "${careName}", expected ${expectCare(picks)}`);

  // the two halves never leak into each other, and the leanings stay sensible
  const wantsBookOrSell = picks[2] >= 3;
  if (wantsBookOrSell !== (build === 'Crone')) failures.push(`${tag}: Crone must mean booking or selling`);
  if (picks[3] <= 1 && care === 'care') failures.push(`${tag}: care for changes only a few times a year`);
  if (picks[3] === 3 && care !== 'care') failures.push(`${tag}: no care for "every week or two"`);
  if (picks[3] === 2 && picks[5] === 1 && care !== 'care') failures.push(`${tag}: monthly changes + "one bill" should get care`);
  if (picks[3] === 2 && picks[4] > 0 && picks[5] === 2 && care !== 'care') failures.push(`${tag}: monthly changes + wanting email or a newsletter should lean care`);
  if (picks[5] === 0 && care === 'care' && paygMid(picks) < CARE_PREPAID) failures.push(`${tag}: care costs more, but they asked to keep costs low`);

  // prices shown match the table
  const [full, founding] = PRICES[build] || [0, 0];
  if ($('r-build-price').textContent !== usd(full)) failures.push(`${tag}: build price shows ${$('r-build-price').textContent}`);
  if (!$('r-build-founding').textContent.includes(usd(founding))) failures.push(`${tag}: founding price missing`);
  const costs = $('r-costs').textContent;
  const points = $('r-care-points').textContent;
  const because = $('r-care-because').textContent;
  const careAlso = $('r-care-also').textContent;
  if (!costs.includes(usd(full) + ' once')) failures.push(`${tag}: cost list lacks the build price`);
  if (!/Half to start, which holds your spot, and half at launch/.test(costs)) failures.push(`${tag}: cost list lacks how paying works`);
  if (!because.includes(rangeWords(range(picks)) + ' without care')) failures.push(`${tag}: the without-care estimate isn't ${rangeWords(range(picks))}: "${because.slice(0, 140)}"`);
  if (!/Care is \$69 a month, or \$690 a year if you pay yearly/.test(because)) failures.push(`${tag}: the reason lacks the care price`);
  if (care === 'care') {
    if (!costs.includes('$69 a month, or $690 a year (two months free)')) failures.push(`${tag}: cost list lacks the care price`);
    if (!costs.includes('Founding clients: $35 a month, or $350 a year')) failures.push(`${tag}: cost list lacks the founding care price`);
    if (!/I make your changes whenever you ask/.test(costs + points)) failures.push(`${tag}: care doesn't say changes come whenever you ask`);
    if (!/reply within 2 business days/.test(points)) failures.push(`${tag}: care points lack the reply time`);
    if (!/Anything big, like a new page, I’ll quote first/.test(points)) failures.push(`${tag}: care points don't say big jobs are quoted first`);
    if (!/up to 1,000 subscribers/.test(costs)) failures.push(`${tag}: cost list lacks the newsletter limit`);
    if (!/Billing starts after your 30 days of settling in, not at launch/.test(costs)) failures.push(`${tag}: cost list lacks when care billing starts`);
    if (!/always free, with or without care/.test(careAlso)) failures.push(`${tag}: care lacks the free-fixes promise`);
    // under the monthly price it's honest about being close; below the yearly price it names the difference
    if (paygMid(picks) < CARE_YEAR && !/^It’s a close call\./.test(because)) failures.push(`${tag}: a close call isn't called one`);
    if (paygMid(picks) < CARE_PREPAID && !/a year more than going without/.test(because)) failures.push(`${tag}: care costs more here but the difference isn't named`);
  } else {
    if (!/^Send one email with everything you’d like changed, and I’ll reply with a price before I start \(\$100 an hour\)/.test(points)) failures.push(`${tag}: points don't say one email, a price before I start, $100 an hour`);
    if (!/Most small changes, like new hours, a price or a photo, come to about \$25 to \$50/.test(points)) failures.push(`${tag}: points don't say most small changes come to about $25 to $50`);
    if (!/Anything big is quoted the same way, and nothing starts until you say yes/.test(points)) failures.push(`${tag}: points don't say big jobs are quoted the same way`);
    // the range and the rate never split across lines ("$25 / to $50", "$100 / an hour")
    if (!/\$25\u00a0to\u00a0\$50/.test($('r-care-points').rawText) || !/\$100\u00a0an\u00a0hour/.test($('r-costs').rawText)) failures.push(`${tag}: "$25 to $50" or "$100 an hour" can split across lines`);
    if (!costs.includes('About $25 to $50 a change, quoted first ($100 an hour). At the pace you described, that’s ' + rangeWords([PER_YEAR[picks[3]][0] * CHANGE, PER_YEAR[picks[3]][1] * CHANGE]))) failures.push(`${tag}: cost list lacks the changes estimate`);
    if (!/about \$12 a year/.test(costs)) failures.push(`${tag}: cost list lacks the web address renewal`);
    if (!/\$69 a month, or \$690 a year/.test(careAlso)) failures.push(`${tag}: doesn't say care is there anytime, with its price`);
    if (picks[4] > 0 && !/The extras you wanted/.test(costs)) failures.push(`${tag}: the extras they wanted aren't priced`);
    // a "one bill" wish that the math doesn't support is named, with the difference;
    // a cost-minded close call says which way it leans
    if (picks[5] === 1 && !/You said you’d like one bill/.test(because)) failures.push(`${tag}: a "one bill" wish isn't acknowledged`);
    if (paygMid(picks) >= CLOSE_CALL && !/^It’s a close call\./.test(because)) failures.push(`${tag}: a close call isn't called one`);
    if (picks[5] === 0 && paygMid(picks) >= CLOSE_CALL && !/care starts to win/.test(because)) failures.push(`${tag}: cost-minded close call doesn't say which way it leans`);
  }
  if (picks[2] === 2 && !/booking app you already use/.test(costs)) failures.push(`${tag}: booking-app cost line missing`);
  if (build === 'Crone' && !/about 3% \+ 30¢ per payment \(it varies a little by payment company\)/.test(costs)) failures.push(`${tag}: Crone cost list lacks the payment fee`);
  // hosting is free, and if that ever changed Taya would move the site for free
  if (!/Free, forever\. If that ever changed, I’d move your site for free/.test(costs)) failures.push(`${tag}: hosting line lacks the free-move promise`);
  if (!/Fixes for my mistakes: Always free/.test(costs)) failures.push(`${tag}: cost list lacks free fixes`);

  // the result's words stay clean
  const text = ['r-build-what', 'r-build-founding', 'r-build-ready', 'r-build-because', 'r-build-points', 'r-build-also',
    'r-care-name', 'r-care-because', 'r-care-points', 'r-care-also', 'r-costs', 'r-start'].map((id) => $(id).textContent).join(' | ');
  for (const re of FORBIDDEN) if (re.test(text)) failures.push(`${tag}: result text contains ${re}`);

  // the intake link carries the build and the care leaning
  const href = $('r-start').href;
  if (href !== `intake.html?plan=${build}&care=${care}`) failures.push(`${tag}: start link is ${href}`);

  const bKey = picks.slice(0, 3).map((p, qi) => short(qi, p)).join(' / ');
  if (!buildRows.has(bKey)) buildRows.set(bKey, build);
  const cKey = picks.slice(3).map((p, qi) => short(qi + 3, p)).join(' / ');
  if (!careRows.has(cKey)) careRows.set(cKey, `${care === 'care' ? 'Care' : 'Without care'} (without care ~$${paygMid(picks)}/yr)`);
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

console.log('BUILD (questions 1 to 3)');
for (const [k, v] of buildRows) console.log(`  ${k.padEnd(96)} -> ${v}`);
console.log('\nAFTER LAUNCH (questions 4 to 6)');
for (const [k, v] of careRows) console.log(`  ${k.padEnd(96)} -> ${v}`);
console.log('\nTotals:', Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', '));

if (failures.length) {
  console.log(`\nFAIL (${failures.length})`);
  failures.slice(0, 40).forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log('\nPASS: every path checked');
