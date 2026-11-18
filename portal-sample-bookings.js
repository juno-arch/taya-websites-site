/* =====================================================================================================
   portal.html?demo=1: the BOOKINGS tool's pretend answers (Nov 16 2026).
   The made-up owner is Rosa Linden of Fern & Clay Pottery (pottery classes and studio visits, bookings on, Stripe in test
   mode, card no-show protection, new client intake, thank-you and book again notes, paid add-ons). Everything lives in
   this tab's memory (S.bookings): Coming up, Schedule (day, week, month, year), Hours, Services, Settings and Your clients
   all read it, and every change (cancel, move, no-show, time off, hours, repeats, services, questions, add-ons, calendars,
   settings, clients) writes it, so the next view shows the change. Reload starts the sample fresh.
   Names are invented, emails end in @example.test, and nothing is sent anywhere. The answers have the shapes in the
   hub's API.md sections 15, 17, 21 and 22 (webfaery-book2*.js). Loaded by portal.js before portal-demo.js.
   ===================================================================================================== */
(function () {
  'use strict';
  var W = window.WFSample;
  if (!W) return;
  var S = W.S;

  // ------------------------------------------------------------------ small helpers
  var DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var pad = W.pad;
  var seq = 0;
  function mkId(tag) { seq++; var s = (tag || 'x') + (1000000 + seq * 7919).toString(36) + 'q' + (seq * 104729).toString(36); return (s + '000000000000000').slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '0'); }
  function dateObj(date) { return new Date(date + 'T12:00:00'); }
  function dowNum(date) { return dateObj(date).getDay(); }
  function dowKey(date) { return DOW[dowNum(date)]; }
  function plus(date, n) { var d = dateObj(date); d.setDate(d.getDate() + n); return W.iso(d); }
  function mondayOf(date) { return plus(date, -((dowNum(date) + 6) % 7)); }
  function daysBetween(a, b) { return Math.round((dateObj(b) - dateObj(a)) / 86400000); }
  function mins(hm) { var p = String(hm).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function hm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function h12(m) { var hh = Math.floor(m / 60) % 24, mm = m % 60; var ap = hh < 12 ? 'AM' : 'PM'; var h = hh % 12 === 0 ? 12 : hh % 12; return h + ':' + pad(mm) + ' ' + ap; }
  function tEnd(m) { return m >= 1440 ? 'midnight' : h12(m); }
  function dayLabel(date) { var d = dateObj(date); return DOW_SHORT[d.getDay()] + ', ' + MON_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function dayLong(date) { var d = dateObj(date); return DOW_LONG[d.getDay()] + ', ' + MON_LONG[d.getMonth()] + ' ' + d.getDate(); }
  function monDay(date) { var d = dateObj(date); return MON_SHORT[d.getMonth()] + ' ' + d.getDate(); }
  function dateLabel(date) { var d = dateObj(date); return MON_SHORT[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function when(date, m) { return dayLabel(date) + ', ' + h12(m); }
  function atIso(date, m) { var p = date.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], Math.floor(m / 60), m % 60, 0).toISOString(); }
  function startMs(date, m) { var p = date.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], Math.floor(m / 60), m % 60, 0).getTime(); }
  function money(c) { c = Math.max(0, Math.round(+c || 0)); return '$' + String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (c % 100 ? '.' + pad(c % 100) : ''); }
  function winsLabel(w) { if (!w || !w.length) return 'Closed'; return w.map(function (x) { return h12(mins(x[0])) + ' to ' + tEnd(mins(x[1])); }).join(', '); }
  function spanLabel(a, z) { return a <= 0 && z >= 1440 ? 'All day' : h12(a) + ' to ' + tEnd(z); }
  function badIn(field, why, message) { var b = { error: 'input', field: field }; if (why) b.why = why; if (message) b.message = message; return { __status: 400, body: b }; }
  function nowMin() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function today() { return W.isoDay(0); }
  function overlap(a1, z1, a2, z2) { return a1 < z2 && a2 < z1; }

  // ------------------------------------------------------------------ the fixtures
  function seedAll() {
    var T = today();
    var nth = function (key, wk) { for (var n = 1; n <= 8; n++) { if (dowKey(W.isoDay(n)) === key) return W.isoDay(n + 7 * (wk || 0)); } return W.isoDay(1); };
    var wins = function (list) { return list; };
    var B = {
      owner: { name: 'Fern & Clay Pottery', owner_name: 'Rosa Linden', studio: '48 Quarry Lane, Fern Hollow', page_url: 'https://example.test/fern-and-clay/book',
        feed_url: 'https://example.test/fern-and-clay/calendar.ics?t=sample1', feedN: 1 },
      hours: { mon: [], tue: wins([['10:00', '13:00'], ['17:00', '20:30']]), wed: [['10:00', '16:00']], thu: [['10:00', '13:00'], ['17:00', '20:30']],
        fri: [['10:00', '16:00']], sat: [['10:00', '17:00']], sun: [['11:00', '15:00']] },
      settings: { notice_hours: 12, horizon_days: 60, buffer_min: 15, cancel_window_hours: 24, max_per_day: 2, max_per_week: 10, reminder_hours: 24, slot_step: 30, requests_on: true,
        card_on: true, card_can: true, noshow_first_pct: 50, noshow_repeat_pct: 100, card_policy: '',
        thanks_on: true, thanks_hours: 3, thanks_review_url: 'https://example.test/fern-and-clay/review', thanks_note: 'I hope your hands are happily clay-dusty.',
        nudge_on: true, nudge_weeks: 6, nudge_note: '', nudge_page: true,
        intake_keep_days: 365 },
      switches: { addons_on: true, intake_on: true },
      services: [], addons: [], questions: [], bookings: [], timeOff: [], overrides: {}, repeats: [], calendars: [], roster: [], hand: [], sms: { on: false, last4: '' }
    };
    // ---- services
    var sv = function (key, name, minutes, price, dep, desc, loc, pk, hours, maxd, maxw) {
      return { id: mkId('sv'), key: key, name: name, minutes: minutes, price_cents: price, deposit_cents: dep, description: desc, location: loc, package_count: pk || 1, active: true, hours: hours || null, max_per_day: maxd || 0, max_per_week: maxw || 0 };
    };
    B.services = [
      sv('wheel', 'Wheel throwing class', 120, 6500, 2000, 'Learn to center clay and pull up a cylinder. Everything is provided, and one of your pieces is glazed and fired for pickup in two weeks.', 'studio', 1),
      sv('private', 'Private lesson', 90, 11000, 3000, 'One on one at the wheel or the hand building table, at your pace.', 'studio', 1),
      sv('visit', 'Studio visit', 45, 2000, 0, 'See the kilns, meet the shelves, try the clay and ask anything. A good first step if you are deciding what to try.', 'studio', 1),
      sv('glaze', 'Glaze party', 150, 5500, 2500, 'Paint pre-made mugs and bowls with friends or family. Bring a small group, up to eight.', 'studio', 1, { sat: [['10:00', '17:00']], sun: [['11:00', '15:00']] }),
      sv('series', 'Four week beginner series', 120, 24000, 6000, 'Four weekly classes, booked together. Your first bowls and mugs, glazed and fired.', 'studio', 4)
    ];
    var svc = function (key) { return B.services.filter(function (s) { return s.key === key; })[0]; };
    // ---- add-ons
    B.addons = [
      { id: mkId('ad'), name: 'Take-home glaze kit', description: 'Three small jars and a brush, so you can keep painting at home.', price_cents: 1200, active: true, services: [svc('glaze').id, svc('wheel').id] },
      { id: mkId('ad'), name: 'Extra piece to fire', description: 'One more piece glazed and fired for pickup.', price_cents: 800, active: true, services: [svc('wheel').id, svc('private').id, svc('series').id] },
      { id: mkId('ad'), name: 'Apron loan', description: 'Borrow a studio apron for the visit.', price_cents: 0, active: true, services: [] }
    ];
    // ---- the booking form's questions
    var q = function (label, type, req, o) { return Object.assign({ id: mkId('q').slice(2, 8), label: label, type: type, choices: [], required: !!req, services: [], new_only: false, heads: false, heads_word: '', hint: '' }, o || {}); };
    var Q1 = q('Have you worked with clay before?', 'choice', true, { choices: ['First time', 'A little', 'Often'] });
    var Q2 = q('Any wrist, hand or back trouble we should plan around?', 'text', true, { new_only: true, heads: true, heads_word: 'wrist or back', hint: 'Please say what, or write none.' });
    var Q3 = q('Is this a gift or a celebration?', 'yesno', false);
    var Q4 = q('Which glaze colors are you drawn to?', 'text', false, { services: [svc('glaze').id], hint: 'Blues, greens, warm earth tones, anything.' });
    var Q5 = q('Any allergies, like latex gloves or clay dust?', 'text', true, { new_only: true, heads: true, heads_word: 'allergies' });
    B.questions = [Q1, Q2, Q3, Q4, Q5];
    // ---- the people (invented). earlier: [days ago, service key, options]
    var P = function (name, phone, earlier) { return { name: name, email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@example.test', phone: phone, earlier: earlier || [] }; };
    B.roster = [
      P('Maya Okafor', '707 555 0111', [[96, 'wheel'], [63, 'wheel'], [27, 'wheel']]),
      P('Priya Nandakumar', '707 555 0122', [[130, 'private'], [101, 'private'], [74, 'wheel'], [45, 'private'], [18, 'private']]),
      P('Jonah Whitfield', '707 555 0133', [[88, 'wheel'], [32, 'wheel']]),
      P('Ellie Navarro', '707 555 0144', []),
      P('Dana Reyes', '707 555 0155', [[52, 'glaze']]),
      P('Tom Beaumont', '', []),
      P('Wei Zhang', '707 555 0166', [[120, 'wheel'], [92, 'wheel'], [66, 'private'], [11, 'private']]),
      P('Hannah Lindqvist', '707 555 0177', []),
      P('Ruth Calloway', '707 555 0188', [[150, 'wheel'], [140, 'wheel'], [122, 'wheel'], [100, 'private'], [79, 'private'], [38, 'private'], [8, 'private']]),
      P('Ben Alvarado', '707 555 0199', [[70, 'glaze'], [24, 'wheel']]),
      P('Keiko Mori', '707 555 0102', [[81, 'glaze'], [47, 'wheel'], [14, 'wheel']]),
      P('Greg Alderman', '707 555 0113', [[2, 'wheel', { card: true }]]),
      P('Sofia Marchetti', '707 555 0124', [[5, 'private', { card: true, noshow: 'charged' }]]),
      P('Lena Bauer', '707 555 0135', [[160, 'wheel'], [130, 'wheel'], [97, 'private'], [69, 'private'], [41, 'private'], [4, 'private']])
    ];
    var by = function (n) { return B.roster.filter(function (p) { return p.name.indexOf(n) === 0; })[0]; };
    var card = function (p) { return !!(p.earlier.length && p.earlier.length > 2) || p.name.indexOf('Greg') === 0 || p.name.indexOf('Sofia') === 0 || p.name.indexOf('Priya') === 0 || p.name.indexOf('Ruth') === 0; };
    // ---- bookings that are still ahead
    var gid = 0;
    var add = function (spec) {
      var s = svc(spec.svc), p = by(spec.who);
      var row = { id: mkId('bk'), date: spec.date, start: mins(spec.at), minutes: s.minutes, svc: s.id, service_name: s.name, location: s.location,
        name: p.name, email: p.email, phone: p.phone, note: spec.note || '', status: spec.status || 'confirmed', group: spec.group || ('g' + (++gid)), group_index: spec.index || 1, group_size: spec.size || 1,
        deposit_cents: spec.dep === undefined ? s.deposit_cents : spec.dep, paid: spec.paid !== undefined ? spec.paid : (spec.dep === undefined ? s.deposit_cents > 0 : spec.dep > 0),
        canceled_by: spec.canceled_by || '', client_reason: spec.reason || '', answers: spec.answers || [], heads: spec.heads || '', card: spec.card !== undefined ? spec.card : false,
        addons: spec.addons || '', addons_total: spec.addons_total || '', noshow: spec.noshow || null };
      if (row.status === 'pending') row.paid = false;
      B.bookings.push(row);
      return row;
    };
    var A = function (a, b, c) { var out = [{ label: Q1.label, answer: a }]; if (b) out.push({ label: Q2.label, answer: b }); if (c) out.push({ label: Q3.label, answer: c }); return out; };
    add({ svc: 'wheel', who: 'Maya', date: nth('tue', 0), at: '17:30', note: 'My friend Jess is joining, so there will be two of us.', answers: A('A little', 'None', 'No') });
    add({ svc: 'private', who: 'Priya', date: nth('wed', 0), at: '10:00', card: true, answers: A('Often', 'None', 'No') });
    add({ svc: 'wheel', who: 'Jonah', date: nth('thu', 0), at: '17:30', answers: A('A little', 'None', 'No') });
    add({ svc: 'visit', who: 'Ellie', date: nth('fri', 0), at: '11:00', note: 'I am thinking about renting a shelf once I get going.', heads: 'wrist or back: left wrist, healing from a sprain',
      answers: A('First time', 'Left wrist, healing from a sprain, so I should go gently.', 'No').concat([{ label: Q5.label, answer: 'None' }]) });
    add({ svc: 'glaze', who: 'Dana', date: nth('sat', 0), at: '10:00', note: 'Birthday for my daughter. Six kids, ages 9 to 11.', card: true, addons: 'Extras: Take-home glaze kit ($12)', addons_total: 'Pay $12 at the session',
      answers: A('First time', 'None', 'Yes').concat([{ label: Q4.label, answer: 'Lots of blues and purples' }]) });
    add({ svc: 'wheel', who: 'Tom', date: nth('sat', 0), at: '14:00', status: 'pending', dep: 2000, answers: A('First time', 'None', 'No') });
    add({ svc: 'private', who: 'Keiko', date: nth('sun', 0), at: '11:30', card: true, answers: A('Often', 'None', 'No') });
    for (var i = 1; i <= 4; i++) {
      add({ svc: 'series', who: 'Hannah', date: nth('fri', i - 1), at: '13:00', group: 'series1', index: i, size: 4, dep: i === 1 ? 6000 : 0, paid: i === 1, card: true,
        note: i === 1 ? 'A gift from my sister, and I have not touched a wheel since school.' : '', answers: i === 1 ? A('First time', 'None', 'Yes') : [] });
    }
    add({ svc: 'private', who: 'Ruth', date: nth('wed', 1), at: '10:00', card: true, heads: 'wrist or back: carpal tunnel on the right', answers: A('Often', 'Carpal tunnel on my right hand, a short break now and then helps.', 'No') });
    add({ svc: 'wheel', who: 'Ben', date: nth('thu', 1), at: '17:30', note: 'Our anniversary class. Ines is coming too.', addons: 'Extras: Extra piece to fire ($8)', addons_total: 'Pay $8 at the session',
      answers: A('A little', 'None', 'Yes') });
    add({ svc: 'private', who: 'Greg', date: nth('tue', 2), at: '10:00', card: true, answers: A('A little', 'None', 'No') });
    // a canceled one (they canceled) and one Rosa canceled
    add({ svc: 'visit', who: 'Jonah', date: nth('sat', 2), at: '11:00', status: 'canceled', canceled_by: 'client', dep: 0, paid: false, reason: 'My little one has a fever, so sorry. I will rebook next month.', answers: [] });
    add({ svc: 'wheel', who: 'Lena', date: nth('wed', 2), at: '10:00', status: 'canceled', canceled_by: 'owner', answers: [] });
    // ---- earlier visits: the last 60 days are real rows (Past), older ones only live in the client's history
    var ago = function (n, svcKey) {
      var date = W.isoDay(-n), s = svc(svcKey);
      for (var g = 0; g < 7; g++) { var k = dowKey(date); if (svcKey === 'glaze' ? k === 'sat' : (B.hours[k] || []).length) break; date = plus(date, -1); }
      return { date: date, start: mins((B.hours[dowKey(date)] || [['10:00']])[0][0]) + (dowKey(date) === 'tue' || dowKey(date) === 'thu' ? 30 + 420 : 0) };
    };
    B.roster.forEach(function (p) {
      p.old = [];
      p.earlier.forEach(function (e) {
        var o = e[2] || {}, s = svc(e[1]), at = ago(e[0], e[1]);
        if (e[0] <= 60) {
          var r = add({ svc: e[1], who: p.name, date: at.date, at: hm(at.start), card: o.card !== undefined ? o.card : card(p) && (e[0] % 2 === 0) });
          if (o.noshow === 'charged') r.noshow = { state: 'charged', words: 'Charged ' + money(Math.round(s.price_cents * 0.5)) + ' to ' + p.name + '’s card. A short receipt is on its way to them.' };
        } else p.old.push({ date: at.date, start: at.start, service: s.name });
      });
    });
    // ---- time off, repeats, one different day, one closed day, busy times from her own calendar
    var booked = function (date) { return B.bookings.some(function (b) { return b.date === date && b.status !== 'canceled'; }); };
    var d0 = 16;
    while (booked(W.isoDay(d0)) || booked(W.isoDay(d0 + 1))) d0++;
    B.timeOff.push({ id: mkId('to'), from: W.isoDay(d0), to: W.isoDay(d0 + 1), allDay: true, start: '', end: '', note: 'Craft fair weekend' });
    var d1 = 3;
    var held = [nth('tue', 1), nth('thu', 2), nth('sat', 1), nth('tue', 3)];
    while (d1 < 14 && (booked(W.isoDay(d1)) || (B.hours[dowKey(W.isoDay(d1))] || []).length === 0 || held.indexOf(W.isoDay(d1)) >= 0)) d1++;
    var w1 = B.hours[dowKey(W.isoDay(d1))][0][0];
    B.timeOff.push({ id: mkId('to'), from: W.isoDay(d1), to: W.isoDay(d1), allDay: false, start: w1, end: hm(mins(w1) + 120), note: 'Dentist' });
    B.repeats.push({ id: mkId('rp'), days: ['wed'], start: '12:30', end: '14:30', every_weeks: 1, starts_on: nth('wed', 0), ends_on: '', note: 'Kiln loading and glaze mixing' });
    B.repeats.push({ id: mkId('rp'), days: ['sun'], start: '13:30', end: '15:00', every_weeks: 2, starts_on: nth('sun', 0), ends_on: '', note: 'Lunch with my mother' });
    B.overrides[nth('sat', 1)] = { windows: [['10:00', '14:00']], note: 'Short day' };
    B.overrides[nth('tue', 3)] = { windows: [], note: 'Studio painting day' };
    B.calendars.push({ id: mkId('cl'), label: 'Rosa’s family calendar', hint: 'Google Calendar, ending 9f2c', active: true, checked_at: new Date(Date.now() - 6 * 60000).toISOString(), ok_at: new Date(Date.now() - 6 * 60000).toISOString(), error: '',
      events: 6, busy: [{ date: nth('tue', 1), a: 600, z: 690 }, { date: nth('thu', 2), a: 600, z: 720 }] });
    B.hand.push({ id: mkId('hd'), name: 'Marcus Teller', email: '', phone: '707 555 0170', note: 'Booked by phone. Wants the Saturday class once the shop slows down.' });
    return B;
  }
  S.bookings = seedAll();
  function st() { return S.bookings || (S.bookings = seedAll()); }

  // ------------------------------------------------------------------ the week, the month and the times
  function openWins(B, date) { var o = B.overrides[date]; return o ? o.windows : (B.hours[dowKey(date)] || []); }
  function repApplies(r, date) {
    if (r.days.indexOf(dowKey(date)) < 0) return false;
    if (date < r.starts_on || (r.ends_on && date > r.ends_on)) return false;
    return Math.round(daysBetween(mondayOf(r.starts_on), mondayOf(date)) / 7) % (r.every_weeks || 1) === 0;
  }
  function offOn(B, date) {
    var out = [];
    B.timeOff.forEach(function (t) {
      if (t.allDay) { if (date >= t.from && date <= t.to) out.push([0, 1440]); } else if (date === t.from) out.push([mins(t.start), mins(t.end)]);
    });
    return out;
  }
  function repOn(B, date) { var out = []; B.repeats.forEach(function (r) { if (repApplies(r, date)) out.push([mins(r.start), mins(r.end)]); }); return out; }
  function busyOn(B, date) { var out = []; B.calendars.forEach(function (c) { if (c.active) c.busy.forEach(function (x) { if (x.date === date) out.push([x.a, x.z]); }); }); return out; }
  function live(b) { return b.status === 'confirmed' || b.status === 'pending'; }
  function endMs(b) { return startMs(b.date, b.start + b.minutes); }
  function svcOf(B, b) { return B.services.filter(function (s) { return s.id === b.svc; })[0] || null; }

  function slotsFor(B, minutes, o) {
    o = o || {};
    var out = [], step = B.settings.slot_step || (minutes < 30 ? 15 : 30), buf = B.settings.buffer_min || 0, T = today(), nm = nowMin();
    for (var n = 0; n < 45 && out.length < 28; n++) {
      var date = W.isoDay(n), wins = openWins(B, date).map(function (w) { return [mins(w[0]), mins(w[1])]; });
      if (o.svc && o.svc.hours) { var sw = (o.svc.hours[dowKey(date)] || []).map(function (w) { return [mins(w[0]), mins(w[1])]; });
        wins = wins.map(function (w) { var r = []; sw.forEach(function (x) { var a = Math.max(w[0], x[0]), z = Math.min(w[1], x[1]); if (z > a) r.push([a, z]); }); return r; }).reduce(function (a, b) { return a.concat(b); }, []); }
      var blocked = offOn(B, date).concat(repOn(B, date), busyOn(B, date));
      var others = B.bookings.filter(function (b) { return b.date === date && live(b) && b.id !== o.except; });
      var times = [];
      wins.forEach(function (w) {
        for (var t = Math.ceil(w[0] / step) * step; t + minutes <= w[1]; t += step) {
          if (date === T && t <= nm + (o.noNotice ? 0 : (B.settings.notice_hours || 0) * 60)) continue;
          if (date < T) continue;
          if (blocked.some(function (x) { return overlap(t, t + minutes, x[0], x[1]); })) continue;
          if (others.some(function (b) { return overlap(t, t + minutes, b.start - buf, b.start + b.minutes + buf); })) continue;
          times.push({ at: atIso(date, t), label: h12(t) });
        }
      });
      if (times.length) out.push({ date: date, label: dayLabel(date), times: times });
    }
    return out;
  }
  function slotHas(days, at) { var t = new Date(at).getTime(); return days.some(function (d) { return d.times.some(function (x) { return new Date(x.at).getTime() === t; }); }); }
  function fromAt(at) { var d = new Date(at); return { date: W.iso(d), start: d.getHours() * 60 + d.getMinutes() }; }

  function monthDay(B, date) {
    var T = today(), has = Object.prototype.hasOwnProperty.call(B.overrides, date);
    var wins = openWins(B, date), usual = B.hours[dowKey(date)] || [];
    var off = offOn(B, date), rep = repOn(B, date), busy = busyOn(B, date);
    var whole = function (x) { return x[0] <= 0 && x[1] >= 1440; };
    var state = 'open';
    if (date < T) state = 'past';
    else if (has && !wins.length) state = 'closed';
    else if (!wins.length) state = 'usual_closed';
    else if (off.some(whole) || rep.some(whole)) state = 'closed';
    var books = B.bookings.filter(function (b) { return b.date === date && live(b); }).sort(function (x, y) { return x.start - y.start; });
    var wk = mondayOf(date), weekCount = B.bookings.filter(function (b) { return live(b) && mondayOf(b.date) === wk; }).length;
    var full = !!((B.settings.max_per_day && books.length >= B.settings.max_per_day) || (B.settings.max_per_week && weekCount >= B.settings.max_per_week));
    var sp = function (x) { return spanLabel(x[0], x[1]); };
    return { date: date, label: dayLong(date), state: state, override: has, hours_label: wins.length ? winsLabel(wins) : 'Closed', windows: wins.map(function (w) { return [w[0], w[1]]; }),
      usual_label: winsLabel(usual), time_off: off.map(sp), blocks: rep.map(sp), busy: busy.map(sp),
      bookings: books.map(function (b) { return { id: b.id, time: h12(b.start), name: b.name, service_name: b.service_name }; }), full: full };
  }

  // ------------------------------------------------------------------ rows as the server sends them
  function whereWords(B, b) {
    if (b.location === 'video') return 'By video (the link comes before we start)';
    return 'At ' + B.owner.studio;
  }
  function cardOn(B) { return !!B.settings.card_on; }
  function ownerRow(B, b) {
    var T = Date.now(), s = startMs(b.date, b.start);
    var r = { id: b.id, when: when(b.date, b.start), starts_at: atIso(b.date, b.start), ends_at: atIso(b.date, b.start + b.minutes), day: b.date,
      service_name: b.service_name, minutes: b.minutes, location: b.location, where: whereWords(B, b), address: '', name: b.name, email: b.email, phone: b.phone, note: b.note,
      status: b.status, group_index: b.group_index, group_size: b.group_size, deposit: b.deposit_cents ? money(b.deposit_cents) : '', paid: !!b.paid, canceled_by: b.canceled_by,
      past: s <= T, answers: b.answers.map(function (a) { return { label: a.label, answer: a.answer }; }), client_reason: b.client_reason };
    if (cardOn(B)) {
      r.card = !!b.card; r.noshow = b.noshow ? { state: b.noshow.state, words: b.noshow.words } : null;
      r.can_noshow = !b.noshow && b.status === 'confirmed' && s <= T && T - s < 14 * 86400000;
    }
    if (B.settings.thanks_on) r.thanks = s <= T && b.status === 'confirmed' ? 'sent' : '';
    if (b.addons) { r.addons = b.addons; if (b.addons_total) r.addons_total = b.addons_total; }
    if (B.switches.intake_on) { r.heads = b.heads || ''; r.answers_cleared = false; }
    return r;
  }
  function svcOut(s) {
    return { id: s.id, name: s.name, minutes: s.minutes, price_cents: s.price_cents, deposit_cents: s.deposit_cents, description: s.description, location: s.location,
      package_count: s.package_count, active: s.active, hours: s.hours ? JSON.parse(JSON.stringify(s.hours)) : null, max_per_day: s.max_per_day, max_per_week: s.max_per_week };
  }
  var REP_LONG = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  function repLabel(r) {
    var order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    var names = r.days.slice().sort(function (x, y) { return order.indexOf(x) - order.indexOf(y); }).map(function (k) { return REP_LONG[k]; });
    var list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0] || '';
    var head = r.every_weeks === 1 ? 'Every ' + list : r.every_weeks === 2 ? 'Every other week on ' + list : 'Every ' + r.every_weeks + ' weeks on ' + list;
    var a = mins(r.start), z = mins(r.end);
    var span = a === 0 && z === 1440 ? 'all day' : h12(a) + ' to ' + tEnd(z);
    return head + ', ' + span + (r.ends_on ? ', ' + monDay(r.starts_on) + ' until ' + monDay(r.ends_on) : ', from ' + monDay(r.starts_on));
  }
  function repOut(r) { return { id: r.id, label: repLabel(r), note: r.note, days: r.days.slice(), start: r.start, end: r.end, every_weeks: r.every_weeks, starts_on: r.starts_on, ends_on: r.ends_on }; }
  function offLabel(t) {
    if (t.allDay) return t.from === t.to ? dayLabel(t.from) + ', all day' : monDay(t.from) + ' to ' + monDay(t.to);
    return dayLabel(t.from) + ', ' + h12(mins(t.start)) + ' to ' + h12(mins(t.end));
  }
  function calOut(c) { return { id: c.id, label: c.label, hint: c.hint, active: c.active, checked_at: c.checked_at, ok_at: c.ok_at, error: c.error, events: c.events, busy_count: c.busy.length }; }
  function thanksPreview(B) {
    var n = B.owner.name, s = B.settings;
    return 'Hi Sam,\n\nThank you for spending time with ' + n + '. I hope you enjoyed your session.' + (s.thanks_note ? '\n\n' + s.thanks_note : '') +
      '\n\nIf you have a minute, a short review helps other people find us:\n' + (s.thanks_review_url || '(your review link)') + '\n\nSee you soon,\n' + n;
  }
  function nudgePreview(B) {
    var n = B.owner.name, s = B.settings;
    return 'Hi Sam,\n\nIt has been a little while since your last visit to ' + n + '. If you would like to come back to the wheel, you can book a time here:\n' + B.owner.page_url + (s.nudge_note ? '\n\n' + s.nudge_note : '') +
      '\n\nNo reply needed. To stop these notes, use the link below.\n(their own stop link)\n\nSee you soon,\n' + n;
  }
  function settingsOut(B) {
    var s = B.settings;
    var o = { notice_hours: s.notice_hours, horizon_days: s.horizon_days, buffer_min: s.buffer_min, cancel_window_hours: s.cancel_window_hours, max_per_day: s.max_per_day, max_per_week: s.max_per_week,
      reminder_hours: s.reminder_hours, slot_step: s.slot_step, requests_on: s.requests_on,
      card_on: s.card_on, noshow_first_pct: s.noshow_first_pct, noshow_repeat_pct: s.noshow_repeat_pct, card_policy: s.card_policy, card_can: true,
      card_policy_default: 'Your card is saved with Stripe and charged nothing today. If you miss your appointment, ' + B.owner.name + '’s no-show fee is ' +
        (s.noshow_first_pct === 50 ? 'half the session price' : s.noshow_first_pct + '% of the session price') + ' the first time and ' + (s.noshow_repeat_pct === 100 ? 'the full price' : s.noshow_repeat_pct + '% of the session price') + ' after that.',
      thanks_on: s.thanks_on, thanks_hours: s.thanks_hours, thanks_review_url: s.thanks_review_url, thanks_note: s.thanks_note, thanks_preview: thanksPreview(B),
      nudge_on: s.nudge_on, nudge_weeks: s.nudge_weeks, nudge_note: s.nudge_note, nudge_page: s.nudge_page, nudge_preview: nudgePreview(B),
      switches: { addons_on: !!B.switches.addons_on, intake_on: !!B.switches.intake_on } };
    if (B.switches.intake_on) { o.intake_on = true; o.intake_keep_days = s.intake_keep_days; o.intake_keep_choices = [30, 60, 90, 180, 365, 730, 1095, 1825]; }
    return o;
  }

  W.on('bookings/overview', function () {
    var B = st(), now = Date.now(), T = today();
    var up = B.bookings.filter(function (b) { return live(b) && endMs(b) > now; }).sort(function (x, y) { return startMs(x.date, x.start) - startMs(y.date, y.start); });
    var past = B.bookings.filter(function (b) { return (b.status === 'confirmed' && endMs(b) <= now && now - endMs(b) < 60 * 86400000) || b.status === 'canceled'; })
      .sort(function (x, y) { return startMs(y.date, y.start) - startMs(x.date, x.start); });
    var res = {
      booking: { sample: true, name: B.owner.name, active: true, zone: 'Pacific', hours: JSON.parse(JSON.stringify(B.hours)), notice_hours: B.settings.notice_hours, horizon_days: B.settings.horizon_days,
        buffer_min: B.settings.buffer_min, cancel_window_hours: B.settings.cancel_window_hours, locations: ['studio', 'video'], payments: true, payments_test: true,
        feed_url: B.owner.feed_url, page_url: B.owner.page_url, settings: settingsOut(B), questions: JSON.parse(JSON.stringify(B.questions)), now: new Date().toISOString(), today: T },
      overrides: Object.keys(B.overrides).filter(function (d) { return d >= T; }).sort().map(function (d) {
        var o = B.overrides[d]; return { id: mkId('ov'), date: d, label: dayLabel(d), windows: o.windows, closed: !o.windows.length, hours_label: winsLabel(o.windows), note: o.note || '' }; }),
      repeats: B.repeats.map(repOut),
      calendars: B.calendars.map(calOut),
      services: B.services.map(svcOut),
      upcoming: up.map(function (b) { return ownerRow(B, b); }),
      past: past.map(function (b) { return ownerRow(B, b); }),
      time_off: B.timeOff.filter(function (t) { return t.to >= T; }).sort(function (x, y) { return x.from < y.from ? -1 : 1; }).map(function (t) { return { id: t.id, label: offLabel(t), note: t.note }; })
    };
    if (B.switches.addons_on) { res.booking.addons_on = true; res.booking.addons_max = 12; res.addons = B.addons.map(function (a) { return { id: a.id, name: a.name, description: a.description, price_cents: a.price_cents, active: a.active, services: a.services.slice() }; }); }
    return res;
  });

  // ------------------------------------------------------------------ a booking: cancel, slots, move, no-show
  function mine(B, id) { return B.bookings.filter(function (b) { return b.id === id; })[0] || null; }
  W.on('bookings/cancel', function (body) {
    var B = st(), b = mine(B, body.id);
    if (!b) return W.fail(404, 'not_found');
    if (b.status === 'canceled') return { __status: 409, body: { error: 'canceled' } };
    var wasPending = b.status === 'pending';
    b.status = 'canceled'; b.canceled_by = 'owner';
    return { ok: true, emailed: body.tell !== false && !wasPending, booking: ownerRow(B, b) };
  });
  W.on('bookings/slots', function (body) {
    var B = st(), b = mine(B, body.id);
    if (!b) return W.fail(404, 'not_found');
    if (b.status !== 'confirmed') return { __status: 409, body: { error: 'canceled' } };
    return { ok: true, zone: 'Pacific', days: slotsFor(B, b.minutes, { except: b.id, noNotice: true, svc: svcOf(B, b) }) };
  });
  W.on('bookings/move', function (body) {
    var B = st(), b = mine(B, body.id);
    if (!b) return W.fail(404, 'not_found');
    if (typeof body.at !== 'string' || isNaN(Date.parse(body.at))) return badIn('at');
    if (b.status !== 'confirmed') return { __status: 409, body: { error: 'canceled' } };
    if (!slotHas(slotsFor(B, b.minutes, { except: b.id, noNotice: true, svc: svcOf(B, b) }), body.at)) return { __status: 409, body: { error: 'slot_taken' } };
    var f = fromAt(body.at);
    b.date = f.date; b.start = f.start;
    return { ok: true, emailed: true, booking: ownerRow(B, b) };
  });
  function earlierNoshows(B, b) { return B.bookings.filter(function (x) { return x.id !== b.id && x.email === b.email && x.noshow; }).length; }
  function feeOf(price, pct) { return Math.round(price * pct / 100); }
  function noshowLabel(pct) { return pct === 100 ? 'full price' : pct === 50 ? 'half' : pct + '%'; }
  function quote(B, b) {
    var s = svcOf(B, b), price = s ? s.price_cents : 0, earlier = earlierNoshows(B, b);
    var first = B.settings.noshow_first_pct, rep = B.settings.noshow_repeat_pct;
    var mk = function (choice, pct) {
      var c = feeOf(price, pct);
      return { choice: choice, pct: pct, amount_cents: c, amount: money(c), label: 'Charge ' + noshowLabel(pct) + ' (' + money(c) + ')',
        confirm: 'Charge ' + b.name + ' ' + money(c) + ' for the missed ' + b.service_name + ' on ' + b.when + '?', can: !!b.card && c >= 50 };
    };
    var opts = earlier > 0 ? [mk('repeat', rep), mk('first', first)] : [mk('first', first), mk('repeat', rep)];
    if (first === rep) opts = opts.slice(0, 1);
    var note = '';
    if (!b.card) note = 'No card was saved for this booking, so there’s nothing to charge. You can still mark it as a no-show.';
    else if (!price) note = 'This session has no price set, so there’s nothing to charge. You can still mark it as a no-show.';
    return { suggest: earlier > 0 ? 'repeat' : 'first', earlier: earlier, price: money(price),
      why: earlier > 0 ? 'They’ve missed a booking with you before, so the fee is the full price: ' + money(feeOf(price, rep)) + '.' : 'This is their first no-show with you, so the fee is ' + (first === 50 ? 'half the price' : first + '% of the price') + ': ' + money(feeOf(price, first)) + '.',
      note: note, options: opts, none: { choice: 'none', label: 'Mark no-show, no charge', confirm: 'Mark ' + b.name + ' as a no-show for ' + b.service_name + ' on ' + b.when + ', with no charge?' } };
  }
  W.on('bookings/noshow-quote', function (body) {
    var B = st(), b = mine(B, body.id);
    if (!b) return W.fail(404, 'not_found');
    var row = ownerRow(B, b);
    if (b.noshow) return { ok: true, already: true, booking: row };
    if (!row.can_noshow) return { __status: 409, body: { error: 'not_markable' } };
    return Object.assign({ ok: true, booking: row }, quote(B, Object.assign({}, b, { when: row.when })));
  });
  W.on('bookings/noshow', function (body) {
    var B = st(), b = mine(B, body.id);
    if (!b) return W.fail(404, 'not_found');
    if (['first', 'repeat', 'none'].indexOf(body.choice) < 0) return badIn('choice');
    var row = ownerRow(B, b);
    if (b.noshow) return { ok: true, already: true, booking: row, noshow: row.noshow, message: row.noshow.words };
    if (!row.can_noshow) return { __status: 409, body: { error: 'not_markable' } };
    var s = svcOf(B, b), price = s ? s.price_cents : 0, state, words;
    if (body.choice === 'none') { state = 'no_charge'; words = 'Marked as a no-show, with no charge.'; }
    else if (!b.card) { state = 'no_card'; words = 'Marked as a no-show. No card was saved for this booking, so nothing was charged.'; }
    else { var c = feeOf(price, body.choice === 'first' ? B.settings.noshow_first_pct : B.settings.noshow_repeat_pct); state = 'charged'; words = 'Charged ' + money(c) + ' to ' + b.name + '’s card. A short receipt is on its way to them.'; }
    b.noshow = { state: state, words: words };
    var out = ownerRow(B, b);
    return { ok: true, booking: out, noshow: out.noshow, message: words + (state === 'charged' ? ' This is practice, so nothing was really charged.' : '') };
  });

  // ------------------------------------------------------------------ the month and the week
  W.on('bookings/month', function (body) {
    var B = st(), m = /^(\d{4})-(\d{2})$/.exec(String(body.month || ''));
    if (!m || +m[2] < 1 || +m[2] > 12) return badIn('month');
    var first = m[1] + '-' + m[2] + '-01', days = [], d = first;
    while (d.slice(0, 7) === first.slice(0, 7)) { days.push(monthDay(B, d)); d = plus(d, 1); }
    return { ok: true, month: first.slice(0, 7), today: today(), horizon_last: W.isoDay(B.settings.horizon_days), days: days };
  });
  W.on('bookings/week', function (body) {
    var B = st(), re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(String(body.from))) return badIn('from');
    if (!re.test(String(body.to)) || body.to < body.from || daysBetween(body.from, body.to) > 14) return badIn('to');
    var events = [], days = [];
    var ev = function (kind, id, date, a, z, extra) {
      var e = { id: id, kind: kind, sd: date, sm: a, ed: z >= 1440 ? plus(date, 1) : date, em: z >= 1440 ? z - 1440 : z };
      return Object.assign(e, extra);
    };
    for (var d = body.from; d <= body.to; d = plus(d, 1)) {
      days.push({ date: d, windows: openWins(B, d).map(function (w) { return [w[0], w[1]]; }) });
      B.bookings.filter(function (b) { return b.date === d && live(b); }).forEach(function (b) {
        events.push(ev('session', b.id, d, b.start, b.start + b.minutes, { title: b.name, service_name: b.service_name, minutes: b.minutes, location: b.location }));
      });
      offOn(B, d).forEach(function (x) { events.push(ev('off', '', d, x[0], x[1], { title: 'Time off' })); });
      repOn(B, d).forEach(function (x) { events.push(ev('off', '', d, x[0], x[1], { title: 'Blocked' })); });
      busyOn(B, d).forEach(function (x) { events.push(ev('busy', '', d, x[0], x[1], { title: 'Busy in your other calendar' })); });
    }
    return { ok: true, from: body.from, to: body.to, today: today(), now_min: nowMin(), zone: 'Pacific', days: days, events: events };
  });

  // ------------------------------------------------------------------ book for a client (the Schedule tab)
  W.on('bookings/book-slots', function (body) {
    var B = st(), s = B.services.filter(function (x) { return x.id === body.service && x.active; })[0];
    if (!s) return { __status: 404, body: { error: 'not_found', field: 'service' } };
    if (s.package_count !== 1) return { __status: 409, body: { error: 'package' } };
    return { ok: true, zone: 'Pacific', days: slotsFor(B, s.minutes, { svc: s, noNotice: true }).slice(0, 60) };
  });
  W.on('bookings/book-for', function (body) {
    var B = st(), s = B.services.filter(function (x) { return x.id === body.service && x.active; })[0];
    if (!s) return { __status: 404, body: { error: 'not_found', field: 'service' } };
    if (s.package_count !== 1) return { __status: 409, body: { error: 'package' } };
    if (typeof body.at !== 'string' || isNaN(Date.parse(body.at))) return badIn('at');
    var name = String(body.name || '').trim().slice(0, 120), email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    if (!name) return { __status: 400, body: { error: 'input', fields: [{ field: 'name', why: 'required' }] } };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { __status: 400, body: { error: 'input', fields: [{ field: 'email', why: 'format' }] } };
    if (!slotHas(slotsFor(B, s.minutes, { svc: s, noNotice: true }), body.at)) return { __status: 409, body: { error: 'slot_taken' } };
    var f = fromAt(body.at);
    var row = { id: mkId('bk'), date: f.date, start: f.start, minutes: s.minutes, svc: s.id, service_name: s.name, location: s.location, name: name, email: email, phone: String(body.phone || '').slice(0, 40),
      note: String(body.note || '').slice(0, 1000), status: 'confirmed', group: 'g' + Date.now(), group_index: 1, group_size: 1, deposit_cents: 0, paid: false, canceled_by: '', client_reason: '',
      answers: [], heads: '', card: false, addons: '', addons_total: '', noshow: null };
    B.bookings.push(row);
    return { ok: true, emailed: body.tell === true, booking: ownerRow(B, row) };
  });

  // ------------------------------------------------------------------ days, time off, repeats, hours
  function whole(B, date) { return offOn(B, date).some(function (x) { return x[0] <= 0 && x[1] >= 1440; }); }
  function clashes(B, date, wins) {
    return B.bookings.filter(function (b) { return live(b) && b.date === date && !wins.some(function (w) { return b.start >= mins(w[0]) && b.start + b.minutes <= mins(w[1]); }); })
      .map(function (b) { return { id: b.id }; });
  }
  function openTimeOffOn(B, date) {
    var n = 0, next = [];
    B.timeOff.forEach(function (t) {
      if (!(t.from <= date && t.to >= date) || !t.allDay && t.from !== date) { next.push(t); return; }
      n++;
      if (!t.allDay || t.from === t.to) return;
      if (t.from === date) { t.from = plus(date, 1); next.push(t); } else if (t.to === date) { t.to = plus(date, -1); next.push(t); } else {
        next.push({ id: t.id, from: t.from, to: plus(date, -1), allDay: true, start: '', end: '', note: t.note });
        next.push({ id: mkId('to'), from: plus(date, 1), to: t.to, allDay: true, start: '', end: '', note: t.note });
      }
    });
    B.timeOff = next;
    return n;
  }
  function checkWins(list) {
    if (!Array.isArray(list) || list.length > 4) return null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (!Array.isArray(w) || w.length !== 2 || !/^\d\d:\d\d$/.test(w[0]) || !/^\d\d:\d\d$/.test(w[1])) return null;
      var a = mins(w[0]), z = mins(w[1]);
      if (a % 15 || z % 15 || a < 0 || z > 1440 || z <= a) return null;
      out.push([hm(a), z === 1440 ? '24:00' : hm(z)]);
    }
    out.sort(function (x, y) { return x[0] < y[0] ? -1 : 1; });
    for (var j = 1; j < out.length; j++) if (mins(out[j][0]) < mins(out[j - 1][1])) return null;
    return out;
  }
  W.on('bookings/day-set', function (body) {
    var B = st();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) return badIn('date');
    if (['closed', 'usual', 'hours'].indexOf(body.mode) < 0) return badIn('mode');
    var date = body.date, overlaps = [], opened = 0;
    if (body.mode === 'closed') { B.overrides[date] = { windows: [], note: '' }; overlaps = clashes(B, date, []); }
    else if (body.mode === 'usual') { delete B.overrides[date]; opened = openTimeOffOn(B, date); }
    else {
      var w = checkWins(body.windows);
      if (!w || !w.length) return badIn('windows');
      B.overrides[date] = { windows: w, note: '' }; opened = openTimeOffOn(B, date); overlaps = clashes(B, date, w);
    }
    return { ok: true, day: monthDay(B, date), opened_time_off: opened, overlaps: overlaps };
  });
  W.on('bookings/time-off-add', function (body) {
    var B = st(), re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(String(body.from))) return badIn('from');
    var to = body.to ? String(body.to) : body.from;
    if (!re.test(to) || to < body.from) return badIn('to');
    var t = { id: mkId('to'), from: body.from, to: to, allDay: true, start: '', end: '', note: String(body.note || '').slice(0, 200) };
    if (body.start || body.end) {
      var a = /^\d\d:\d\d$/.test(String(body.start)) ? mins(body.start) : -1, z = /^\d\d:\d\d$/.test(String(body.end)) ? mins(body.end) : -1;
      if (a < 0 || z <= a || a % 15 || z % 15) return badIn('start');
      t.allDay = false; t.to = t.from; t.start = body.start; t.end = body.end;
    }
    if (B.timeOff.length >= 300) return badIn('from', 'too_many');
    B.timeOff.push(t);
    var hits = B.bookings.filter(function (b) {
      if (!live(b) || b.date < t.from || b.date > t.to) return false;
      return t.allDay || overlap(b.start, b.start + b.minutes, mins(t.start), mins(t.end));
    }).map(function (b) { return { id: b.id }; });
    return { ok: true, item: { id: t.id, label: offLabel(t), note: t.note }, overlaps: hits };
  });
  W.on('bookings/time-off-remove', function (body) {
    var B = st(), n = B.timeOff.length;
    B.timeOff = B.timeOff.filter(function (t) { return t.id !== body.id; });
    return B.timeOff.length === n ? W.fail(404, 'not_found') : { ok: true };
  });
  W.on('bookings/repeat-save', function (body) {
    var B = st();
    var days = Array.isArray(body.days) ? body.days.filter(function (k) { return REP_LONG[k]; }) : [];
    if (!days.length) return badIn('days');
    var a = /^\d\d:\d\d$/.test(String(body.start)) ? mins(body.start) : -1, z = /^\d\d:\d\d$/.test(String(body.end)) ? mins(body.end) : -1;
    if (a < 0 || z <= a || a % 15 || z % 15 || z > 1440) return badIn('start');
    var ev = +body.every_weeks;
    if (!(ev >= 1 && ev <= 4)) return badIn('every_weeks');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.starts_on))) return badIn('starts_on');
    var ends = body.ends_on ? String(body.ends_on) : '';
    if (ends && (!/^\d{4}-\d{2}-\d{2}$/.test(ends) || ends < body.starts_on)) return badIn('ends_on');
    var r = body.id ? B.repeats.filter(function (x) { return x.id === body.id; })[0] : null;
    if (body.id && !r) return W.fail(404, 'not_found');
    if (!r) { if (B.repeats.length >= 30) return badIn('days', 'too_many'); r = { id: mkId('rp') }; B.repeats.push(r); }
    Object.assign(r, { days: days, start: hm(a), end: z === 1440 ? '24:00' : hm(z), every_weeks: ev, starts_on: body.starts_on, ends_on: ends, note: String(body.note || '').slice(0, 200) });
    var hits = B.bookings.filter(function (b) { return live(b) && repApplies(r, b.date) && overlap(b.start, b.start + b.minutes, a, z); }).map(function (b) { return { id: b.id }; });
    return { ok: true, item: repOut(r), overlaps: hits };
  });
  W.on('bookings/repeat-remove', function (body) {
    var B = st(), n = B.repeats.length;
    B.repeats = B.repeats.filter(function (r) { return r.id !== body.id; });
    return B.repeats.length === n ? W.fail(404, 'not_found') : { ok: true };
  });
  W.on('bookings/hours', function (body) {
    var B = st(), keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], out = {};
    if (!body.hours || typeof body.hours !== 'object') return badIn('hours');
    for (var i = 0; i < keys.length; i++) { var w = checkWins(body.hours[keys[i]] || []); if (!w) return badIn(keys[i]); out[keys[i]] = w; }
    B.hours = out;
    return { ok: true, hours: JSON.parse(JSON.stringify(out)) };
  });

  // ------------------------------------------------------------------ settings
  W.on('bookings/settings', function (body) {
    var B = st(), s = B.settings;
    var num = function (k, lo, hi) { if (body[k] === undefined) return null; var v = body[k]; if (typeof v !== 'number' || Math.floor(v) !== v || v < lo || v > hi) return false; s[k] = v; return null; };
    var checks = [['notice_hours', 0, 720], ['horizon_days', 7, 365], ['buffer_min', 0, 240], ['cancel_window_hours', 0, 720], ['max_per_day', 0, 50], ['max_per_week', 0, 200], ['reminder_hours', 0, 48], ['slot_step', 0, 60],
      ['noshow_first_pct', 1, 100], ['noshow_repeat_pct', 1, 100], ['thanks_hours', 1, 72], ['nudge_weeks', 2, 52], ['intake_keep_days', 30, 1825]];
    for (var i = 0; i < checks.length; i++) if (num(checks[i][0], checks[i][1], checks[i][2]) === false) return badIn(checks[i][0]);
    ['card_on', 'thanks_on', 'nudge_on', 'requests_on'].forEach(function (k) { if (typeof body[k] === 'boolean') s[k] = body[k]; });
    ['card_policy', 'thanks_note', 'nudge_note'].forEach(function (k) { if (typeof body[k] === 'string') s[k] = body[k].slice(0, 600); });
    if (typeof body.thanks_review_url === 'string') s.thanks_review_url = body.thanks_review_url.trim().slice(0, 500);
    if (s.thanks_on && !s.thanks_review_url) { s.thanks_on = false; return badIn('thanks_review_url', '', 'Please add your Google review link first, so the note can include it.'); }
    if (typeof body.addons_on === 'boolean') B.switches.addons_on = body.addons_on;
    if (typeof body.intake_on === 'boolean') B.switches.intake_on = body.intake_on;
    return { ok: true, settings: settingsOut(B) };
  });

  // ------------------------------------------------------------------ services, questions, add-ons
  W.on('bookings/service-save', function (body) {
    var B = st();
    var name = String(body.name || '').trim().slice(0, 80);
    if (!name) return badIn('name');
    var m = body.minutes;
    if (!(Number.isInteger(m) && m >= 15 && m <= 480 && m % 5 === 0)) return badIn('minutes');
    if (!(Number.isInteger(body.price_cents) && body.price_cents >= 0)) return badIn('price_cents');
    if (!(Number.isInteger(body.deposit_cents) && body.deposit_cents >= 0)) return badIn('deposit_cents');
    if (['studio', 'video'].indexOf(body.location) < 0) return badIn('location', 'not_set_up');
    var pk = body.package_count === undefined ? 1 : body.package_count;
    if (!(Number.isInteger(pk) && pk >= 1 && pk <= 12)) return badIn('package_count');
    var hours = null;
    if (body.hours) { hours = {}; ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(function (k) { hours[k] = checkWins(body.hours[k] || []); }); if (Object.keys(hours).some(function (k) { return !hours[k]; })) return badIn('hours'); }
    var s = body.id ? B.services.filter(function (x) { return x.id === body.id; })[0] : null;
    if (body.id && !s) return W.fail(404, 'not_found');
    if (!s) { if (B.services.length >= 40) return badIn('name', 'too_many'); s = { id: mkId('sv'), key: '' }; B.services.push(s); }
    Object.assign(s, { name: name, minutes: m, price_cents: body.price_cents, deposit_cents: body.deposit_cents, description: String(body.description || '').slice(0, 600), location: body.location,
      package_count: pk, active: body.active !== false, hours: hours, max_per_day: +body.max_per_day || 0, max_per_week: +body.max_per_week || 0 });
    return { ok: true, service: svcOut(s) };
  });
  W.on('bookings/questions-save', function (body) {
    var B = st();
    if (!Array.isArray(body.questions)) return badIn('questions');
    var intake = !!B.switches.intake_on, max = intake ? 16 : 10, lmax = intake ? 200 : 120;
    if (body.questions.length > max) return badIn('questions', 'too_many');
    var out = [];
    for (var i = 0; i < body.questions.length; i++) {
      var q = body.questions[i] || {}, label = String(q.label || '').trim();
      if (!label || label.length > lmax) return { __status: 400, body: { error: 'input', field: 'label', index: i } };
      var type = ['text', 'long', 'yesno', 'choice'].indexOf(q.type) >= 0 ? q.type : 'text';
      var ch = type === 'choice' ? (Array.isArray(q.choices) ? q.choices.map(function (c) { return String(c).trim().slice(0, 60); }).filter(Boolean) : []) : [];
      if (type === 'choice' && (ch.length < 2 || ch.length > 12)) return { __status: 400, body: { error: 'input', field: 'choices', index: i } };
      out.push({ id: q.id || mkId('q').slice(2, 8), label: label, type: type, choices: ch, required: !!q.required, services: Array.isArray(q.services) ? q.services.slice() : [],
        new_only: intake && !!q.new_only, heads: intake && !!q.heads, heads_word: intake && q.heads ? String(q.heads_word || '').slice(0, 40) : '', hint: intake ? String(q.hint || '').slice(0, 400) : '' });
    }
    B.questions = out;
    return { ok: true, questions: JSON.parse(JSON.stringify(out)) };
  });
  W.on('bookings/intake-starter', function () {
    var B = st();
    if (!B.switches.intake_on) return W.fail(404, 'not_found');
    var starter = [
      { label: 'Best way to reach you', type: 'choice', choices: ['Call', 'Text', 'Email'], required: true },
      { label: 'Anything about your hands or wrists we should know?', type: 'text', required: false },
      { label: 'What would you love to make?', type: 'long', required: false, hint: 'A mug, a bowl, a vase, or just a happy mess.' }
    ];
    var have = B.questions.map(function (q) { return q.label; }), added = [], skipped = [], already = [];
    starter.forEach(function (x) {
      if (have.indexOf(x.label) >= 0) { already.push(x.label); return; }
      if (B.questions.length >= 16) { skipped.push(x.label); return; }
      B.questions.push({ id: mkId('q').slice(2, 8), label: x.label, type: x.type, choices: x.choices || [], required: !!x.required, services: [], new_only: true, heads: false, heads_word: '', hint: x.hint || '' });
      added.push(x.label);
    });
    return { ok: true, questions: JSON.parse(JSON.stringify(B.questions)), added: added, skipped: skipped, already: already };
  });
  function addonList(B) { return B.addons.map(function (a) { return { id: a.id, name: a.name, description: a.description, price_cents: a.price_cents, active: a.active, services: a.services.slice() }; }); }
  W.on('bookings/addon-save', function (body) {
    var B = st();
    if (!B.switches.addons_on) return W.fail(404, 'not_found');
    var name = String(body.name || '').trim().slice(0, 60);
    if (!name) return badIn('name');
    if (!(Number.isInteger(body.price_cents) && body.price_cents >= 0)) return badIn('price_cents');
    var a = body.id ? B.addons.filter(function (x) { return x.id === body.id; })[0] : null;
    if (body.id && !a) return W.fail(404, 'not_found');
    if (!a) { if (B.addons.length >= 12) return badIn('name', 'too_many'); a = { id: mkId('ad') }; B.addons.push(a); }
    Object.assign(a, { name: name, description: String(body.description || '').slice(0, 160), price_cents: body.price_cents, active: body.active !== false, services: Array.isArray(body.services) ? body.services.slice() : [] });
    return { ok: true, addon: { id: a.id, name: a.name, description: a.description, price_cents: a.price_cents, active: a.active, services: a.services.slice() }, addons: addonList(B) };
  });
  W.on('bookings/addon-move', function (body) {
    var B = st(), i = -1;
    B.addons.forEach(function (a, k) { if (a.id === body.id) i = k; });
    if (i < 0) return W.fail(404, 'not_found');
    if (body.dir !== 'up' && body.dir !== 'down') return badIn('dir');
    var j = body.dir === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < B.addons.length) { var t = B.addons[i]; B.addons[i] = B.addons[j]; B.addons[j] = t; }
    return { ok: true, addons: addonList(B) };
  });
  W.on('bookings/addon-remove', function (body) {
    var B = st(), n = B.addons.length;
    B.addons = B.addons.filter(function (a) { return a.id !== body.id; });
    return B.addons.length === n ? W.fail(404, 'not_found') : { ok: true, addons: addonList(B) };
  });

  // ------------------------------------------------------------------ their own calendars, the calendar link
  W.on('bookings/calendar-add', function (body) {
    var B = st(), url = String(body.url || '').trim();
    if (!/^(https:|webcal:)\/\//i.test(url)) return badIn('url', 'format');
    if (!/(google|icloud|outlook|office|proton|fastmail|yahoo)/i.test(url)) return badIn('url', 'host');
    if (B.calendars.length >= 5) return badIn('url', 'too_many');
    if (B.calendars.some(function (c) { return c.url === url; })) return badIn('url', 'already');
    var nowIso = new Date().toISOString(), tail = url.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase() || 'a1b2';
    var c = { id: mkId('cl'), url: url, label: String(body.label || '').trim().slice(0, 60), hint: 'Calendar, ending ' + tail, active: true, checked_at: nowIso, ok_at: nowIso, error: '', events: 3,
      busy: [{ date: W.isoDay(6), a: 540, z: 600 }, { date: W.isoDay(13), a: 780, z: 840 }, { date: W.isoDay(20), a: 600, z: 660 }] };
    B.calendars.push(c);
    return { ok: true, calendar: calOut(c) };
  });
  W.on('bookings/calendar-check', function (body) {
    var B = st(), c = B.calendars.filter(function (x) { return x.id === body.id; })[0];
    if (!c) return W.fail(404, 'not_found');
    c.checked_at = c.ok_at = new Date().toISOString(); c.error = '';
    return { ok: true, calendar: calOut(c) };
  });
  W.on('bookings/calendar-set', function (body) {
    var B = st(), c = B.calendars.filter(function (x) { return x.id === body.id; })[0];
    if (!c) return W.fail(404, 'not_found');
    if (typeof body.label === 'string') c.label = body.label.slice(0, 60);
    if (typeof body.active === 'boolean') c.active = body.active;
    return { ok: true, calendar: calOut(c) };
  });
  W.on('bookings/calendar-remove', function (body) {
    var B = st(), n = B.calendars.length;
    B.calendars = B.calendars.filter(function (c) { return c.id !== body.id; });
    return B.calendars.length === n ? W.fail(404, 'not_found') : { ok: true };
  });
  W.on('bookings/feed-new', function () {
    var B = st();
    B.owner.feedN++;
    B.owner.feed_url = 'https://example.test/fern-and-clay/calendar.ics?t=sample' + B.owner.feedN;
    return { ok: true, feed_url: B.owner.feed_url };
  });
  W.on('bookings/sample-reset', function () {
    var B = st(), n = B.bookings.length;
    S.bookings = seedAll();
    return { ok: true, cleared: n, made: S.bookings.bookings.length };
  });

  // ------------------------------------------------------------------ Your clients
  function peopleRows(B) {
    var now = Date.now(), map = {};
    var get = function (name, email, phone) {
      var k = email || ('hand:' + name);
      return map[k] || (map[k] = { key: k, name: name, email: email, phone: phone, visits: 0, noshows: 0, regular: false, first: '', last: '', last_day: '', first_day: '', next: '', next_ms: 0, hist: [] });
    };
    B.roster.forEach(function (p) {
      var r = get(p.name, p.email, p.phone);
      p.old.forEach(function (o) { r.hist.push({ ms: startMs(o.date, o.start), date: o.date, when: when(o.date, o.start), service: o.service, status: 'visit', word: 'Visit' }); });
    });
    B.bookings.forEach(function (b) {
      var r = get(b.name, b.email, b.phone), ms = startMs(b.date, b.start);
      if (b.phone) r.phone = b.phone;
      var size = b.group_size, svc = b.service_name + (size > 1 ? ' (' + b.group_index + ' of ' + size + ')' : '');
      var key, word;
      if (b.noshow) { key = 'noshow'; word = 'No-show'; } else if (b.status === 'canceled') { key = 'canceled'; word = b.canceled_by === 'owner' ? 'You canceled' : 'They canceled'; }
      else if (ms > now) { key = 'booked'; word = 'Booked'; } else { key = 'visit'; word = 'Visit'; }
      if (b.status === 'pending') { key = 'booked'; word = 'Booked'; }
      r.hist.push({ ms: ms, date: b.date, when: when(b.date, b.start), service: svc, status: key, word: word });
      if (key === 'booked' && (!r.next_ms || ms < r.next_ms)) { r.next_ms = ms; r.next = when(b.date, b.start); }
    });
    Object.keys(map).forEach(function (k) {
      var r = map[k], v = r.hist.filter(function (h) { return h.status === 'visit'; }).sort(function (a, b) { return a.ms - b.ms; });
      r.visits = v.length; r.noshows = r.hist.filter(function (h) { return h.status === 'noshow'; }).length; r.regular = r.visits >= 3;
      if (v.length) { r.first_day = v[0].date; r.last_day = v[v.length - 1].date; r.first = dateLabel(v[0].date); r.last = dateLabel(v[v.length - 1].date); }
    });
    // people she added by hand: a note on the line of someone who booked, or a line of their own
    B.hand.forEach(function (h) {
      var r = h.email && map[h.email] ? map[h.email] : null, both = !!r;
      if (!r) { r = get(h.name, h.email, h.phone); }
      if (!r.name) r.name = h.name;
      if (!r.phone) r.phone = h.phone;
      Object.assign(r, { added: true, source: both ? 'both' : 'you', added_id: h.id, added_name: h.name, added_email: h.email, added_phone: h.phone, added_note: h.note });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function personOut(r) {
    var o = { key: r.key, name: r.name, email: r.email, phone: r.phone, visits: r.visits, noshows: r.noshows, regular: r.regular, first: r.first, first_day: r.first_day, last: r.last, last_day: r.last_day, next: r.next };
    if (r.added) Object.assign(o, { added: true, source: r.source, added_id: r.added_id, added_name: r.added_name, added_email: r.added_email, added_phone: r.added_phone, added_note: r.added_note });
    return o;
  }
  function sortPeople(list) {
    return list.sort(function (a, b) {
      var x = a.last_day || '', y = b.last_day || '';
      if (x !== y) return x < y ? 1 : -1;
      return (a.next_ms || 9e15) - (b.next_ms || 9e15) || (a.name < b.name ? -1 : 1);
    });
  }
  W.on('bookings/clients', function (body) {
    var B = st(), q = String(body.q || '').trim().toLowerCase().slice(0, 80);
    var list = sortPeople(peopleRows(B)).filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) >= 0 || r.email.indexOf(q) >= 0 || (r.added_name || '').toLowerCase().indexOf(q) >= 0; });
    return { people: list.slice(0, 50).map(personOut), page: 0, page_size: 50, more: false, total: list.length, regular_at: 3, searched: !!q };
  });
  W.on('bookings/client', function (body) {
    var B = st(), k = String(body.email || '').trim().toLowerCase();
    var r = peopleRows(B).filter(function (x) { return x.key === k; })[0];
    if (!r || !r.hist.length) return W.fail(404, 'not_found');
    return { email: k, bookings: r.hist.sort(function (a, b) { return b.ms - a.ms; }).slice(0, 200).map(function (h) { return { when: h.when, day: h.date, service: h.service, status: h.status, status_word: h.word }; }), more: false };
  });
  function cleanPerson(body) {
    var name = String(body.name || '').trim().slice(0, 200), email = String(body.email || '').trim().toLowerCase().slice(0, 300), phone = String(body.phone || '').trim().slice(0, 60);
    if (!name) return { err: badIn('name', '', 'Add their name.') };
    if (name.length > 120) return { err: badIn('name', 'long', 'A name can be up to 120 letters.') };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { err: badIn('email', 'format', 'That email doesn’t look quite right. Check for a little typo?') };
    if (!email && !phone) return { err: badIn('contact', '', 'Add an email or a phone, so you can reach them.') };
    return { p: { name: name, email: email, phone: phone, note: String(body.note || '').slice(0, 500) } };
  }
  function personFor(B, h) { return personOut(peopleRows(B).filter(function (r) { return r.added_id === h.id; })[0]); }
  function takenBy(B, email, id) { return !!email && B.hand.some(function (h) { return h.email === email && h.id !== id; }); }
  W.on('bookings/people-add', function (body) {
    var B = st(), c = cleanPerson(body);
    if (c.err) return c.err;
    if (takenBy(B, c.p.email, '')) return { __status: 409, body: { error: 'taken', field: 'email', message: 'You already have someone with that email on your list.' } };
    if (B.hand.length >= 500) return badIn('name', 'too_many');
    var h = Object.assign({ id: mkId('hd') }, c.p);
    B.hand.push(h);
    return { ok: true, person: personFor(B, h) };
  });
  W.on('bookings/people-edit', function (body) {
    var B = st(), h = B.hand.filter(function (x) { return x.id === body.id; })[0];
    if (!h) return W.fail(404, 'not_found');
    var c = cleanPerson(body);
    if (c.err) return c.err;
    if (takenBy(B, c.p.email, h.id)) return { __status: 409, body: { error: 'taken', field: 'email', message: 'You already have someone with that email on your list.' } };
    Object.assign(h, c.p);
    return { ok: true, person: personFor(B, h) };
  });
  W.on('bookings/people-remove', function (body) {
    var B = st(), n = B.hand.length;
    B.hand = B.hand.filter(function (h) { return h.id !== body.id; });
    return B.hand.length === n ? W.fail(404, 'not_found') : { ok: true };
  });
  W.on('bookings/clients-csv', function () {
    var B = st(), rows = sortPeople(peopleRows(B));
    var cell = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = ['Name,Email,Phone,Visits,No-shows,First visit,Last visit,Next booking'].concat(rows.map(function (r) {
      return [r.name, r.email, r.phone, r.visits, r.noshows, r.first, r.last, r.next].map(cell).join(',');
    }));
    return { __blob: new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }), type: 'text/csv' };
  });

  // ------------------------------------------------------------------ phone alerts (portal-alerts.js): harmless answers
  var SMS_CONSENT = 'I agree to get short text alerts about my bookings. Message and data rates may apply. Reply STOP to stop.';
  function smsOut() { var B = st(); return { available: true, on: !!B.sms.on, last4: B.sms.last4 || '0142', consent: SMS_CONSENT }; }
  W.on('portal/push-key', function () { return { key: '' }; });
  W.on('portal/push-status', function () { return { ok: true, enabled: true, phones: 0, last_ok: '', sms: smsOut() }; });
  W.on('portal/push-subscribe', function () { return { ok: true, phones: 1 }; });
  W.on('portal/push-unsubscribe', function () { return { ok: true, phones: 0 }; });
  W.on('portal/push-test', function () { return { ok: true, phones: 0, sent: 0 }; });
  W.on('portal/sms-alerts', function (body) {
    var B = st();
    if (body.on === true) { var d = String(body.phone || '').replace(/\D/g, ''); B.sms = { on: true, last4: d.slice(-4) || '0142' }; } else B.sms = { on: false, last4: B.sms.last4 };
    return { ok: true, sms: smsOut() };
  });
  W.on('portal/sms-alerts-test', function () { return { ok: true }; });
})();
