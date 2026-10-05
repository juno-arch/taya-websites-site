/* =====================================================================================================
   The sample client for portal.html's preview. portal.js loads this file only while DEMO = true.

   Nothing here talks to any server and nothing is sent: sign-in, uploads, answers and change requests all
   stay in this browser tab's memory, and a reload starts the sample fresh (the "signed in" key and which
   sample is showing last for this visit only).

   Demo sign-in: demo@webfaery.love, code 000000. Any other code gets the wrong-code message. The real
   server has no fixed code and no demo account: this file is the only place either exists.

   The sample: Rosa Linden of Fern & Clay Pottery, a founding Tended client (build $600 founding, deposit
   $300; care $45 a month, always full price). Four moments in her project, picked from "Show me":
     mockup    her first visit (Oct 2 2026 flow): "Your turn: look over your mockup", nothing to sign or pay
     waiting   she tapped Done on her mockup: "My turn: that's it for you for now"
     new       Taya opened getting started: one item, her getting-started page (signing and the deposit are on it)
     mid       the draft is under way (the default)
     launched  launch day: settling in, the second half due, care waiting until settling in ends, "Ask for a change" open
     care      in care: everything paid, two past asks with Taya's replies
   Every date is counted from today, so each moment reads true whatever day it's opened.
   The answers have exactly the shapes the server sends (API.md in the hub's webfaery-portal-docs), so the
   page can't tell them apart.
   ===================================================================================================== */
(function () {
  'use strict';

  var EMAIL = 'demo@webfaery.love';
  var CODE = '000000';
  var SCENE_KEY = 'wf-portal-demo-scene';
  var IN_KEY = 'wf-portal-demo-in';
  var STRIPE = 'https://buy.stripe.com/sample-link-for-the-preview';

  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* this visit only anyway */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* fine */ } }
  };

  function err(code, status) { var e = new Error(code); e.code = code; e.status = status || 0; return e; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function randomKey() {
    var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', out = 'demo';
    var b = new Uint8Array(44);
    crypto.getRandomValues(b);
    for (var i = 0; i < b.length; i++) out += abc[b[i] % abc.length];
    return out;
  }
  // a calendar day n days from today (negative for the past), as the server sends it
  function day(n) {
    var t = new Date(); t.setDate(t.getDate() + (n || 0));
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function today() { return day(0); }
  function spoken(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    return m ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : d;
  }
  function replyBy() {
    var t = new Date(), d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), 12)), left = 2;
    while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--; }
    return d.toISOString().slice(0, 10);
  }

  /* ---------------- the four moments ---------------- */
  var CLIENT = {
    first_name: 'Rosa', business: 'Fern & Clay Pottery', build: 'mother', build_label: 'Tended', founding: true,
    care: 'monthly', care_active: false, site_url: '', email: EMAIL
  };
  function stages(dates, current) {
    var keys = ['getting_started', 'call', 'draft', 'changes', 'launch', 'settling_in'];
    var labels = ['Getting started', 'Your story', 'Draft', 'Changes', 'Launch', 'Settling in'];
    var ci = keys.indexOf(current);
    if (ci < 0) ci = keys.length;
    return keys.map(function (k, i) { return { key: k, label: labels[i], date: dates[i] || '', state: i < ci ? 'done' : (i === ci ? 'now' : 'next') }; });
  }
  // the plan, counted from today: [started, call, draft, changes, launch, settled]
  function plan(start) { return [0, 7, 21, 28, 35, 65].map(function (n) { return day(start + n); }); }
  function item(id, title, detail, kind, extra) {
    var o = { id: id, title: title, detail: detail, kind: kind, start_step: '', url: '', accept: '', status: 'open',
      answer: '', files_count: 0, sent_on: '', derived: id.indexOf('d:') === 0 };
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  var DEPOSIT_DAY = { mid: day(-8), launched: day(-35), care: day(-100) };
  function agreement(signedOn) { return { file: true, signed_name: 'Rosa Linden', signed_on: signedOn, version: '2026-09-30' }; }
  var RECEIPT_DEPOSIT = { name: 'Deposit_receipt_k2m9x7q4ab.pdf', label: 'Deposit receipt' };
  var RECEIPT_BALANCE = { name: 'Second_half_receipt_p8d3n5w1zc.pdf', label: 'Second half receipt' };
  var RECEIPT_CARE = { name: 'Care_receipt_t6v2h9r4ye.pdf', label: 'Care receipt' };
  var receiptDays = {};

  var SCENES = {
    // the magic mockup step: getting started is closed, so no list, no payments, and the turn card on top
    mockup: function () { return mockupScene(''); },
    waiting: function () { return mockupScene(today()); },
    'new': function () {
      return {
        ok: true,
        client: Object.assign({}, CLIENT),
        note: { text: 'So glad you said yes! Start whenever you’re ready. There’s no rush, and no wrong answers.', date: today() },
        list: {
          open: [
            item('wfdemo00000001a', 'Fill in your getting-started page', 'A short list with only what you need. It saves as you go.', 'start', { start_step: 'top' })
          ],
          done: []
        },
        timeline: { current: 'getting_started', stages: stages([today()], 'getting_started'), care_since: '' },
        things: { draft: null, agreement: null, brand_sheet: false, handoff_sheet: false, receipts: [] },
        pay: [
          { key: 'deposit', amount: 300, period: '', state: 'later', paid_on: '', starts_on: '', url: '' },
          { key: 'balance', amount: 300, period: '', state: 'later', paid_on: '', starts_on: '', url: '' },
          { key: 'care', amount: 45, period: 'month', state: 'later', paid_on: '', starts_on: '', url: '' }
        ],
        care_manage_url: '',
        care: { can_ask: false, requests: [] },
        session: { expires_at: '' }
      };
    },
    mid: function () {
      var d = plan(-8);
      receiptDays = { deposit: DEPOSIT_DAY.mid };
      return {
        ok: true,
        client: Object.assign({}, CLIENT),
        note: { text: 'Your draft is coming along beautifully. The teal from your mugs is the star 😊', date: day(-1) },
        list: {
          open: [
            item('wfdemo00000002a', 'Send your photos', 'You at the wheel, your pieces, your studio. A few is plenty. Big photos shrink on your phone before they send.', 'upload', { accept: 'photos' }),
            item('wfdemo00000002b', 'What’s your web address?', 'If you already own one, like fernandclay.com. Not sure? Just say so.', 'answer'),
            item('wfdemo00000002c', 'Add me as a manager on your Google profile', 'About 2 minutes, and the steps are right here.', 'start', { start_step: 'accounts' }),
            item('d:draft', 'Look over your draft', 'Jot down anything you’d like changed.', 'link', { url: 'https://draft.example.com/fern-and-clay' })
          ],
          done: [
            { id: 'wfdemo00000002d', title: 'Fill in your getting-started page' },
            { id: 'wfdemo00000002e', title: 'Sign and hold your spot' },
            { id: 'wfdemo00000002f', title: 'Send your logo files' }
          ]
        },
        timeline: { current: 'draft', stages: stages(d, 'draft'), care_since: '' },
        things: {
          draft: { url: 'https://draft.example.com/fern-and-clay', note: 'It’s private, so please don’t share the link yet.' },
          agreement: agreement(d[0]), brand_sheet: false, handoff_sheet: false, receipts: [clone(RECEIPT_DEPOSIT)]
        },
        pay: [
          { key: 'deposit', amount: 300, period: '', state: 'paid', paid_on: DEPOSIT_DAY.mid, starts_on: '', url: '' },
          { key: 'balance', amount: 300, period: '', state: 'later', paid_on: '', starts_on: '', url: '' },
          { key: 'care', amount: 45, period: 'month', state: 'later', paid_on: '', starts_on: d[5], url: '' }
        ],
        care_manage_url: '',
        care: { can_ask: false, requests: [] },
        session: { expires_at: '' }
      };
    },
    launched: function () {
      var d = plan(-35);
      receiptDays = { deposit: DEPOSIT_DAY.launched };
      return {
        ok: true,
        client: Object.assign({}, CLIENT, { site_url: 'https://fernandclay.com' }),
        note: { text: 'You’re live! 🎉 Take a slow look this week. Anything feel off, big or small? Ask for a change, further down. Settling-in tweaks are on me, and your care picks up right after, the same easy way.', date: today() },
        list: {
          open: [
            item('d:balance', 'Pay the second half', 'Due at launch.', 'pay', { pay_key: 'balance' })
          ],
          done: [
            { id: 'wfdemo00000003b', title: 'Fill in your getting-started page' },
            { id: 'wfdemo00000003c', title: 'Sign and hold your spot' },
            { id: 'wfdemo00000003d', title: 'Send your logo files' },
            { id: 'wfdemo00000003e', title: 'Send your photos' },
            { id: 'wfdemo00000003f', title: 'What’s your web address?' },
            { id: 'wfdemo00000003g', title: 'Add me as a manager on your Google profile' },
            { id: 'wfdemo00000003h', title: 'Look over your draft' }
          ]
        },
        timeline: { current: 'settling_in', stages: stages(d, 'settling_in'), care_since: '' },
        things: { draft: null, agreement: agreement(d[0]), brand_sheet: true, handoff_sheet: true, receipts: [clone(RECEIPT_DEPOSIT)] },
        pay: [
          { key: 'deposit', amount: 300, period: '', state: 'paid', paid_on: DEPOSIT_DAY.launched, starts_on: '', url: '' },
          { key: 'balance', amount: 300, period: '', state: 'due', paid_on: '', starts_on: '', url: STRIPE },
          // what the server sends on launch day: care waits until a few days before settling in ends
          { key: 'care', amount: 45, period: 'month', state: 'later', paid_on: '', starts_on: d[5], url: '' }
        ],
        care_manage_url: '',
        care: { can_ask: true, requests: [] },
        session: { expires_at: '' }
      };
    },
    care: function () {
      var d = plan(-100);
      receiptDays = { deposit: DEPOSIT_DAY.care, balance: d[4], care: d[5] };
      return {
        ok: true,
        client: Object.assign({}, CLIENT, { site_url: 'https://fernandclay.com', care_active: true }),
        note: null,
        list: {
          open: [],
          done: [
            { id: 'wfdemo00000004b', title: 'Fill in your getting-started page' },
            { id: 'wfdemo00000004c', title: 'Sign and hold your spot' },
            { id: 'wfdemo00000004d', title: 'Send your logo files' },
            { id: 'wfdemo00000004e', title: 'Send your photos' },
            { id: 'wfdemo00000004f', title: 'What’s your web address?' },
            { id: 'wfdemo00000004g', title: 'Add me as a manager on your Google profile' },
            { id: 'wfdemo00000004h', title: 'Look over your draft' },
            { id: 'wfdemo00000004i', title: 'Pay the second half' }
          ]
        },
        timeline: { current: 'care', stages: stages(d, 'care'), care_since: d[5] },
        things: { draft: null, agreement: agreement(d[0]), brand_sheet: true, handoff_sheet: true, receipts: [clone(RECEIPT_DEPOSIT), clone(RECEIPT_BALANCE), clone(RECEIPT_CARE)] },
        pay: [
          { key: 'deposit', amount: 300, period: '', state: 'paid', paid_on: DEPOSIT_DAY.care, starts_on: '', url: '' },
          { key: 'balance', amount: 300, period: '', state: 'paid', paid_on: d[4], starts_on: '', url: '' },
          { key: 'care', amount: 45, period: 'month', state: 'active', paid_on: d[5], starts_on: '', url: '' }
        ],
        care_manage_url: 'https://billing.stripe.com/sample-link-for-the-preview',
        care: {
          can_ask: true,
          requests: [
            { id: 'wfdemo00000004j', what: 'I’d love a page for our spring workshops, with a way to sign up.', where_on_site: 'A new page',
              status: 'quoted', taya_reply: 'Love this idea! It’s a bigger one, so I emailed you a price. Say yes and I’ll start.', created: day(-3), files_count: 0 },
            { id: 'wfdemo00000004k', what: 'Could you add our new class times? Tuesdays and Thursdays, 6 to 8.', where_on_site: 'Classes page and Google',
              status: 'done', taya_reply: 'Done! Your class times are up on your site and your Google profile. 🌿', created: day(-10), files_count: 0 }
          ]
        },
        session: { expires_at: '' }
      };
    }
  };

  function mockupScene(doneOn) {
    return {
      ok: true,
      client: Object.assign({}, CLIENT),
      note: null,
      list: { open: [], done: doneOn ? [{ id: 'wfdemo00000009a', title: 'Things you sent from your mockup' }] : [] },
      timeline: { current: 'getting_started', stages: stages([today()], 'getting_started'), care_since: '' },
      things: { draft: null, agreement: null, brand_sheet: false, handoff_sheet: false, receipts: [] },
      start_open: false,
      mockup: { url: 'https://webfaery.love/peek/tera/?mark=1', done_on: doneOn },
      sms: { available: false, on: false, last4: '' },
      pay: [],
      care_manage_url: '',
      care: { can_ask: false, requests: [] },
      session: { expires_at: '' }
    };
  }
  var scene = SCENES[ss.get(SCENE_KEY)] ? ss.get(SCENE_KEY) : 'mid';
  var data = SCENES[scene]();
  var failNext = '';

  function signedIn() { return ss.get(IN_KEY) === '1'; }
  // a moment picked from "Show me" (can't reach the server, signed out) happens on the very next call
  function pending() {
    if (!failNext) return null;
    var f = failNext; failNext = '';
    return f === 'network' ? err('network') : err(f, 401);
  }
  // every call after sign-in: that moment, or signed out, or nothing
  function gate() { return pending() || (signedIn() ? null : err('signed_out', 401)); }
  function refuse(e, ms) { return wait(ms || 300).then(function () { throw e; }); }

  /* ---------------- sample files: tiny real PDFs, made right here ---------------- */
  function pdf(title, lines) {
    var esc = function (s) { return s.replace(/[\\()]/g, '\\$&'); };
    var content = 'BT /F1 22 Tf 64 720 Td (' + esc(title) + ') Tj /F1 12 Tf 0 -40 Td 16 TL';
    lines.forEach(function (l) { content += ' (' + esc(l) + ') Tj T*'; });
    content += ' ET';
    var objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'
    ];
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    return new Blob([out], { type: 'application/pdf' });
  }
  var SAMPLE = 'This is sample data for the portal preview.';
  var FILES = {
    agreement: function () {
      return pdf('Our agreement (sample)', [
        'Between Taya of Web Faery and Rosa Linden, Fern & Clay Pottery.', '',
        'What we are building: a Tended build. A full site with a contact form,',
        'newsletter signup and a Book now button to your booking app.', '',
        'Price: $600, a founding price (half off), paid once.',
        'Half to start, half at launch.', '',
        'After launch: care at $45 a month, which keeps your site running.',
        'Billing starts after 30 days of settling in. If you ever stop care,',
        'the site is still yours, with every file and login.', '',
        'Two rounds of changes by email. The site is yours.', '',
        'Signed ' + spoken(data.things.agreement ? data.things.agreement.signed_on : today()) + ' as Rosa Linden. Version 2026-09-30.', '', SAMPLE
      ]);
    },
    brand_sheet: function () {
      return pdf('Fern & Clay Pottery: brand sheet (sample)', [
        'Colors', '  Teal #2F7F7A   Clay #C9825B   Cream #F4EDE1   Ink #2A2622', '',
        'Fonts', '  Headings: Fraunces   Words: Work Sans', '',
        'Logo files: in the folder I sent with this sheet.',
        'Ready for any designer or print shop, so flyers and cards can match.', '', SAMPLE
      ]);
    },
    handoff_sheet: function () {
      return pdf('Your site sheet (sample)', [
        'Your site: fernandclay.com', '',
        'Your web address: held for you, and you are the legal owner.',
        'Your Google profile: you are the owner, and I am a manager.',
        'Your newsletter on Buttondown: in your name, with your email.',
        'Your logins came to you privately at launch. Change each password the first time you sign in.', '',
        'How to reach me: taya@webfaery.love', 'I usually reply within 2 business days.', '', SAMPLE
      ]);
    },
    receipt: function (name) {
      var r = [RECEIPT_DEPOSIT, RECEIPT_BALANCE, RECEIPT_CARE].filter(function (x) { return x.name === name; })[0];
      if (!r) return null;
      var lines = r === RECEIPT_DEPOSIT ? ['Deposit for a Tended build (founding price)', 'Amount: $300.00', 'Paid ' + spoken(receiptDays.deposit || today()) + ' by card']
        : r === RECEIPT_BALANCE ? ['Second half of a Tended build (founding price)', 'Amount: $300.00', 'Paid ' + spoken(receiptDays.balance || today()) + ' by card']
          : ['Care, one month', 'Amount: $45.00', 'Paid ' + spoken(receiptDays.care || today()) + ' by card'];
      return pdf('Web Faery receipt (sample)', lines.concat(['', 'Thank you, Rosa!', '', SAMPLE]));
    }
  };

  function findItem(id) { return data.list.open.filter(function (x) { return x.id === id; })[0]; }

  /* ---------------- the same eight calls as the real server ---------------- */
  var api = {
    requestCode: function (who) {
      var p = pending(); if (p) return refuse(p, 700);
      return wait(700).then(function () {
        if (who && who.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) return { ok: true };
        if (who && who.phone && /^\d{10}$/.test(who.phone)) return { ok: true };
        throw err('input', 400);
      });
    },
    verifyCode: function (who, code) {
      var p = pending(); if (p) return refuse(p);
      return wait(600).then(function () {
        if (!who || who.email !== EMAIL || code !== CODE) throw err('code', 401);
        ss.set(IN_KEY, '1');
        return { ok: true, token: randomKey(), expires_at: '' };
      });
    },
    me: function () {
      var g = gate(); if (g) return refuse(g, 350);
      return wait(450).then(function () { return clone(data); });
    },
    logout: function () { ss.del(IN_KEY); return wait(150).then(function () { return { ok: true }; }); },
    file: function (thing, name) {
      var g = gate(); if (g) return refuse(g);
      return wait(350).then(function () {
        var t = data.things, blob = null;
        if (thing === 'agreement' && t.agreement && t.agreement.file) blob = FILES.agreement();
        else if (thing === 'brand_sheet' && t.brand_sheet) blob = FILES.brand_sheet();
        else if (thing === 'handoff_sheet' && t.handoff_sheet) blob = FILES.handoff_sheet();
        else if (thing === 'receipt' && t.receipts.some(function (r) { return r.name === name; })) blob = FILES.receipt(name);
        if (!blob) throw err('not_found', 404);
        return { blob: blob, type: 'application/pdf' };
      });
    },
    upload: function (id, files, onProgress) {
      var g = gate(); if (g) return refuse(g);
      var it = findItem(id);
      if (!it || it.kind !== 'upload') return refuse(err('not_found', 404));
      var steps = 8, i = 0;
      return new Promise(function (resolve) {
        var tick = setInterval(function () {
          i++;
          if (onProgress) onProgress(i / steps);
          if (i >= steps) { clearInterval(tick); resolve(); }
        }, 110);
      }).then(function () {
        it.files_count += files.length;
        it.status = 'sent';
        it.sent_on = today();
        return { ok: true, files_count: it.files_count };
      });
    },
    todo: function (id, action, text) {
      var g = gate(); if (g) return refuse(g);
      return wait(500).then(function () {
        var it = findItem(id);
        if (!it) throw err('not_found', 404);
        if (action === 'answer' && it.kind === 'answer' && text) it.client_answer = it.answer = String(text).slice(0, 1000);
        else if (!(action === 'sent' && (it.kind === 'start' || it.kind === 'link'))) throw err('input', 400);
        it.status = 'sent';
        it.sent_on = today();
        return { ok: true, status: 'sent' };
      });
    },
    change: function (req, onProgress) {
      var g = gate(); if (g) return refuse(g);
      if (!data.care.can_ask) return refuse(err('no_care', 403));
      if (onProgress && req.files.length) { onProgress(0.4); setTimeout(function () { onProgress(0.9); }, 300); }
      return wait(req.files.length ? 800 : 600).then(function () {
        var same = data.care.requests.filter(function (r) { return r._nonce === req.nonce; })[0];
        if (same) return { ok: true, id: same.id, reply_by: replyBy() };
        var id = 'wfdemo' + String(Date.now()).slice(-9);
        data.care.requests.unshift({ id: id, what: req.what.slice(0, 140), where_on_site: req.where, status: 'new', taya_reply: '',
          created: today(), files_count: req.files.length, _nonce: req.nonce });
        data.care.requests = data.care.requests.slice(0, 10);
        return { ok: true, id: id, reply_by: replyBy() };
      });
    }
  };

  window.WFPortalDemo = {
    email: EMAIL,
    code: CODE,
    api: api,
    scenario: function () { return scene; },
    setScenario: function (k) { if (!SCENES[k]) return; scene = k; data = SCENES[k](); ss.set(SCENE_KEY, k); },
    failNext: function (code) { failNext = code; },
    // "Show me" signs in by itself, so a sample is one tap away
    signIn: function () { ss.set(IN_KEY, '1'); return randomKey(); }
  };
})();
