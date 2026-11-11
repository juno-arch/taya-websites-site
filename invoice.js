/* The public invoice page (Oct 24 2026, webfaery-portal-docs/PORT-QUEUE-OCT24.md part C). One read (GET invoice/view?t=) and, on the button, one
   write (POST invoice/pay), then it goes to Stripe's own page. It lives in two places with the same script: the hub's
   pb_public/invoice/ (same origin, used by the tests) and the website as invoice.html (site-pages/invoice/ here, with a
   wf-server meta that names the bookings server; the server lets webfaery.love's origin read and pay). Everything is drawn with textContent. The token stays in
   the address; no cookie, no storage, no script from anywhere else. */
(() => {
  'use strict';
  // where the server is: this page's own address when the hub serves it (no meta), or the address in <meta name="wf-server"> when it sits on the website
  const meta = document.querySelector('meta[name="wf-server"]');
  const SERVER = meta && /^https?:\/\/[^\/\s]+$/.test(meta.content) ? meta.content : '';
  const root = document.getElementById('inv');
  const token = (new URLSearchParams(location.search).get('t') || '').trim();
  const paidBack = new URLSearchParams(location.search).get('paid') === '1';
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = String(text); return n; }
  const usd = (c) => '$' + (Math.floor(Math.abs(c) / 100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + String(Math.abs(c) % 100).padStart(2, '0');
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? MON[+s.slice(5, 7) - 1] + ' ' + (+s.slice(8, 10)) + ', ' + s.slice(0, 4) : '');
  function say(text) { root.textContent = ''; root.append(el('p', 'inv-err', text)); }

  function draw(d) {
    document.title = 'Invoice ' + d.number;
    root.textContent = '';
    const sheet = el('section', 'inv-sheet');
    sheet.append(el('p', 'inv-from', 'Taya at Web Faery'));
    sheet.append(el('h1', 'inv-h', 'Invoice ' + d.number));
    if (d.display === 'void') { sheet.append(el('p', 'inv-status', 'This invoice was cancelled. If you were not expecting that, just reply to my message.')); root.append(sheet); return; }
    const meta = el('dl', 'inv-meta');
    [['For', d.client], ['Date', day(d.issued_on)], ['Due', day(d.due_on)]].forEach((p) => { if (p[1]) { meta.append(el('dt', '', p[0]), el('dd', '', p[1])); } });
    sheet.append(meta);
    const words = { paid: 'Paid. Thank you.', overdue: 'This one is past its due date.', partial: 'Part of this has been paid.' };
    if (words[d.display]) sheet.append(el('p', 'inv-status is-' + d.display, words[d.display]));
    const lines = el('div', 'inv-lines');
    d.lines.forEach((l) => {
      const row = el('div', 'inv-line');
      const left = el('div', 'inv-desc', l.description);
      if (l.qty !== 1) left.append(el('div', 'inv-sub', l.qty + ' at ' + usd(l.unit_cents)));
      row.append(left, el('div', 'inv-amt', usd(l.total_cents)));
      lines.append(row);
    });
    sheet.append(lines);
    const sums = el('div', 'inv-sums');
    const sum = (a, b, cls) => { const r = el('div', 'inv-sum' + (cls ? ' ' + cls : '')); r.append(el('span', '', a), el('span', '', b)); sums.append(r); };
    if (d.discount_cents) { sum('Subtotal', usd(d.subtotal_cents)); sum('Discount', '-' + usd(d.discount_cents)); }
    sum('Total', usd(d.total_cents));
    if (d.paid_cents) sum('Paid', '-' + usd(d.paid_cents));
    sum(d.balance_cents ? 'Due' : 'Balance', usd(d.balance_cents), 'is-due');
    sheet.append(sums);
    if (d.notes) sheet.append(el('p', 'inv-notes', d.notes));
    if (paidBack && d.balance_cents) sheet.append(el('p', 'inv-note-pay', 'Thank you. Your bank payment has started. Banks can take a few days to finish it, and I will mark this paid when it clears.'));
    else if (d.pay_note) sheet.append(el('p', 'inv-note-pay', d.pay_note));
    const acts = el('div', 'inv-acts');
    if (d.can_pay) {
      const b = el('button', 'inv-pay', 'Pay ' + usd(d.balance_cents) + ' by bank'); b.type = 'button';
      b.addEventListener('click', async () => {
        b.disabled = true; b.textContent = 'One moment';
        try {
          const res = await fetch(SERVER + '/api/webfaery/invoice/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token }), cache: 'no-store' });
          const out = await res.json().catch(() => null);
          if (res.ok && out && typeof out.url === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(out.url)) { location.assign(out.url); return; }
          b.disabled = false; b.textContent = 'Pay ' + usd(d.balance_cents) + ' by bank';
          acts.append(el('p', 'inv-fine', res.status === 429 ? 'That was a lot of tries. Please wait a little and try again.' : 'The payment page did not open. Please try again in a few minutes, or reply to my message and I will help.'));
        } catch (_) { b.disabled = false; b.textContent = 'Pay ' + usd(d.balance_cents) + ' by bank'; acts.append(el('p', 'inv-fine', 'The payment page did not open. Please try again in a few minutes.')); }
      });
      acts.append(b);
    } else if (d.balance_cents > 0) {
      acts.append(el('p', 'inv-fine', 'To pay, just reply to my message and I will send you a way to pay.'));
    }
    const pr = el('button', 'inv-link', 'Print or save a copy'); pr.type = 'button'; pr.addEventListener('click', () => window.print());
    acts.append(pr);
    sheet.append(acts);
    if (d.can_pay) sheet.append(el('p', 'inv-fine', 'You pay on Stripe’s own page, straight from your bank. Nothing is taken until you finish there.'));
    root.append(sheet);
  }

  async function start() {
    if (!/^[A-Za-z0-9]{40}$/.test(token)) { say('This invoice link looks incomplete. Please use the link from my message, or reply to me and I will send it again.'); return; }
    try {
      const res = await fetch(SERVER + '/api/webfaery/invoice/view?t=' + encodeURIComponent(token), { cache: 'no-store' });
      const d = await res.json().catch(() => null);
      if (res.status === 404) { say('I could not find that invoice. Please use the link from my message, or reply to me and I will send it again.'); return; }
      if (res.status === 429) { say('Too many tries just now. Please wait a few minutes and open the link again.'); return; }
      if (!res.ok || !d || !d.ok) { say('The invoice did not open. Please try again in a few minutes.'); return; }
      draw(d);
    } catch (_) { say('The invoice did not open. Please try again in a few minutes.'); }
  }
  start();
})();
