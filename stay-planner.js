/* Web Faery stay + services planner. One shared module for hosts who rent rooms AND sell treatments, classes or tours.
   A guest picks a stay (or just services), the dates, then what they want on each day of the stay. The plan builds live as an
   itinerary ticket, and the request lands as ONE bundle. Preview only: nothing is sent. The page sets window.STAY_PLANNER first.
   Config: { mount, host, place, owner, endpoint, consentText, stays:[{key,name,sleeps,blurb}], visit:{name,blurb}|null, services:[{key,cat,name,price,mins}],
             slots:[[key,label]], maxNights, noun:'treatment'|'class'|'session', stayNote, doneNote, inbox:true }
   On "send" it fires a CustomEvent "stayplanner:request" on the mount with detail = the bundle (the shape the portal will read). */
(function () {
  var C = window.STAY_PLANNER; if (!C) return;
  var root = document.querySelector(C.mount || '#stay-planner'); if (!root) return;
  var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var slots = C.slots || [['am', 'Morning'], ['pm', 'Afternoon'], ['eve', 'Evening']], noun = C.noun || 'treatment', money = C.currency || '$';
  var maxN = C.maxNights || 7, S;
  function fresh() { return { step: 1, stay: null, n: 2, date: '', picks: {}, name: '', mail: '', phone: '', note: '', consent: false, sent: false, open: 0 }; }
  S = fresh();
  function el(t, cls, txt) { var e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(txt, cls, fn) { var b = el('button', cls, txt); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; }
  function svc(k) { return (C.services || []).filter(function (s) { return s.key === k; })[0]; }
  function stayOf(k) { return (C.stays || []).filter(function (s) { return s.key === k; })[0]; }
  function dayCount() { return S.stay === 'visit' ? S.n : S.n + 1; }          // a stay of n nights spans n+1 days
  function dayDate(i) { if (!S.date) return null; var p = S.date.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + i); return d; }
  function dayLabel(i) { var d = dayDate(i); return d ? DN[d.getDay()] + ' ' + MN[d.getMonth()] + ' ' + d.getDate() : 'Day ' + (i + 1); }
  function iso(i) { var d = dayDate(i); return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : null; }
  function picksOf(i) { var out = []; Object.keys(S.picks).forEach(function (k) { var p = k.split('|'); if (+p[0] === i && svc(p[1])) out.push({ s: svc(p[1]), slot: S.picks[k] }); }); return out; }
  function total() { var t = 0; Object.keys(S.picks).forEach(function (k) { var s = svc(k.split('|')[1]); if (s && +k.split('|')[0] < dayCount()) t += s.price || 0; }); return t; }
  function slotName(k) { var r = slots.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : ''; }
  function stayName() { return S.stay === 'visit' ? ((C.visit && C.visit.name) || 'Services only') : (stayOf(S.stay) || {}).name; }
  function ok1() { return !!S.stay; }
  function consentText() { return C.consentText || ('Yes, ' + (C.host || 'the host') + ' may email me about future stays, treatments and events at ' + (C.place || 'this place') + '. I can unsubscribe any time.'); }

  root.classList.add('sp'); root.textContent = '';
  var flow = el('div', 'sp-flow'), ticket = el('aside', 'sp-ticket'), live = el('p', 'sp-vh'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
  root.appendChild(flow); root.appendChild(ticket); root.appendChild(live);

  function head() {
    var h = el('ol', 'sp-steps'); [['1', 'Your stay'], ['2', 'Your days'], ['3', 'You']].forEach(function (s, i) {
      var li = el('li', 'sp-step' + (S.step === i + 1 ? ' on' : '') + (S.step > i + 1 ? ' done' : '')); li.appendChild(el('span', 'sp-n', s[0])); li.appendChild(el('span', '', s[1]));
      if (S.step > i + 1 && !S.sent) { li.tabIndex = 0; li.addEventListener('click', function () { S.step = i + 1; draw(); }); }
      h.appendChild(li);
    }); return h;
  }
  function step1() {
    var w = el('div', 'sp-pane'); w.appendChild(el('h3', 'sp-q', 'Where would you like to stay?'));
    var g = el('div', 'sp-cards');
    (C.stays || []).forEach(function (s) { var b = btn('', 'sp-card', function () { S.stay = s.key; draw(); }); b.setAttribute('aria-pressed', S.stay === s.key ? 'true' : 'false');
      b.appendChild(el('b', '', s.name)); b.appendChild(el('span', '', s.sleeps || '')); if (s.blurb) b.appendChild(el('em', '', s.blurb)); g.appendChild(b); });
    if (C.visit) { var v = btn('', 'sp-card', function () { S.stay = 'visit'; draw(); }); v.setAttribute('aria-pressed', S.stay === 'visit' ? 'true' : 'false'); v.appendChild(el('b', '', C.visit.name)); v.appendChild(el('span', '', C.visit.blurb || '')); g.appendChild(v); }
    w.appendChild(g);
    if (S.stay) {
      var row = el('div', 'sp-row'), f1 = el('label', 'sp-fld', S.stay === 'visit' ? 'First day (optional)' : 'Arriving (optional)'), d = el('input'); d.type = 'date'; d.value = S.date; d.addEventListener('change', function () { S.date = d.value; paintTicket(); });
      f1.appendChild(d); row.appendChild(f1);
      var f2 = el('div', 'sp-fld'); f2.appendChild(el('span', '', S.stay === 'visit' ? 'How many days?' : 'How many nights?'));
      var st = el('div', 'sp-stepper'), out = el('output', '', String(S.n)); out.setAttribute('aria-live', 'polite');
      var minus = btn('−', 'sp-sm', function () { if (S.n > 1) { S.n--; out.textContent = S.n; trim(); paintTicket(); } }), plus = btn('+', 'sp-sm', function () { if (S.n < maxN) { S.n++; out.textContent = S.n; paintTicket(); } });
      minus.setAttribute('aria-label', 'Fewer'); plus.setAttribute('aria-label', 'More'); st.appendChild(minus); st.appendChild(out); st.appendChild(plus); f2.appendChild(st); row.appendChild(f2); w.appendChild(row);
      if (S.stay !== 'visit' && C.stayNote) w.appendChild(el('p', 'sp-note', C.stayNote));
    }
    return w;
  }
  function trim() { Object.keys(S.picks).forEach(function (k) { if (+k.split('|')[0] >= dayCount()) delete S.picks[k]; }); }
  function step2() {
    var w = el('div', 'sp-pane'); w.appendChild(el('h3', 'sp-q', 'What would you like each day?')); w.appendChild(el('p', 'sp-hint', 'Pick as many or as few as you like. Choose a time of day for each.'));
    var cats = []; (C.services || []).forEach(function (s) { if (cats.indexOf(s.cat) < 0) cats.push(s.cat); });
    for (var i = 0; i < dayCount(); i++) (function (i) {
      var isOpen = S.open === i, n = picksOf(i).length;
      var day = el('section', 'sp-day' + (isOpen ? ' open' : '')), top = btn('', 'sp-dayhead', function () { S.open = isOpen ? -1 : i; draw(); });
      top.setAttribute('aria-expanded', isOpen ? 'true' : 'false'); top.appendChild(el('b', '', dayLabel(i)));
      var tag = S.stay === 'visit' ? '' : (i === 0 ? 'arrive' : i === dayCount() - 1 ? 'leave' : 'night ' + i); if (tag) top.appendChild(el('span', 'sp-tag', tag));
      top.appendChild(el('span', 'sp-count', n ? n + ' picked' : (isOpen ? '' : 'add')));
      top.appendChild(el('span', 'sp-caret', isOpen ? '\u2212' : '+')); day.appendChild(top);
      if (!isOpen) { w.appendChild(day); return; }
      cats.forEach(function (cat) {
        var grp = el('div', 'sp-grp'); grp.appendChild(el('span', 'sp-cat', cat));
        (C.services || []).filter(function (s) { return s.cat === cat; }).forEach(function (s) {
          var k = i + '|' + s.key, on = !!S.picks[k], b = btn('', 'sp-chip', function () { if (S.picks[k]) delete S.picks[k]; else S.picks[k] = slots[0][0]; draw(); });
          b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.appendChild(el('span', '', s.name)); b.appendChild(el('i', '', s.price ? money + s.price : 'free')); grp.appendChild(b);
          if (on) { var seg = el('div', 'sp-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Time of day for ' + s.name);
            slots.forEach(function (sl) { var q = btn(sl[1], '', function () { S.picks[k] = sl[0]; draw(); }); q.setAttribute('aria-pressed', S.picks[k] === sl[0] ? 'true' : 'false'); seg.appendChild(q); }); grp.appendChild(seg); }
        }); day.appendChild(grp);
      }); w.appendChild(day);
    })(i);
    return w;
  }
  function step3() {
    var w = el('div', 'sp-pane'); w.appendChild(el('h3', 'sp-q', 'Who is it for?'));
    function fld(label, key, type, ph) { var f = el('label', 'sp-fld', label), i = el(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') i.type = type; else i.rows = 3; i.value = S[key]; if (ph) i.placeholder = ph; i.addEventListener('input', function () { S[key] = i.value; }); f.appendChild(i); return f; }
    var r = el('div', 'sp-row'); r.appendChild(fld('Your name', 'name', 'text')); r.appendChild(fld('Email', 'mail', 'email')); w.appendChild(r);
    w.appendChild(fld('Phone (optional)', 'phone', 'tel')); w.appendChild(fld('Anything ' + (C.host || 'we') + ' should know', 'note', 'textarea', 'Celebrating an anniversary, vegetarian breakfast, arriving late'));
    var cw = el('label', 'sp-consent'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!S.consent; cb.addEventListener('change', function () { S.consent = cb.checked; });
    cw.appendChild(cb); cw.appendChild(el('span', '', consentText())); w.appendChild(cw);
    return w;
  }
  function bundle() {
    var days = []; for (var i = 0; i < dayCount(); i++) days.push({ date: iso(i), label: dayLabel(i), items: picksOf(i).map(function (p) { return { key: p.s.key, name: p.s.name, slot: p.slot, price: p.s.price || 0 }; }) });
    return { place: C.place, stay: S.stay === 'visit' ? null : { unit: S.stay, name: stayName(), arrive: S.date || null, nights: S.n }, services_only: S.stay === 'visit', days: days, total: total(), contact: { name: S.name, email: S.mail, phone: S.phone, consent_email: !!S.consent, consent_text: S.consent ? consentText() : null }, note: S.note };
  }
  function nav() {
    var n = el('div', 'sp-nav');
    if (S.step > 1) n.appendChild(btn('Back', 'sp-go ghost', function () { S.step--; draw(); }));
    var next = btn(S.step === 3 ? 'Send my request (preview)' : 'Next', 'sp-go', function () {
      if (S.step < 3) { S.step++; S.open = 0; draw(); return; }
      S.sent = true; var b = bundle(); try { root.dispatchEvent(new CustomEvent('stayplanner:request', { detail: b, bubbles: true })); } catch (e) {}
      if (C.endpoint) { /* live portal only; mockups have no endpoint, so nothing is sent. Prices are recomputed on the server from the keys. */
        try { fetch(C.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: C.owner || null, bundle: b }), keepalive: true }).catch(function () {}); } catch (e) {}
      }
      draw();
    });
    if (S.step === 1 && !ok1()) next.disabled = true; n.appendChild(next); return n;
  }
  function done() {
    var w = el('div', 'sp-done'), h = el('h3', 'sp-q', 'Your request is sent!'); h.tabIndex = -1; w.appendChild(h);
    w.appendChild(el('p', '', (C.doneNote || 'Your host writes back to confirm the days and times.')));
    var b = el('div', 'sp-nav'); b.appendChild(btn('Try it again', 'sp-go ghost', function () { S = fresh(); draw(); })); b.appendChild(btn('Change something', 'sp-go ghost', function () { S.sent = false; S.step = 3; draw(); })); w.appendChild(b);
    setTimeout(function () { h.focus({ preventScroll: true }); }, 0); return w;
  }
  function paintTicket() {
    ticket.textContent = ''; ticket.appendChild(el('p', 'sp-tk-k', 'Your plan'));
    if (!S.stay) { ticket.appendChild(el('p', 'sp-tk-empty', 'Pick a place to stay, or just the services, and your plan builds here.')); }
    else {
      ticket.appendChild(el('h4', 'sp-tk-h', stayName() + (S.stay === 'visit' ? '' : ', ' + S.n + ' night' + (S.n === 1 ? '' : 's'))));
      if (S.date) ticket.appendChild(el('p', 'sp-tk-d', dayLabel(0) + ' to ' + dayLabel(dayCount() - 1)));
      var list = el('ol', 'sp-tk-days' + (S.stay === 'visit' ? ' visit' : ''));
      for (var i = 0; i < dayCount(); i++) { var li = el('li', 'sp-tk-day'), p = picksOf(i); li.appendChild(el('b', '', dayLabel(i)));
        if (!p.length) li.appendChild(el('span', 'sp-tk-free', S.stay === 'visit' ? 'nothing yet' : 'free day'));
        p.forEach(function (x) { var r = el('div', 'sp-tk-line'); r.appendChild(el('span', '', x.s.name + ' · ' + slotName(x.slot).toLowerCase())); r.appendChild(el('i', '', x.s.price ? money + x.s.price : 'free')); li.appendChild(r); });
        list.appendChild(li); }
      ticket.appendChild(list); var t = el('div', 'sp-tk-total'); t.appendChild(el('span', '', noun.charAt(0).toUpperCase() + noun.slice(1) + 's total')); t.appendChild(el('b', '', money + total())); ticket.appendChild(t);
      if (C.stayNote && S.stay !== 'visit') ticket.appendChild(el('p', 'sp-tk-fine', 'Stay nights are confirmed on the booking site you use today.'));
    }
    if (C.inbox !== false) { var ib = el('div', 'sp-inbox'); ib.appendChild(el('span', 'sp-ib-k', 'What ' + (C.host || 'your host') + ' sees')); ib.appendChild(el('p', '', S.sent ? 'New request: ' + (S.name || 'A new guest') + ', ' + stayName() + (S.stay === 'visit' ? '' : ', ' + S.n + ' nights') + ', ' + Object.keys(S.picks).length + ' ' + noun + (Object.keys(S.picks).length === 1 ? '' : 's') + ', ' + money + total() + '. One message, everything lined up.' : 'Waiting for a request. Try the planner.')); ticket.appendChild(ib); }
    ticket.appendChild(el('p', 'sp-tk-fine', 'Planner preview: nothing here sends a real request.'));
    live.textContent = S.stay ? 'Plan updated: ' + money + total() : '';
  }
  function draw() {
    flow.textContent = ''; if (S.sent) { flow.appendChild(done()); paintTicket(); return; }
    flow.appendChild(head()); flow.appendChild(S.step === 1 ? step1() : S.step === 2 ? step2() : step3()); flow.appendChild(nav()); paintTicket();
  }
  draw();
})();
