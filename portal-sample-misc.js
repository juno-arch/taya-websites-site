/* =====================================================================================================
   Sample answers for the REST of the tools in portal.html?demo=1 (Nov 16 2026), for the made-up Fern & Clay Pottery
   (owner Rosa Linden): how she shows up on Google, her receipts box, the critique card, the how-to videos and guides,
   her messages with Taya (with attachments), phone alerts and texts, her business papers' own uploads, billing and the
   small account calls. Shapes follow hub API.md and the hub's pb_hooks (google, receipts, critique, resources,
   messages, push). Everything lives in this tab's memory (S.misc): add or delete a receipt, send a message, stop
   Google tracking, and the next answer says so; a reload starts fresh. Every email is @example.test and nothing
   leaves the page. Needs portal-sample.js first (window.WFSample).

   Two files are sent as forms through XMLHttpRequest (message attachments, a business paper), which the pretend
   server's fetch cannot catch, so this file also answers those two form posts itself (a small shim below that
   leaves every other request alone).
   ===================================================================================================== */
(function () {
  'use strict';
  var W = window.WFSample;
  if (!W) return;
  var S = W.S;
  var M = S.misc = S.misc || {};
  var SERVER = 'https://bookings.gardenfaery.love';

  var seq = 0;
  function mkId(prefix) { // 15 lowercase letters and numbers, like the server's ids
    seq++;
    return (prefix + String(seq) + 'fernclay0123456789').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fail(status, error, extra) { var b = { error: error }; for (var k in extra || {}) b[k] = extra[k]; return { __status: status, body: b }; }
  function ym(d) { return d.getFullYear() + '-' + W.pad(d.getMonth() + 1); }
  function monthsBack(n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(1); d.setMonth(d.getMonth() - n); return d; }
  function stamp(daysAgo, h, m) { var d = W.day(-daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); }
  function pngFrom(canvasFn, w, h) {
    return new Promise(function (resolve) {
      try {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        canvasFn(c.getContext('2d'), w, h);
        c.toBlob(function (b) { resolve(b || new Blob([''], { type: 'image/png' })); }, 'image/png');
      } catch (e) { resolve(new Blob([''], { type: 'image/png' })); }
    });
  }

  /* ================================================================ how she shows up on Google */
  // POST google/mine -> { google: { months: [ newest, the one before ] } } | { google: null, opted_out: true } | { google: null, soon: true }
  function googleFixture() {
    var a = ym(monthsBack(1)), b = ym(monthsBack(2));
    return {
      off: false,
      months: [
        { month: a, clicks: 142, impressions: 3860, position: 14.2,
          queries: [
            { k: 'fern and clay pottery', clicks: 38, impressions: 190 },
            { k: 'handmade ceramic mugs', clicks: 21, impressions: 940 },
            { k: 'pottery classes near me', clicks: 17, impressions: 720 },
            { k: 'wheel throwing class for beginners', clicks: 12, impressions: 410 },
            { k: 'handmade dinnerware set stoneware', clicks: 9, impressions: 530 }
          ],
          pages: [
            { k: '/', clicks: 61, impressions: 1210 },
            { k: '/shop', clicks: 34, impressions: 1180 },
            { k: '/classes', clicks: 27, impressions: 840 },
            { k: '/about', clicks: 11, impressions: 320 },
            { k: '/shop/mugs', clicks: 9, impressions: 310 }
          ] },
        { month: b, clicks: 118, impressions: 3210, position: 16.8,
          queries: [
            { k: 'fern and clay pottery', clicks: 31, impressions: 160 },
            { k: 'handmade ceramic mugs', clicks: 16, impressions: 760 },
            { k: 'pottery classes near me', clicks: 14, impressions: 650 },
            { k: 'linden falls farmers market pottery', clicks: 9, impressions: 140 },
            { k: 'handmade planters with drainage', clicks: 7, impressions: 380 }
          ],
          pages: [
            { k: '/', clicks: 52, impressions: 1010 },
            { k: '/shop', clicks: 27, impressions: 960 },
            { k: '/classes', clicks: 21, impressions: 690 },
            { k: '/about', clicks: 10, impressions: 290 },
            { k: '/shop/planters', clicks: 8, impressions: 260 }
          ] }
      ]
    };
  }
  M.google = googleFixture();
  W.on('google/mine', function () {
    var g = M.google;
    if (g.off) return { google: null, opted_out: true };
    if (!g.months.length) return { google: null, soon: true };
    return { google: { months: W.clone(g.months) } };
  });
  W.on('google/privacy', function (body) {
    var g = M.google;
    if (body && body.wipe === true) g.months = [];
    if (body && typeof body.off === 'boolean') {
      g.off = body.off;
      // tracking back on after a wipe: the next monthly update brings numbers (here, the sample's own again)
      if (!g.off && !g.months.length) g.months = googleFixture().months;
    }
    return { ok: true, active: !g.off };
  });

  /* ================================================================ receipts */
  var RC_CATS = { supplies: 'Supplies', tools: 'Tools and equipment', rent: 'Rent and studio', advertising: 'Advertising', insurance: 'Insurance', fees: 'Fees', other: 'Other' };
  function dayIn(monthOffset, dom) {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    var todayDom = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() - monthOffset);
    d.setDate(monthOffset === 0 ? Math.max(1, Math.min(dom, todayDom)) : Math.min(dom, 28));
    return W.iso(d);
  }
  function receiptSvg(r, lines) {
    var ls = lines && lines.length ? lines : [[r.note || 'Sale', r.amount_cents]];
    var y = 150, rows = '';
    ls.slice(0, 5).forEach(function (l) {
      rows += '<text x="26" y="' + y + '" font-size="15">' + esc(String(l[0]).slice(0, 24)) + '</text><text x="274" y="' + y + '" font-size="15" text-anchor="end">' + (l[1] / 100).toFixed(2) + '</text>';
      y += 26;
    });
    var tilt = (r.id.charCodeAt(r.id.length - 1) % 5) - 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#d9d3c7"/>' +
      '<g transform="rotate(' + tilt + ' 150 210)"><rect x="12" y="10" width="276" height="400" fill="#fbfaf6" stroke="#cfc8b8"/>' +
      '<g font-family="Courier New, monospace" fill="#3b3a36"><text x="150" y="52" font-size="19" font-weight="bold" text-anchor="middle">' + esc(r.vendor.slice(0, 22)) + '</text>' +
      '<text x="150" y="76" font-size="12" text-anchor="middle">Thank you for your business</text>' +
      '<text x="26" y="112" font-size="13">' + esc(r.date) + '</text><text x="274" y="112" font-size="13" text-anchor="end">#' + (1000 + r.id.charCodeAt(4) * 7) + '</text>' +
      '<line x1="26" y1="124" x2="274" y2="124" stroke="#8d8778" stroke-dasharray="3 3"/>' + rows +
      '<line x1="26" y1="' + (y + 4) + '" x2="274" y2="' + (y + 4) + '" stroke="#8d8778" stroke-dasharray="3 3"/>' +
      '<text x="26" y="' + (y + 34) + '" font-size="18" font-weight="bold">TOTAL</text><text x="274" y="' + (y + 34) + '" font-size="18" font-weight="bold" text-anchor="end">$' + (r.amount_cents / 100).toFixed(2) + '</text>' +
      '<text x="150" y="388" font-size="11" text-anchor="middle">Sample receipt, made up for the preview</text></g></g></svg>';
  }
  function fileNameOf(r) {
    if (!r.photo) return '';
    var slug = r.vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '');
    return 'receipt-' + (r.date || 'undated') + (slug ? '-' + slug : '') + '-' + r.id.slice(0, 5) + '.' + (r.data ? 'jpg' : 'svg');
  }
  function rcOut(r, same) {
    return { id: r.id, date: r.date, vendor: r.vendor, amount_cents: r.amount_cents, category: r.category, note: r.note,
      photo: !!r.photo, file_name: fileNameOf(r), maybe_same: !!same, draft: r.status === 'draft' };
  }
  function rcSeed() {
    // [monthsAgo, day, vendor, cents, category, note, photo?, lines]
    var rows = [
      [0, 14, 'Highlands Clay Supply', 8640, 'supplies', '50 lb bags of cone 6 stoneware, two', 1, [['Stoneware B-mix 50lb', 3900], ['Stoneware B-mix 50lb', 3900], ['Tax', 840]]],
      [0, 11, 'Riverside Farmers Market', 4500, 'fees', 'Saturday booth fee', 0, null],
      [0, 7, 'Glazeworks Pigment Co', 12395, 'supplies', 'Celadon and ash glaze, three pints', 1, [['Celadon glaze pint', 3495], ['Celadon glaze pint', 3495], ['Ash glaze pint', 3295], ['Shipping', 2110]]],
      [0, 3, 'Linden Falls Print Shop', 6850, 'advertising', 'Holiday market postcards, 200', 1, [['Postcards 4x6 x200', 6200], ['Tax', 650]]],
      [0, 1, 'Kilnside Mutual Insurance', 3400, 'insurance', 'Monthly premium', 0, null],
      [1, 26, 'Craft Box Supply', 5420, 'supplies', 'Mug boxes and tissue paper', 1, [['Mug gift box x50', 3800], ['Tissue 480 sheets', 1200], ['Tax', 420]]],
      [1, 19, 'Fern Street Studio Rent', 45000, 'rent', 'October studio space', 0, null],
      [1, 18, 'Hartley Hardware', 2349, 'tools', 'Sponges, wire cutter and a rib set', 1, [['Wire cutter', 799], ['Rib set', 1199], ['Sponges 6pk', 351]]],
      [1, 12, 'Highlands Clay Supply', 7920, 'supplies', 'Porcelain, one bag', 1, [['Porcelain 25lb', 7300], ['Tax', 620]]],
      [1, 12, 'Highlands Clay Supply', 7920, 'supplies', 'Porcelain, one bag', 1, [['Porcelain 25lb', 7300], ['Tax', 620]]],
      [1, 5, 'Riverside Farmers Market', 4500, 'fees', 'Saturday booth fee', 0, null],
      [2, 28, 'Pottery Parts Direct', 18900, 'tools', 'Replacement kiln element', 1, [['Element, 240V', 16900], ['Shipping', 2000]]],
      [2, 14, 'Fern Street Studio Rent', 45000, 'rent', 'September studio space', 0, null]
    ];
    var out = [];
    rows.forEach(function (x) {
      var r = { id: mkId('rc'), date: dayIn(x[0], x[1]), vendor: x[2], amount_cents: x[3], category: x[4], note: x[5], photo: !!x[6], status: 'saved', lines: x[7] };
      out.push(r);
    });
    return out;
  }
  M.rc = { rows: rcSeed(), used: 3, cap: 20, reads: 0 };
  var GUESSES = [
    { vendor: 'Highlands Clay Supply', amount_cents: 8640, category: 'supplies', note: 'Clay, two bags' },
    { vendor: 'Hartley Hardware', amount_cents: 1875, category: 'tools', note: 'Bats and a trimming tool' },
    { vendor: 'Craft Box Supply', amount_cents: 3240, category: 'supplies', note: 'Packing tape and boxes' }
  ];
  function rcFind(id) { for (var i = 0; i < M.rc.rows.length; i++) if (M.rc.rows[i].id === id) return M.rc.rows[i]; return null; }
  function rcSame(r) {
    return M.rc.rows.some(function (x) { return x !== r && x.status === 'saved' && x.date === r.date && x.vendor.toLowerCase() === r.vendor.toLowerCase() && x.amount_cents === r.amount_cents; });
  }
  function rcReads() { var left = Math.max(0, M.rc.cap - M.rc.used); return { used: M.rc.used, cap: M.rc.cap, left: left }; }
  W.on('receipts/mine', function (body) {
    var now = ym(new Date()), month = body && body.month ? String(body.month) : now;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail(400, 'input', { field: 'month' });
    var saved = M.rc.rows.filter(function (r) { return r.status === 'saved'; });
    var months = {};
    saved.forEach(function (r) { months[r.date.slice(0, 7)] = 1; });
    months[now] = 1;
    var rows = saved.filter(function (r) { return r.date.slice(0, 7) === month; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
      .map(function (r) { return rcOut(r, rcSame(r)); });
    return { receipts: { month: month, this_month: now, months: Object.keys(months).sort().reverse(), rows: rows, count: rows.length,
      total_cents: rows.reduce(function (s, r) { return s + r.amount_cents; }, 0), reads: rcReads(), reader: true } };
  });
  W.on('receipts/photo', function (body) {
    var img = String(body && body.image || '');
    var m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+\/=]+)$/.exec(img);
    if (!m) return fail(400, 'input', { field: 'image', reason: 'type' });
    var d = { id: mkId('rd'), date: '', vendor: '', amount_cents: 0, category: 'other', note: '', photo: true, status: 'draft', data: img };
    M.rc.rows.push(d);
    var read = null, why = 'skipped';
    if (body.read !== false) {
      if (M.rc.used >= M.rc.cap) why = 'cap';
      else {
        var g = GUESSES[M.rc.reads % GUESSES.length]; M.rc.reads++; M.rc.used++;
        read = { date: W.isoDay(0), vendor: g.vendor, amount_cents: g.amount_cents, category: g.category, note: g.note };
        why = '';
      }
    }
    return { receipt: rcOut(d, false), read: read, why: why, reads: rcReads(), same_photo: null };
  });
  function rcFields(b) {
    var date = String(b.date || ''), vendor = String(b.vendor || '').replace(/\s+/g, ' ').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > W.isoDay(0)) return { error: 'date' };
    if (!vendor || vendor.length > 120) return { error: 'vendor' };
    if (!(Number.isInteger(b.amount_cents) && b.amount_cents > 0 && b.amount_cents <= 99999999)) return { error: 'amount_cents' };
    var note = String(b.note || '').trim();
    if (note.length > 500) return { error: 'note' };
    return { date: date, vendor: vendor, amount_cents: b.amount_cents, category: RC_CATS[b.category] ? b.category : 'other', note: note };
  }
  function rcSave(body, edit) {
    var f = rcFields(body || {});
    if (f.error) return fail(400, 'input', { field: f.error });
    var r = null;
    if (body.id) {
      r = rcFind(String(body.id));
      if (!r || r.status !== (edit ? 'saved' : 'draft')) return fail(404, 'not_found');
    }
    var probe = { date: f.date, vendor: f.vendor, amount_cents: f.amount_cents };
    var twins = M.rc.rows.filter(function (x) { return x !== r && x.status === 'saved' && x.date === probe.date && x.vendor.toLowerCase() === probe.vendor.toLowerCase() && x.amount_cents === probe.amount_cents; });
    if (twins.length && !edit && body.anyway !== true) return fail(409, 'maybe_same', { same: twins.slice(0, 3).map(function (x) { return rcOut(x, true); }) });
    var inMonth = M.rc.rows.filter(function (x) { return x.status === 'saved' && x.date.slice(0, 7) === f.date.slice(0, 7); }).length;
    if (!edit && inMonth >= 300) return fail(409, 'full', { what: 'month' });
    if (!r) { r = { id: mkId('rc'), photo: false, lines: null }; M.rc.rows.push(r); }
    r.date = f.date; r.vendor = f.vendor; r.amount_cents = f.amount_cents; r.category = f.category; r.note = f.note; r.status = 'saved';
    return { receipt: rcOut(r, rcSame(r)) };
  }
  W.on('receipts/save', function (body) { return rcSave(body, false); });
  W.on('receipts/edit', function (body) { return rcSave(body, true); });
  W.on('receipts/remove', function (body) {
    var r = rcFind(String(body && body.id || ''));
    if (!r) return fail(404, 'not_found');
    M.rc.rows.splice(M.rc.rows.indexOf(r), 1);
    return { ok: true };
  });
  W.on('receipts/file', function (body) {
    var r = rcFind(String(body && body.id || ''));
    if (!r || !r.photo) return fail(404, 'not_found');
    if (r.data) { // a photo she took here: its own bytes back
      var m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(r.data);
      var bin = atob(m[2]), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return { __blob: new Blob([u], { type: m[1] }), type: m[1] };
    }
    return { __blob: new Blob([receiptSvg(r, r.lines)], { type: 'image/svg+xml' }), type: 'image/svg+xml' };
  });
  W.on('receipts/export', function (body) {
    var month = String(body && body.month || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return fail(400, 'input', { field: 'month' });
    function cell(v) { var s = String(v == null ? '' : v); return /[",\r\n']/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var rows = M.rc.rows.filter(function (r) { return r.status === 'saved' && r.date.slice(0, 7) === month; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var out = ['Date,Vendor,Category,Amount,Note,File name'];
    rows.forEach(function (r) {
      out.push([r.date, r.vendor, RC_CATS[r.category], Math.floor(r.amount_cents / 100) + '.' + String(r.amount_cents % 100).padStart(2, '0'), r.note, fileNameOf(r)].map(cell).join(','));
    });
    return { __blob: new Blob(['﻿' + out.join('\r\n') + '\r\n'], { type: 'text/csv' }), type: 'text/csv' };
  });

  /* ================================================================ their critique of Web Faery */
  M.cq = { answers: {
    first_feeling: { choice: 'Excited', other: '' },
    words: { choice: 'Mostly like me', other: 'The line about the kiln felt very us.' },
    portal: { choice: 'Easy', other: '' }
  }, fix: '', status: 'draft' };
  var CQ_PROMPTS = [
    { key: 'first_feeling', title: 'My first feeling when I opened the mockup', choices: ['Excited', 'Curious', 'Not sure', 'A bit much'] },
    { key: 'words', title: 'The words on it', choices: ['Sounded like me', 'Mostly like me', 'Not like me'] },
    { key: 'prices', title: 'The prices', choices: ['Fair', 'Too high', 'Too low', 'Confusing'] },
    { key: 'choosing', title: 'Choosing a build', choices: ['Clear', 'Mostly clear', 'Confusing'] },
    { key: 'portal', title: 'This portal', choices: ['Easy', 'Okay', 'Confusing'] },
    { key: 'process', title: 'The whole process: what I would change', choices: ['Nothing, it felt right', 'Fewer steps', 'More explaining along the way'] }
  ];
  var CQ_THANKS = 'Thank you, this helps a lot.';
  W.on('critique/mine', function () {
    // Nov 19 2026 (Pollen): the critique is Tidal Taxi only, so no demo or preview shows the card
    if (true) return { eligible: false };
    return { eligible: true, read_only: false,
      intro: 'Thank you for telling me what you really think. Answer only the ones you want to. Each answer saves as you go, so you can leave and come back.',
      thanks: CQ_THANKS, prompts: W.clone(CQ_PROMPTS), fix_title: 'One thing I should fix first',
      answers: W.clone(M.cq.answers), fix_first: M.cq.fix, status: M.cq.status, sent_on: M.cq.status === 'sent' ? 'Today' : '' };
  });
  W.on('critique/save', function (body) {
    var b = body || {};
    if (b.key === 'fix_first') M.cq.fix = String(b.text || '').slice(0, 1500);
    else {
      var q = CQ_PROMPTS.filter(function (x) { return x.key === b.key; })[0];
      if (!q) return fail(400, 'input', { field: 'key' });
      var choice = String(b.choice || ''), other = String(b.other || '').slice(0, 400);
      if (choice && choice !== 'Other' && q.choices.indexOf(choice) < 0) return fail(400, 'input', { field: 'choice' });
      if (!choice && !other) delete M.cq.answers[q.key]; else M.cq.answers[q.key] = { choice: choice, other: other };
    }
    M.cq.status = 'draft';
    return { ok: true, status: 'draft' };
  });
  W.on('critique/send', function () {
    var n = Object.keys(M.cq.answers).length + (M.cq.fix ? 1 : 0);
    if (!n) return fail(400, 'input');
    M.cq.status = 'sent';
    return { ok: true, status: 'sent', thanks: CQ_THANKS, sent_on: 'Today' };
  });

  /* ================================================================ how-to videos and guides */
  // Links stay on webfaery.love (the card allows only a few hosts): the clickthrough videos and the how page that ship with the site.
  M.resources = [
    { id: 'rsgooglever00001', title: 'Add Taya as a manager on your Google profile', summary: 'A short clickthrough, about two minutes, with your private details hidden.', url: 'https://webfaery.love/how/google-add-manager.mp4', kind: 'video', topic: 'google', step: 'google-profile',
      steps_text: 'Open your Google Business Profile.\nTap Business Profile settings, then People and access.\nTap Add, type the address Taya gives you, and choose Manager.\nTap Invite.', last_checked: W.isoDay(-6) },
    { id: 'rsgoogleask00002', title: 'Ask a happy customer for a Google review', summary: 'Where your review link is and the one line to send with it.', url: 'https://webfaery.love/how.html', kind: 'guide', topic: 'google' },
    { id: 'rsemailnews00003', title: 'Confirm your newsletter sender address', summary: 'The one email you tap so your newsletter can go out under your name.', url: 'https://webfaery.love/how/buttondown-confirm.mp4', kind: 'video', topic: 'email' },
    { id: 'rsemailsend00004', title: 'Reply from your own address', summary: 'Answer customers from Gmail so replies come from your studio name.', url: 'https://webfaery.love/how.html', kind: 'guide', topic: 'email' },
    { id: 'rssitedomain0005', title: 'Switch your domain to your new site', summary: 'Two screens at your domain company, with the numbers to paste.', url: 'https://webfaery.love/how/porkbun-domain.mp4', kind: 'video', topic: 'site', step: 'domain',
      steps_text: 'Sign in at your domain company.\nOpen the domain, then DNS.\nPaste the two records Taya sends, one at a time.\nSave, and tell Taya. It can take a few hours to show.', last_checked: W.isoDay(-9) },
    { id: 'rssitechange0006', title: 'Ask for a change to your site', summary: 'What to put in the box so a change comes back right the first time.', url: 'https://webfaery.love/how.html', kind: 'guide', topic: 'site' },
    { id: 'rsshopstripe0007', title: 'Give Taya view only access in Stripe', summary: 'So I can help if a payment looks odd, and nothing else.', url: 'https://webfaery.love/how/stripe-add-member.mp4', kind: 'video', topic: 'shop', step: 'stripe-view-only' },
    { id: 'rsshoppack00008', title: 'Packing an order and marking it shipped', summary: 'Tick Packed, print the slip, add tracking, tap Shipped.', url: 'https://webfaery.love/how.html', kind: 'guide', topic: 'shop' },
    { id: 'rsbookconfirm009', title: 'Confirm your booking calendar', summary: 'One email to tap so class sign-ups land on your calendar.', url: 'https://webfaery.love/how/calcom-confirm.mp4', kind: 'video', topic: 'booking' },
    { id: 'rsbookblock00010', title: 'Block a day off or a holiday', summary: 'Closing the studio for a week without cancelling anyone by hand.', url: 'https://webfaery.love/how.html', kind: 'guide', topic: 'booking' }
  ];
  W.on('portal/resources', function () { return { ok: true, resources: W.clone(M.resources) }; });

  /* ================================================================ her messages with Taya */
  M.files = {};      // id -> { name, size, type, make: () => Promise<Blob> }
  M.msgs = [];
  function addFile(name, type, size, make) { var id = mkId('mf'); M.files[id] = { name: name, type: type, size: size, make: make }; return id; }
  function fileOut(id) { var f = M.files[id]; return { id: id, name: f.name, size: f.size, type: f.type, image: /^image\/(jpeg|png|gif|webp)$/.test(f.type) }; }
  function paintShelf(g, w, h) {
    g.fillStyle = '#e9e0d1'; g.fillRect(0, 0, w, h);
    var wood = '#a67b52';
    [[150, 0], [300, 0], [450, 0]].forEach(function (s) { g.fillStyle = wood; g.fillRect(30, s[0], w - 60, 12); });
    var glazes = ['#6f8f72', '#c9a24a', '#a5553a', '#d8d2c4', '#5f7a8a', '#8b6a3a'];
    for (var row = 0; row < 3; row++) {
      var base = 150 + row * 150;
      for (var i = 0; i < 6; i++) {
        var x = 60 + i * 95, k = (i + row) % 3, c = glazes[(i * 2 + row) % glazes.length];
        g.fillStyle = c;
        if (k === 0) { g.fillRect(x, base - 62, 56, 62); g.fillRect(x + 56, base - 46, 14, 28); }              // a mug
        else if (k === 1) { g.beginPath(); g.moveTo(x - 6, base - 44); g.lineTo(x + 66, base - 44); g.quadraticCurveTo(x + 60, base, x + 30, base); g.quadraticCurveTo(x, base, x - 6, base - 44); g.fill(); } // a bowl
        else { g.beginPath(); g.moveTo(x + 18, base - 80); g.lineTo(x + 38, base - 80); g.quadraticCurveTo(x + 62, base - 40, x + 52, base); g.lineTo(x + 4, base); g.quadraticCurveTo(x - 6, base - 40, x + 18, base - 80); g.fill(); } // a vase
      }
    }
  }
  function paintTiles(g, w, h) {
    g.fillStyle = '#d9d2c3'; g.fillRect(0, 0, w, h);
    var cols = ['#7e9b7a', '#c4a050', '#9c5a40', '#e3ddcf', '#5d7482', '#b78f6a'];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
      var x = 30 + c * 150, y = 30 + r * 130, col = cols[(r * 4 + c) % cols.length];
      g.fillStyle = col; g.fillRect(x, y, 120, 100);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, 120, 36);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 10, y + 82, 40, 4);
    }
  }
  var shelfId = addFile('studio-shelves.png', 'image/png', 184320, function () { return pngFrom(paintShelf, 640, 480); });
  var tilesId = addFile('glaze-test-tiles.png', 'image/png', 142336, function () { return pngFrom(paintTiles, 640, 440); });
  M.msgs = [
    { id: mkId('mg'), from: 'taya', body: 'Hi Rosa, welcome to your portal. This is where we can talk about anything on your site, so nothing gets lost in email.\n\nIf you have a photo of your studio shelves, send it over whenever you like.', created: stamp(12, 10, 14), files: [] },
    { id: mkId('mg'), from: 'client', body: 'Thank you! Here is the shelf photo. The light is best around 4pm.', created: stamp(11, 16, 42), files: [shelfId] },
    { id: mkId('mg'), from: 'taya', body: 'Love it, the glaze test tiles will go right on your home page, just as you sent them.\n\nTwo quick questions, **no rush**:\n\n- Do you want the class schedule on the home page?\n- Is Saturday still your market day?', created: stamp(9, 9, 30), files: [] },
    { id: mkId('mg'), from: 'client', body: 'Yes to the schedule. Saturdays only until the holiday fair, then Sundays too.', created: stamp(8, 13, 5), files: [tilesId] },
    { id: mkId('mg'), from: 'taya', source: 'email', subject: 'Your class page draft', body: 'Hi Rosa,\n\nYour class page draft is up in your portal. Have a look at the times and the price per class, and tell me if anything is off.\n\nThe beginner wheel night is the one I changed most, so start there.', created: stamp(5, 11, 20), files: [] },
    { id: mkId('mg'), from: 'taya', body: 'Your class page is ready for a look. I put the holiday fair dates in a gold note at the top, and you can change them any time by asking me here.', created: stamp(2, 15, 8), files: [] }
  ];
  M.msgs.forEach(function (m) { m.files = m.files.slice(); });
  function msgOut(m, full) {
    var o = { id: m.id, from: m.from, body: m.body, created: m.created };
    if (m.source === 'email') { o.source = 'email'; o.subject = m.subject; o.attachments = 0; return o; }
    o.files = m.files.map(fileOut);
    return o;
  }
  W.on('portal/messages', function (body) {
    if (body && body.full) {
      var f = M.msgs.filter(function (m) { return m.id === body.full; })[0];
      return f ? { ok: true, message: msgOut(f, true) } : fail(404, 'not_found');
    }
    return { ok: true, rich: true, messages: M.msgs.map(function (m) { return msgOut(m, false); }) };
  });
  W.on('portal/message', function (body) {
    var b = body || {}, text = String(b.body || '').trim(), ids = Array.isArray(b.files) ? b.files.slice(0, 5) : [];
    if (!text && !ids.length) return fail(400, 'input', { field: 'body' });
    if (text.length > 8000) return fail(400, 'input', { field: 'body', reason: 'long' });
    for (var i = 0; i < ids.length; i++) if (!M.files[ids[i]]) return fail(400, 'input', { field: 'files' });
    var m = { id: mkId('mg'), from: 'client', body: text, created: new Date().toISOString(), files: ids };
    M.msgs.push(m);
    return { ok: true, message: msgOut(m, false) };
  });
  W.on('portal/message-unattach', function (body) {
    var id = String(body && body.id || '');
    if (!M.files[id]) return fail(404, 'not_found');
    delete M.files[id];
    return { ok: true };
  });
  W.on('portal/message-file', function (body) {
    var f = M.files[String(body && body.id || '')];
    if (!f) return fail(404, 'not_found');
    return Promise.resolve(f.make()).then(function (blob) { return { __blob: blob, type: f.type }; });
  });
  // the attachments she picks (a form post, answered by the shim below): kept in memory, named like the server names them
  function onMessageUpload(fields, files) {
    if (!files.length) return { status: 400, body: { error: 'input' } };
    if (files.length > 5) return { status: 400, body: { error: 'input', field: 'files', reason: 'count' } };
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.size > 10 * 1024 * 1024) return { status: 413, body: { error: 'too_big' } };
      var id = addFile(String(f.name || 'file').slice(0, 120), f.type || 'application/octet-stream', f.size, (function (file) { return function () { return Promise.resolve(file); }; })(f));
      out.push(fileOut(id));
    }
    return { status: 200, body: { ok: true, files: out } };
  }

  /* ================================================================ phone alerts and texts */
  M.sms = { on: false, last4: '' };
  var SMS_ALERT_CONSENT = 'Yes, text me at this number when someone books, changes or cancels, or asks for another time. ' +
    'The text only says to open my schedule and has none of my customers’ details. A few texts a day at most. ' +
    'Message and data rates may apply. Reply STOP to stop, HELP for help. Saying yes is not required.';
  W.on('portal/push-key', function () { return { key: '' }; }); // no push service in the sample: the card says alerts are not available here
  W.on('portal/push-status', function () {
    return { ok: true, enabled: false, phones: 0, last_ok: '', sms: { available: true, on: M.sms.on, last4: M.sms.last4, consent: SMS_ALERT_CONSENT } };
  });
  W.on('portal/push-subscribe', function () { return { ok: true, phones: 1 }; });
  W.on('portal/push-unsubscribe', function () { return { ok: true, phones: 0 }; });
  W.on('portal/push-test', function () { return { ok: false, phones: 0, sent: 0 }; });
  W.on('portal/sms-alerts', function (body) {
    var b = body || {};
    if (typeof b.on !== 'boolean') return fail(400, 'input', { field: 'on' });
    if (b.on) {
      if (b.agree !== true) return fail(400, 'input', { field: 'agree' });
      var digits = String(b.phone || '').replace(/\D/g, '');
      if (digits.length !== 10) return fail(400, 'input', { field: 'phone', reason: 'phone' });
      M.sms.last4 = digits.slice(-4);
    }
    M.sms.on = b.on;
    return { ok: true, sms: { available: true, on: M.sms.on, last4: M.sms.last4 } };
  });
  W.on('portal/sms-alerts-test', function () { return { ok: M.sms.on }; });
  W.on('portal/sms', function (body) { // the older sign-in-by-text card
    var b = body || {};
    if (b.on) { var d = String(b.phone || '').replace(/\D/g, ''); if (d.length !== 10 || b.agree !== true) return fail(400, 'input'); M.sms.last4 = d.slice(-4); }
    M.sms.on = !!b.on;
    return { ok: true, sms: { available: true, on: M.sms.on, last4: M.sms.last4 } };
  });

  /* ================================================================ the small account calls */
  W.on('portal/care-manage', function () { return { ok: true, url: 'https://billing.stripe.com/sample-link-for-the-preview' }; }); // the same sample link portal-demo.js uses
  W.on('portal/approve-site', function () { return { ok: true, approved_on: W.isoDay(0) }; });
  W.on('portal/launch-request', function (body) { return { ok: true, requested: { date: String(body && body.date || W.isoDay(14)) } }; });
  M.pw = { set: false, set_on: '' };
  W.on('portal/password-state', function () { return { ok: true, set: M.pw.set, set_on: M.pw.set_on }; });
  W.on('portal/password-set', function (body) {
    var p = String(body && body.password || '');
    if (p.length < 12) return fail(400, 'input', { reason: 'short' });
    M.pw = { set: true, set_on: W.isoDay(0) };
    return { ok: true, set_on: M.pw.set_on };
  });
  W.on('portal/password-signin', function () { return fail(401, 'code'); });
  // her business papers' own uploads: answered (the form shim below), kept in this tab only
  M.papers = [];
  function onPaperAdd(fields, files) {
    var f = files[0];
    if (!f) return { status: 400, body: { error: 'input', field: 'files' } };
    var title = '';
    fields.forEach(function (kv) { if (kv[0] === 'title') title = kv[1]; });
    var id = mkId('pp');
    M.papers.push({ id: id, title: title || String(f.name || 'Paper').replace(/\.[a-z0-9]+$/i, '') });
    return { status: 200, body: { ok: true, paper: { id: id } } };
  }
  W.on('papers/add', function () { return fail(400, 'input', { field: 'files' }); }); // fetch is not how files go; the form shim answers
  W.on('papers/rename', function (body) {
    var p = M.papers.filter(function (x) { return x.id === (body && body.id); })[0];
    if (!p) return fail(404, 'not_found');
    p.title = String(body.title || '').slice(0, 120);
    return { ok: true };
  });
  W.on('papers/remove', function (body) {
    var i = -1; M.papers.forEach(function (x, k) { if (x.id === (body && body.id)) i = k; });
    if (i < 0) return fail(404, 'not_found');
    M.papers.splice(i, 1);
    return { ok: true };
  });

  /* ================================================================ the form-post shim (files go by XMLHttpRequest) */
  var FORMS = (W.forms = W.forms || {});
  FORMS['portal/message-upload'] = onMessageUpload;
  FORMS['papers/add'] = onPaperAdd;
  var XP = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if (XP && !XP.__wfSampleForms) {
    XP.__wfSampleForms = true;
    var realOpen = XP.open, realSend = XP.send;
    XP.open = function (method, url) {
      var u = String(url), pre = SERVER + '/api/webfaery/';
      this.__wfForm = u.indexOf(pre) === 0 && FORMS[u.slice(pre.length).split('?')[0]] ? FORMS[u.slice(pre.length).split('?')[0]] : null;
      return realOpen.apply(this, arguments);
    };
    XP.send = function (data) {
      var x = this, fn = x.__wfForm;
      if (!fn || !(data instanceof FormData)) return realSend.apply(x, arguments);
      var fields = [], files = [];
      data.forEach(function (v, k) { if (typeof v === 'string') fields.push([k, v]); else files.push(v); });
      var steps = 6, i = 0;
      var tick = setInterval(function () {
        i++;
        if (x.upload && typeof x.upload.onprogress === 'function') x.upload.onprogress({ lengthComputable: true, loaded: i, total: steps });
        if (i < steps) return;
        clearInterval(tick);
        var r = fn(fields, files);
        Object.defineProperty(x, 'status', { value: r.status, configurable: true });
        Object.defineProperty(x, 'responseText', { value: JSON.stringify(r.body), configurable: true });
        if (typeof x.onload === 'function') x.onload();
      }, 90);
    };
  }
})();
