// Runs the real quiz script from quiz.html against a tiny fake page, clicks through every
// possible answer path, and checks the recommendation.
//
//   node _tests/quiz-paths.test.mjs
//
// Pricing as of Oct 5 2026 (web-faery-kit/pricing-oct2026.md): a subscription comes with every site and matches the
// build (called "care" until Oct 6 2026).
// The BUILD comes from what the site needs to do (questions 1 to 3), plus email and a newsletter (question 4),
// following the sheet's "Small rules decided Oct 5 2026" and its booking ladder (rule 1, Oct 6 2026 afternoon,
// Pollen: "yes add the booking link to planted"):
//   In Bloom if anything takes payments: booking with payments or deposits, or selling (rule 5)
//   Tended   if they'd like simple booking set up for them: a free Cal.com in their name, which Taya sets up with
//            Tended and In Bloom (rule 1), or have "Quite a bit" to say, or want the site to gather something
//            (forms and other pieces that take no bookings or payments are Tended; rule 4), or want email from
//            their own address or a newsletter (both come with Tended and In Bloom; no side add-ons for Planted)
//   Planted  otherwise: people call, text or email them, and a Book button opens the booking app they already
//            use, if they have one (rule 1: that comes with every build, so it doesn't lift the build on its own)
// The booking question's answers are sorted by their words, not their order, so splitting or rewording one
// doesn't break this test: "already use" is their own app; payments, deposits, selling, a shop, gift
// certificates or orders take payments; any other booking answer is booking set up for them.
// Also: no line ties booking (without payments) to In Bloom (rule 1), and Planted never shows the Instagram
// feed (Tended and up; rule 6). Every build's subscription list ends with the lines every plan includes (Pollen,
// Oct 6 2026), in the same words as the "Every plan" card on webfaery.love.
// The subscription is always the build's own: Planted $12, Tended $45, In Bloom $90 a month.
// Also fails (exit 1) if focus doesn't land on the new question / the result, if a price is wrong,
// if the intake link loses the build, or if an old name, price or rule (Maiden / Mother / Crone, $69, $35,
// pay as you go, $100 an hour, a yearly or optional subscription), the old name "care" for the subscription
// ("Tended care", "then care"), a trade or a dash sneaks in,
// or a side cost "paid by you" (like the old $3 a month for own-address email on Planted).
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
  // no-break spaces (the quiz keeps "$1,200 once" and the like on one line) read as plain spaces
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
const usd = (n) => '$' + n.toLocaleString('en-US');
// what every plan's subscription also includes (Pollen, Oct 6 2026; pricing-oct2026.md), word for word as on the main page
const EVERY_PLAN = ['Email me anytime and I make your changes', 'Changes usually within 2 business days',
  'I watch over your site: if it goes down, I know before you do, and if anything breaks, I fix it',
  'Holiday heads-ups, with your hours updated on your site and your Google profile', 'If a host changes its rules, moving your site is on me'];
const failures = [];

// find each question by its words, and sort its answers by their words
const words = (a) => a.t + ' ' + (a.sub || '');
const findQ = (re, what) => {
  const i = QUESTIONS.findIndex((q) => re.test(q.title));
  if (i < 0) { console.log(`FAIL: no ${what} question (the test finds it by its title)`); process.exit(1); }
  return i;
};
const Q_SAY = findQ(/how much do you have to tell/i, '"how much to tell"');
const Q_GATHER = findQ(/gather/i, '"gather anything"');
const Q_BOOK = findQ(/\bbook\b/i, '"book or pay"');
const Q_MAIL = findQ(/own address|newsletter/i, '"own address or newsletter"');
const sortAnswers = (qi, sorter) => QUESTIONS[qi].answers.map((a, i) => {
  const k = sorter(a);
  if (!k) failures.push(`question ${qi + 1}, answer ${i + 1} ("${a.t}"): the test doesn’t know what it means; teach the sorter in this file`);
  return k || {};
});
const SAY = sortAnswers(Q_SAY, (a) => (/quite a bit/i.test(a.t) ? { lots: true } : /essentials/i.test(a.t) ? { lots: false } : null));
const GATHER = sortAnswers(Q_GATHER, (a) => (/^yes/i.test(a.t) ? { yes: true } : /^(?:no|not sure)/i.test(a.t) ? { yes: false } : null));
const BOOK = sortAnswers(Q_BOOK, (a) => {
  const s = words(a);
  if (/^(?:no|maybe|not)\b/i.test(a.t)) return { kind: 'none' };
  if (/already use/i.test(s)) return { kind: 'own' };
  if (/pay|deposit|sell|shop|gift|order/i.test(s)) return { kind: 'pay', booking: /\bbook/i.test(s) };
  if (/\bbook|cal\.com/i.test(s)) return { kind: 'setup' };
  return null;
});
const MAIL = sortAnswers(Q_MAIL, (a) => {
  if (/^no\b/i.test(a.t)) return { own: false, news: false };
  if (/^both/i.test(a.t)) return { own: true, news: true };
  if (/own address/i.test(a.t)) return { own: true, news: false };
  if (/newsletter/i.test(a.t)) return { own: false, news: true };
  return null;
});
// rule 1: someone who wants simple booking (no payments) gets a free Cal.com set up for them, with Tended
for (const k of ['own', 'setup', 'pay']) {
  if (!BOOK.some((b) => b.kind === k)) failures.push(`quiz.html: the booking question has no answer for ${{
    own: 'a booking app they already use',
    setup: 'simple booking set up for them with no payments (a free Cal.com in their name comes with Tended and In Bloom; rule 1, Oct 5 2026)',
    pay: 'taking payments (deposits, selling, a shop)' }[k]}`);
}

const expectBuild = (p) => {
  const b = BOOK[p[Q_BOOK]], m = MAIL[p[Q_MAIL]];
  if (b.kind === 'pay') return 'In Bloom';
  // (Oct 6 2026 afternoon: 'own', a booking app they already use, no longer lifts the build to Tended on its own)
  if (b.kind === 'setup' || SAY[p[Q_SAY]].lots || GATHER[p[Q_GATHER]].yes || m.own || m.news) return 'Tended';
  return 'Planted';
};
// a sentence that sends booking to In Bloom without any payment in it (simple booking is Tended now; rule 1)
const BOOKING_TO_BLOOM = (sentence) => /\bbooking\b/i.test(sentence) && /In Bloom/.test(sentence) && !/pay|deposit|sell|shop/i.test(sentence);

// words that must never appear: old names, prices and rules, "care" as the subscription's old name (the word
// "subscription" itself is welcome since Oct 6 2026), trades, dashes
const FORBIDDEN = [/\bMaiden\b/, /\bMother\b/, /\bCrone\b/, /\$69\b/, /\$690/, /\$35\b/, /\$350/, /\$49\b/, /\$490/,
  /pay(?:ing)? as you go/i, /without care/i, /an hour/i, /per hour/i, /\$25 to \$50/, /quick change/i, /update session/i,
  /a year\b[^.]{0,20}care/i, /two months free/i, /care is optional/i, /optional care/i, /skip (?:it|care)/i,
  /subscription is optional/i, /optional subscription/i, /skip (?:the |your )?subscription/i,
  /\b(?:Planted|Tended|In Bloom) care\b/i, /\bcare comes with every site/i, /\bthen care\b/i, /\bstop care\b/i, /\btrad(?:e|es|ed|ing)\b/i, /\bon call\b/i, /\bchat\b/i, /—/, /–/, /&mdash;/, /&ndash;/, /\$-/, /NaN|undefined/,
  /paid by you/i, /\$3 a month/i, /looked after if you like/i, /Let’s talk/, /booking fully set up for you/i];
const visible = html
  .replace(/<script[\s\S]*?<\/script>/g, (m) => (m.includes('quiz-logic') ? m.replace(/\/\/.*$/gm, '') : ''))
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');
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
  const book = BOOK[picks[Q_BOOK]], mail = MAIL[picks[Q_MAIL]];
  if (build !== expectBuild(picks)) failures.push(`${tag}: build ${build}, expected ${expectBuild(picks)}`);
  if ((book.kind === 'pay') !== (build === 'In Bloom')) failures.push(`${tag}: In Bloom must mean taking payments (booking with payments or deposits, or selling; rule 5)`);

  const [full, founding, care] = PRICES[build] || [0, 0, 0];
  if ($('r-build-price').textContent !== usd(full)) failures.push(`${tag}: build price shows ${$('r-build-price').textContent}`);
  if (!$('r-build-founding').textContent.includes(usd(founding))) failures.push(`${tag}: founding price missing`);
  const careName = $('r-care-name').textContent;
  if (!careName.endsWith(`${build} subscription, ${usd(care)} a month`)) failures.push(`${tag}: subscription heading is "${careName}"`);
  const costs = $('r-costs').textContent;
  const because = $('r-care-because').textContent;
  const careAlso = $('r-care-also').textContent;
  if (!costs.includes(usd(full) + ' once')) failures.push(`${tag}: cost list lacks the build price`);
  if (!/Half to start, which holds your spot, and half at launch/.test(costs)) failures.push(`${tag}: cost list lacks how paying works`);
  if (!costs.includes(`Subscription: ${usd(care)} a month, starting after your 30 days of settling in`)) failures.push(`${tag}: cost list lacks the subscription price`);
  if (!/Every site comes with a subscription/.test(because)) failures.push(`${tag}: doesn't say every site comes with a subscription`);
  if (!/as often as you need/.test(careAlso)) failures.push(`${tag}: changes as often as they need missing`);
  // what every plan's subscription also includes (Oct 6 2026): the reply time and the watching-over line live in this list now
  const carePoints = $('r-care-points').children.map((li) => li.textContent);
  for (const line of EVERY_PLAN) if (!carePoints.includes(line)) failures.push(`${tag}: the subscription list lacks "${line}"`);
  if (!/Big new things, like a new page, I quote first/.test(careAlso)) failures.push(`${tag}: big things aren't quoted first`);
  if (!/If you ever cancel your subscription, your site is still yours, and I hand you every file and login/.test(careAlso)) failures.push(`${tag}: the hand-over promise is missing`);
  if (book.kind === 'own' && !/booking app you already use/.test(costs)) failures.push(`${tag}: booking-app cost line missing`);
  if (build === 'In Bloom' && !/about 2\.9% \+ 30¢ per payment/.test(costs)) failures.push(`${tag}: In Bloom cost list lacks the payment fee`);
  // the newsletter list lives in their own Buttondown account, with no helper (Oct 5 2026)
  if (/newsletter[^.]{0,80}helper|helper[^.]{0,80}newsletter/i.test(costs)) failures.push(`${tag}: the newsletter is listed with helper access`);
  if (mail.news && !/newsletter list is yours too, in your own Buttondown account/.test(costs)) failures.push(`${tag}: doesn't say the newsletter list lives in their own Buttondown account`);
  // the account setup flow (pricing-oct2026.md, Oct 5 2026): Taya makes their Buttondown and a new Cal.com with
  // their email and hands them over at launch (Cal.com with Tended and In Bloom; rule 1); a booking app they
  // already use is never "set up" by her
  const calcom = book.kind === 'setup' || (book.kind === 'pay' && book.booking);
  if ((mail.news || calcom) && !/I set (?:both )?up with your email and hand you(?: the logins)? at launch|which I set up with your email and hand you at launch/.test(costs)) failures.push(`${tag}: doesn't say I set up their Buttondown or Cal.com with their email and hand it over at launch`);
  if (calcom && !/booking lives in your own Cal\.com account/.test(costs)) failures.push(`${tag}: booking set up for them doesn't say their booking lives in their own Cal.com account`);
  if (book.kind === 'own' && /I set (?:it|both) up|I set up[^.]{0,30}booking/i.test(costs.replace(/newsletter list[^.]*\./g, ''))) failures.push(`${tag}: says I set up booking for someone who keeps their own app`);
  // fixes are part of the subscription, said without "free" (Oct 6 2026)
  if (!/Fixes: If anything breaks, I fix it, as part of your subscription\./.test(costs)) failures.push(`${tag}: cost list lacks the fixes line`);
  if (/Fixes:[^|]*\bfree\b/i.test(costs.split('Fixes:').slice(1).map((s) => 'Fixes:' + s).join('|'))) failures.push(`${tag}: the fixes line says "free"`);

  const text = ['r-build-what', 'r-build-founding', 'r-build-ready', 'r-build-because', 'r-build-points', 'r-build-also',
    'r-care-name', 'r-care-because', 'r-care-points', 'r-care-also', 'r-costs', 'r-start'].map((id) => $(id).textContent).join(' | ');
  for (const re of FORBIDDEN) if (re.test(text)) failures.push(`${tag}: result text contains ${re}`);
  // rule 1 (the booking ladder): someone who keeps their own booking app hears that their Book button opens it
  if (book.kind === 'own' && !/Book (?:now )?button[^.|]*(?:booking )?app you already use/.test(text)) failures.push(`${tag}: doesn't say their Book button links to the booking app they already use`);
  // rule 1: simple booking comes with Tended, so no line sends booking (with no payments in it) to In Bloom
  for (const s of text.split(/(?<=[.!?])\s+|\s\|\s/)) {
    if (BOOKING_TO_BLOOM(s)) failures.push(`${tag}: ties booking to In Bloom (Cal.com booking comes with Tended and In Bloom): "${s.trim().slice(0, 110)}"`);
  }
  // rule 6: the Instagram feed is Tended and up
  if (build === 'Planted' && /Instagram/.test(text)) failures.push(`${tag}: Planted mentions the Instagram feed (Tended and up)`);
  // rule 1 (the booking ladder, Oct 6 2026 afternoon): a Planted page says people call, text or email, and its
  // Book button opens the booking app they already use, only when they have one (Cal.com set up for them is Tended)
  const planted = $('r-build-points').textContent;
  if (build === 'Planted' && !/call, text or email/.test(planted)) failures.push(`${tag}: Planted doesn't say people call, text or email`);
  if (build === 'Planted' && book.kind === 'own' && !/A Book button that opens the booking app you already use/.test(planted)) failures.push(`${tag}: Planted with their own booking app doesn't list the Book button that opens it`);
  if (build === 'Planted' && book.kind !== 'own' && /Book (?:now )?button/i.test(planted)) failures.push(`${tag}: Planted lists a Book button for someone with no booking app`);
  if (build === 'Planted' && /Cal\.com[^.|]*(?:Planted|comes with your)/i.test(text)) failures.push(`${tag}: Planted ties a Cal.com set up for them to Planted (it comes with Tended and In Bloom)`);

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
