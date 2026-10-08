// Private sessions with Taya (book.html), built Oct 8 2026.
//
// Two ways in, read once from the part of the address after #, which stays in the browser:
//   book.html#k=<their magic key>      book a session (pick a session, a day, a time, a short note)
//   book.html#m=<booking id>.<token>   change or cancel one booking (the link in their booking emails)
// Without a good key: one kind line saying the page is for Web Faery clients, nothing else.
// Every answer comes from the bookings server (webfaery-booking.pb.js). The key is held in memory only:
// nothing is saved in the browser and nothing goes in the address's query.
(function () {
  'use strict';

  const SERVER = 'https://bookings.gardenfaery.love';
  const BASE = SERVER + '/api/webfaery/book';
  const TZ = 'America/Los_Angeles';
  const KEY_RE = /^[A-Za-z0-9]{24,64}$/;
  const MANAGE_RE = /^[a-z0-9]{15}\.[a-f0-9]{64}$/;
  const NOTE_MAX = 1000;
  const MAIL = 'taya@webfaery.love';

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };

  // ---------------------------------------------------------------- what we know so far (memory only)
  const S = {
    mode: '',          // 'book' or 'manage'
    k: '',             // their magic key
    m: '',             // a manage link (id.token)
    start: null,       // the /start answer
    type: null,        // the picked session type { id, name, minutes }
    slots: null,       // the /slots (or /manage-slots) answer
    day: null,         // the picked day { date, label, times }
    time: null,        // the picked time { at, label }
    nonce: '',         // made once per visit to the note step
    booking: null,     // the booking being changed (manage mode)
    retry: null,       // what Try again does
    busy: false,       // one request at a time
  };

  // ---------------------------------------------------------------- showing one step at a time
  const STATES = ['loading', 'nokey', 'type', 'day', 'time', 'note', 'done', 'toomany', 'slow', 'error',
    'manage', 'confirm', 'move', 'moved', 'canceled', 'wascanceled', 'started'];
  function show(state, opts) {
    const o = opts || {};
    for (const s of STATES) {
      const sec = $('s-' + s);
      if (sec) sec.hidden = s !== state;
    }
    document.body.setAttribute('data-state', state);
    const h = $('h-' + state);
    if (h) {
      if (o.focus !== false) {
        try { h.focus({ preventScroll: true }); } catch (_) { h.focus(); }
      }
      window.scrollTo(0, 0);
      say(o.say || h.textContent);
    }
  }
  function say(text) {
    const live = $('live');
    live.textContent = '';
    window.setTimeout(() => { live.textContent = text; }, 60);
  }
  function notice(id, text) {
    const n = $(id);
    n.textContent = text || '';
    n.hidden = !text;
  }

  // ---------------------------------------------------------------- talking to the server
  // { ok: true, data } or { ok: false, status, data } ; status 0 = no answer at all
  async function post(path, body) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? window.setTimeout(() => ctl.abort(), 20000) : 0;
    try {
      const r = await fetch(BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: ctl ? ctl.signal : undefined,
      });
      let data = null;
      try { data = await r.json(); } catch (_) { data = null; }
      if (r.ok && data && data.ok) return { ok: true, status: r.status, data };
      return { ok: false, status: r.status, data: data || {} };
    } catch (_) {
      return { ok: false, status: 0, data: {} };
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }
  const code = (res) => (res && res.data && typeof res.data.error === 'string' ? res.data.error : '');

  // the answers every step treats the same way; true when it was handled here
  function common(res, again) {
    const c = code(res);
    if (res.status === 401 || c === 'bad_link' || c === 'bad_manage') { show('nokey'); return true; }
    if (res.status === 429 || c === 'slow_down') {
      const n = Math.max(1, Math.round(Number(res.data.retry_minutes) || 10));
      $('slow-words').textContent = 'Please try again in ' + n + (n === 1 ? ' minute.' : ' minutes.');
      show('slow');
      return true;
    }
    if (res.status === 0 || res.status >= 500 || c === 'not_ready' || c === 'server' || c === 'origin' || res.status === 403) {
      S.retry = again;
      show('error');
      return true;
    }
    return false;
  }

  // a button that waits for its answer: disabled, busy, one request at a time
  async function busy(btn, fn) {
    if (S.busy) return;
    S.busy = true;
    const btns = btn ? [].concat(btn) : [];
    btns.forEach((b) => { b.disabled = true; b.setAttribute('aria-busy', 'true'); });
    try { await fn(); } finally {
      S.busy = false;
      btns.forEach((b) => { b.disabled = false; b.removeAttribute('aria-busy'); });
    }
  }

  // ---------------------------------------------------------------- times, in Pacific and in theirs
  const visitorTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) { return ''; } })();
  function fmt(ms, tz, opts) {
    try { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, opts)).format(new Date(ms)); } catch (_) { return ''; }
  }
  const hm = { hour: 'numeric', minute: '2-digit' };
  // "1:00 PM your time" (with the day when theirs is a different day), or '' when they are on Pacific time too
  function yourTime(at, pacificDate) {
    const ms = Date.parse(at);
    if (!visitorTz || !isFinite(ms)) return '';
    const mine = fmt(ms, visitorTz, hm), pac = fmt(ms, TZ, hm);
    const myDate = fmt(ms, visitorTz, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const pacDate = fmt(ms, TZ, { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!mine || (mine === pac && myDate === pacDate)) return '';
    const day = myDate !== pacDate ? ' ' + fmt(ms, visitorTz, { weekday: 'short' }) : '';
    return mine + day + ' your time';
  }
  // "Tuesday, October 13 at 10:00 AM", when the server did not send words for it
  function longWhen(at) {
    const ms = Date.parse(at);
    if (!isFinite(ms)) return '';
    return fmt(ms, TZ, { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + fmt(ms, TZ, hm);
  }
  const pacific = (when) => (when ? when + ' Pacific time' : '');

  function sum(id, rows) {
    const dl = $(id);
    dl.textContent = '';
    for (const [k, v] of rows) {
      if (!v) continue;
      dl.append(el('dt', '', k), el('dd', '', v));
    }
  }

  // ================================================================= book mode
  async function loadStart(focusType) {
    show('loading', { focus: false });
    const res = await post('/start', { k: S.k });
    if (!res.ok) { if (!common(res, () => loadStart(focusType))) { S.retry = () => loadStart(focusType); show('error'); } return; }
    S.start = res.data;
    renderType();
    show('type');
  }

  function renderType() {
    const d = S.start || {};
    const first = d.client && d.client.first_name ? String(d.client.first_name) : '';
    const owner = d.owner && d.owner.name ? String(d.owner.name) : 'Taya';
    $('type-hi').textContent = first ? 'Hi ' + first : 'Hi there';
    $('type-lede').textContent = 'Time together on a shared screen, just you and ' + owner + '. Pick the one that fits.';
    const list = $('type-list');
    list.textContent = '';
    const types = Array.isArray(d.types) ? d.types : [];
    for (const t of types) {
      const b = el('button', 'b-pick', t.name);
      b.type = 'button';
      b.addEventListener('click', () => pickType(t, b));
      list.append(b);
    }
    if (!types.length) list.append(el('p', 'soft', 'There are no sessions to pick right now. Write to me at ' + MAIL + '.'));
    const up = Array.isArray(d.upcoming) ? d.upcoming : [];
    const ul = $('upcoming-list');
    ul.textContent = '';
    for (const u of up) {
      const li = el('li');
      li.append(el('span', '', pacific(u.when || longWhen(u.starts_at))), el('span', 't', u.type_name || ''));
      if (u.manage && MANAGE_RE.test(u.manage)) {
        const a = el('a', '', 'Change or cancel');
        a.href = '#m=' + u.manage;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          openManage(u.manage, true);
        });
        li.append(a);
      }
      ul.append(li);
    }
    $('upcoming').hidden = !up.length;
  }

  function pickType(t, btn) {
    busy([...document.querySelectorAll('#type-list .b-pick')], async () => {
      S.type = t;
      await loadSlots(null);
    });
  }

  // fetch open times for the picked type; then = 'taken' shows the kind notice
  async function loadSlots(then) {
    const res = S.mode === 'manage'
      ? await post('/manage-slots', { m: S.m })
      : await post('/slots', { k: S.k, type: S.type && S.type.id });
    if (!res.ok) {
      const c = code(res);
      if (S.mode === 'manage' && c === 'canceled') { show('wascanceled'); return; }
      if (S.mode === 'manage' && c === 'started') { show('started'); return; }
      if (c === 'not_found') { await loadStart(); return; }
      if (!common(res, () => loadSlots(then))) { S.retry = () => loadSlots(then); show('error'); }
      return;
    }
    S.slots = res.data;
    if (res.data.type) S.type = res.data.type;
    const days = Array.isArray(res.data.days) ? res.data.days : [];
    if (then === 'taken' && S.day) {
      const same = days.find((x) => x.date === S.day.date && x.times && x.times.length);
      if (same) {
        S.day = same;
        renderTime();
        notice('time-notice', 'Someone just took that time. Here are the times still open.');
        show('time', { say: 'Someone just took that time. Here are the times still open.' });
        return;
      }
    }
    renderDay();
    notice('day-notice', then === 'taken' ? 'Someone just took that time. Here are the times still open.' : '');
    show('day', then === 'taken' ? { say: 'Someone just took that time. Here are the times still open.' } : undefined);
  }

  function renderDay() {
    const days = (S.slots && Array.isArray(S.slots.days)) ? S.slots.days : [];
    $('day-kicker').textContent = S.mode === 'manage' ? 'A new time' : (S.type ? S.type.name : '');
    const grid = $('day-grid');
    grid.textContent = '';
    let open = 0;
    for (const d of days) {
      const parts = String(d.label || '').split(', ');
      const has = Array.isArray(d.times) && d.times.length > 0;
      if (has) open++;
      const b = el('button', 'b-day');
      b.type = 'button';
      b.append(el('span', 'dw', parts[0] || ''), el('span', 'dd', parts[1] || d.label || ''));
      if (!has) {
        b.disabled = true;
        b.append(el('span', 'sr-only', ', full'));
      } else {
        b.addEventListener('click', () => { S.day = d; renderTime(); notice('time-notice', ''); show('time'); });
      }
      grid.append(b);
    }
    const empty = $('day-empty');
    if (!open) {
      const n = Math.max(1, days.length - 1);
      empty.textContent = 'No open times in the next ' + n + ' days. Write to me at ' + MAIL + ' and we’ll find one.';
    }
    empty.hidden = !!open;
    grid.hidden = !open;
  }

  function renderTime() {
    const d = S.day;
    $('time-kicker').textContent = d ? d.label : '';
    const list = $('time-list');
    list.textContent = '';
    for (const t of (d && d.times) || []) {
      const b = el('button', 'b-time');
      b.type = 'button';
      b.append(el('span', '', t.label));
      const yt = yourTime(t.at, d.date);
      if (yt) b.append(el('span', 'yt', yt));
      b.setAttribute('aria-label', t.label + ' Pacific time' + (yt ? ', ' + yt : ''));
      b.addEventListener('click', () => pickTime(t));
      list.append(b);
    }
  }

  function pickTime(t) {
    S.time = t;
    if (S.mode === 'manage') {
      sum('move-sum', [['Session', S.booking && S.booking.type_name], ['Day', S.day && S.day.label], ['Time', pacific(t.label)]]);
      show('move');
      return;
    }
    sum('note-sum', [['Session', S.type && S.type.name], ['Day', S.day && S.day.label], ['Time', pacific(t.label)]]);
    S.nonce = makeNonce();
    notice('note-err', '');
    show('note');
  }

  function makeNonce() {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += abc[b % abc.length];
    return s;
  }

  function noteCount() {
    const n = $('note-in').value.length;
    $('note-count').textContent = n + ' of ' + NOTE_MAX;
  }

  async function bookIt() {
    const btn = $('note-go');
    await busy([btn, $('note-back')], async () => {
      notice('note-err', '');
      const note = $('note-in').value.slice(0, NOTE_MAX);
      const res = await post('/create', { k: S.k, type: S.type.id, at: S.time.at, note, nonce: S.nonce });
      if (res.ok) {
        const b = res.data.booking || {};
        $('done-when').textContent = pacific(b.when || longWhen(b.starts_at));
        const video = !!(S.start && S.start.owner && S.start.owner.video);
        $('done-join').textContent = video ? 'The link to join is in your email.' : 'I’ll email you the link to join before we start.';
        $('note-in').value = '';
        noteCount();
        show('done');
        return;
      }
      const c = code(res);
      if (c === 'slot_taken') { await loadSlots('taken'); return; }
      if (c === 'too_many') { show('toomany'); return; }
      if (c === 'not_found') { await loadStart(); return; }
      if (c === 'input') {
        notice('note-err', res.data.field === 'note' ? 'That note is a little long. Could you trim it?' : 'Something in that didn’t go through. Please pick the time again.');
        return;
      }
      if (!common(res, bookIt)) { S.retry = bookIt; show('error'); }
    });
  }

  // ================================================================= manage mode
  async function openManage(m, fromBook) {
    S.mode = 'manage';
    S.m = m;
    $('manage-home-row').hidden = !(fromBook && S.k);
    show('loading', { focus: false });
    const res = await post('/manage', { m });
    if (!res.ok) { if (!common(res, () => openManage(m, fromBook))) { S.retry = () => openManage(m, fromBook); show('error'); } return; }
    const d = res.data;
    S.booking = d.booking || {};
    if (S.booking.status === 'canceled') { show('wascanceled'); return; }
    if (!d.can_change) { show('started'); return; }
    const first = d.client && d.client.first_name ? String(d.client.first_name) : '';
    $('manage-hi').textContent = first ? 'Hi ' + first : '';
    $('manage-hi').hidden = !first;
    sum('manage-sum', [
      ['Session', S.booking.type_name],
      ['When', pacific(S.booking.when || longWhen(S.booking.starts_at))],
      ['Your note', S.booking.note || ''],
    ]);
    show('manage');
  }

  async function moveIt() {
    await busy([$('move-go'), $('move-back')], async () => {
      const res = await post('/reschedule', { m: S.m, at: S.time.at });
      if (res.ok) {
        const b = res.data.booking || {};
        S.booking = Object.assign({}, S.booking, b);
        $('moved-when').textContent = 'Your new time is ' + pacific(b.when || longWhen(b.starts_at)) + '.';
        show('moved');
        return;
      }
      const c = code(res);
      if (c === 'slot_taken') { await loadSlots('taken'); return; }
      if (c === 'canceled') { show('wascanceled'); return; }
      if (c === 'started') { show('started'); return; }
      if (!common(res, moveIt)) { S.retry = moveIt; show('error'); }
    });
  }

  function askCancel() {
    const when = S.booking ? (S.booking.when || longWhen(S.booking.starts_at)) : '';
    $('h-confirm').textContent = 'Cancel ' + when + '?';
    notice('confirm-err', '');
    show('confirm');
  }

  async function cancelIt() {
    await busy([$('confirm-yes'), $('confirm-keep')], async () => {
      const res = await post('/cancel', { m: S.m });
      if (res.ok) { show('canceled'); return; }
      const c = code(res);
      if (c === 'started') { show('started'); return; }
      if (c === 'canceled') { show('wascanceled'); return; }
      if (!common(res, cancelIt)) { S.retry = cancelIt; show('error'); }
    });
  }

  function backToSessions() {
    S.mode = 'book';
    S.m = '';
    S.booking = null;
    loadStart();
  }

  // ================================================================= wiring
  function wire() {
    $('day-back').addEventListener('click', () => {
      if (S.mode === 'manage') show('manage'); else show('type');
    });
    $('time-back').addEventListener('click', () => { notice('day-notice', ''); renderDay(); show('day'); });
    $('note-back').addEventListener('click', () => show('time'));
    $('note-in').addEventListener('input', noteCount);
    $('note-go').addEventListener('click', bookIt);
    $('done-again').addEventListener('click', () => { S.type = null; S.day = null; S.time = null; loadStart(); });
    $('toomany-back').addEventListener('click', () => loadStart());
    $('error-again').addEventListener('click', () => {
      // the step being tried again guards itself (one request at a time), so this only dims the button
      if (S.busy) return;
      const again = S.retry || boot, b = $('error-again');
      b.disabled = true;
      Promise.resolve(again()).finally(() => { b.disabled = false; });
    });
    $('manage-move').addEventListener('click', () => busy([$('manage-move'), $('manage-cancel')], () => loadSlots(null)));
    $('manage-cancel').addEventListener('click', askCancel);
    $('manage-home').addEventListener('click', backToSessions);
    $('confirm-yes').addEventListener('click', cancelIt);
    $('confirm-keep').addEventListener('click', () => show('manage'));
    $('move-go').addEventListener('click', moveIt);
    $('move-back').addEventListener('click', () => show('time'));
  }

  function boot() {
    const h = String(location.hash || '').replace(/^#/, '');
    const k = /^k=(.*)$/.exec(h);
    const m = /^m=(.*)$/.exec(h);
    if (k && KEY_RE.test(k[1])) {
      S.mode = 'book'; S.k = k[1];
      return loadStart();
    }
    if (m && MANAGE_RE.test(m[1])) {
      return openManage(m[1], false);
    }
    show('nokey');
    return Promise.resolve();
  }

  function init() {
    wire();
    boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
