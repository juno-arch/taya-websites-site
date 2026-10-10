/* =====================================================================================================
   Your project (portal.html): everything that happens on a client's own page. No libraries, no outside
   scripts, no trackers. Only this site's own files run here (the page's security line says so).

   ---- CONFIG: the only things to change ----
     DEMO        true while it's a preview: the sample client (portal-demo.js), nothing sent anywhere.
                 false once the server side is switched on (the last step of the deploy notes, which live
                 in garden-faery-hub/pocketbase/webfaery-portal-docs/ on Pollen's Mac, not in this public repo).
     SERVER      the PocketBase the portal talks to (Garden Faery's server, its own /api/webfaery/ routes)
     SMS_SIGNIN  true shows "Text me a code instead" (only once texts are switched on on the server)
     START_PAGE  the getting-started page the list links into

   ---- WHAT IT KEEPS ----
   In this browser's storage: {token}, the random key that says "signed in". The server keeps just a
   scrambled copy of it, and forgets it after 8 quiet hours (or a week at most), when Taya switches the
   portal off for someone, or at "Sign out". Never the project itself. Three small conveniences too:
     - "I tapped Pay" notes, so a pay button someone already used says "Paid? Thank you!"
       instead of glowing again (a day per key, under a short tag of their email; gone once Taya marks it,
       after 3 weeks, or at "Sign out")
     - while a code is on its way, the email it went to, for 10 minutes and this tab only, so a reload
       goes back to the code step instead of asking again (which would send another email)
     - words typed into an answer or a change request and not sent yet, this tab only, so a sign-in
       after a quiet while doesn't lose them (cleared once sent, and at "Sign out")
   Without storage (a private window) it still works: they just sign in each visit.

   ---- HOW IT TALKS TO THE SERVER ----
   All in the api block below (the demo has the same eight calls with the same shapes):
     requestCode, verifyCode, me, logout, file, upload, todo, change
   plus three for a shop's orders (Oct 8 2026; never called in the preview): shopOrders, shopPacked, shopExport,
   and six more for a shop (Oct 10 2026, also never in the preview): shopCodes, shopCodeSave, shopCodeActive,
   shopSettings, shopShipped, shopSlip
   Every call after sign-in sends the key in an X-WF-Session header, never in a web address.
   The full list of routes and answers: webfaery-portal-docs/API.md in the hub (next to DEPLOY.md).

   ---- WORDS ----
   Warm but plain, few words, curly quotes, no dashes, the monthly part is a "subscription" (Oct 6 2026), nothing about trades.
   _tests/portal-text.test.mjs checks every string in this file.
   ===================================================================================================== */
(() => {
  'use strict';

  /* ================= CONFIG ================= */
  const DEMO = false;                                 // LIVE since Oct 1 2026 (server side switched on)
  const SERVER = 'https://bookings.gardenfaery.love'; // PocketBase (the page's security line allows only this)
  const SMS_SIGNIN = false;                           // true once WF_SMS_ENABLED=1 on the server
  const START_PAGE = 'start.html';
  const TAYA = 'taya@webfaery.love';

  const BASE = SERVER + '/api/webfaery/portal';
  const SHOP = SERVER + '/api/webfaery/shop';         // a shop's orders (Oct 8 2026): only clients with a shop get any
  const STORE_KEY = DEMO ? 'wf-portal-demo-v1' : 'wf-portal-v1';
  const TOKEN_RE = /^[A-Za-z0-9]{40,64}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const RESEND_WAIT = 60;              // seconds before "Send a new code" wakes up (the server sends one a minute at most)
  const PENDING_MS = 10 * 60 * 1000;   // a code works for 10 minutes: a reload within that goes back to the code step
  const TAP_DAYS = 21;                 // an "I tapped Pay" note fades after 3 weeks
  const REFRESH_AFTER = 5 * 60 * 1000; // coming back to the tab after 5 minutes fetches the project again
  const MB = 1024 * 1024;
  const UPLOAD_MAX = 15 * MB, UPLOAD_PER_SEND = 10, UPLOAD_SEND_BYTES = 25 * MB, UPLOAD_PER_ITEM = 40; // the server takes about 32 MB a send
  const CHANGE_MAX = 10 * MB, CHANGE_FILES = 3, WHAT_MAX = 2000, ANSWER_MAX = 1000;
  const SAFE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

  const BUILDS = { maiden: 'Planted', mother: 'Tended', crone: 'In Bloom' }; // keys stay; only the words changed (Oct 5 2026)
  const BUILD_MOON = { maiden: 'i-wax', mother: 'i-full', crone: 'i-wan' };
  // what care does for each build, in the garden words of its name (the care row under Payments); one short line
  // each, from "What care includes" in pricing-oct2026.md (the full lists are on webfaery.love's price cards)
  const CARE_SAY = {
    maiden: 'Keeps your site healthy: hosting, your web address, backups, your changes as I follow your socials or whenever you email me, and a monthly check-in.',
    mother: 'Tending as the seasons change: everything in the Planted subscription, plus your posts showing up everywhere, email from your own address and a seasonal refresh.',
    crone: 'Keeps you in full bloom: everything in the Tended subscription, plus your booking, payments or shop kept running, a flyer for one event a month, made and posted for you, and a yearly refresh.'
  };
  const STAGES = [
    ['getting_started', 'Getting started'], ['call', 'Your story'], ['draft', 'Draft'],
    ['changes', 'Changes'], ['launch', 'Launch'], ['settling_in', 'Settling in']
  ];
  const STAGE_SAY = {
    getting_started: 'Your answers, photos and a few little setup bits.',
    call: 'A few easy questions by email. I do the writing after.',
    draft: 'I’m building your draft. You’ll get a private link to peek.',
    changes: 'Two rounds, each one email with everything in it.',
    launch: 'Your site goes live at your own web address, and I hand you your logins.',
    settling_in: '30 days of tweaks, on me, and I’ll check in to see how it’s all feeling.'
  };
  // start.html's steps (#s-<step>); a few older names point to the step that holds them now.
  // Only the whole page (a new client) and signing link there now: on a new device start.html opens at its
  // quick check, so every other step's few lines live right in the list item (HOWTO below).
  const START_STEPS = {
    build: 's-build', sign: 's-sign', call: 's-work', work: 's-work', look: 's-look', accounts: 's-accounts',
    you: 's-sign', agree: 's-sign', deposit: 's-sign', photos: 's-look'
  };
  const HOWTO = {
    // (pricing-oct2026.md, "Account setup flow": the owner adds Taya as a manager; no profile yet, Taya builds it.
    // Newsletter and booking accounts Taya sets up herself, in the client's name, and hands over at launch.
    // Those come with Tended and In Bloom only, so `after` is picked by their build: maiden (Planted) promises no
    // newsletter or Cal.com, only the Book now button to a booking app they already use (the booking ladder, Oct 6
    // 2026 afternoon), mother covers Tended and In Bloom both, and other is for a build not picked yet.)
    accounts: {
      steps: [
        'Go to business.google.com and sign in with the Google account that owns your profile.',
        'Open your profile’s menu and choose Business Profile settings, then People and access, then Add. Type taya@webfaery.love, choose Manager, and send it. You stay the owner. (Google moves its buttons around now and then; if it looks different, stop there and we’ll do it together.)',
        'No profile yet? Nothing to do now. Just email me, and I’ll build it for you. Later, Google asks you for one quick check that it’s really your business (a short video, or a code it sends you).'
      ],
      after: {
        maiden: 'Anything I set up for you is in your name, with your email. If a confirm-your-email message comes, just click it. Already use a booking app? Send me your booking link, and your Book now button opens it.',
        mother: 'I set up your newsletter, and your booking if you’d like it, in your name, with your email, and hand you the logins at launch. Already happy with a booking app? We keep that one. If a confirm-your-email message or two comes from them, just click them.',
        other: 'If your build has a newsletter or booking, I set those up for you in your name, with your email, and hand you the logins at launch. If a confirm-your-email message or two comes from them, just click them.'
      }
    },
    work: { steps: ['A few lines is plenty: what you offer, when and where, and any words you love. Just reply to any email from me.'] },
    look: { steps: ['Colors you love (or don’t), and a site or two you like the feel of. Just reply to any email from me.'] },
    build: { steps: ['Planted (one page), Tended (a full site) or In Bloom (booking, payments or a small shop). Not sure yet? We’ll pick together over email.'] },
    call: { steps: ['Nothing to book. I’ll email you a few easy questions, and you answer whenever suits you.'] }
  };
  const ASK_STATUS = { new: 'New', seen: 'Seen', quoted: 'Priced', doing: 'Working on it', done: 'Done', declined: 'Not this time' };
  // what each upload spot takes (the server checks again, and so does the field itself)
  const UPLOAD_TYPES = {
    photos: { ext: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'pdf'], accept: 'image/*,.heic,.heif,application/pdf', say: 'photos' },
    logo: { ext: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'pdf', 'svg', 'eps', 'ai', 'ps'], accept: 'image/*,.svg,.eps,.ai,.pdf,application/pdf', say: 'files' },
    files: { ext: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'pdf', 'svg', 'eps', 'ai', 'ps', 'zip'], accept: 'image/*,.svg,.eps,.ai,.pdf,.zip,application/pdf,application/zip', say: 'files' }
  };
  const CHANGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'];

  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ================= 0. inside someone else's page? =================
     GitHub Pages can't send the header that forbids framing, so a real portal simply won't show
     inside another site's frame (the preview has no real data, so it may). */
  let framed = false;
  try { framed = window.top !== window.self; } catch (e) { framed = true; }
  if (framed && !DEMO) document.documentElement.classList.add('framed');

  /* ================= 1. the photo's slow intro (the same as every page) =================
     This part runs right away, before the first paint; the rest waits for the page. */
  (function heroIntro() {
    const h = document.querySelector('.page-hero');
    if (!h || reduceMotion) return;
    const ph = h.querySelector('.photo');
    if (!ph) return;
    h.classList.add('wait');
    // play the intro only once the photo has fully arrived; if it's still on its way after 4 seconds
    // (a slow connection), show everything at rest so a half-loaded photo never animates
    let settled = false;
    const rest = () => { if (settled) return; settled = true; h.classList.remove('wait'); };
    const go = () => { if (settled) return; settled = true; h.classList.remove('wait'); h.classList.add('go'); };
    const ready = () => { if (ph.decode) ph.decode().then(go, go); else go(); };
    if (ph.complete && ph.naturalWidth) ready(); else { ph.addEventListener('load', ready); ph.addEventListener('error', rest); setTimeout(rest, 4000); }
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ph.style.translate = '0 ' + (Math.min(window.scrollY, h.offsetHeight) * 0.12).toFixed(1) + 'px';
      });
    }, { passive: true });
  })();

  /* ================= little helpers ================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const icon = (id, cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (cls) svg.setAttribute('class', cls);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.append(use);
    return svg;
  };
  const str = (v, max) => (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : '')).slice(0, max || 4000);
  const arr = (v) => (Array.isArray(v) ? v : []);
  const money = (n) => '$' + Math.round(+n || 0).toLocaleString('en-US');
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  // only https links from the server ever become links on the page
  const safeUrl = (u) => {
    const s = str(u, 2000).trim();
    if (!/^https:\/\/[^\s"'<>\\]+$/i.test(s)) return '';
    try { return new URL(s).protocol === 'https:' ? s : ''; } catch (e) { return ''; }
  };
  const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch (e) { return ''; } };
  const extOf = (name) => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };
  // what someone types: newlines kept, other control characters dropped, long gaps shortened
  const cleanText = (s, max) => String(s || '').replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max);
  const cleanLine = (s, max) => String(s || '').replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, max);
  const maskPhone = (d) => (d.length >= 4 ? '(•••) •••-' + d.slice(-4) : 'your phone');
  const newNonce = () => {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  };

  /* ---- dates: every date is a plain calendar day ("2026-10-13"), read from its parts, so a time zone
     can never move it back a day ---- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pad = (n) => String(n).padStart(2, '0');
  const dayParts = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(s));
    return m ? { y: +m[1], m: +m[2], d: +m[3], key: m[1] + m[2] + m[3] } : null;
  };
  const now = new Date();
  const todayKey = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const todayISO = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  const shortDate = (s) => {
    const p = dayParts(s);
    if (!p || p.m < 1 || p.m > 12) return '';
    return MON[p.m - 1] + ' ' + p.d + (p.y !== now.getFullYear() ? ', ' + p.y : '');
  };
  const longDay = (s) => {
    const p = dayParts(s);
    if (!p) return '';
    return DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] + ', ' + shortDate(s);
  };
  const isPast = (s) => { const p = dayParts(s); return !!p && p.key <= todayKey; };
  // the 2nd business day from today (the care promise), only if the server didn't say
  const replyByLocal = () => {
    const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
    let left = 2;
    while (left > 0) { t.setUTCDate(t.getUTCDate() + 1); const w = t.getUTCDay(); if (w !== 0 && w !== 6) left--; }
    return t.toISOString().slice(0, 10);
  };

  /* ================= keeping the sign-in key ================= */
  // (the preview keeps its pretend key for this tab only, so it never lingers)
  let token = '';
  const box = () => (DEMO ? window.sessionStorage : window.localStorage);
  const store = {
    get() {
      try {
        const o = JSON.parse(box().getItem(STORE_KEY) || 'null');
        return o && typeof o.token === 'string' && TOKEN_RE.test(o.token) ? o.token : '';
      } catch (e) { return ''; }
    },
    set(t) { try { box().setItem(STORE_KEY, JSON.stringify({ token: t })); } catch (e) { /* no storage: signed in for this visit only */ } },
    clear() { try { box().removeItem(STORE_KEY); } catch (e) { /* nothing kept anyway */ } }
  };
  const readJSON = (bx, key) => { try { const o = JSON.parse(bx.getItem(key) || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
  const writeJSON = (bx, key, o) => { try { if (o) bx.setItem(key, JSON.stringify(o)); else bx.removeItem(key); } catch (e) { /* fine: a convenience only */ } };
  const tab = () => window.sessionStorage;

  // while a code is on its way: where it went (this tab, 10 minutes), so a reload goes back to the code step
  const PENDING_KEY = STORE_KEY + '-pending';
  const pending = {
    get() {
      const o = readJSON(tab(), PENDING_KEY);
      if (!o || !(Date.now() - (+o.at || 0) < PENDING_MS)) return null;
      if (typeof o.email === 'string' && EMAIL_RE.test(o.email)) return { who: { email: o.email.slice(0, 200) }, at: +o.at };
      if (typeof o.phone === 'string' && /^\d{10}$/.test(o.phone)) return { who: { phone: o.phone }, at: +o.at };
      return null;
    },
    set(w) { writeJSON(tab(), PENDING_KEY, Object.assign({ at: Date.now() }, w)); },
    clear() { writeJSON(tab(), PENDING_KEY, null); }
  };

  // "I tapped Pay": so a pay button someone already used doesn't glow at them again
  // while Taya waits to see the money land. Kept per client (a short tag of their email, not the email).
  const TAPS_KEY = STORE_KEY + '-taps';
  const tagOf = (s) => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return 't' + h.toString(36); };
  const taps = {
    mine() {
      const all = readJSON(box(), TAPS_KEY) || {};
      const o = me ? all[tagOf(me.client.email)] : null;
      const out = {};
      if (o && typeof o === 'object') {
        for (const k of ['deposit', 'balance', 'care']) {
          if (typeof o[k] === 'number' && Date.now() - o[k] < TAP_DAYS * 86400000) out[k] = o[k];
        }
      }
      return out;
    },
    save(o) {
      if (!me) return;
      const all = readJSON(box(), TAPS_KEY) || {};
      const tag = tagOf(me.client.email);
      if (Object.keys(o).length) all[tag] = o; else delete all[tag];
      writeJSON(box(), TAPS_KEY, Object.keys(all).length ? all : null);
    },
    set(k) { const o = this.mine(); o[k] = Date.now(); this.save(o); },
    drop(k) { const o = this.mine(); if (k in o) { delete o[k]; this.save(o); } },
    clearAll() { writeJSON(box(), TAPS_KEY, null); }
  };

  // words typed but not sent yet (this tab only): a sign-in after a quiet while doesn't lose them
  const DRAFTS_KEY = STORE_KEY + '-drafts';
  const drafts = {
    get(id) { const o = readJSON(tab(), DRAFTS_KEY) || {}; return typeof o[id] === 'string' ? o[id].slice(0, 4000) : ''; },
    set(id, text) {
      const o = readJSON(tab(), DRAFTS_KEY) || {};
      if (text && text.trim()) o[id] = String(text).slice(0, 4000); else delete o[id];
      writeJSON(tab(), DRAFTS_KEY, Object.keys(o).length ? o : null);
    },
    any() { return Object.keys(readJSON(tab(), DRAFTS_KEY) || {}).length > 0; },
    clearAll() { writeJSON(tab(), DRAFTS_KEY, null); }
  };

  /* ================= the server (the only place that talks to it) ================= */
  const KNOWN = ['input', 'code', 'signed_out', 'origin', 'no_care', 'not_found', 'slow_down', 'server', 'not_ready', 'too_big'];
  const fail = (code, status, retry) => { const e = new Error(code); e.code = code; e.status = status || 0; if (retry) e.retry = retry; return e; };
  const errorFrom = (status, data) => {
    let code = data && typeof data.error === 'string' && KNOWN.includes(data.error) ? data.error : '';
    if (!code) {
      code = status === 400 ? 'input' : status === 401 ? 'signed_out' : status === 403 ? 'origin' : status === 404 ? 'not_found'
        : status === 413 ? 'too_big' : status === 429 ? 'slow_down' : status === 503 ? 'not_ready' : 'server';
    }
    const r = data && Number.isFinite(+data.retry_minutes) ? Math.max(1, Math.min(10080, Math.round(+data.retry_minutes))) : 0;
    const e = fail(code, status, r);
    // for files the server also says which rule they bumped into: size, type, count or too_many
    if (data && typeof data.reason === 'string') e.reason = data.reason.slice(0, 20);
    // (field and at: kept for older server answers; the editors were retired Oct 5 2026)
    if (data && typeof data.field === 'string') e.field = data.field.slice(0, 20);
    if (data && Number.isInteger(data.at) && data.at >= 0 && data.at < 100) e.at = data.at;
    // the shop's back end (Oct 10 2026) says what to fix in its own words, and 409 "taken" for a code name in use
    if (data && typeof data.message === 'string') e.msg = cleanLine(data.message, 200);
    if (status === 409 && data && data.error === 'taken') e.code = 'input';
    return e;
  };
  const post = async (path, body, key, base) => {
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['X-WF-Session'] = key;
    try {
      return await fetch((base || BASE) + path, {
        method: 'POST', headers, body: JSON.stringify(body || {}),
        mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
      });
    } catch (e) { throw fail('network'); }
  };
  const postJSON = async (path, body, key, base) => {
    const res = await post(path, body, key, base);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw errorFrom(res.status, data);
    return data;
  };
  // pictures and files go as a form, with a progress report while they travel
  const sendForm = (path, fields, files, key, onProgress) => new Promise((resolve, reject) => {
    const fd = new FormData();
    fields.forEach(([k, v]) => fd.append(k, v));
    files.forEach((f) => fd.append('files', f, f.name));
    const x = new XMLHttpRequest();
    x.open('POST', BASE + path);
    x.setRequestHeader('X-WF-Session', key);
    x.timeout = 5 * 60 * 1000;
    if (onProgress && x.upload) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      let data = {};
      try { data = JSON.parse(x.responseText || '{}'); } catch (e) { /* not JSON */ }
      if (x.status >= 200 && x.status < 300) resolve(data); else reject(errorFrom(x.status, data));
    };
    x.onerror = x.ontimeout = x.onabort = () => reject(fail('network'));
    x.send(fd);
  });

  const realApi = {
    requestCode: (who) => postJSON('/request-code', who),
    verifyCode: (who, code) => postJSON('/verify-code', Object.assign({}, who, { code })),
    me: () => postJSON('/me', {}, token),
    logout: (key) => postJSON('/logout', {}, key),
    todo: (id, action, text) => postJSON('/todo', text == null ? { todo: id, action } : { todo: id, action, text }, token),
    async file(thing, name) {
      const res = await post('/file', name ? { thing, name } : { thing }, token);
      if (!res.ok) throw errorFrom(res.status, await res.json().catch(() => ({})));
      const blob = await res.blob();
      return { blob, type: (res.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() };
    },
    upload: (id, files, onProgress) => sendForm('/upload', [['todo', id]], files, token, onProgress),
    change: (req, onProgress) => (req.files.length
      ? sendForm('/change', [['what', req.what], ['where_on_site', req.where], ['nonce', req.nonce]], req.files, token, onProgress)
      : postJSON('/change', { what: req.what, where_on_site: req.where, nonce: req.nonce }, token)),
    // a shop's orders (Oct 8 2026)
    shopOrders: () => postJSON('/orders', {}, token, SHOP),
    shopPacked: (id, packed) => postJSON('/packed', { order: id, packed }, token, SHOP),
    async shopExport(what) {
      const res = await post('/export', { what }, token, SHOP);
      if (!res.ok) throw errorFrom(res.status, await res.json().catch(() => ({})));
      return res.blob();
    },
    // a shop's codes, free shipping, shipped and packing slips (Oct 10 2026)
    shopCodes: () => postJSON('/codes', {}, token, SHOP),
    shopCodeSave: (c) => postJSON('/code-save', c, token, SHOP),
    shopCodeActive: (id, active) => postJSON('/code-active', { id, active }, token, SHOP),
    shopSettings: (s) => postJSON('/settings', s, token, SHOP),
    shopShipped: (b) => postJSON('/shipped', b, token, SHOP),
    async shopSlip(id) {
      const res = await post('/slip', { order: id }, token, SHOP);
      if (!res.ok) throw errorFrom(res.status, await res.json().catch(() => ({})));
      return res.text();
    }
  };
  let api = realApi;

  // what people read when something goes sideways
  const words = (err, where) => {
    const c = err && err.code;
    if (c === 'code') return 'That code didn’t work. Check the numbers, and use the code in the newest email.';
    if (c === 'slow_down' && (err.retry || 0) >= 2880) return 'Sign-in is paused for this email, to keep it safe. Email me at ' + TAYA + ' and I’ll open it back up.';
    if (c === 'slow_down') {
      const m = err.retry || 15;
      const when = m >= 90 ? plural(Math.round(m / 60), 'hour', 'hours') : m >= 60 ? 'an hour' : plural(m, 'minute', 'minutes');
      return 'Let’s take a little breather. Try again in ' + when + '.';
    }
    if (c === 'not_found') return 'That’s not here anymore. Try refreshing the page.';
    if (c === 'no_care') return 'Asks open once your subscription begins. Until then, just email me.';
    if (c === 'too_big') return 'That’s a bit big to send in one go. Try fewer at a time.';
    if (c === 'input' && err.reason === 'size') return 'One of those is too big to send. Photos up to 15 MB work, and pictures for a change up to 10 MB.';
    if (c === 'input' && err.reason === 'full') return 'Your project’s file space is full. Email me and I’ll make room.';
    if (c === 'input' && err.reason === 'type') return 'One of those is a kind of file I can’t take here. Photos and PDFs work best.';
    if (c === 'input' && (err.reason === 'too_many' || err.reason === 'count')) return 'That’s more than this spot can hold. Email me the rest, or share an album link.';
    if (c === 'input') return where === 'email' ? 'That email doesn’t look quite right. Check for a little typo?' : 'Something in there didn’t fit. Could you check it and try again?';
    return 'I can’t reach the portal right now. Try again soon, or email me at ' + TAYA + '.';
  };

  /* ================= what's on screen ================= */
  let me = null;           // the project, as the server last sent it (cleaned)
  let lastLoad = 0;
  let who = null;          // {email} or {phone} while signing in (memory only)
  let usePhone = false;
  let verifying = false;
  let busy = 0;            // uploads or sends under way: never refresh the page under them
  let firstShow = true;    // the project rises in gently the first time only
  let paidReturn = '';     // back from Stripe: '1', or which payment ('deposit', 'balance', 'care')
  let nonce = newNonce();
  let pics = [];           // pictures chosen for a change request
  const openAnswers = new Set(); // "Change my answer" boxes someone opened

  const VIEWS = ['v-email', 'v-code', 'v-loading', 'v-offline', 'v-project'];
  const show = (id) => {
    VIEWS.forEach((v) => { $('#' + v).hidden = v !== id; });
    $('#foot-out').hidden = id !== 'v-project';
    $('#b-signout-top').hidden = id !== 'v-project';
    if (id !== 'v-project') $('#nav-start').hidden = true; // only signed in, and only once Taya opens it
  };
  const announce = (text) => {
    const l = $('#live');
    l.textContent = '';
    requestAnimationFrame(() => { l.textContent = text; });
  };
  let toastTimer = 0;
  const toast = (text, ms) => {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = true;
    void t.offsetWidth; // start its little rise again
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 5600);
    announce(text);
  };
  const focusEl = (el, stay) => { if (!el) return; if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); el.focus(stay ? { preventScroll: true } : undefined); };
  const setBusy = (btn, on, label) => {
    const span = btn.querySelector('span') || btn;
    if (on) { btn.dataset.label = span.textContent; span.textContent = label; btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    else { if (btn.dataset.label) span.textContent = btn.dataset.label; btn.disabled = false; btn.removeAttribute('aria-busy'); }
  };
  const showErr = (id, text) => {
    const p = $('#' + id + '-err');
    p.textContent = text;
    p.hidden = !text;
    const input = { email: '#in-email', code: '#in-code', what: '#in-what' }[id];
    if (input) { if (text) $(input).setAttribute('aria-invalid', 'true'); else $(input).removeAttribute('aria-invalid'); }
  };

  /* ================= the words in the photo ================= */
  const hero = (eyebrow, before, em, lede, moon, nowLine) => {
    $('#hero-eyebrow').textContent = eyebrow;
    const h = $('#hero-title');
    h.textContent = before;
    if (em) h.append(make('em', null, em));
    const l = $('#hero-lede');
    l.textContent = '';
    // their build's moon (waxing Planted, full Tended, waning In Bloom) sits just before its name
    const parts = lede.split('\u0001');
    l.append(parts[0]);
    if (parts.length > 1) { if (moon) l.append(icon(moon, 'moon')); l.append(parts[1]); }
    // and where we are, in one line, so the first screen answers "where are we?"
    if (nowLine) l.append(make('span', 'now-line', nowLine));
  };
  const heroSignedOut = () => hero('Your project', 'Come on ', 'in.', 'I’ll send a little code to your email. No passwords to remember.');

  /* ================= signing in ================= */
  function toEmailStep(notice, moveFocus) {
    me = null;
    shop = null;
    codes = null;
    $('#sec-orders').hidden = true;
    $('#sec-codes').hidden = true;
    heroSignedOut();
    const n = $('#email-notice');
    n.textContent = notice || '';
    n.hidden = !notice;
    showErr('email', '');
    stopResend();
    show('v-email');
    if (moveFocus) focusEl($('#h-email'));
  }

  function setPhoneMode(on) {
    usePhone = on;
    const input = $('#in-email');
    input.value = '';
    input.type = on ? 'tel' : 'email';
    input.autocomplete = on ? 'tel' : 'email';
    input.inputMode = on ? 'tel' : 'email';
    $('#l-email').textContent = on ? 'Your phone number' : 'Your email';
    $('#email-hint').textContent = on ? 'Use the number you gave me when we started.' : 'Use the email you gave me when we started.';
    $('#b-phone').textContent = on ? 'Use my email instead' : 'Text me a code instead';
    showErr('email', '');
    input.focus();
  }

  async function onEmail(e) {
    e.preventDefault();
    const raw = $('#in-email').value.trim();
    let body;
    if (usePhone) {
      let d = digits(raw);
      if (d.length === 11 && d[0] === '1') d = d.slice(1);
      if (d.length !== 10) { showErr('email', 'That number looks a little short. Try all 10 digits.'); $('#in-email').focus(); return; }
      body = { phone: d };
    } else {
      const em = raw.toLowerCase();
      if (em.length < 3 || em.length > 200 || !EMAIL_RE.test(em)) { showErr('email', 'That email doesn’t look quite right. Check for a little typo?'); $('#in-email').focus(); return; }
      body = { email: em };
    }
    showErr('email', '');
    const btn = $('#b-send');
    setBusy(btn, true, 'Sending…');
    try {
      await api.requestCode(body);
      who = body;
      pending.set(body);
      toCodeStep();
    } catch (err) {
      showErr('email', words(err, 'email'));
    } finally { setBusy(btn, false); }
  }

  function toCodeStep(sentAt) {
    const byPhone = !!who.phone;
    $('#h-code').textContent = byPhone ? 'Check your phone' : 'Check your email';
    const lead = $('#code-lead');
    lead.textContent = byPhone ? 'If it’s the number I have for your project, a ' : 'If it’s the email I have for your project, a ';
    lead.append(make('span', 'nowrap', '6-digit'), ' code is on its way to ', make('b', null, byPhone ? maskPhone(who.phone) : who.email));
    lead.append(byPhone ? '. It works for 10 minutes.' : ', from “Taya · Web Faery”. It works for 10 minutes. Peek in spam if it’s shy.');
    $('#in-code').value = '';
    showErr('code', '');
    startResend(sentAt);
    show('v-code');
    announce(byPhone ? 'Code sent. Check your phone.' : 'Code sent. Check your email.');
    $('#in-code').focus();
  }

  let resendAt = 0, resendTick = 0;
  function tickResend() {
    const left = Math.ceil((resendAt - Date.now()) / 1000);
    const b = $('#b-resend');
    if (left > 0) {
      b.disabled = true;
      $('#resend-note').textContent = 'You can ask for a new one in ' + plural(left, 'second', 'seconds') + '.';
    } else { b.disabled = false; $('#resend-note').textContent = ''; stopResend(); }
  }
  function startResend(from) { resendAt = (from || Date.now()) + RESEND_WAIT * 1000; clearInterval(resendTick); resendTick = setInterval(tickResend, 1000); tickResend(); }
  function stopResend() { clearInterval(resendTick); resendTick = 0; }

  async function onResend() {
    if (!who) { toEmailStep('', true); return; }
    const b = $('#b-resend');
    b.disabled = true;
    showErr('code', '');
    try {
      await api.requestCode(who);
      pending.set(who);
      $('#in-code').value = '';
      startResend();
      toast('A fresh code is on its way. Use whichever email arrives, the newest is best.', 9000);
      $('#in-code').focus();
    } catch (err) { showErr('code', words(err)); b.disabled = false; }
  }

  function onCodeInput() {
    const input = $('#in-code');
    const d = digits(input.value).slice(0, 6);
    if (input.value !== d) input.value = d;
    if (d.length === 6 && !verifying) onCode();
  }

  async function onCode(e) {
    if (e) e.preventDefault();
    if (verifying) return;
    const code = digits($('#in-code').value).slice(0, 6);
    if (code.length !== 6) { showErr('code', 'The code is 6 numbers. Check the message and try again.'); $('#in-code').focus(); return; }
    if (!who) { toEmailStep('', true); return; }
    verifying = true;
    showErr('code', '');
    const btn = $('#b-verify');
    setBusy(btn, true, 'Signing in…');
    try {
      const r = await api.verifyCode(who, code);
      if (!r || !TOKEN_RE.test(str(r.token, 100))) throw fail('server', 500);
      token = r.token;
      store.set(token);
      stopResend();
      pending.clear();
      who = null;
      announce('You’re in.');
      await loadProject(true);
    } catch (err) {
      showErr('code', words(err.code === 'signed_out' ? fail('code', 401) : err));
      const input = $('#in-code');
      input.focus();
      input.select();
    } finally { verifying = false; setBusy(btn, false); }
  }

  function quietSignOut(moveFocus) {
    token = '';
    store.clear();
    toEmailStep('You were signed out after a quiet while. Here’s a fresh start.' +
      (drafts.any() ? ' Your words are kept: sign in again to send them.' : ''), moveFocus !== false);
  }

  async function signOut() {
    const key = token;
    token = '';
    store.clear();
    taps.clearAll();   // a shared computer: nothing of theirs stays behind
    drafts.clearAll();
    pending.clear();
    if (key) api.logout(key).catch(() => { /* the key is gone from here either way; the server forgets it soon */ });
    toEmailStep('You’re signed out. See you soon!', false);
    focusEl($('#h-email'), true);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    announce('You’re signed out.');
  }

  /* ================= the project ================= */
  async function loadProject(fromSignIn) {
    show('v-loading');
    try {
      const data = await api.me();
      me = clean(data);
      lastLoad = Date.now();
      render();
      show('v-project');
      loadOrders();
      if (fromSignIn) focusEl($('#sec-note').hidden ? $('#h-list') : $('#h-note'));
      if (paidReturn) { const k = paidReturn; paidReturn = ''; backFromPaying(k); }
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(fromSignIn !== null); return; }
      show('v-offline');
      if (fromSignIn !== null) focusEl($('#h-offline'));
    }
  }

  // coming back to the tab after a while: fetch it again, quietly, unless they're in the middle of something
  async function quietRefresh() {
    if (!token || !me || busy || isTyping()) return;
    try {
      const data = await api.me();
      if (busy || isTyping()) return;
      me = clean(data);
      lastLoad = Date.now();
      render();
      loadOrders();
    } catch (err) { if (err.code === 'signed_out') quietSignOut(false); }
  }
  const isTyping = () => pics.length > 0 ||
    $$('#v-project textarea, #v-project input[type="text"]:not(.keeps)').some((t) => t.value.trim()) ||
    !!document.querySelector('#v-project .ship-form') || !$('#f-dc').hidden;

  // Back from Stripe (its "after payment" link can be portal.html?paid=deposit, or ?paid=1): note it, so the
  // pay button turns into a thank-you instead of asking again while Taya waits to see it land.
  function backFromPaying(k) {
    let key = ['deposit', 'balance', 'care'].includes(k) ? k : '';
    if (!key) {
      const t = taps.mine();
      const tapped = ['deposit', 'balance', 'care'].filter((x) => t[x]).sort((a, b) => t[b] - t[a]);
      const due = me.pay.find((p) => p.state === 'due');
      key = tapped[0] || (due ? due.key : '');
    }
    const row = me.pay.find((p) => p.key === key);
    if (row && row.state !== 'paid' && row.state !== 'active') { taps.set(key); renderList(); renderPay(); }
    toast('Thank you! It shows here once I see it land, usually within a day. No need to pay again.', 9000);
  }

  /* ---- clean what the server sends: only the fields this page knows, only https links ---- */
  function clean(d) {
    d = d && typeof d === 'object' ? d : {};
    const c = d.client || {};
    const list = d.list || {};
    const tl = d.timeline || {};
    const th = d.things || {};
    const care = d.care || {};
    const item = (x) => {
      if (!x || typeof x !== 'object') return null;
      const title = str(x.title, 120);
      if (!title) return null;
      return {
        id: str(x.id, 40), title, detail: str(x.detail, 300), kind: str(x.kind, 12) || 'note',
        start_step: str(x.start_step, 20), url: safeUrl(x.url), accept: str(x.accept, 10),
        status: x.status === 'sent' ? 'sent' : 'open', answer: str(x.answer, 1000),
        files_count: Math.max(0, Math.min(999, Math.round(+x.files_count || 0))), sent_on: str(x.sent_on, 30),
        derived: !!x.derived || /^d:/.test(str(x.id)), pay_key: str(x.pay_key, 12)
      };
    };
    const agreement = th.agreement && typeof th.agreement === 'object' ? {
      file: !!th.agreement.file, signed_name: str(th.agreement.signed_name, 120),
      signed_on: str(th.agreement.signed_on, 30), version: str(th.agreement.version, 40)
    } : null;
    return {
      client: {
        first_name: str(c.first_name, 60), business: str(c.business, 160), build: str(c.build, 12),
        build_label: str(c.build_label, 20), founding: !!c.founding, care: str(c.care, 12), care_active: !!c.care_active,
        site_url: safeUrl(c.site_url), email: str(c.email, 200)
      },
      note: d.note && str(d.note.text).trim() ? { text: str(d.note.text, 600).trim(), date: str(d.note.date, 30) } : null,
      list: {
        // email only since Oct 5 2026: a booking link for a call is never shown, even if an old one comes through
        open: arr(list.open).map(item).filter((x) => x && x.id !== 'd:call').slice(0, 60),
        done: arr(list.done).map((x) => ({ id: str(x && x.id, 40), title: str(x && x.title, 120) })).filter((x) => x.title).slice(0, 60)
      },
      timeline: {
        current: str(tl.current, 20) || 'getting_started',
        stages: arr(tl.stages).map((s) => ({ key: str(s && s.key, 20), label: str(s && s.label, 40), date: str(s && s.date, 30), state: str(s && s.state, 8) })),
        care_since: str(tl.care_since, 30)
      },
      things: {
        draft: th.draft && safeUrl(th.draft.url) ? { url: safeUrl(th.draft.url), note: str(th.draft.note, 200) } : null,
        agreement: agreement && (agreement.file || agreement.signed_name) ? agreement : null,
        brand_sheet: !!th.brand_sheet, handoff_sheet: !!th.handoff_sheet,
        receipts: arr(th.receipts).map((r) => ({ name: str(r && r.name, 200), label: str(r && r.label, 120) || 'Receipt' })).filter((r) => r.name).slice(0, 20)
      },
      start_open: d.start_open !== false,   // Taya's getting-started switch (older servers: always open)
      sms: d.sms && typeof d.sms === 'object' ? { available: d.sms.available === true, on: d.sms.on === true, last4: /^\d{4}$/.test(str(d.sms.last4)) ? d.sms.last4 : '' } : null,
      // their magic mockup while getting started is closed, and whether they've finished it
      mockup: d.mockup && /^https:\/\/webfaery\.love\/peek\/[a-z0-9-]{1,40}\/\?mark=1$/.test(str(d.mockup.url)) ? { url: str(d.mockup.url), done_on: str(d.mockup.done_on, 30) } : null,
      pay: arr(d.pay).filter((p) => p && ['deposit', 'balance', 'care'].includes(p.key)).map((p) => ({
        key: p.key, amount: Math.max(0, Math.round(+p.amount || 0)), period: p.period === 'year' ? 'year' : 'month',
        state: ['paid', 'due', 'later', 'active'].includes(p.state) ? p.state : 'later', paid_on: str(p.paid_on, 30), starts_on: str(p.starts_on, 30),
        url: /^https:\/\/(buy|checkout)\.stripe\.com\//.test(str(p.url)) ? safeUrl(p.url) : ''
      })),
      care_manage_url: /^https:\/\/billing\.stripe\.com\//.test(str(d.care_manage_url)) ? safeUrl(d.care_manage_url) : '',
      care: {
        can_ask: !!care.can_ask,
        requests: arr(care.requests).map((r) => ({
          id: str(r && r.id, 40), what: str(r && r.what, 200), where_on_site: str(r && r.where_on_site, 200),
          status: ASK_STATUS[r && r.status] ? r.status : 'new', taya_reply: str(r && r.taya_reply, 1000), created: str(r && r.created, 30)
        })).filter((r) => r.what).slice(0, 10)
      }
    };
  }

  const stageIndex = (key) => {
    const i = STAGES.findIndex((s) => s[0] === key);
    return i >= 0 ? i : (key === 'care' || key === 'resting' ? STAGES.length : 0);
  };
  const stageDate = (key) => { const s = me.timeline.stages.find((x) => x.key === key); return s ? s.date : ''; };
  const startHref = (step) => {
    const c = me.client;
    const q = new URLSearchParams();
    if (BUILDS[c.build]) q.set('build', c.build);
    if (c.founding) q.set('founding', '1');
    if (['monthly', 'yearly', 'none'].includes(c.care)) q.set('care', c.care);
    if (c.first_name) q.set('name', c.first_name);
    // their draft is a Web Faery mockup (webfaery.love/peek/KEY/): the page checks it instead of asking them to retype it
    const peek = [me.things && me.things.draft && me.things.draft.url, c.site_url]
      .map((u) => String(u || '').match(/^https:\/\/(?:www\.)?webfaery\.love\/peek\/([a-z0-9-]{1,40})\/?/)).find(Boolean);
    if (peek) q.set('mockup', peek[1]);
    const qs = q.toString();
    return START_PAGE + (qs ? '?' + qs : '') + (START_STEPS[step] ? '#' + START_STEPS[step] : '');
  };
  // the getting-started page, in its own tab (the portal stays put), and it says so
  const startLink = (step, label, cls) => {
    const a = make('a', cls || 'btn small');
    a.href = startHref(step);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(make('span', null, label), icon('i-out'));
    a.setAttribute('aria-label', label + ' (opens your getting-started page in a new tab)');
    return a;
  };
  // a link out of the portal (a draft, Stripe, their site): a new tab that can't reach back here.
  // tapKey: remember the tap ("Paid? Thank you!") so the same button doesn't glow at them again
  const outLink = (href, label, cls, what, tapKey) => {
    const a = make('a', cls || 'open-btn');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(make('span', null, label), icon('i-out'));
    if (what) a.dataset.what = what;
    if (tapKey) a.addEventListener('click', () => { taps.set(tapKey); setTimeout(() => { if (me) { renderList(); renderPay(); } }, 400); });
    return a;
  };
  // the open "Fill in your getting-started page" item, if there is one
  const startItem = () => me.list.open.find((x) => x.kind === 'start' && (x.start_step === 'top' || !x.start_step));
  const PAY_THANKS = 'Paid? Thank you! It shows here once I see it land, usually within a day. No need to pay again.';

  // "Now: your draft, about Oct 13": the first screen answers "where are we?"
  function nowLine() {
    const cur = me.timeline.current;
    const d = stageDate(cur);
    const soon = d && !isPast(d) ? shortDate(d) : '';
    if (cur === 'care') return 'Live, and in my care';
    if (cur === 'resting') return 'Live, and all yours';
    if (cur === 'getting_started') return !me.start_open && me.mockup ? 'Now: your mockup' : 'Now: getting started';
    if (cur === 'call') return 'Now: gathering your story' + (d ? (isPast(d) ? '' : ', ' + shortDate(d)) : '');
    if (cur === 'draft') return 'Now: your draft' + (soon ? ', about ' + soon : '');
    if (cur === 'changes') return 'Now: your changes' + (soon ? ', about ' + soon : '');
    if (cur === 'launch') return 'Now: launch' + (soon ? ', about ' + soon : '');
    if (cur === 'settling_in') return 'Now: settling in' + (d ? ', until ' + shortDate(d) : '');
    return '';
  }

  // came from their magic mockup (mark.js sends them here to sign in): a way straight back once they're in
  const BACK = (() => {
    const ok = (v) => typeof v === 'string' && (/^\/peek\/[a-z0-9-]{1,40}\/\?mark=1(#[A-Za-z0-9_-]{0,40})?$/.test(v) || /^\/start\.html(\?[A-Za-z0-9=&_.%+-]{0,300})?$/.test(v));
    try {
      const v = new URLSearchParams(location.search).get('back') || '';
      if (ok(v)) { sessionStorage.setItem('wf-back', v); return v; }
      const kept = sessionStorage.getItem('wf-back') || '';
      return ok(kept) ? kept : '';
    } catch (e) { return ''; }
  })();
  function renderBack() {
    if (!BACK) return;
    let box = document.getElementById('back-mock');
    if (!box) {
      box = document.createElement('section'); box.className = 'p-card back-mock'; box.id = 'back-mock';
      const toStart = BACK.indexOf('/start.html') === 0;
      const p = document.createElement('p'); p.textContent = toStart ? 'You’re signed in, so your getting-started page now saves to your portal and follows you to any device.' : 'You’re signed in. Head back to your mockup and tap anything you’d like changed.';
      const a = document.createElement('a'); a.className = 'btn'; a.href = BACK; a.textContent = toStart ? 'Back to my getting-started page' : 'Back to my mockup';
      a.addEventListener('click', () => { try { sessionStorage.removeItem('wf-back'); } catch (e) { /* fine */ } });
      box.append(p, a);
      const proj = document.getElementById('v-project'); proj.insertBefore(box, proj.firstElementChild);
    }
  }
  function render() {
    const c = me.client;
    const build = BUILDS[c.build] || c.build_label;
    hero('Your project', 'Hi, ', (c.first_name || 'friend') + '.',
      (c.business ? c.business + (build ? ' · ' : '') : '') + (build ? '\u0001' + build + ' build' : ''), BUILD_MOON[c.build], nowLine());
    $('#me-email').textContent = c.email || 'you';
    // forget "I tapped Pay" once Taya has marked it
    me.pay.forEach((p) => { if (p.state === 'paid' || p.state === 'active') taps.drop(p.key); });
    // the header's "Getting started" only while that page is still theirs to fill in
    $('#nav-start').hidden = !startItem();
    renderBack();
    renderTurn();
    renderNote();
    renderList();
    renderTimeline();
    renderThings();
    renderTexts();
    renderPay();
    renderChange();
    placeChange();
    if (firstShow) {
      firstShow = false;
      if (!reduceMotion) {
        $$('#v-project > .p-card:not([hidden])').forEach((el, i) => {
          el.style.setProperty('--i', String(i));
          el.classList.add('rise');
          el.addEventListener('animationend', () => el.classList.remove('rise'), { once: true });
        });
      }
    }
  }

  // Care clients mostly come back to ask for a change: once they're in care (or have nothing left on
  // their list), "Ask for a change" moves up, right under the note and the list.
  function placeChange() {
    const proj = $('#v-project');
    const sec = $('#sec-change');
    const cur = me.timeline.current;
    const up = me.care.can_ask && (cur === 'care' || !me.list.open.length);
    const before = up ? (me.list.open.length ? $('#sec-where') : $('#sec-list')) : null;
    if (before) { if (sec.nextElementSibling !== before) proj.insertBefore(sec, before); }
    else if (proj.lastElementChild !== sec) proj.append(sec);
  }

  /* ---- texts: sign in with a text (Oct 2 2026). The words match the server's SMS_CONSENT exactly. ---- */
  const SMS_CONSENT = 'Yes, text me my Web Faery sign-in codes and updates about my website at this number. ' +
    'A few texts a month at most. Message and data rates may apply. Reply STOP to stop, HELP for help. ' +
    'Saying yes is never required to work with me.';
  function renderTexts() {
    const sec = $('#sec-texts');
    const s = me.sms;
    if (!s || !s.available) { sec.hidden = true; return; }
    wireTexts();
    sec.hidden = false;
    $('#texts-on').hidden = !s.on;
    $('#f-texts').hidden = s.on;
    $('#h-texts').textContent = s.on ? 'Texts are on' : 'Sign in with a text';
    $('#texts-now').textContent = 'Your sign-in codes can come by text to the number ending in ' + s.last4 + '. Reply STOP anytime to stop.';
    $('#texts-consent').textContent = SMS_CONSENT;
  }
  let textsWired = false;
  function wireTexts() {
    if (textsWired) return; textsWired = true;
    const err = (m) => { const p = $('#texts-err'); p.hidden = !m; p.textContent = m || ''; };
    $('#f-texts').addEventListener('submit', async (ev) => {
      ev.preventDefault(); err('');
      const digits = $('#in-cell').value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
      if (digits.length !== 10) { err('That doesn’t look like a 10-digit number.'); $('#in-cell').focus(); return; }
      if (!$('#in-agree').checked) { err('Tick the box to say yes to texts.'); $('#in-agree').focus(); return; }
      if (DEMO) { toast('Demo: nothing was saved.'); return; }
      const b = $('#b-texts'); b.disabled = true;
      try {
        const d = await postJSON('/sms', { on: true, phone: digits, agree: true }, token);
        me.sms = Object.assign({}, me.sms, d.sms || {}); renderTexts(); toast('Texts are on. Thank you!');
      } catch (e) {
        err(e.reason === 'taken' ? 'That number is already on another account. Email me and I’ll sort it out.'
          : e.code === 'slow_down' ? 'That’s a lot of changes for now. Try again in a bit.'
          : 'That didn’t go through. Try again?');
      } finally { b.disabled = false; }
    });
    $('#b-texts-off').addEventListener('click', async () => {
      if (DEMO) { toast('Demo: nothing was saved.'); return; }
      try { const d = await postJSON('/sms', { on: false }, token); me.sms = Object.assign({}, me.sms, d.sms || {}); renderTexts(); toast('Texts are off.'); }
      catch (e) { toast('That didn’t go through. Try again?'); }
    });
  }

  /* ---- whose turn it is (the magic mockup step, Oct 2 2026) ---- */
  function renderTurn() {
    const sec = $('#sec-turn');
    const m = me.mockup;
    if (me.start_open || !m) { sec.hidden = true; return; }
    const done = !!m.done_on;
    $('#turn-kicker').textContent = done ? 'My turn' : 'Your turn';
    $('#h-turn').textContent = done ? 'That’s it for you for now' : 'Look over your mockup';
    $('#turn-text').textContent = done
      ? 'Thank you! I’m looking over everything you sent, and I’ll email you with the next round. Nothing to sign or pay yet.'
      : 'Pick the build that feels like you, then tap anything on it to leave me a note. When you’re finished, tap Done.';
    $('#turn-btn').href = m.url;
    $('#turn-btn').className = done ? 'btn secondary' : 'btn';
    $('#turn-btn-text').textContent = done ? 'Add more to my mockup' : 'Open my mockup';
    sec.hidden = false;
  }

  /* ---- a note from Taya ---- */
  function renderNote() {
    const sec = $('#sec-note');
    if (!me.note) { sec.hidden = true; return; }
    $('#note-text').textContent = me.note.text;
    $('#note-date').textContent = shortDate(me.note.date);
    sec.hidden = false;
  }

  /* ---- your list ---- */
  function renderList() {
    const open = me.list.open;
    const done = me.list.done;
    const cur = me.timeline.current;
    $('#h-list').textContent = !open.length ? 'All caught up' : open.length === 1 ? 'Just one thing' : 'Just these few things';
    $('#todos').replaceChildren(...open.map(todoRow));
    $('#todos').hidden = !open.length;
    $('#list-empty').hidden = open.length > 0;
    // their turn on the mockup: an empty list mustn't sit under "Your turn" saying "rest easy"
    $('#sec-list').hidden = !open.length && !me.start_open && !!me.mockup && !me.mockup.done_on;
    $('#list-empty-text').textContent = cur === 'care' || cur === 'resting'
      ? 'Nothing on your list. Your site is in good hands.'
      : 'Nothing on your list right now. Rest easy, I’ve got the next bit.';
    // once the list is empty, say what is happening now and what comes after, so nobody wonders
    const nx = $('#list-next');
    nx.replaceChildren();
    if (!open.length) {
      const ci = stageIndex(cur);
      const here = STAGES[ci];
      const after = STAGES[ci + 1];
      const lines = [];
      if (cur === 'care') {
        lines.push(['Next', 'I check in by email about once a month. Anything you want changed, just email me.']);
      } else if (here) {
        if (cur !== 'getting_started' && STAGE_SAY[here[0]]) lines.push(['Right now', STAGE_SAY[here[0]]]);
        if (after && STAGE_SAY[after[0]]) {
          const st = me.timeline.stages.find((x) => x.key === after[0]) || {};
          const d = shortDate(st.date);
          lines.push(['Next', (st.label || after[1]) + '. ' + STAGE_SAY[after[0]] + (d && !isPast(st.date) ? ' About ' + d + '.' : '')]);
        }
      }
      nx.append(...lines.map(([k, t]) => {
        const row = make('span');
        row.append(make('b', null, k + ': '), document.createTextNode(t));
        return row;
      }));
    }
    const fold = $('#done-fold');
    fold.hidden = !done.length;
    $('#done-sum').textContent = 'Done (' + done.length + ')';
    $('#done-list').replaceChildren(...done.map((d) => {
      const li = make('li');
      const m = make('span', 'm');
      m.append(icon('i-check'));
      li.append(m, make('span', null, d.title));
      return li;
    }));
  }

  function todoRow(item) {
    const t = taps.mine();
    const tapped = item.kind === 'pay' && t[item.pay_key];
    const li = make('li', 'todo' + (item.status === 'sent' || tapped ? ' sent' : '') + (item.kind === 'pay' ? ' pay' : ''));
    li.dataset.id = item.id;
    const mk = make('span', 'mk');
    mk.setAttribute('aria-hidden', 'true');
    const body = make('div');
    body.append(make('h3', null, item.title));
    if (item.detail) body.append(make('p', 'detail', item.detail));
    const sentLine = (text) => {
      const p = make('p', 'thanks-line');
      p.append(icon('i-check'), make('span', null, text));
      return p;
    };
    const act = make('div', 'act');
    const kind = item.kind;

    if (kind === 'start' && (item.start_step === 'top' || !item.start_step)) {
      // a new client: the whole getting-started page, with what's on it in order
      if (item.status === 'sent') {
        body.append(sentLine('Sent, thank you! I’ll check it soon.'));
        act.append(startLink('top', 'Open it again', 'open-btn'));
      } else {
        const steps = [];
        if (!me.things.agreement) steps.push('Sign our agreement');
        const dep = me.pay.find((p) => p.key === 'deposit');
        if (dep && dep.state !== 'paid' && !t.deposit) steps.push('Pay your deposit');
        // email only since Oct 5 2026: there is never a call to book, so it's never a to-do
        if (steps.length > 1) {
          const ol = make('ol', 'substeps');
          steps.forEach((x) => ol.append(make('li', null, x)));
          body.append(make('p', 'detail', 'On that one page, in order:'), ol);
        }
        act.append(startLink('top', 'Open your getting-started page'));
        if (!item.derived) act.append(doneButton(item));
      }
    } else if (kind === 'start' && item.start_step === 'sign') {
      // signing lives on the getting-started page, so this one still goes there
      if (item.status === 'sent') body.append(sentLine('Sent, thank you! I’ll check it soon.'));
      else body.append(make('p', 'hint', 'It opens your getting-started page in a new tab.'));
      act.append(startLink('sign', item.status === 'sent' ? 'Open it again' : 'Sign it', item.status === 'sent' ? 'open-btn' : 'btn small'));
      if (item.status !== 'sent' && !item.derived) act.append(doneButton(item));
    } else if (kind === 'start') {
      // any other step: its few lines right here, no trip back to the getting-started page
      if (item.status === 'sent') body.append(sentLine('Sent, thank you! I’ll check it soon.'));
      const how = HOWTO[item.start_step];
      if (how) {
        const d = make('details', 'howto');
        if (item.status !== 'sent') d.open = how.steps.length === 1;
        d.append(make('summary', null, how.steps.length > 1 ? 'How to do it' : 'What I need'));
        const ol = make(how.steps.length > 1 ? 'ol' : 'ul');
        how.steps.forEach((x) => ol.append(make('li', null, x)));
        d.append(ol);
        // a line picked by their build (Tended and In Bloom share one), or the same line for everyone
        const b = me.client.build;
        const after = how.after && typeof how.after === 'object'
          ? how.after[b === 'maiden' ? 'maiden' : BUILDS[b] ? 'mother' : 'other']
          : how.after;
        if (after) d.append(make('p', 'hint', after));
        body.append(d);
      }
      if (item.status !== 'sent' && !item.derived) act.append(doneButton(item));
    } else if (kind === 'link' && item.url) {
      if (item.status === 'sent') body.append(sentLine('Sent, thank you! I’ll check it soon.'));
      const what = item.id === 'd:draft' ? 'your private draft' : 'that page';
      act.append(outLink(item.url, 'Open', item.status === 'sent' ? 'open-btn' : 'btn small', what, ''));
      if (item.status !== 'sent' && !item.derived) act.append(doneButton(item));
      if (item.id === 'd:draft') {
        // a round of changes: one email with everything in it
        const m = make('a', 'later', 'Send me your changes');
        m.href = 'mailto:' + TAYA + '?subject=' + encodeURIComponent('Changes for my draft');
        act.append(m);
        body.append(make('p', 'hint', 'One email per round, with everything in it. Two rounds are included.'));
      }
    } else if (kind === 'upload') {
      uploadBlock(item, body, act, sentLine);
    } else if (kind === 'answer') {
      answerBlock(item, body, act);
    } else if (kind === 'pay') {
      if (tapped) body.append(sentLine(PAY_THANKS));
      const b = make('button', tapped ? 'later' : 'btn small secondary', 'See payments');
      b.type = 'button';
      b.addEventListener('click', () => {
        const sec = $('#sec-pay');
        sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        const target = item.pay_key && $('#pay-' + item.pay_key + ' .btn, #pay-' + item.pay_key + ' a');
        setTimeout(() => focusEl(target || sec), reduceMotion ? 0 : 450);
      });
      act.append(b);
    }
    if (act.childNodes.length) body.append(act);
    li.append(mk, body);
    return li;
  }

  // "I’ve done it": for a step on the getting-started page or a link, so Taya knows to look
  function doneButton(item) {
    const b = make('button', 'later', 'I’ve done it');
    b.type = 'button';
    b.addEventListener('click', async () => {
      b.disabled = true;
      busy++;
      try {
        const r = await api.todo(item.id, 'sent');
        item.status = r && r.status === 'done' ? 'done' : 'sent';
        item.sent_on = todayISO;
        if (item.status === 'done') { me.list.open = me.list.open.filter((x) => x !== item); me.list.done.push({ id: item.id, title: item.title }); renderList(); }
        else { replaceRow(item); if (item === startItem()) renderThings(); }
        announce('Thank you! I’ll check it soon.');
      } catch (err) {
        b.disabled = false;
        if (err.code === 'signed_out') { quietSignOut(true); return; }
        toast(words(err));
      } finally { busy = Math.max(0, busy - 1); }
    });
    return b;
  }

  const replaceRow = (item) => {
    const old = $('#todos > li[data-id="' + CSS.escape(item.id) + '"]');
    if (old) old.replaceWith(todoRow(item));
  };

  /* ---- an answer, typed right here ---- */
  function answerBlock(item, body, act) {
    const kept = drafts.get('ans:' + item.id);
    if (kept && item.status === 'sent' && kept !== item.answer) openAnswers.add(item.id);
    const editing = openAnswers.has(item.id);
    if (item.status === 'sent' && item.answer && !editing) {
      const said = make('p', 'said');
      said.append(make('span', 'sr-only', 'You said: '), item.answer);
      body.append(said);
      const p = make('p', 'thanks-line');
      p.append(icon('i-check'), make('span', null, 'Sent, thank you! I’ll check it soon.'));
      body.append(p);
      const b = make('button', 'later', 'Change my answer');
      b.type = 'button';
      b.addEventListener('click', () => { openAnswers.add(item.id); replaceRow(item); const t = $('#todos > li[data-id="' + CSS.escape(item.id) + '"] textarea'); if (t) t.focus(); });
      act.append(b);
      return;
    }
    const box = make('div', 'answer-box');
    const id = 'ans-' + item.id.replace(/[^A-Za-z0-9]/g, '');
    const label = make('label', 'sr-only', 'Your answer to: ' + item.title);
    label.htmlFor = id;
    const ta = make('textarea', 'short');
    ta.id = id;
    ta.maxLength = ANSWER_MAX;
    ta.rows = 3;
    ta.placeholder = 'Type it here';
    ta.value = kept || (editing ? item.answer : '');
    ta.addEventListener('input', () => drafts.set('ans:' + item.id, ta.value));
    const err = make('p', 'err');
    err.hidden = true;
    err.id = id + '-err';
    ta.setAttribute('aria-describedby', err.id);
    const row = make('div', 'row');
    const send = make('button', 'btn small', null);
    send.type = 'button';
    send.append(make('span', null, 'Send'));
    row.append(send);
    if (editing) {
      const cancel = make('button', 'later', 'Keep what I sent');
      cancel.type = 'button';
      cancel.addEventListener('click', () => { openAnswers.delete(item.id); drafts.set('ans:' + item.id, ''); replaceRow(item); });
      row.append(cancel);
    }
    send.addEventListener('click', async () => {
      const text = cleanText(ta.value, ANSWER_MAX + 1);
      if (!text) { err.textContent = 'Just a word or two is plenty.'; err.hidden = false; ta.focus(); return; }
      if (text.length > ANSWER_MAX) { err.textContent = 'That’s a lot! Could you keep it under 1,000 characters? Email me the rest.'; err.hidden = false; return; }
      err.hidden = true;
      setBusy(send, true, 'Sending…');
      busy++;
      try {
        const r = await api.todo(item.id, 'answer', text);
        item.status = 'sent';
        item.answer = text;
        item.sent_on = todayISO;
        drafts.set('ans:' + item.id, '');
        openAnswers.delete(item.id);
        busy--;
        replaceRow(item);
        announce('Sent, thank you!');
      } catch (e2) {
        busy--;
        setBusy(send, false);
        if (e2.code === 'signed_out') { quietSignOut(true); return; }
        err.textContent = words(e2);
        err.hidden = false;
      }
    });
    box.append(label, ta, err, row);
    body.append(box);
  }

  /* ---- photos and files, sent right here ---- */
  function uploadBlock(item, body, act, sentLine) {
    const kind = UPLOAD_TYPES[item.accept] || UPLOAD_TYPES.photos;
    const noun = kind.say; // photos or files
    if (item.files_count > 0) body.append(sentLine(plural(item.files_count, noun === 'photos' ? 'photo' : 'file', noun) + ' sent. Thank you!'));
    const room = UPLOAD_PER_ITEM - item.files_count;
    if (room <= 0) { body.append(make('p', 'detail', 'That’s all this spot can hold. Email me any more, or share an album link.')); return; }
    const id = 'up-' + item.id.replace(/[^A-Za-z0-9]/g, '');
    const input = make('input', 'up-input');
    input.type = 'file';
    input.id = id;
    input.multiple = true;
    input.accept = kind.accept;
    const pick = make('label', 'pick pick-btn');
    pick.htmlFor = id;
    pick.append(icon('i-up'), make('span', null, item.files_count ? 'Add more' : noun === 'photos' ? 'Add photos' : 'Add files'));
    const progress = make('p', 'progress');
    progress.setAttribute('role', 'status');
    input.addEventListener('change', () => sendFiles(item, input, pick, progress, kind));
    act.append(input, pick);
    body.append(progress);
  }

  async function sendFiles(item, input, pick, progress, kind) {
    const chosen = Array.from(input.files || []);
    input.value = '';
    if (!chosen.length || pick.getAttribute('aria-disabled') === 'true') return;
    const skipped = [];
    let files = chosen.filter((f) => { const ok = kind.ext.includes(extOf(f.name)); if (!ok) skipped.push(f.name); return ok; });
    const room = UPLOAD_PER_ITEM - item.files_count;
    if (files.length > room) { skipped.push(plural(files.length - room, 'extra file', 'extra files')); files = files.slice(0, room); }
    if (!files.length) { progress.className = 'progress err'; progress.textContent = 'Those didn’t fit here. Photos, PDFs or logo files work best.'; return; }
    busy++;
    pick.setAttribute('aria-disabled', 'true');
    input.disabled = true;
    progress.className = 'progress';
    progress.textContent = 'Getting them ready…';
    let sent = 0;
    try {
      const ready = [];
      for (const f of files) {
        const s = item.accept === 'photos' || !item.accept ? await shrink(f) : f;
        if (s.size > UPLOAD_MAX) skipped.push(f.name + ' (over 15 MB)'); else ready.push(s);
      }
      if (!ready.length) throw Object.assign(fail('input', 400), { reason: 'size' });
      const total = ready.length;
      let count = item.files_count;
      // sends of up to 10 files and about 25 MB each
      const batches = [];
      for (const f of ready) {
        const last = batches[batches.length - 1];
        if (last && last.length < UPLOAD_PER_SEND && last.bytes + f.size <= UPLOAD_SEND_BYTES) { last.push(f); last.bytes += f.size; }
        else { const b = [f]; b.bytes = f.size; batches.push(b); }
      }
      for (const batch of batches) {
        const r = await api.upload(item.id, batch.slice(), (p) => {
          const pct = Math.round(((sent + p * batch.length) / total) * 100);
          progress.textContent = 'Sending… ' + Math.min(99, pct) + '%';
        });
        sent += batch.length;
        count = r && Number.isFinite(+r.files_count) ? +r.files_count : count + batch.length;
        item.files_count = count;
        item.status = 'sent';
      }
      item.files_count = count;
      item.status = 'sent';
      item.sent_on = todayISO;
      busy--;
      replaceRow(item);
      const msg = plural(total, kind.say === 'photos' ? 'photo' : 'file', kind.say) + ' sent. Thank you!' +
        (skipped.length ? ' (I left out ' + skipped.slice(0, 3).join(', ') + (skipped.length > 3 ? ' and more' : '') + '.)' : '');
      toast(msg);
    } catch (err) {
      busy--;
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      if (sent > 0) { replaceRow(item); toast('Some arrived, but not all. ' + words(err), 9000); return; }
      pick.removeAttribute('aria-disabled');
      input.disabled = false;
      progress.className = 'progress err';
      progress.textContent = words(err);
    }
  }

  // Big phone photos are shrunk in the browser first (longest side 2400 px, JPEG), like the getting-started
  // page does, so they send quickly and stay under the server's limit. Anything else goes as is.
  async function shrink(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5 * MB || !window.createImageBitmap) return f;
    try {
      const bmp = await createImageBitmap(f);
      const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
      if (!blob || blob.size >= f.size) return f;
      return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: f.lastModified });
    } catch (e) { return f; }
  }

  /* ---- where we are ---- */
  function renderTimeline() {
    const cur = me.timeline.current;
    const ci = stageIndex(cur);
    const live = cur === 'care' || cur === 'resting';
    const list = STAGES.map(([key, label], i) => {
      const s = me.timeline.stages.find((x) => x.key === key) || {};
      return { key, label: s.label || label, date: s.date || '', state: i < ci ? 'done' : i === ci ? 'now' : 'next' };
    });
    $('#tl').replaceChildren(...list.map((s) => {
      const li = make('li', s.state);
      if (s.state === 'now') li.setAttribute('aria-current', 'step');
      const dot = make('span', 'dot');
      dot.setAttribute('aria-hidden', 'true');
      if (s.state === 'done') dot.append(icon('i-check'));
      const body = make('div');
      const name = make('span', 'name');
      name.append(make('span', null, s.label));
      if (s.state === 'now') name.append(make('span', 'now-pill', 'Now'));
      else if (s.state === 'done') name.append(make('span', 'sr-only', '(done)'));
      body.append(name);
      const d = shortDate(s.date);
      // the draft link is already here: its date is when it's finished, not when it arrives
      const draftHere = s.key === 'draft' && s.state === 'now' && !!me.things.draft;
      let when = '';
      if (d) {
        if (s.state === 'done') when = d;
        else if (s.key === 'settling_in') when = (s.state === 'now' ? 'Until ' : 'Until about ') + d;
        else if (s.key === 'call') when = isPast(s.date) ? d : 'About ' + d;
        else if (draftHere) when = isPast(s.date) ? '' : 'Finished about ' + d;
        else if (s.state === 'now') when = isPast(s.date) ? 'Since ' + d : 'About ' + d;
        else when = 'About ' + d;
      }
      body.append(make('span', 'when', when));
      const say = draftHere ? 'Your draft is growing. Peek anytime with your private link.' : STAGE_SAY[s.key];
      if (s.state === 'now' && say) body.append(make('p', 'say', say));
      li.append(dot, body);
      return li;
    }));
    // once the site is live, the six finished steps fold away into one line
    $('#h-where').textContent = cur === 'care' ? 'Live, and in good hands' : cur === 'resting' ? 'All done, and all yours' : 'Your site, step by step';
    $('#tl').hidden = live;
    const more = $('#b-tl-more');
    more.hidden = !live;
    more.textContent = 'See every step';
    more.setAttribute('aria-expanded', 'false');
    const after = $('#tl-after');
    after.replaceChildren();
    if (cur === 'care') {
      const since = shortDate(me.timeline.care_since || (me.pay.find((p) => p.key === 'care') || {}).paid_on || stageDate('settling_in'));
      after.append(icon('i-full'), make('span', null, 'Live and in my care' + (since ? ' since ' + since : '') + '.'));
      after.hidden = false;
    } else if (cur === 'resting') {
      const span = make('span', null, 'Your site is all yours. If you ever need me, just email ');
      const a = make('a', null, TAYA);
      a.href = 'mailto:' + TAYA;
      span.append(a, '.');
      after.append(icon('i-full'), span);
      after.hidden = false;
    } else after.hidden = true;
  }

  /* ---- your things ---- */
  function renderThings() {
    const c = me.client;
    const th = me.things;
    const ci = stageIndex(me.timeline.current);
    const rows = [];
    const row = (ico, name, sub, actions, waiting) => {
      const li = make('li', 'thing' + (waiting ? ' waiting' : ''));
      const i = make('span', 'ico');
      i.append(icon(ico));
      li.append(i, make('span', 't-name', name));
      if (sub) li.append(make('span', 't-sub', sub));
      if (actions && actions.length) { const a = make('span', 't-act'); a.append(...actions); li.append(a); }
      rows.push(li);
      return li;
    };

    // their live site once it's out, otherwise the draft
    if (c.site_url && ci >= 4) row('i-globe', 'Your site', hostOf(c.site_url), [outLink(c.site_url, 'Visit', null, 'your live site')]);
    else if (me.mockup) row('i-eye', 'Your mockup', 'Pick a build and tap anything to leave me a note.', [outLink(me.mockup.url, 'Open', null, 'your mockup')]);
    else if (th.draft) row('i-eye', 'Your draft', th.draft.note || 'A private link, just for you.', [outLink(th.draft.url, 'Open', null, 'your private draft')]);
    else {
      const d = shortDate(stageDate('draft'));
      row('i-eye', 'Your draft', d && ci <= 2 ? 'Comes about ' + d + '. I’ll email you the link.' : 'Your private link comes with your draft.', null, true);
    }

    // the agreement
    if (th.agreement) {
      const a = th.agreement;
      const signed = a.signed_name ? 'Signed' + (a.signed_on ? ' ' + shortDate(a.signed_on) : '') + ' as ' + a.signed_name : 'Signed, thank you';
      if (a.file) row('i-sign', 'Our agreement', signed, [fileButton('agreement', null, 'Open', 'agreement')]);
      else row('i-sign', 'Our agreement', signed + '. Want a copy? Just ask.', null);
    } else if (!me.start_open) {
      // nothing to sign until Taya has written back after their mockup
      row('i-sign', 'Our agreement', 'Nothing to sign yet. It comes later, once we’ve talked over email.', null, true);
    } else {
      const st = startItem();
      if (st && st.status === 'sent') {
        row('i-sign', 'Our agreement', 'Signed on your getting-started page? I’ll add it here once I’ve had a look.', null, true);
      } else {
        row('i-sign', 'Our agreement', 'Not signed yet. It’s one short page, on your getting-started page.', [startLink('sign', 'Sign it', 'later')], true);
      }
    }

    row('i-palette', 'Your brand sheet', th.brand_sheet ? 'Your colors, fonts and logo files' : 'Comes at launch',
      th.brand_sheet ? [fileButton('brand_sheet', null, 'Open', 'brand sheet')] : null, !th.brand_sheet);
    row('i-key', 'The “Your site” sheet', th.handoff_sheet ? 'What lives where, and which logins are yours' : 'Comes at launch',
      th.handoff_sheet ? [fileButton('handoff_sheet', null, 'Open', 'site sheet')] : null, !th.handoff_sheet);

    // receipts
    if (th.receipts.length) {
      const li = row('i-receipt', th.receipts.length === 1 ? 'Your receipt' : 'Your receipts', 'Stripe also emails a receipt each time.');
      const ul = make('ul', 'receipts');
      th.receipts.forEach((r) => {
        const item = make('li');
        item.append(make('span', null, r.label), fileButton('receipt', r.name, 'Open', r.label, 'later'));
        ul.append(item);
      });
      li.append(ul);
    } else row('i-receipt', 'Your receipts', 'None yet. Stripe also emails a receipt each time.', null, true);

    $('#things').replaceChildren(...rows);
  }

  function fileButton(thing, name, label, what, cls) {
    const b = make('button', cls || 'open-btn', null);
    b.type = 'button';
    b.append(make('span', null, label));
    if (!cls) b.append(icon('i-doc'));
    b.setAttribute('aria-label', label + ' your ' + what.replace(/^your /i, ''));
    b.addEventListener('click', () => openFile(b, thing, name, what));
    return b;
  }

  // Files come through the server only for the signed-in client, then open here as a private blob.
  // A tab is opened during the tap (so phones allow it) and filled once the file arrives.
  async function openFile(btn, thing, name, what) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    let win = null;
    try { win = window.open('', '_blank'); } catch (e) { win = null; }
    if (win) { try { win.opener = null; win.document.title = 'Opening…'; win.document.body.textContent = 'Opening your file…'; } catch (e) { /* fine */ } }
    btn.setAttribute('aria-busy', 'true');
    try {
      const r = await api.file(thing, name || undefined);
      const type = SAFE_TYPES.includes(r.type) ? r.type : 'application/octet-stream';
      const url = URL.createObjectURL(new Blob([r.blob], { type }));
      if (win && !win.closed && type !== 'application/octet-stream') win.location.href = url;
      else {
        if (win) win.close();
        const a = make('a');
        a.href = url;
        a.download = (what || 'file').replace(/[^\w ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + ({ 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[type] || '');
        document.body.append(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      if (win) win.close();
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      toast(err.code === 'not_found' ? 'That file isn’t here anymore. Email me and I’ll send it again.' : words(err));
    } finally { btn.removeAttribute('aria-busy'); }
  }

  /* ---- your shop's orders (Oct 8 2026) ----
     Only for a client whose shop runs on Web Faery's server (the server answers shop: null for everyone else, and
     the section stays hidden). Newest first: what, size, total, the full shipping address, a Packed tick (the one
     thing saved from here) and a link to the order in their own Stripe. Addresses leave the server 30 days after
     Packed; then the row says where it went, and Stripe keeps the whole order. */
  let shop = null;           // { shop: { name, test }, orders: [...] } as the server last sent it (cleaned)
  let ordersBusy = false;
  async function loadOrders() {
    if (DEMO) { $('#sec-orders').hidden = true; return; } // the preview has no shop
    if (ordersBusy) return;
    ordersBusy = true;
    try {
      const d = await api.shopOrders();
      shop = cleanShop(d);
      renderOrders();
      if (shop) loadCodes(); else { codes = null; $('#sec-codes').hidden = true; }
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      // a shop that can't load right now keeps what it showed; a client without one sees nothing new
      if (!shop) $('#sec-orders').hidden = true;
    } finally { ordersBusy = false; }
  }
  function cleanShop(d) {
    d = d && typeof d === 'object' ? d : {};
    if (!d.shop || typeof d.shop !== 'object') return null;
    const stripeUrl = (u) => { const s = safeUrl(u); return /^https:\/\/dashboard\.stripe\.com\//.test(s) ? s : ''; };
    const order = (o) => {
      if (!o || typeof o !== 'object' || !str(o.id)) return null;
      const a = o.address && typeof o.address === 'object' ? o.address : null;
      return {
        id: str(o.id, 20), day: str(o.day, 10), total: str(o.total, 20), ship_option: str(o.ship_option, 120),
        city: str(o.city, 120), state: str(o.state, 60), packed_on: str(o.packed_on, 10), cleared_on: str(o.address_cleared_on, 10),
        test: !!o.test, oversold: !!o.oversold, stripe_url: stripeUrl(o.stripe_url),
        code: str(o.code, 30), discount: str(o.discount, 20), note: str(o.note, 600),
        shipped_on: str(o.shipped_on, 10), carrier: str(o.carrier, 40), tracking: str(o.tracking, 60),
        tracking_url: safeUrl(o.tracking_url), emailed_on: str(o.emailed_on, 10), can_email: !!o.can_email,
        items: arr(o.items).slice(0, 50).map((it) => ({ title: str(it && it.title, 250), size: str(it && it.size, 30), qty: Math.max(1, Math.min(999, Math.round(+(it && it.qty) || 1))), total: str(it && it.total, 20) })).filter((it) => it.title),
        address: a ? { name: str(a.name, 200), line1: str(a.line1, 200), line2: str(a.line2, 200), city: str(a.city, 120), state: str(a.state, 60), postal_code: str(a.postal_code, 20), country: str(a.country, 8) } : null
      };
    };
    return { shop: { name: str(d.shop.name, 120), test: !!d.shop.test }, orders: arr(d.orders).slice(0, 200).map(order).filter(Boolean) };
  }
  function renderOrders() {
    const sec = $('#sec-orders');
    if (!shop) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#orders-test').hidden = !shop.shop.test;
    $('#orders-empty').hidden = shop.orders.length > 0;
    $('#orders').replaceChildren(...shop.orders.map(orderRow));
  }
  function orderRow(o) {
    const li = make('li', 'order' + (o.packed_on ? ' packed' : ''));
    li.dataset.order = o.id;
    const head = make('div', 'o-head');
    head.append(make('span', 'o-date', shortDate(o.day) || 'New'), make('span', 'o-total', o.total));
    li.append(head);
    const items = make('ul', 'o-items');
    o.items.forEach((it) => {
      const row = make('li');
      row.append(make('span', 'o-what', it.title + (it.size ? ', size ' + it.size : '')), make('span', 'o-cost', (it.qty > 1 ? it.qty + ' for ' : '') + it.total));
      items.append(row);
    });
    li.append(items);
    if (o.code) li.append(make('p', 'o-code', 'Code ' + o.code + (o.discount ? ', ' + o.discount + ' off' : '')));
    const ship = make('div', 'o-ship');
    const where = [o.city, o.state].filter(Boolean).join(', ');
    if (o.address) {
      const a = o.address;
      ship.append(make('span', 'o-label', 'Ship to'));
      const lines = make('p', 'o-addr');
      [a.name, a.line1, a.line2, [[a.city, a.state].filter(Boolean).join(', '), a.postal_code].filter(Boolean).join(' '), a.country && a.country !== 'US' ? a.country : '']
        .filter(Boolean).forEach((t) => lines.append(make('span', null, t)));
      ship.append(lines);
    } else if (o.cleared_on) {
      ship.append(make('span', 'o-label', 'Shipped to'), make('p', 'o-gone', (where ? where + '. ' : '') + 'The full address is in your Stripe now.'));
    } else {
      ship.append(make('span', 'o-label', 'Ship to'), make('p', 'o-gone', (where ? where + '. ' : '') + 'The full address is in your Stripe.'));
    }
    if (o.ship_option) ship.append(make('p', 'o-opt', o.ship_option));
    li.append(ship);
    if (o.note) {
      const n = make('div', 'o-note');
      n.append(make('span', 'o-label', 'Their note'), make('p', null, o.note));
      li.append(n);
    }
    if (o.shipped_on) li.append(shippedLine(o));
    if (o.oversold) li.append(make('p', 'o-warn', 'This was the last one, and it sold twice. Refund one of the two in your Stripe, and email me if you’d like a hand.'));
    const act = make('div', 'o-act');
    const lab = make('label', 'o-packed');
    const cb = make('input');
    cb.type = 'checkbox';
    cb.checked = !!o.packed_on;
    const word = make('span', null, o.packed_on ? 'Packed ' + shortDate(o.packed_on) : 'Packed');
    lab.append(cb, word);
    cb.addEventListener('change', () => setPacked(o, cb, word, li));
    act.append(lab);
    if (o.stripe_url) act.append(outLink(o.stripe_url, 'Open in Stripe', null, 'this order in Stripe'));
    li.append(act);
    const act2 = make('div', 'o-act o-act2');
    const shipBtn = make('button', 'open-btn o-ship-btn', o.shipped_on ? 'Change tracking' : 'Shipped');
    shipBtn.type = 'button';
    shipBtn.setAttribute('aria-expanded', 'false');
    shipBtn.addEventListener('click', () => openShipForm(o, li, shipBtn));
    const slipBtn = make('button', 'open-btn o-slip-btn', 'Packing slip');
    slipBtn.type = 'button';
    slipBtn.addEventListener('click', () => openSlip(slipBtn, o));
    act2.append(shipBtn, slipBtn);
    li.append(act2);
    return li;
  }
  // "Shipped Oct 10 by USPS, 9400... Track it" and whether the buyer has their email
  function shippedLine(o) {
    const p = make('p', 'o-shipped');
    p.append(make('span', null, 'Shipped ' + shortDate(o.shipped_on) + (o.carrier ? ' by ' + o.carrier : '') + (o.tracking ? ', ' + o.tracking : '') + '.'));
    if (o.tracking_url) {
      p.append(' ');
      const a = make('a', 'later', 'Track it');
      a.href = o.tracking_url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a);
    }
    p.append(make('span', 'o-mailed', o.emailed_on ? 'The buyer has their shipped email.' : (o.can_email ? '' : 'No buyer email here, so no email went out.')));
    return p;
  }
  const CARRIER_KEYS = { USPS: 'usps', UPS: 'ups', FedEx: 'fedex', DHL: 'dhl' };
  // the Shipped form, right on the order: carrier, tracking number, and for another carrier its name and link
  function openShipForm(o, li, btn) {
    const open = li.querySelector('.ship-form');
    if (open) { focusEl(open.querySelector('select')); return; }
    const id = o.id;
    const f = make('form', 'ship-form');
    f.noValidate = true;
    const field = (label, input, opt) => {
      const l = make('label', 'field-label', label);
      l.htmlFor = input.id;
      if (opt) { l.append(' '); l.append(make('span', 'opt-tag', opt)); }
      return l;
    };
    const sel = make('select');
    sel.id = 'car-' + id;
    [['usps', 'USPS'], ['ups', 'UPS'], ['fedex', 'FedEx'], ['dhl', 'DHL'], ['other', 'Another carrier'], ['', 'No tracking (a plain stamp)']]
      .forEach(([v, t]) => { const op = make('option', null, t); op.value = v; sel.append(op); });
    if (o.shipped_on) sel.value = o.carrier ? (CARRIER_KEYS[o.carrier] || 'other') : '';
    const trk = make('input');
    trk.type = 'text'; trk.id = 'trk-' + id; trk.maxLength = 60; trk.autocomplete = 'off'; trk.spellcheck = false;
    trk.value = o.tracking || '';
    const trkWrap = make('div');
    trkWrap.append(field('Tracking number', trk), trk);
    const cname = make('input');
    cname.type = 'text'; cname.id = 'cname-' + id; cname.maxLength = 40; cname.autocomplete = 'off';
    const curl = make('input');
    curl.type = 'url'; curl.id = 'curl-' + id; curl.maxLength = 500; curl.autocomplete = 'off'; curl.placeholder = 'https://';
    if (o.shipped_on && sel.value === 'other') { cname.value = o.carrier; curl.value = o.tracking_url || ''; }
    const otherWrap = make('div');
    otherWrap.append(field('Carrier name', cname), cname, field('Tracking link', curl, '(optional)'), curl);
    const sync = () => { otherWrap.hidden = sel.value !== 'other'; trkWrap.hidden = sel.value === ''; };
    sel.addEventListener('change', sync);
    sync();
    const hint = make('p', 'o-hint', o.can_email
      ? (o.emailed_on ? 'The buyer already has their email. A new tracking number sends them the new one.' : 'Saving emails the buyer their tracking, signed with your shop’s name.')
      : 'There’s no buyer email on this order here, so no email goes out.');
    const err = make('p', 'err');
    err.hidden = true;
    err.setAttribute('role', 'alert');
    const save = make('button', 'btn small');
    save.type = 'submit';
    save.append(make('span', null, o.shipped_on ? 'Save tracking' : 'Mark shipped'));
    const cancel = make('button', 'later', 'Cancel');
    cancel.type = 'button';
    const btns = make('div', 'dc-btns');
    btns.append(save, cancel);
    if (o.shipped_on) {
      const undo = make('button', 'later', 'Not shipped after all');
      undo.type = 'button';
      undo.addEventListener('click', () => sendShipped(o, li, { order: o.id, shipped: false }, save, err));
      btns.append(undo);
    }
    f.append(field('Carrier', sel), sel, trkWrap, otherWrap, hint, err, btns);
    const close = () => { f.remove(); btn.setAttribute('aria-expanded', 'false'); focusEl(btn); };
    cancel.addEventListener('click', close);
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const b = { order: o.id, shipped: true, carrier: sel.value, tracking: cleanLine(trk.value, 60) };
      if (sel.value === '') b.tracking = '';
      if (sel.value === 'other') { b.carrier_name = cleanLine(cname.value, 40); b.tracking_url = cleanLine(curl.value, 500); }
      sendShipped(o, li, b, save, err);
    });
    li.querySelector('.o-act2').after(f);
    btn.setAttribute('aria-expanded', 'true');
    focusEl(sel);
  }
  async function sendShipped(o, li, b, save, err) {
    if (save.disabled) return;
    setBusy(save, true, 'Saving…');
    err.hidden = true;
    busy++;
    try {
      const r = await api.shopShipped(b);
      const fresh = cleanShop({ shop: { name: shop.shop.name, test: shop.shop.test }, orders: [r && r.order] });
      const now = fresh && fresh.orders[0] ? fresh.orders[0] : null;
      if (now) {
        const i = shop.orders.findIndex((x) => x.id === o.id);
        if (i >= 0) shop.orders[i] = now;
        const row = orderRow(now);
        li.replaceWith(row);
        focusEl(row.querySelector('.o-ship-btn'));
      }
      const m = r && r.mail;
      toast(!b.shipped ? 'Taken off. It shows as not shipped.'
        : m === 'sent' ? 'Marked shipped. The buyer’s email is on its way.'
          : m === 'no_email' ? 'Marked shipped. There’s no buyer email on this order, so none went out.'
            : m === 'not_sent' ? 'Marked shipped, but the email didn’t go out. Try saving again in a little while.'
              : 'Saved.');
    } catch (e) {
      setBusy(save, false);
      if (e.code === 'signed_out') { quietSignOut(true); return; }
      err.textContent = e.code === 'input' && e.msg ? e.msg : words(e);
      err.hidden = false;
    } finally { busy = Math.max(0, busy - 1); }
  }
  // The packing slip: a page from the server for the signed-in owner only, opened in a new tab as a private
  // page (a tab is opened during the tap, so phones allow it). It prints on plain paper.
  async function openSlip(btn, o) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    let win = null;
    try { win = window.open('', '_blank'); } catch (e) { win = null; }
    if (win) { try { win.opener = null; win.document.title = 'Opening…'; win.document.body.textContent = 'Opening your packing slip…'; } catch (e) { /* fine */ } }
    btn.setAttribute('aria-busy', 'true');
    try {
      const html = await api.shopSlip(o.id);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      if (win && !win.closed) win.location.href = url;
      else toast('Your browser kept the new tab from opening. Allow pop ups for this page, then tap Packing slip again.');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      if (win) win.close();
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      toast(words(err));
    } finally { btn.removeAttribute('aria-busy'); }
  }

  /* ---- your shop's discount codes, free shipping and the packing slip line (Oct 10 2026) ----
     Codes live on Web Faery's server, in the owner's own back end: % or $ off, a smallest order, first and last
     days, a limit, once per buyer, on or off. Checkout checks them and puts them on the Stripe receipt; a use
     counts once the order is paid. */
  let codes = null;          // { settings, codes: [...] } as the server last sent it (cleaned)
  let codeEditing = '';      // the id of the code in the form ('' for a new one)
  async function loadCodes() {
    if (DEMO) { $('#sec-codes').hidden = true; return; }
    try {
      const d = await api.shopCodes();
      codes = cleanCodes(d);
      renderCodes();
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      if (!codes) $('#sec-codes').hidden = true;
    }
  }
  function cleanCode(c) {
    if (!c || typeof c !== 'object' || !str(c.id)) return null;
    const int = (v) => (Number.isInteger(+v) && +v >= 0 ? +v : 0);
    return {
      id: str(c.id, 20), code: str(c.code, 30), kind: c.kind === 'amount' ? 'amount' : 'percent',
      percent: int(c.percent), amount_cents: int(c.amount_cents), min_cents: int(c.min_cents),
      label: str(c.label, 30), min: str(c.min, 20), starts_on: str(c.starts_on, 10), ends_on: str(c.ends_on, 10),
      max_uses: int(c.max_uses), uses: int(c.uses), one_per_email: !!c.one_per_email, active: !!c.active,
      state: ['on', 'off', 'scheduled', 'ended', 'used_up'].includes(c.state) ? c.state : 'off'
    };
  }
  function cleanCodes(d) {
    d = d && typeof d === 'object' ? d : {};
    if (!d.shop) return null;
    const st = d.settings && typeof d.settings === 'object' ? d.settings : {};
    return {
      settings: { free_ship_cents: Number.isInteger(+st.free_ship_cents) ? +st.free_ship_cents : 0, slip_note: str(st.slip_note, 300) },
      codes: arr(d.codes).slice(0, 200).map(cleanCode).filter(Boolean)
    };
  }
  const dollars = (cents) => (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100));
  // "40", "$40", "40.5", "40.50" -> 4050; '' -> 0; anything else -> null
  const toCents = (v) => {
    const s = String(v || '').trim().replace(/^\$\s*/, '').replace(/,/g, '');
    if (!s) return 0;
    const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);
    return m ? +m[1] * 100 + (m[2] ? +((m[2] + '0').slice(0, 2)) : 0) : null;
  };
  function renderCodes() {
    const sec = $('#sec-codes');
    if (!codes) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#dcs-empty').hidden = codes.codes.length > 0;
    $('#dcs').replaceChildren(...codes.codes.map(codeRow));
    const setForm = $('#f-shop-set');
    if (!setForm.contains(document.activeElement)) {
      $('#in-free').value = codes.settings.free_ship_cents ? dollars(codes.settings.free_ship_cents) : '';
      $('#in-slip-note').value = codes.settings.slip_note;
    }
  }
  const STATE_WORDS = { on: 'On', off: 'Off', ended: 'Ended', used_up: 'Used up' };
  function codeRow(c) {
    const li = make('li', 'dc st-' + c.state);
    li.dataset.code = c.id;
    const head = make('div', 'dc-head');
    head.append(make('span', 'dc-name', c.code), make('span', 'dc-off', c.label));
    li.append(head);
    const when = c.starts_on && c.ends_on ? (c.starts_on === c.ends_on ? 'Only ' + shortDate(c.starts_on) : shortDate(c.starts_on) + ' to ' + shortDate(c.ends_on))
      : c.starts_on ? 'From ' + shortDate(c.starts_on) : c.ends_on ? 'Until ' + shortDate(c.ends_on) : '';
    const bits = [c.min ? 'Orders of ' + c.min + ' or more' : 'Any order', when,
      c.max_uses ? c.uses + ' of ' + c.max_uses + ' used' : plural(c.uses, 'use', 'uses') + ' so far',
      c.one_per_email ? 'Once per buyer' : ''].filter(Boolean);
    li.append(make('p', 'dc-meta', bits.join(' · ')));
    const act = make('div', 'o-act');
    const lab = make('label', 'o-packed dc-on');
    const cb = make('input');
    cb.type = 'checkbox';
    cb.checked = c.active;
    const word = make('span', null, c.state === 'scheduled' ? 'On, starts ' + shortDate(c.starts_on) : (c.active ? (STATE_WORDS[c.state] || 'On') : 'Off'));
    lab.append(cb, word);
    cb.addEventListener('change', () => setCodeActive(c, cb));
    const edit = make('button', 'open-btn', 'Change');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Change the code ' + c.code);
    edit.addEventListener('click', () => openCodeForm(c));
    act.append(lab, edit);
    li.append(act);
    return li;
  }
  async function setCodeActive(c, cb) {
    const want = cb.checked;
    cb.disabled = true;
    busy++;
    try {
      const r = await api.shopCodeActive(c.id, want);
      const now = cleanCode(r && r.code);
      if (now) {
        const i = codes.codes.findIndex((x) => x.id === c.id);
        if (i >= 0) codes.codes[i] = now;
        const row = codeRow(now);
        $('#dcs').querySelector('[data-code="' + c.id + '"]').replaceWith(row);
        focusEl(row.querySelector('input'), true);
      }
      announce(want ? 'Code ' + c.code + ' is on.' : 'Code ' + c.code + ' is off.');
    } catch (err) {
      cb.checked = !want;
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      toast(words(err));
    } finally { cb.disabled = false; busy = Math.max(0, busy - 1); }
  }
  const DC_ERRS = { code: 'dc-code', percent: 'dc-value', amount_cents: 'dc-value', kind: 'dc-value', min_cents: 'dc-min', starts_on: 'dc-start', ends_on: 'dc-end', max_uses: 'dc-max' };
  const DC_INPUTS = { 'dc-code': '#in-dc-code', 'dc-value': '#in-dc-value', 'dc-min': '#in-dc-min', 'dc-start': '#in-dc-start', 'dc-end': '#in-dc-end', 'dc-max': '#in-dc-max' };
  function dcErr(id, text) {
    const p = $('#' + id + '-err');
    p.textContent = text || '';
    p.hidden = !text;
    const input = DC_INPUTS[id] && $(DC_INPUTS[id]);
    if (input) { if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  function clearDcErrs() { ['dc-code', 'dc-value', 'dc-min', 'dc-start', 'dc-end', 'dc-max', 'dc'].forEach((id) => dcErr(id, '')); }
  function dcKind() { const r = document.querySelector('input[name="dc-kind"]:checked'); return r ? r.value : 'percent'; }
  function syncDcKind() {
    const pct = dcKind() === 'percent';
    $('#dc-amt-pre').hidden = pct;
    $('#dc-amt-post').textContent = pct ? '% off' : 'off';
    $('#in-dc-value').placeholder = pct ? 'Like: 10' : 'Like: 5';
  }
  function openCodeForm(c) {
    const f = $('#f-dc');
    codeEditing = c ? c.id : '';
    clearDcErrs();
    $('#dc-form-h').textContent = c ? 'Change ' + c.code : 'A new code';
    $('#in-dc-code').value = c ? c.code : '';
    document.querySelector('input[name="dc-kind"][value="' + (c ? c.kind : 'percent') + '"]').checked = true;
    $('#in-dc-value').value = c ? (c.kind === 'percent' ? String(c.percent) : dollars(c.amount_cents)) : '';
    $('#in-dc-min').value = c && c.min_cents ? dollars(c.min_cents) : '';
    $('#in-dc-start').value = c ? c.starts_on : '';
    $('#in-dc-end').value = c ? c.ends_on : '';
    $('#in-dc-max').value = c && c.max_uses ? String(c.max_uses) : '';
    $('#in-dc-once').checked = c ? c.one_per_email : false;
    $('#in-dc-on').checked = c ? c.active : true;
    syncDcKind();
    f.hidden = false;
    $('#b-dc-new').setAttribute('aria-expanded', 'true');
    f.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    focusEl($('#in-dc-code'), true);
  }
  function closeCodeForm() {
    $('#f-dc').hidden = true;
    codeEditing = '';
    $('#b-dc-new').setAttribute('aria-expanded', 'false');
  }
  async function onCodeSave(ev) {
    ev.preventDefault();
    const btn = $('#b-dc-save');
    if (btn.disabled) return;
    clearDcErrs();
    const kind = dcKind();
    const b = { code: cleanLine($('#in-dc-code').value, 40).toUpperCase().replace(/\s+/g, ''), kind,
      starts_on: $('#in-dc-start').value || '', ends_on: $('#in-dc-end').value || '',
      one_per_email: $('#in-dc-once').checked, active: $('#in-dc-on').checked };
    if (codeEditing) b.id = codeEditing;
    const v = $('#in-dc-value').value.trim().replace(/%$/, '');
    if (kind === 'percent') {
      if (!/^\d{1,3}$/.test(v) || +v < 1 || +v > 100) { dcErr('dc-value', 'A percent from 1 to 100.'); focusEl($('#in-dc-value')); return; }
      b.percent = +v;
    } else {
      const c = toCents(v);
      if (!c) { dcErr('dc-value', 'How many dollars off, like 5.'); focusEl($('#in-dc-value')); return; }
      b.amount_cents = c;
    }
    const min = toCents($('#in-dc-min').value);
    if (min === null) { dcErr('dc-min', 'The smallest order in dollars, like 40, or leave it empty.'); focusEl($('#in-dc-min')); return; }
    b.min_cents = min;
    const max = $('#in-dc-max').value.trim();
    if (max && !/^\d{1,7}$/.test(max)) { dcErr('dc-max', 'A number, like 20, or leave it empty.'); focusEl($('#in-dc-max')); return; }
    b.max_uses = max ? +max : 0;
    setBusy(btn, true, 'Saving…');
    busy++;
    try {
      const r = await api.shopCodeSave(b);
      const now = cleanCode(r && r.code);
      if (now) {
        const i = codes.codes.findIndex((x) => x.id === now.id);
        if (i >= 0) codes.codes[i] = now; else codes.codes.unshift(now);
      }
      closeCodeForm();
      renderCodes();
      const row = now && $('#dcs').querySelector('[data-code="' + now.id + '"]');
      if (row) focusEl(row, true);
      toast(now ? 'Saved. ' + now.code + (now.active ? ' is ready for buyers.' : ' is off for now.') : 'Saved.');
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      if (err.code === 'input' && err.msg) {
        const id = DC_ERRS[err.field] || 'dc';
        dcErr(id, err.msg);
        if (DC_INPUTS[id]) focusEl($(DC_INPUTS[id]));
      } else dcErr('dc', words(err));
    } finally { setBusy(btn, false); busy = Math.max(0, busy - 1); }
  }
  async function onShopSettings(ev) {
    ev.preventDefault();
    const btn = $('#b-set-save');
    if (btn.disabled) return;
    ['free', 'slip'].forEach((id) => { $('#' + id + '-err').hidden = true; });
    const free = toCents($('#in-free').value);
    if (free === null || (free > 0 && free < 100)) { $('#free-err').textContent = 'An amount in dollars, like 75, or leave it empty for none.'; $('#free-err').hidden = false; focusEl($('#in-free')); return; }
    setBusy(btn, true, 'Saving…');
    busy++;
    try {
      const r = await api.shopSettings({ free_ship_cents: free || null, slip_note: cleanLine($('#in-slip-note').value, 300) });
      const st = r && r.settings && typeof r.settings === 'object' ? r.settings : {};
      codes.settings = { free_ship_cents: Number.isInteger(+st.free_ship_cents) ? +st.free_ship_cents : 0, slip_note: str(st.slip_note, 300) };
      $('#in-free').value = codes.settings.free_ship_cents ? dollars(codes.settings.free_ship_cents) : '';
      $('#in-slip-note').value = codes.settings.slip_note;
      toast(codes.settings.free_ship_cents ? 'Saved. Orders of $' + dollars(codes.settings.free_ship_cents) + ' or more get free shipping.' : 'Saved. No free shipping for now.');
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      const p = err.field === 'slip_note' ? $('#slip-err') : $('#free-err');
      p.textContent = err.code === 'input' && err.msg ? err.msg : words(err);
      p.hidden = false;
    } finally { setBusy(btn, false); busy = Math.max(0, busy - 1); }
  }
  async function setPacked(o, cb, word, li) {
    const want = cb.checked;
    cb.disabled = true;
    busy++;
    try {
      const r = await api.shopPacked(o.id, want);
      const fresh = cleanShop({ shop: { name: shop.shop.name, test: shop.shop.test }, orders: [r && r.order] });
      const now = fresh && fresh.orders[0] ? fresh.orders[0] : null;
      if (now) {
        const i = shop.orders.findIndex((x) => x.id === o.id);
        if (i >= 0) shop.orders[i] = now;
        o.packed_on = now.packed_on;
      }
      cb.checked = !!o.packed_on;
      word.textContent = o.packed_on ? 'Packed ' + shortDate(o.packed_on) : 'Packed';
      li.classList.toggle('packed', !!o.packed_on);
      announce(o.packed_on ? 'Marked packed.' : 'Packed tick taken off.');
    } catch (err) {
      cb.checked = !want;
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      toast(words(err));
    } finally { cb.disabled = false; busy = Math.max(0, busy - 1); }
  }
  async function downloadCsv(btn, what) {
    if (DEMO || btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    try {
      const blob = await api.shopExport(what);
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const a = make('a');
      a.href = url;
      a.download = what + '-' + todayISO + '.csv';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      toast(words(err));
    } finally { btn.removeAttribute('aria-busy'); }
  }

  /* ---- payments ---- */
  function renderPay() {
    const c = me.client;
    const sec = $('#sec-pay');
    const pays = me.pay;
    if (!pays.length) { sec.hidden = true; return; }
    sec.hidden = false;
    const t = taps.mine();
    const settle = shortDate(stageDate('settling_in'));
    $('#pays').replaceChildren(...pays.map((p) => {
      const tapped = p.state === 'due' && !!t[p.key];
      const div = make('div', 'payrow st-' + (tapped ? 'tapped' : p.state));
      div.id = 'pay-' + p.key;
      let name, sub, amt, payLabel, thanks = PAY_THANKS;
      const starts = p.starts_on && !isPast(p.starts_on) ? shortDate(p.starts_on) : '';
      if (p.key === 'deposit') { name = 'Deposit'; sub = 'Half the build. It holds your spot.'; amt = money(p.amount); payLabel = 'Pay the deposit'; }
      else if (p.key === 'balance') { name = 'Second half'; sub = 'The other half of the build, due at launch.'; amt = money(p.amount); payLabel = 'Pay the second half'; }
      else {
        name = 'Subscription';
        amt = money(p.amount) + (p.period === 'year' ? ' a year' : ' a month');
        sub = (CARE_SAY[c.build] || 'Hosting, your web address, backups, and your changes as I follow your socials or whenever you email me.') +
          (p.state === 'due' && starts ? ' Your subscription begins ' + starts + ', right where settling in leaves off.' : '');
        payLabel = 'Start my subscription';
        thanks = 'Set up? Thank you! It shows here once it’s running. No need to do it again.';
      }
      if (c.founding && p.key !== 'care') sub += ' Founding price.';
      div.append(make('span', 'p-name', name), make('span', 'p-amt', p.amount ? amt : ''), make('span', 'p-sub', sub));
      const st = make('div', 'p-state');
      if (p.state === 'paid') {
        const s = make('span', 'p-paid');
        s.append(icon('i-check'), make('span', null, 'Paid' + (p.paid_on ? ' ' + shortDate(p.paid_on) : '')));
        st.append(s);
      } else if (p.state === 'active') {
        const s = make('span', 'p-paid');
        s.append(icon('i-check'), make('span', null, 'Active' + (p.paid_on ? ' since ' + shortDate(p.paid_on) : '')));
        st.append(s);
        if (me.care_manage_url) st.append(outLink(me.care_manage_url, 'Update your card or subscription', 'later', 'your Stripe subscription page'));
      } else if (p.state === 'due' && p.url && tapped) {
        // they already tapped it: a thank-you, and only a small way to pay again
        const s = make('p', 'p-thanks');
        s.append(icon('i-check'), make('span', null, thanks));
        st.append(s, outLink(p.url, p.key === 'care' ? 'Open it again' : 'Pay again', 'later', 'Stripe so you can pay', p.key));
      } else if (p.state === 'due' && p.url) {
        st.append(outLink(p.url, payLabel, 'btn', 'Stripe so you can pay', p.key));
      } else if (p.state === 'due') {
        st.append(make('span', 'p-later', 'I’ll send the link soon'));
      } else {
        let later = 'I’ll send the link soon';
        if (p.key === 'deposit' && !me.things.agreement) later = 'After you sign our agreement';
        if (p.key === 'balance') later = 'Due at launch';
        if (p.key === 'care') later = 'Starts after settling in' + (starts || settle ? ', about ' + (starts || settle) : '');
        st.append(make('span', 'p-later', later));
      }
      div.append(st);
      return div;
    }));
  }

  /* ---- ask for a change ---- */
  function renderChange() {
    const c = me.client;
    const sec = $('#sec-change');
    const ci = stageIndex(me.timeline.current);
    const hasCare = c.care === 'monthly' || c.care === 'yearly';
    if (me.care.can_ask) {
      sec.hidden = false;
      $('#change-care').hidden = false;
      $('#change-email').hidden = true;
      // words kept from before a quiet sign-out
      if (!$('#in-what').value && drafts.get('change')) { $('#in-what').value = drafts.get('change'); whatCount(); }
      if (!$('#in-where').value && drafts.get('change-where')) $('#in-where').value = drafts.get('change-where');
      renderAsks();
      return;
    }
    $('#change-care').hidden = true;
    if (ci >= 5 && !hasCare) {
      sec.hidden = false;
      $('#change-email').hidden = false;
      const settle = shortDate(stageDate('settling_in'));
      $('#change-email-text').textContent = me.timeline.current === 'settling_in'
        ? 'Settling-in tweaks are on me' + (settle ? ' until ' + settle : '') + '. Send me one email with everything you’d like changed.'
        : 'Want a change? Send me one email with everything in it, and I’ll reply with a price before I start. Anything broken, or anything I got wrong, is always fixed free.';
      return;
    }
    sec.hidden = true;
  }

  function renderAsks() {
    const reqs = me.care.requests;
    $('#asks-wrap').hidden = !reqs.length;
    $('#asks').replaceChildren(...reqs.map((r) => {
      const li = make('li');
      li.append(make('p', 'a-what', r.what));
      const meta = make('div', 'a-meta');
      meta.append(make('span', 'pill ' + r.status, ASK_STATUS[r.status]));
      if (r.created) meta.append(make('span', 'a-date', shortDate(r.created)));
      if (r.where_on_site) meta.append(make('span', 'a-where', r.where_on_site));
      li.append(meta);
      if (r.taya_reply) {
        const rep = make('div', 'a-reply');
        const img = make('img');
        img.src = 'taya.jpg';
        img.alt = '';
        img.width = 28;
        img.height = 28;
        const p = make('p');
        p.append(make('span', 'sr-only', 'Taya replied: '), r.taya_reply);
        rep.append(img, p);
        li.append(rep);
      }
      return li;
    }));
  }

  function whatCount() {
    const n = $('#in-what').value.length;
    const c = $('#what-count');
    c.textContent = n > WHAT_MAX - 400 ? (WHAT_MAX - n) + ' characters left' : '';
    c.classList.toggle('near', n > WHAT_MAX - 150);
  }

  function renderPics() {
    $('#pic-list').replaceChildren(...pics.map((f, i) => {
      const li = make('li');
      const b = make('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Take out ' + f.name);
      b.append(icon('i-x'));
      b.addEventListener('click', () => { pics.splice(i, 1); renderPics(); $('#in-pics').focus(); });
      li.append(make('span', null, f.name), b);
      return li;
    }));
    const pick = $('#f-change .pick span');
    pick.textContent = pics.length ? (pics.length >= CHANGE_FILES ? 'That’s 3, the most' : 'Add another') : 'Choose pictures';
    $('#in-pics').disabled = pics.length >= CHANGE_FILES;
  }

  function onPics() {
    const input = $('#in-pics');
    const chosen = Array.from(input.files || []);
    input.value = '';
    const left = [];
    for (const f of chosen) {
      if (!CHANGE_EXT.includes(extOf(f.name))) { left.push(f.name); continue; }
      if (pics.length >= CHANGE_FILES) { left.push(f.name); continue; }
      pics.push(f);
    }
    renderPics();
    showErr('change', left.length ? 'I left out ' + left.slice(0, 3).join(', ') + '. Up to 3 photos or PDFs.' : '');
  }

  async function onChange(e) {
    e.preventDefault();
    const what = cleanText($('#in-what').value, WHAT_MAX + 1);
    const where = cleanLine($('#in-where').value, 200);
    showErr('change', '');
    if (what.length < 3) { showErr('what', 'Tell me a little more. Even one sentence helps.'); $('#in-what').focus(); return; }
    if (what.length > WHAT_MAX) { showErr('what', 'That’s a lot for one message! Could you trim it a little, or email me the rest?'); $('#in-what').focus(); return; }
    showErr('what', '');
    const btn = $('#b-change');
    setBusy(btn, true, 'Sending…');
    busy++;
    try {
      const files = [];
      for (const f of pics) {
        const s = await shrink(f);
        if (s.size > CHANGE_MAX) throw Object.assign(fail('too_big', 413), { file: f.name });
        files.push(s);
      }
      const r = await api.change({ what, where, nonce, files }, (p) => { btn.querySelector('span').textContent = 'Sending… ' + Math.min(99, Math.round(p * 100)) + '%'; });
      const replyBy = dayParts(r && r.reply_by) ? r.reply_by : replyByLocal();
      if (!me.care.requests.some((x) => x.id && x.id === (r && r.id))) {
        me.care.requests.unshift({ id: str(r && r.id, 40), what: what.slice(0, 140), where_on_site: where, status: 'new', taya_reply: '', created: todayISO });
        me.care.requests = me.care.requests.slice(0, 10);
      }
      $('#f-change').reset();
      drafts.set('change', '');
      drafts.set('change-where', '');
      pics = [];
      renderPics();
      whatCount();
      nonce = newNonce();
      busy--;
      setBusy(btn, false);
      $('#f-change').hidden = true;
      $('#got-text').textContent = 'That’s all you need to do. I’ll reply by ' + longDay(replyBy) + '. If it’s a big one, you’ll get a price first, and nothing starts until you say yes.';
      $('#got-it').hidden = false;
      renderAsks();
      focusEl($('#got-it'));
      announce('Got it, thank you! I’ll reply by ' + longDay(replyBy) + '.');
    } catch (err) {
      busy--;
      setBusy(btn, false);
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      if (err.code === 'no_care') { me.care.can_ask = false; renderChange(); toast(words(err)); return; }
      showErr('change', err.code === 'too_big' && err.file ? err.file + ' is a bit big. Pictures up to 10 MB work.' : err.code === 'slow_down' ? 'That’s a lot of asks for one day! Email me if it’s urgent.' : words(err));
    }
  }

  function askAnother() {
    $('#got-it').hidden = true;
    $('#f-change').hidden = false;
    nonce = newNonce();
    $('#in-what').focus();
  }

  /* ================= no do-it-yourself editing (Oct 5 2026) =================
     The "Change it yourself" editors (hours, banner, prices and more) were retired with the Oct 5 2026
     pricing: every change goes through Taya, by email or the change form above. Their code is gone on
     purpose, so they can never show. The content.js that live sites load still reads what was saved. */

  /* ================= the preview: the sample client ================= */
  function loadDemo() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'portal-demo.js';
      s.onload = () => (window.WFPortalDemo ? resolve(window.WFPortalDemo) : reject(new Error('no demo')));
      s.onerror = reject;
      document.head.append(s);
    });
  }

  function wireDemo(D) {
    api = D.api;
    $('#demo-bar').hidden = false;
    $$('.demo-hint').forEach((el) => { el.hidden = false; });
    const mark = () => $$('#demo-menu [data-demo]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.demo === D.scenario())));
    mark();
    $$('[data-fill]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.fill === 'email') {
        if (usePhone) setPhoneMode(false);
        $('#in-email').value = D.email;
        showErr('email', '');
        $('#b-send').focus();
      } else {
        $('#in-code').value = D.code;
        showErr('code', '');
        $('#b-verify').focus();
      }
    }));
    const signInQuietly = () => { if (!token) { token = D.signIn(); store.set(token); } };
    $$('#demo-menu [data-demo]').forEach((b) => b.addEventListener('click', async () => {
      const k = b.dataset.demo;
      $('#demo-menu').open = false;
      const bar = $('#demo-bar');
      if (['mockup', 'waiting', 'new', 'mid', 'launched', 'care'].includes(k)) {
        D.setScenario(k);
        mark();
        signInQuietly();
        firstShow = true;
        openAnswers.clear();
        pics = [];
        askReset();
        await loadProject(false);
        bar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        toast('Showing: ' + b.textContent.toLowerCase() + '.', 3200);
      } else if (k === 'wrong-code') {
        if (token) { const key = token; token = ''; store.clear(); api.logout(key).catch(() => {}); }
        who = { email: D.email };
        toCodeStep();
        $('#in-code').value = '123456';
        await onCode();
        bar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      } else if (k === 'quiet') {
        signInQuietly();
        D.failNext('signed_out');
        await loadProject(false);
        bar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      } else if (k === 'offline') {
        signInQuietly();
        D.failNext('network');
        await loadProject(true);
        bar.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }));
    // links that would leave for a real page (a draft, Stripe, a booking page) just say where they'd go
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[data-what]');
      if (!a) return;
      e.preventDefault();
      toast('Preview: in the real portal, this opens ' + a.dataset.what + '.', 4200);
    });
  }
  function askReset() {
    const f = $('#f-change');
    if (!f) return;
    f.reset();
    drafts.set('change', '');
    drafts.set('change-where', '');
    f.hidden = false;
    $('#got-it').hidden = true;
    showErr('what', '');
    showErr('change', '');
    whatCount();
    renderPics();
    nonce = newNonce();
  }

  /* ================= start ================= */
  function wire() {
    $('#f-email').addEventListener('submit', onEmail);
    $('#f-code').addEventListener('submit', onCode);
    $('#in-code').addEventListener('input', onCodeInput);
    $('#b-resend').addEventListener('click', onResend);
    $('#b-restart').addEventListener('click', () => { stopResend(); pending.clear(); who = null; toEmailStep('', false); $('#in-email').focus(); });
    $('#b-retry').addEventListener('click', () => loadProject(true));
    $('#b-signout').addEventListener('click', signOut);
    $('#b-signout-top').addEventListener('click', signOut);
    $('#b-tl-more').addEventListener('click', () => {
      const tl = $('#tl');
      tl.hidden = !tl.hidden;
      $('#b-tl-more').textContent = tl.hidden ? 'See every step' : 'Hide the steps';
      $('#b-tl-more').setAttribute('aria-expanded', String(!tl.hidden));
    });
    $('#in-what').addEventListener('input', () => drafts.set('change', $('#in-what').value));
    $('#in-where').addEventListener('input', () => drafts.set('change-where', $('#in-where').value));
    $('#f-change').addEventListener('submit', onChange);
    $('#in-what').addEventListener('input', whatCount);
    $('#in-pics').addEventListener('change', onPics);
    $('#b-another').addEventListener('click', askAnother);
    $('#b-csv-orders').addEventListener('click', () => downloadCsv($('#b-csv-orders'), 'orders'));
    $('#b-csv-products').addEventListener('click', () => downloadCsv($('#b-csv-products'), 'products'));
    $('#b-dc-new').addEventListener('click', () => { if ($('#f-dc').hidden || codeEditing) openCodeForm(null); else closeCodeForm(); });
    $('#b-dc-cancel').addEventListener('click', () => { closeCodeForm(); focusEl($('#b-dc-new')); });
    $('#f-dc').addEventListener('submit', onCodeSave);
    $$('input[name="dc-kind"]').forEach((r) => r.addEventListener('change', syncDcKind));
    $('#f-shop-set').addEventListener('submit', onShopSettings);
    $('#toast').addEventListener('click', () => { $('#toast').hidden = true; });
    if (SMS_SIGNIN) { $('#b-phone').hidden = false; $('#b-phone').addEventListener('click', () => setPhoneMode(!usePhone)); }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && me && Date.now() - lastLoad > REFRESH_AFTER) quietRefresh();
    });
  }

  async function start() {
    // back from paying (Taya can set Stripe's "after payment" link to portal.html?paid=1): say thank you,
    // and tidy the address bar so nothing lingers in it
    try {
      if (location.search) {
        const v = new URLSearchParams(location.search).get('paid') || '';
        paidReturn = ['1', 'deposit', 'balance', 'care'].includes(v) ? v : '';
        history.replaceState(null, '', location.pathname + location.hash);
      }
    } catch (e) { /* fine */ }
    token = store.get();
    if (token) {
      hero('Your project', 'Welcome ', 'back.', '');
      await loadProject(null);
    } else {
      // a reload (or a phone that set the tab aside) while a code is on its way: back to the code step,
      // without asking again (a new ask would send another email)
      const p = pending.get();
      if (p) { heroSignedOut(); who = p.who; toCodeStep(p.at); }
      else toEmailStep('', false);
      if (paidReturn) toast('Thank you! Sign in to see your project. It can take a day for a payment to show.', 8000);
    }
  }

  function boot() {
    if (framed && !DEMO) {
      const main = $('#main');
      const p = make('p', 'p-card');
      p.append('Your project opens in its own tab: ');
      const a = make('a', null, 'webfaery.love/portal.html');
      a.href = 'https://webfaery.love/portal.html';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a);
      p.style.marginTop = '40px';
      const box = make('div', 'gutter');
      const wrap = make('div', 'wrap');
      wrap.append(p);
      box.append(wrap);
      document.body.insertBefore(box, main);
      return;
    }
    wire();
    if (DEMO) {
      loadDemo().then((D) => { wireDemo(D); start(); }, () => {
        const nowhere = () => Promise.reject(fail('network'));
        api = { requestCode: nowhere, verifyCode: nowhere, me: nowhere, logout: nowhere, todo: nowhere, file: nowhere, upload: nowhere, change: nowhere };
        start();
      });
    }
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
