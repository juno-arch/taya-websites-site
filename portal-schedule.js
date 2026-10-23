/* The owner's Schedule tab in the portal's Bookings (Oct 22 2026): a Day and Week hour grid of her visits, with Move, Cancel and Book for a client.
   Ported in spirit from Pollen's own Studio calendar. Its own file beside portal.js: portal.js gives it a small bridge (window.WFBk: call, select,
   data, toast) and tells it when the tab opens (WFSchedule.show) and when the overview reloads ('wf-bk-updated'). Server routes (the client's own
   session): POST bookings/week, book-slots, book-for, slots, move, cancel. The browser does NO time zone math: every event comes with its date and
   minutes in the owner's zone, and dates here are plain YYYY-MM-DD strings moved by whole days. Drawn with createElement and textContent only,
   one delegated click listener. Nothing here sends anything by itself. */
(() => {
  'use strict';
  const GRID_FROM = 7 * 60, GRID_TO = 20 * 60, ROW_H = 44;          // 7 AM to 8 PM, 44px an hour
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const root = () => document.getElementById('sch-root');
  let view = 'week';
  let anchor = '';
  let today = '';
  let nowMin = 0;
  let data = null;
  let busy = 0;
  let picked = null;
  let built = false;

  // ---------------------------------------------------------------- dates (whole days)
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => ({ y: +d.slice(0, 4), m: +d.slice(5, 7), d: +d.slice(8, 10) });
  const noon = (d) => Date.UTC(ymd(d).y, ymd(d).m - 1, ymd(d).d, 12);
  const plus = (d, n) => new Date(noon(d) + n * 86400000).toISOString().slice(0, 10);
  const dow = (d) => (new Date(noon(d)).getUTCDay() + 6) % 7;
  const monday = (d) => plus(d, -dow(d));
  const dayWord = (d) => DOW[dow(d)] + ' ' + MON3[ymd(d).m - 1] + ' ' + ymd(d).d;
  const toMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? +m[1] * 60 + +m[2] : 0; };
  function h12(mins) { let h = Math.floor(mins / 60) % 24; const m = mins % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + (m ? ':' + pad(m) : '') + ' ' + ap; }
  function range() { if (view === 'day') return { from: anchor, to: anchor }; const a = monday(anchor); return { from: a, to: plus(a, 6) }; }
  function title() {
    if (view === 'day') return dayWord(anchor) + ', ' + ymd(anchor).y;
    const a = monday(anchor), z = plus(a, 6);
    return MON3[ymd(a).m - 1] + ' ' + ymd(a).d + ' to ' + (ymd(a).m === ymd(z).m ? '' : MON3[ymd(z).m - 1] + ' ') + ymd(z).d + ', ' + ymd(z).y;
  }

  // ---------------------------------------------------------------- helpers
  const B = () => window.WFBk;
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = String(text); return n; }
  function say(text, bad) { const p = document.getElementById('sch-say'); if (!p) return; p.textContent = text || ''; p.hidden = !text; p.classList.toggle('is-bad', !!bad); }
  function words(e) {
    if (e && e.code === 'signed_out') return 'You’ve been signed out.';
    if (e && e.status === 409 && (e.code === 'slot_taken' || e.code === 'server')) return 'That time was just taken, or that one can’t be booked this way. Pick another.';
    if (e && e.status === 409) return 'That one is already canceled, or can’t be booked this way.';
    if (e && e.status === 400) return 'Something in that form isn’t right. Check it and try again.';
    if (e && e.status === 404) return 'I couldn’t find that. Refresh and try again.';
    return 'That didn’t save. Try once more.';
  }
  async function call(path, body) {
    try { return await B().call(path, body); } catch (e) {
      if (e && e.code === 'signed_out' && B().signedOut) B().signedOut();
      throw e;
    }
  }

  // ---------------------------------------------------------------- pieces and lanes
  function pieces(ev) {
    const out = [];
    let d = ev.sd, guard = 0;
    while (d <= ev.ed && guard++ < 20) {
      const a = d === ev.sd ? ev.sm : 0;
      let z = d === ev.ed ? ev.em : 1440;
      if (d === ev.ed && z === 0 && d > ev.sd) break;
      if (z <= a) z = Math.min(1440, a + 15);
      out.push({ ev: ev, date: d, a: a, z: z, allDay: a <= 0 && z >= 1440 });
      d = plus(d, 1);
    }
    return out;
  }
  function byDay() {
    const map = {};
    ((data && data.events) || []).forEach((ev) => pieces(ev).forEach((p) => { (map[p.date] = map[p.date] || []).push(p); }));
    Object.keys(map).forEach((d) => map[d].sort((x, y) => x.a - y.a || x.z - y.z));
    return map;
  }
  function lanes(list) {
    const timed = list.filter((p) => !p.allDay), out = [];
    let cluster = [], end = -1;
    const flush = () => { const n = cluster.reduce((m, p) => Math.max(m, p.lane + 1), 1); cluster.forEach((p) => { p.lanes = n; out.push(p); }); cluster = []; };
    timed.forEach((p) => {
      if (cluster.length && p.a >= end) { flush(); end = -1; }
      const taken = cluster.filter((q) => q.z > p.a).map((q) => q.lane);
      let l = 0;
      while (taken.indexOf(l) >= 0) l++;
      p.lane = l; cluster.push(p); end = Math.max(end, p.z);
    });
    if (cluster.length) flush();
    return out;
  }

  // ---------------------------------------------------------------- drawing
  function chip(p) {
    const ev = p.ev;
    const b = el('button', 'sch-ev ' + (ev.kind === 'session' ? 'is-session' : ev.kind === 'busy' ? 'is-busy' : 'is-off'));
    b.type = 'button';
    b.dataset.id = ev.id || '';
    b.dataset.kind = ev.kind;
    b.append(el('span', 'sch-ev-t', ev.title));
    if (!p.allDay) b.append(el('span', 'sch-ev-w', h12(p.a) + (ev.kind === 'session' ? ' · ' + ev.service_name : '')));
    b.setAttribute('aria-label', ev.title + ', ' + dayWord(p.date) + (p.allDay ? ', all day' : ', ' + h12(p.a) + ' to ' + h12(p.z)));
    if (ev.kind !== 'session') { b.disabled = true; b.tabIndex = -1; }
    return b;
  }
  function render() {
    document.getElementById('sch-title').textContent = title();
    ['day', 'week'].forEach((v) => document.getElementById('sch-v-' + v).setAttribute('aria-pressed', v === view ? 'true' : 'false'));
    const host = document.getElementById('sch-grid');
    host.textContent = '';
    if (!data) return;
    const map = byDay();
    const dates = view === 'day' ? [anchor] : [0, 1, 2, 3, 4, 5, 6].map((i) => plus(monday(anchor), i));
    const wrap = el('div', 'sch-week');
    wrap.style.setProperty('--cols', String(dates.length));
    const head = el('div', 'sch-heads');
    head.append(el('div', 'sch-gutter'));
    dates.forEach((d) => {
      const h = el('button', 'sch-head' + (d === today ? ' is-today' : ''), dayWord(d));
      h.type = 'button'; h.dataset.go = d; h.setAttribute('aria-label', 'Open ' + dayWord(d));
      head.append(h);
    });
    wrap.append(head);
    const strip = el('div', 'sch-allday');
    strip.append(el('div', 'sch-gutter', 'All day'));
    let anyAll = false;
    dates.forEach((d) => { const c = el('div', 'sch-allcol'); (map[d] || []).filter((p) => p.allDay).forEach((p) => { c.append(chip(p)); anyAll = true; }); strip.append(c); });
    if (anyAll) wrap.append(strip);
    const body = el('div', 'sch-body');
    const gut = el('div', 'sch-gutter sch-hours');
    for (let m = GRID_FROM; m < GRID_TO; m += 60) { const h = el('div', 'sch-hour', h12(m)); h.style.height = ROW_H + 'px'; gut.append(h); }
    body.append(gut);
    const winsOf = {};
    (data.days || []).forEach((d) => { winsOf[d.date] = d.windows || []; });
    dates.forEach((d) => {
      const col = el('div', 'sch-col' + (d === today ? ' is-today' : ''));
      col.style.height = ((GRID_TO - GRID_FROM) / 60 * ROW_H) + 'px';
      (winsOf[d] || []).forEach((w) => {
        const a = Math.max(GRID_FROM, toMin(w[0])), z = Math.min(GRID_TO, toMin(w[1]));
        if (z > a) { const s = el('div', 'sch-open'); s.style.top = ((a - GRID_FROM) / 60 * ROW_H) + 'px'; s.style.height = ((z - a) / 60 * ROW_H) + 'px'; col.append(s); }
      });
      lanes(map[d] || []).forEach((p) => {
        const a = Math.max(p.a, GRID_FROM), z = Math.min(p.z, GRID_TO);
        if (z <= a) return;
        const b = chip(p);
        b.style.top = ((a - GRID_FROM) / 60 * ROW_H) + 'px';
        b.style.height = Math.max(22, (z - a) / 60 * ROW_H - 2) + 'px';
        b.style.left = (p.lane / p.lanes * 100) + '%';
        b.style.width = (100 / p.lanes) + '%';
        col.append(b);
      });
      if (d === today && nowMin >= GRID_FROM && nowMin < GRID_TO) { const line = el('div', 'sch-now'); line.style.top = ((nowMin - GRID_FROM) / 60 * ROW_H) + 'px'; line.setAttribute('aria-hidden', 'true'); col.append(line); }
      body.append(col);
    });
    wrap.append(body);
    host.append(wrap);
    const n = (data.events || []).filter((e) => e.kind === 'session').length;
    document.getElementById('sch-sum').textContent = n ? n + (n === 1 ? ' visit' : ' visits') + ' in view. Times are ' + (data.zone || 'your') + ' time.' : 'No visits in view.';
    if (picked) showDetail(picked);
  }

  // ---------------------------------------------------------------- loading
  async function load(quiet) {
    if (busy) return;
    const r = range();
    let d = null;
    try { d = await call('/week', { from: r.from, to: r.to }); } catch (e) { if (!quiet) say(words(e), true); return; }
    data = d; today = d.today; nowMin = d.now_min;
    if (!anchor) anchor = today;
    render();
  }
  function go(newAnchor, newView) {
    if (newView) view = newView;
    if (newAnchor) anchor = newAnchor;
    closeAll();
    load(false);
  }

  // ---------------------------------------------------------------- one visit
  const find = (id) => ((data && data.events) || []).find((e) => e.id === id && e.kind === 'session') || null;
  function showDetail(ev) {
    picked = ev;
    const box = document.getElementById('sch-detail');
    box.textContent = '';
    box.hidden = false;
    box.append(el('h4', 'sch-dh', ev.title));
    box.append(el('p', 'sch-dw', dayWord(ev.sd) + ', ' + h12(ev.sm) + ' to ' + h12(ev.em || 1440) + ' · ' + ev.service_name + (ev.minutes ? ' (' + ev.minutes + ' min)' : '')));
    const acts = el('div', 'sch-acts');
    [['Move', 'move'], ['Cancel', 'cancel'], ['See the details', 'details'], ['Close', 'close-detail']].forEach(([l, a]) => { const b = el('button', 'btn small ghost', l); b.type = 'button'; b.dataset.act = a; acts.append(b); });
    box.append(acts, el('div', 'sch-dform'));
  }
  function closeDetail() { picked = null; const b = document.getElementById('sch-detail'); b.hidden = true; b.textContent = ''; }
  function closeAll() { closeDetail(); const f = document.getElementById('sch-form'); f.hidden = true; f.textContent = ''; say(''); }

  async function act(action) {
    const ev = picked;
    if (!ev || busy) return;
    const slot = document.getElementById('sch-detail').querySelector('.sch-dform');
    if (action === 'close-detail') { closeDetail(); return; }
    if (action === 'details') { B().select('upcoming'); return; }
    if (action === 'cancel') {
      slot.textContent = '';
      const tl = el('label', 'sch-check'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = true; tl.append(cb, document.createTextNode(' Email them that it’s canceled'));
      const msg = el('textarea', 'sch-msg'); msg.rows = 2; msg.maxLength = 500; msg.placeholder = 'A note for them (optional)'; msg.setAttribute('aria-label', 'A note for them (optional)');
      const go1 = el('button', 'btn small', 'Yes, cancel it'); go1.type = 'button';
      slot.append(tl, msg, go1);
      go1.addEventListener('click', async () => {
        go1.disabled = true; busy++;
        try { const r = await call('/cancel', { id: ev.id, message: msg.value.trim(), tell: cb.checked }); busy--; B().toast(r.emailed ? 'Canceled, and they were emailed.' : 'Canceled.'); closeDetail(); await load(true); B().reload(); } catch (e) { busy--; go1.disabled = false; say(words(e), true); }
      });
      return;
    }
    if (action === 'move') {
      slot.textContent = '';
      const wrap = el('div', 'sch-picker'); slot.append(wrap);
      wrap.append(el('p', 'sch-hint', 'Loading open times…'));
      let r = null;
      try { r = await call('/slots', { id: ev.id }); } catch (e) { wrap.textContent = ''; wrap.append(el('p', 'sch-hint is-bad', words(e))); return; }
      wrap.textContent = '';
      picker(wrap, r.days, 'Move it', 'Move it and email them the new time', async (at, tell) => {
        busy++;
        try { await call('/move', { id: ev.id, at: at, message: '' }); busy--; B().toast('Moved, and they were emailed.'); closeDetail(); await load(true); B().reload(); } catch (e) { busy--; say(words(e), true); }
      }, true);
    }
  }

  // ---------------------------------------------------------------- the open-times picker (Move and Book for a client)
  function picker(host, days, goLabel, tellLabel, onPick, noTell) {
    if (!days || !days.length) { host.append(el('p', 'sch-hint', 'No open times. Change your hours or time off first.')); return; }
    let chosen = '';
    const dayRow = el('div', 'sch-days'), timeRow = el('div', 'sch-times');
    timeRow.setAttribute('role', 'group'); timeRow.setAttribute('aria-label', 'Open times');
    const goBtn = el('button', 'btn small', goLabel); goBtn.type = 'button'; goBtn.disabled = true;
    const tl = el('label', 'sch-check'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = true; tl.append(cb, document.createTextNode(' ' + tellLabel));
    const show = (d) => {
      timeRow.textContent = '';
      d.times.forEach((t) => {
        const b = el('button', 'btn small ghost sch-time', t.label); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => { chosen = t.at; timeRow.querySelectorAll('.sch-time').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); goBtn.disabled = false; });
        timeRow.append(b);
      });
      dayRow.querySelectorAll('.sch-day').forEach((x) => x.setAttribute('aria-pressed', x.dataset.date === d.date ? 'true' : 'false'));
      chosen = ''; goBtn.disabled = true;
    };
    days.slice(0, 21).forEach((d) => { const b = el('button', 'btn small ghost sch-day', d.label); b.type = 'button'; b.dataset.date = d.date; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => show(d)); dayRow.append(b); });
    goBtn.addEventListener('click', async () => { if (!chosen) return; goBtn.disabled = true; await onPick(chosen, cb.checked); goBtn.disabled = !chosen; });
    host.append(dayRow, timeRow);
    if (!noTell) host.append(tl);
    host.append(goBtn);
  }

  // ---------------------------------------------------------------- Book for a client
  function openBook() {
    closeAll();
    const f = document.getElementById('sch-form');
    f.hidden = false;
    f.append(el('h4', 'sch-dh', 'Book for a client'));
    const services = ((B().data() || {}).services || []).filter((s) => s.active && s.package_count === 1);
    if (!services.length) { f.append(el('p', 'sch-hint', 'Add a one-visit service first (Services tab), then you can book it here.'), closeBtn()); return; }
    const svc = el('select', 'sch-sel'); svc.setAttribute('aria-label', 'Service');
    services.forEach((s) => { const o = el('option', '', s.name + ' · ' + s.minutes + ' min'); o.value = s.id; svc.append(o); });
    const fld = (label, type, max) => { const l = el('label', 'sch-fl'); l.append(el('span', 'sch-fl-t', label)); const i = el('input', 'sch-in'); i.type = type; if (max) i.maxLength = max; l.append(i); return { l: l, i: i }; };
    const name = fld('Their name', 'text', 120), email = fld('Their email', 'email', 200), phone = fld('Phone (optional)', 'tel', 40);
    const street = fld('Street', 'text', 120), town = fld('Town', 'text', 80), zip = fld('ZIP', 'text', 10);
    const home = el('div', 'sch-home'); home.hidden = true; home.append(street.l, town.l, zip.l);
    const note = el('textarea', 'sch-msg'); note.rows = 2; note.maxLength = 1000; note.placeholder = 'A note (optional)'; note.setAttribute('aria-label', 'A note (optional)');
    const holder = el('div', 'sch-pickhost');
    const syncHome = () => { const s = services.find((x) => x.id === svc.value); home.hidden = !(s && s.location === 'home'); };
    const refresh = async () => {
      syncHome(); holder.textContent = '';
      holder.append(el('p', 'sch-hint', 'Loading open times…'));
      let r = null;
      try { r = await call('/book-slots', { service: svc.value }); } catch (e) { holder.textContent = ''; holder.append(el('p', 'sch-hint is-bad', words(e))); return; }
      holder.textContent = '';
      picker(holder, r.days, 'Book it', 'Email them the confirmation', async (at, tell) => {
        const body = { service: svc.value, at: at, name: name.i.value.trim(), email: email.i.value.trim(), phone: phone.i.value.trim(), note: note.value.trim(), tell: tell };
        if (!home.hidden) body.address = { street: street.i.value.trim(), town: town.i.value.trim(), zip: zip.i.value.trim() };
        if (!body.name || !body.email) { say('Add their name and email first.', true); return; }
        busy++;
        try { const x = await call('/book-for', body); busy--; B().toast(x.emailed ? 'Booked, and they were emailed.' : 'Booked.'); closeAll(); await load(true); B().reload(); } catch (e) { busy--; say(words(e), true); }
      });
    };
    svc.addEventListener('change', refresh);
    f.append(svc, name.l, email.l, phone.l, home, note, holder, closeBtn());
    refresh();
  }
  function closeBtn() { const b = el('button', 'later', 'Close'); b.type = 'button'; b.dataset.act = 'close-form'; return b; }

  // ---------------------------------------------------------------- the tab's own markup, built once
  function build() {
    if (built || !root()) return;
    built = true;
    const r = root();
    const bar = el('div', 'sch-bar');
    const nav = el('span', 'sch-nav');
    [['sch-prev', '‹', 'Earlier'], ['sch-today', 'Today', ''], ['sch-next', '›', 'Later']].forEach(([id, t, aria]) => { const b = el('button', 'btn small ghost', t); b.type = 'button'; b.id = id; if (aria) b.setAttribute('aria-label', aria); nav.append(b); });
    const h = el('h4', 'sch-title'); h.id = 'sch-title';
    const views = el('span', 'sch-views'); views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'View');
    [['day', 'Day'], ['week', 'Week']].forEach(([v, t]) => { const b = el('button', 'btn small ghost', t); b.type = 'button'; b.id = 'sch-v-' + v; b.setAttribute('aria-pressed', v === view ? 'true' : 'false'); views.append(b); });
    const tools = el('span', 'sch-tools');
    const blk = el('button', 'btn small ghost', 'Block off time'); blk.type = 'button'; blk.id = 'sch-block';
    const bk = el('button', 'btn small', 'Book for a client'); bk.type = 'button'; bk.id = 'sch-book';
    tools.append(blk, bk);
    bar.append(nav, h, views, tools);
    const sum = el('p', 'sch-sum'); sum.id = 'sch-sum';
    const sy = el('p', 'sch-say'); sy.id = 'sch-say'; sy.setAttribute('role', 'status'); sy.hidden = true;
    const grid = el('div', 'sch-grid'); grid.id = 'sch-grid';
    const det = el('div', 'sch-detail'); det.id = 'sch-detail'; det.hidden = true;
    const frm = el('div', 'sch-form'); frm.id = 'sch-form'; frm.hidden = true;
    r.append(bar, sum, sy, grid, det, frm);
    r.addEventListener('click', (ev) => {
      const t = ev.target.closest('button');
      if (!t || !r.contains(t) || t.disabled) return;
      if (t.dataset.go) { go(t.dataset.go, 'day'); return; }
      if (t.classList.contains('sch-ev')) { const e = find(t.dataset.id); if (e) { document.getElementById('sch-form').hidden = true; showDetail(e); } return; }
      if (t.dataset.act === 'close-form') { closeAll(); return; }
      if (t.dataset.act) { act(t.dataset.act); return; }
      if (t.id === 'sch-prev') go(plus(anchor, view === 'week' ? -7 : -1));
      else if (t.id === 'sch-next') go(plus(anchor, view === 'week' ? 7 : 1));
      else if (t.id === 'sch-today') go(today || anchor);
      else if (t.id === 'sch-v-day') go(null, 'day');
      else if (t.id === 'sch-v-week') go(null, 'week');
      else if (t.id === 'sch-block') B().select('hours');
      else if (t.id === 'sch-book') openBook();
    });
  }

  window.WFSchedule = { show() { if (!B()) return; build(); load(false); } };
  document.addEventListener('wf-bk-updated', () => { if (built && root() && !root().closest('[hidden]') && !busy) load(true); });
})();
