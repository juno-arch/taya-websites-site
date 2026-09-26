// Runs the real script from quiz.html against a tiny fake page, clicks through every
// possible answer path, and prints the plan each one recommends.
//
//   node _tests/quiz-paths.test.mjs
//
// Fails (exit 1) if Crone is ever recommended without a "Yes" to booking, if a booking
// path gets anything but Crone, if a "That week" path without booking gets anything but
// the plain Mother result, or if focus doesn't land on the new question / the result.
// (Folders starting with "_" are not published by GitHub Pages.)

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'quiz.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ---- a fake page, just big enough for quiz.html's script ----
class El {
  constructor(tag, id) {
    this.tag = tag; this.id = id || ''; this.children = []; this.listeners = {};
    this.hidden = false; this.style = {}; this._text = ''; this._html = ''; this.href = '';
    const cls = new Set();
    this.classList = {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c),
      toggle: (c, on) => ((on === undefined ? !cls.has(c) : on) ? cls.add(c) : cls.delete(c)),
    };
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text; }
  set innerHTML(v) { this._html = String(v); this._text = this._html.replace(/<[^>]+>/g, ' '); this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach((fn) => fn({ target: this })); }
  focus() { document.activeElement = this; }
}
const ids = {};
const document = {
  activeElement: null,
  getElementById: (id) => (ids[id] ||= new El('div', id)),
  querySelector: (sel) => (ids['sel:' + sel] ||= new El('a', sel)),
  createElement: (tag) => new El(tag),
};
const window = { scrollTo() {} };
const ctx = vm.createContext({ document, window, encodeURIComponent });
vm.runInContext(script, ctx);

const QUESTIONS = vm.runInContext('QUESTIONS', ctx);
const RESULTS = vm.runInContext('RESULTS', ctx);
const $ = (id) => document.getElementById(id);

// ---- the rule as it was before this change, only to show what moved ----
function oldRule(picks) {
  const score = { planted: 0, tended: 0, bloom: 0 };
  picks.forEach((p, qi) => { const s = QUESTIONS[qi].answers[p].s; for (const k in s) score[k] += s[k]; });
  return score.bloom >= 3 ? 'bloom' : (score.tended >= score.planted ? 'tended' : 'planted');
}

// ---- every combination of answers ----
const combos = [[]];
for (const q of QUESTIONS) {
  const next = [];
  for (const c of combos) for (let i = 0; i < q.answers.length; i++) next.push([...c, i]);
  combos.splice(0, combos.length, ...next);
}

const short = (t) => {
  let s = t.split(/[.,]/)[0];
  if (s.length > 26) s = s.split(':')[0];
  return s.slice(0, 26);
};
const failures = [];
const tally = {};
const moved = [];
let noBookingCrone = 0;

console.log(`Question count shown to visitors: ${QUESTIONS.length}`);
console.log(`Checking ${combos.length} answer paths\n`);
console.log(['#', ...QUESTIONS.map((_, i) => 'Q' + (i + 1))].join(' | ') + ' | Recommendation');

combos.forEach((picks, n) => {
  if ($('result').classList.contains('show')) $('retake').click();
  picks.forEach((p, qi) => {
    const buttons = $('q-answers').children;
    if (buttons.length !== QUESTIONS[qi].answers.length) failures.push(`path ${n + 1}: question ${qi + 1} shows ${buttons.length} answers`);
    buttons[p].click();
    const last = qi === picks.length - 1;
    const want = last ? 'r-name' : 'q-title';
    if (!document.activeElement || document.activeElement.id !== want) failures.push(`path ${n + 1}: after question ${qi + 1}, focus is on ${document.activeElement && document.activeElement.id}, expected ${want}`);
  });
  if (!$('result').classList.contains('show')) failures.push(`path ${n + 1}: result never shown`);

  const name = $('r-name').textContent;
  const also = $('r-also').textContent;
  const labels = picks.map((p, qi) => short(QUESTIONS[qi].answers[p].t));
  console.log([String(n + 1).padStart(3), ...labels.map((l) => l.padEnd(26))].join(' | ') + ' | ' + name);
  tally[name] = (tally[name] || 0) + 1;

  const wantsBooking = picks[1] >= 2; // "Yes: booking, please" or "Yes: booking AND payments"
  const sameWeek = picks[2] === 2;    // "That week, while it's still relevant"
  if (!wantsBooking && name === RESULTS.bloom.name) { noBookingCrone++; failures.push(`path ${n + 1}: Crone without booking`); }
  if (wantsBooking && name !== RESULTS.bloom.name) failures.push(`path ${n + 1}: wants booking but got ${name}`);
  if (!wantsBooking && sameWeek) {
    if (name !== RESULTS.tended.name) failures.push(`path ${n + 1}: same-week, no booking, got ${name}`);
    if (also !== RESULTS.tended.also) failures.push(`path ${n + 1}: same-week, no booking, extra text added: "${also}"`);
  }
  if (also !== RESULTS[Object.keys(RESULTS).find((k) => RESULTS[k].name === name)].also) failures.push(`path ${n + 1}: result text changed`);
  const before = RESULTS[oldRule(picks)].name;
  if (before !== name) moved.push(`${labels.join(' / ')}: ${before} -> ${name}`);
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
console.log(`Crone results on paths that said No / Maybe to booking: ${noBookingCrone}`);
console.log(`\nPaths whose recommendation changed from the old rule (${moved.length}):`);
moved.forEach((m) => console.log('  ' + m));

if (failures.length) {
  console.log(`\nFAIL (${failures.length})`);
  failures.slice(0, 40).forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log('\nPASS: every path checked');
