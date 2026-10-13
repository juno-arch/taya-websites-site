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
   and three for gift certificates (Oct 10 2026, never in the preview): giftOwner, giftLookup, giftRedeem
   and the Products card's own door, prodDoor (Oct 10 2026, never in the preview): /products, /product-save,
   /product-photo, /product-photos
   and the Newsletter card's own door, newsCall (Oct 12 2026, never in the preview): /overview, /issue, /save, /remove,
   /preview, /test, /send, /stop, /people, /export, /settings (hub API.md section 18)
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
  const GIFT = SERVER + '/api/webfaery/gift';         // gift certificates (Oct 10 2026): only clients whose site sells them
  const BOOKINGS = SERVER + '/api/webfaery/bookings'; // a client's own bookings (Oct 10 2026): only clients with booking get any
  const NEWS = SERVER + '/api/webfaery/news/owner';    // a client's own newsletter (Oct 12 2026): only clients with a list get any
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
  const KNOWN = ['input', 'code', 'signed_out', 'origin', 'no_care', 'not_found', 'slow_down', 'server', 'not_ready', 'too_big',
    'over_balance', 'not_paid', 'refunded', 'expired'];
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
    // a client's bookings (Oct 10 2026) say why too (no_payments, not_set_up)
    if (data && typeof data.why === 'string') e.why = data.why.slice(0, 20);
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
    },
    // gift certificates (Oct 10 2026)
    giftOwner: () => postJSON('/owner', {}, token, GIFT),
    giftLookup: (code) => postJSON('/lookup', { code }, token, GIFT),
    giftRedeem: (b) => postJSON('/redeem', b, token, GIFT)
  };
  let api = realApi;
  // a client's own bookings (Oct 10 2026): THE one place that part signs in. Today it is the portal's sign-in key;
  // if the sign-in changes (the private links door), only this line changes.
  const bookCall = (path, body) => postJSON(path, body || {}, token, BOOKINGS);
  // a client's own newsletter (Oct 12 2026): the one place that part signs in, the same way
  const newsCall = (path, body) => postJSON(path, body || {}, token, NEWS);

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
    gifts = null;
    giftNow = null;
    $('#sec-orders').hidden = true;
    $('#sec-codes').hidden = true;
    $('#sec-gifts').hidden = true;
    $('#gift-card').hidden = true;
    $('#in-gift-code').value = '';
    bk = null;
    $('#sec-bookings').hidden = true;
    nl = null;
    nlEdit = null;
    nlPeopleShown = false;
    $('#sec-news').hidden = true;
    $('#f-nl').hidden = true;
    $('#nl-list-view').hidden = false;
    $('#in-nl-subject').value = ''; $('#in-nl-pre').value = ''; $('#in-nl-body').value = '';
    $('#nl-people').replaceChildren();
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
      loadGifts();
      loadBookings();
      loadNews();
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
      loadGifts();
      loadBookings();
      loadNews();
    } catch (err) { if (err.code === 'signed_out') quietSignOut(false); }
  }
  const isTyping = () => pics.length > 0 ||
    $$('#v-project textarea, #v-project input[type="text"]:not(.keeps)').some((t) => t.value.trim()) ||
    !!document.querySelector('#v-project .ship-form') || !$('#f-dc').hidden || !!document.querySelector('#sec-bookings .bk-form') ||
    !$('#f-nl').hidden || $('#f-nl-set').contains(document.activeElement);

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
      if (shop) loadProducts(); else hideProducts(); // the Products card (Oct 10 2026)
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

  /* ---- your bookings (Oct 10 2026; part 2 Oct 12 2026) ----
     Only for a client whose booking runs on Web Faery's server (the server answers booking: null for everyone else,
     and the section stays hidden). Six tabs, each with its own address (#bookings-upcoming, -calendar, -hours,
     -services, -calendars, -settings): coming up (move or cancel, which emails the person), a month view (tap a day
     to take it off or give it different hours), hours (weekly, repeating blocks, different hours on a date, time off),
     services and the booking form's questions, their own calendars (busy times only) and the private calendar link,
     settings. Every call goes through bookCall, the one place this part signs in. */
  let bk = null;             // the overview as the server last sent it (cleaned)
  let bkBusy = false;
  let bkTab = 'upcoming';
  let bkTabsReady = false;
  let bkMonth = '';          // the month on show, 'YYYY-MM'
  let bkMonthDays = [];
  let bkDay = '';            // the day open under the month
  const BK_TABS = ['upcoming', 'calendar', 'hours', 'services', 'calendars', 'settings'];
  const BK_DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  const BK_WHERE = { studio: 'At your studio', home: 'Home visits', video: 'By video' };
  const BK_QTYPE = { text: 'Short answer', long: 'Longer answer', yesno: 'Yes or no', choice: 'Pick one' };
  const BK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  async function loadBookings() {
    if (DEMO) { $('#sec-bookings').hidden = true; return; }
    if (bkBusy) return;
    bkBusy = true;
    try {
      bk = cleanBk(await bookCall('/overview'));
      renderBk();
      if (bk && bkTab === 'calendar') loadMonth(bkMonth);
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      if (!bk) $('#sec-bookings').hidden = true;
    } finally { bkBusy = false; }
  }
  function cleanBkRow(b) {
    if (!b || typeof b !== 'object' || !str(b.id)) return null;
    return {
      id: str(b.id, 20), when: str(b.when, 60), starts_at: str(b.starts_at, 30), service_name: str(b.service_name, 80), minutes: +b.minutes || 0,
      location: str(b.location, 10), where: str(b.where, 400), address: str(b.address, 400), name: str(b.name, 120), email: str(b.email, 200),
      phone: str(b.phone, 40), note: str(b.note, 1000), status: str(b.status, 12), group_index: +b.group_index || 1, group_size: +b.group_size || 1,
      deposit: str(b.deposit, 20), paid: !!b.paid, canceled_by: str(b.canceled_by, 12),
      answers: arr(b.answers).slice(0, 12).map((a) => (a ? { label: str(a.label, 120), answer: str(a.answer, 1000) } : null)).filter((a) => a && a.label),
      client_reason: str(b.client_reason, 600)
    };
  }
  const cleanWins = (v) => arr(v).filter((w) => Array.isArray(w) && w.length === 2).map((w) => [str(w[0], 5), str(w[1], 5)]).slice(0, 4);
  const cleanWeek = (h) => { const out = {}; BK_DAYS.forEach(([k]) => { out[k] = cleanWins(h && h[k]); }); return out; };
  function cleanBk(d) {
    d = d && typeof d === 'object' ? d : {};
    if (!d.booking || typeof d.booking !== 'object') return null;
    const o = d.booking;
    const svc = (s) => (s && str(s.id) ? {
      id: str(s.id, 20), name: str(s.name, 80), minutes: +s.minutes || 60, price_cents: +s.price_cents || 0, deposit_cents: +s.deposit_cents || 0,
      description: str(s.description, 600), location: str(s.location, 10), package_count: Math.max(1, +s.package_count || 1), active: !!s.active,
      hours: s.hours && typeof s.hours === 'object' ? cleanWeek(s.hours) : null, max_per_day: +s.max_per_day || 0, max_per_week: +s.max_per_week || 0
    } : null);
    const st = o.settings && typeof o.settings === 'object' ? o.settings : {};
    return {
      owner: { name: str(o.name, 80), active: !!o.active, zone: str(o.zone, 20), hours: cleanWeek(o.hours), locations: arr(o.locations).map((x) => str(x, 10)).filter((x) => BK_WHERE[x]),
        payments: !!o.payments, payments_test: !!o.payments_test, feed_url: safeUrl(o.feed_url),
        today: /^\d{4}-\d{2}-\d{2}$/.test(str(o.today)) ? str(o.today) : todayISO, now: str(o.now, 30),
        settings: { notice_hours: +st.notice_hours || 0, horizon_days: +st.horizon_days || 60, buffer_min: +st.buffer_min || 0, cancel_window_hours: +st.cancel_window_hours || 0,
          max_per_day: +st.max_per_day || 0, max_per_week: +st.max_per_week || 0, reminder_hours: +st.reminder_hours || 0, slot_step: +st.slot_step || 0 },
        questions: arr(o.questions).slice(0, 10).map((q) => (q && str(q.id) ? { id: str(q.id, 10), label: str(q.label, 120), type: BK_QTYPE[q.type] ? q.type : 'text',
          choices: arr(q.choices).map((c) => str(c, 60)).filter(Boolean).slice(0, 12), required: !!q.required, services: arr(q.services).map((x) => str(x, 20)).filter(Boolean) } : null)).filter(Boolean) },
      services: arr(d.services).slice(0, 40).map(svc).filter(Boolean),
      upcoming: arr(d.upcoming).slice(0, 500).map(cleanBkRow).filter(Boolean),
      past: arr(d.past).slice(0, 300).map(cleanBkRow).filter(Boolean),
      time_off: arr(d.time_off).slice(0, 300).map((t) => (t && str(t.id) ? { id: str(t.id, 20), label: str(t.label, 80), note: str(t.note, 200) } : null)).filter(Boolean),
      overrides: arr(d.overrides).slice(0, 400).map((v) => (v && str(v.date) ? { date: str(v.date, 10), label: str(v.label, 40), hours_label: str(v.hours_label, 120), closed: !!v.closed, windows: cleanWins(v.windows) } : null)).filter(Boolean),
      repeats: arr(d.repeats).slice(0, 30).map((r) => (r && str(r.id) ? { id: str(r.id, 20), label: str(r.label, 200), note: str(r.note, 200), days: arr(r.days).map((x) => str(x, 3)),
        start: str(r.start, 5), end: str(r.end, 5), every_weeks: +r.every_weeks || 1, starts_on: str(r.starts_on, 10), ends_on: str(r.ends_on, 10) } : null)).filter(Boolean),
      calendars: arr(d.calendars).slice(0, 5).map((c) => (c && str(c.id) ? { id: str(c.id, 20), label: str(c.label, 60), hint: str(c.hint, 120), active: !!c.active,
        checked_at: str(c.checked_at, 30), ok_at: str(c.ok_at, 30), error: str(c.error, 40), busy_count: +c.busy_count || 0 } : null)).filter(Boolean)
    };
  }
  function renderBk() {
    const sec = $('#sec-bookings');
    if (!bk) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#bk-off').hidden = bk.owner.active;
    $('#bk-test').hidden = !bk.owner.payments_test;
    $('#bk-zone').textContent = 'Times here are ' + (bk.owner.zone || 'Pacific') + ' time.';
    if (!sec.querySelector('#bk-up .bk-form')) {
      $('#bk-up-empty').hidden = bk.upcoming.length > 0;
      $('#bk-up').replaceChildren(...bk.upcoming.map((b) => bkRow(b, false)));
    }
    $('#bk-past-wrap').hidden = !bk.past.length;
    $('#bk-past').replaceChildren(...bk.past.map((b) => bkRow(b, true)));
    $('#bk-off-list').replaceChildren(...bk.time_off.map(offRow));
    if (!$('#f-bk-hours').contains(document.activeElement)) buildWeek($('#bk-week'), bk.owner.hours, '');
    if (!sec.querySelector('#bk-svcs .bk-form')) $('#bk-svcs').replaceChildren(...bk.services.map(svcRow));
    if (!sec.querySelector('#bk-reps .bk-form, #bk-p-hours > .bk-form')) $('#bk-reps').replaceChildren(...bk.repeats.map(repRow));
    $('#bk-ovr').replaceChildren(...bk.overrides.map(ovrRow));
    if (!sec.querySelector('#bk-qs .bk-form, #bk-p-services > .bk-form')) $('#bk-qs').replaceChildren(...bk.owner.questions.map(qRow));
    $('#bk-cals').replaceChildren(...bk.calendars.map(calRow));
    if (!$('#f-bk-set').contains(document.activeElement)) fillSettings();
    if (!bkTabsReady) {
      bkTabsReady = true;
      const h = hashTab();
      if (h) { selectTab(h, false, true); requestAnimationFrame(() => sec.scrollIntoView({ block: 'start' })); }
    }
  }

  // ---- the tabs
  const hashTab = () => { const m = /^#bookings-([a-z]+)$/.exec(location.hash || ''); return m && BK_TABS.includes(m[1]) ? m[1] : ''; };
  function selectTab(key, focus, fromHash) {
    if (!BK_TABS.includes(key)) key = 'upcoming';
    bkTab = key;
    $$('#sec-bookings .bk-tab').forEach((t) => {
      const on = t.dataset.tab === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    $$('#sec-bookings .bk-panel').forEach((p) => { p.hidden = p.id !== 'bk-p-' + key; });
    if (!fromHash) { try { history.replaceState(null, '', location.pathname + location.search + '#bookings-' + key); } catch (e) { /* fine */ } }
    if (focus) focusEl($('#bk-tab-' + key));
    if (key === 'calendar' && bk) loadMonth(bkMonth);
  }
  function onTabKey(ev) {
    const i = BK_TABS.indexOf(bkTab);
    let n = -1;
    if (ev.key === 'ArrowRight') n = (i + 1) % BK_TABS.length;
    else if (ev.key === 'ArrowLeft') n = (i + BK_TABS.length - 1) % BK_TABS.length;
    else if (ev.key === 'Home') n = 0;
    else if (ev.key === 'End') n = BK_TABS.length - 1;
    if (n < 0) return;
    ev.preventDefault();
    selectTab(BK_TABS[n], true, false);
  }

  // ---- coming up
  function bkRow(b, past) {
    const li = make('li', 'order bk' + (b.status === 'canceled' ? ' bk-gone' : ''));
    li.dataset.booking = b.id;
    const head = make('div', 'o-head');
    head.append(make('span', 'o-date', b.when), make('span', 'o-total bk-svc', b.service_name + (b.group_size > 1 ? ' (' + b.group_index + ' of ' + b.group_size + ')' : '')));
    li.append(head);
    const who = make('p', 'bk-who');
    who.append(make('span', 'bk-name', b.name));
    const mail = make('a', 'later', b.email);
    mail.href = 'mailto:' + b.email;
    who.append(' ', mail);
    if (b.phone) { const tel = make('a', 'later', b.phone); tel.href = 'tel:' + digits(b.phone); who.append(' ', tel); }
    li.append(who);
    const ship = make('div', 'o-ship');
    ship.append(make('span', 'o-label', b.location === 'home' ? 'Their place' : 'Where'));
    ship.append(make('p', 'o-addr', b.location === 'home' ? (b.address || 'Address not given') : b.where));
    li.append(ship);
    if (b.note) { const n = make('div', 'o-note'); n.append(make('span', 'o-label', 'Their note'), make('p', null, b.note)); li.append(n); }
    b.answers.forEach((a) => { const n = make('div', 'o-note bk-ans'); n.append(make('span', 'o-label', a.label), make('p', null, a.answer)); li.append(n); });
    if (b.client_reason) { const n = make('div', 'o-note'); n.append(make('span', 'o-label', b.status === 'canceled' ? 'Their note when they canceled' : 'Their note when they moved it'), make('p', null, b.client_reason)); li.append(n); }
    const bits = [];
    if (b.status === 'pending') bits.push('Waiting for the deposit (held 30 minutes)');
    if (b.deposit) bits.push(b.paid ? 'Deposit paid: ' + b.deposit : 'Deposit ' + b.deposit);
    if (b.status === 'canceled') bits.push(b.canceled_by === 'owner' ? 'You canceled it' : 'They canceled');
    if (bits.length) li.append(make('p', 'dc-meta', bits.join(' · ')));
    if (!past && b.status === 'confirmed') {
      const act = make('div', 'o-act o-act2');
      const mv = make('button', 'open-btn', 'Move');
      mv.type = 'button';
      mv.setAttribute('aria-label', 'Move ' + b.name + '’s booking on ' + b.when);
      mv.addEventListener('click', () => openMove(b, li));
      const cx = make('button', 'open-btn', 'Cancel');
      cx.type = 'button';
      cx.setAttribute('aria-label', 'Cancel ' + b.name + '’s booking on ' + b.when);
      cx.addEventListener('click', () => openCancel(b, li));
      act.append(mv, cx);
      li.append(act);
    }
    return li;
  }
  function closeBkForms(li) { $$('.bk-form', li || document).forEach((f) => f.remove()); }
  function msgBox(id, label) {
    const wrap = make('div');
    const lab = make('label', 'field-label');
    lab.htmlFor = id;
    lab.append(label + ' ', make('span', 'opt-tag', '(optional)'));
    const ta = make('textarea', 'short');
    ta.id = id;
    ta.maxLength = 600;
    wrap.append(lab, ta);
    return { wrap, ta };
  }
  function openCancel(b, li) {
    closeBkForms();
    const f = make('form', 'ship-form bk-form');
    f.noValidate = true;
    f.append(make('p', 'o-hint', 'Cancel ' + b.service_name + ' with ' + b.name + ' on ' + b.when + '? They get an email saying so.'));
    const m = msgBox('in-bk-cmsg-' + b.id, 'A few words for them');
    f.append(m.wrap);
    const err = make('p', 'err'); err.hidden = true; f.append(err);
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Cancel it and email them'));
    const keep = make('button', 'later', 'Keep it'); keep.type = 'button';
    keep.addEventListener('click', () => { f.remove(); focusEl($$('.open-btn', li)[1]); });
    btns.append(go, keep); f.append(btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      setBusy(go, true, 'Canceling…');
      try {
        await bookCall('/cancel', { id: b.id, message: cleanText(m.ta.value, 600), tell: true });
        f.remove();
        toast('Canceled. ' + b.name + ' has an email saying so.');
        await loadBookings();
        focusEl($('#h-bookings'), true);
      } catch (e2) {
        setBusy(go, false, 'Cancel it and email them');
        if (e2.code === 'signed_out') { quietSignOut(false); return; }
        err.textContent = bkWords(e2); err.hidden = false;
      }
    });
    li.append(f);
    focusEl(m.ta);
  }
  async function openMove(b, li) {
    closeBkForms();
    const f = make('form', 'ship-form bk-form');
    f.noValidate = true;
    f.append(make('p', 'o-hint', 'Finding open times…'));
    li.append(f);
    let days = [];
    try { days = arr((await bookCall('/slots', { id: b.id })).days); } catch (e1) {
      if (e1.code === 'signed_out') { quietSignOut(false); return; }
      f.replaceChildren(make('p', 'err', bkWords(e1)));
      return;
    }
    f.replaceChildren();
    if (!days.length) { f.append(make('p', 'o-hint', 'No open times to move it to right now. Add hours, or email them to sort it out.')); return; }
    f.append(make('p', 'o-hint', 'Move ' + b.service_name + ' with ' + b.name + ' (now ' + b.when + '). They get an email with the new time.'));
    const dl = make('label', 'field-label', 'New day'); dl.htmlFor = 'in-bk-day-' + b.id;
    const ds = make('select'); ds.id = 'in-bk-day-' + b.id;
    days.forEach((d) => { const o = make('option', null, longDay(str(d.date, 10))); o.value = str(d.date, 10); ds.append(o); });
    const tl = make('label', 'field-label', 'New time'); tl.htmlFor = 'in-bk-time-' + b.id;
    const ts = make('select'); ts.id = 'in-bk-time-' + b.id;
    const fillTimes = () => {
      const d = days.find((x) => str(x.date) === ds.value);
      ts.replaceChildren(...arr(d && d.times).map((t) => { const o = make('option', null, str(t.label, 20)); o.value = str(t.at, 30); return o; }));
    };
    ds.addEventListener('change', fillTimes);
    fillTimes();
    const m = msgBox('in-bk-mmsg-' + b.id, 'A few words for them');
    const err = make('p', 'err'); err.hidden = true;
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Move it and email them'));
    const keep = make('button', 'later', 'Keep the time'); keep.type = 'button';
    keep.addEventListener('click', () => { f.remove(); focusEl($$('.open-btn', li)[0]); });
    btns.append(go, keep);
    f.append(dl, ds, tl, ts, m.wrap, err, btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!ts.value) return;
      setBusy(go, true, 'Moving…');
      try {
        await bookCall('/move', { id: b.id, at: ts.value, message: cleanText(m.ta.value, 600) });
        f.remove();
        toast('Moved. ' + b.name + ' has an email with the new time.');
        await loadBookings();
        focusEl($('#h-bookings'), true);
      } catch (e2) {
        setBusy(go, false, 'Move it and email them');
        if (e2.code === 'signed_out') { quietSignOut(false); return; }
        err.textContent = bkWords(e2); err.hidden = false;
      }
    });
    focusEl(ds);
  }
  function bkWords(e) {
    if (e.code === 'slow_down') return 'Lots of changes just now. Try again in a few minutes.';
    if (e.code === 'not_found') return 'That’s not here anymore. Try refreshing the page.';
    if (e.status === 409) return 'That time isn’t open anymore, or the booking already changed. Refresh and try again.';
    if (e.code === 'input') {
      if (e.why === 'no_payments') return 'Deposits need your Stripe connected first. Email Taya and she’ll set it up.';
      if (e.why === 'too_many') return 'That’s the most this can hold for now. Remove one first, or email Taya.';
      return 'Something in there didn’t fit. Could you check it and try again?';
    }
    return 'I can’t reach your bookings right now. Try again soon, or email me at ' + TAYA + '.';
  }
  const overlapNote = (hits, done) => {
    const n = arr(hits).length;
    return n ? done + ' ' + plural(n, 'booking is', 'bookings are') + ' already in that time: move or cancel ' + (n === 1 ? 'it' : 'them') + ' under Coming up.' : done;
  };

  // ---- the month
  const monthKeyAdd = (m, n) => { const y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n; const d = new Date(Date.UTC(y, mo, 1)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1); };
  const monthName = (m) => BK_MONTHS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  async function loadMonth(month) {
    if (!bk) return;
    const first = bk.owner.today.slice(0, 7), last = monthKeyAdd(first, 12);
    let m = month && /^\d{4}-\d{2}$/.test(month) ? month : first;
    if (m < first) m = first;
    if (m > last) m = last;
    bkMonth = m;
    $('#bk-month').textContent = monthName(m);
    $('#b-bk-prev').disabled = m <= first;
    $('#b-bk-next').disabled = m >= last;
    try {
      const d = await bookCall('/month', { month: m });
      if (bkMonth !== m) return;
      bkMonthDays = arr(d && d.days).map(cleanDay).filter(Boolean);
      renderMonth();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      $('#bk-cal').replaceChildren(make('p', 'err', bkWords(e)));
    }
  }
  function cleanDay(x) {
    if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(str(x.date))) return null;
    const list = (v) => arr(v).map((t) => str(t, 80)).filter(Boolean).slice(0, 20);
    return { date: str(x.date, 10), label: str(x.label, 40), state: str(x.state, 16), override: !!x.override, hours_label: str(x.hours_label, 120), usual_label: str(x.usual_label, 120),
      windows: cleanWins(x.windows), time_off: list(x.time_off), blocks: list(x.blocks), busy: list(x.busy), full: !!x.full,
      bookings: arr(x.bookings).slice(0, 40).map((b) => (b ? { time: str(b.time, 20), name: str(b.name, 120), service_name: str(b.service_name, 80) } : null)).filter(Boolean) };
  }
  const dayWord = (d) => (d.state === 'closed' ? 'Off' : d.full ? 'Full' : '');
  function dayAria(d) {
    const bits = [d.label];
    if (d.state === 'past') bits.push('past');
    else if (d.state === 'closed') bits.push('off');
    else if (d.state === 'usual_closed') bits.push('outside your usual hours');
    else bits.push('open ' + d.hours_label + (d.override ? ' (just this day)' : ''));
    if (d.full) bits.push('full');
    if (d.bookings.length) bits.push(plural(d.bookings.length, 'booking', 'bookings'));
    if (d.busy.length && d.state !== 'past') bits.push('busy in your calendar');
    return bits.join(', ');
  }
  function renderMonth() {
    const cal = $('#bk-cal');
    const kids = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => { const s = make('span', 'bk-dow', w); s.setAttribute('aria-hidden', 'true'); return s; });
    if (bkMonthDays.length) {
      const p = dayParts(bkMonthDays[0].date);
      const lead = (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7;
      for (let i = 0; i < lead; i++) kids.push(make('span', 'bk-cd-blank'));
    }
    bkMonthDays.forEach((d) => {
      const b = make('button', 'bk-cd bk-cd-' + d.state + (d.override ? ' bk-cd-own' : ''));
      b.type = 'button';
      b.dataset.date = d.date;
      b.setAttribute('aria-pressed', d.date === bkDay ? 'true' : 'false');
      b.setAttribute('aria-label', dayAria(d));
      b.append(make('span', 'bk-cd-n', String(+d.date.slice(8, 10))));
      const w = dayWord(d);
      const count = d.bookings.length && d.state !== 'past' ? String(d.bookings.length) : '';
      const line = make('span', 'bk-cd-w', w || (count ? count + ' ' : ''));
      if (!w && count) line.append(make('span', 'bk-cd-long', 'booked'));
      b.append(line);
      if (d.busy.length && d.state !== 'past' && d.state !== 'closed') { const dot = make('span', 'bk-cd-busy'); dot.setAttribute('aria-hidden', 'true'); b.append(dot); }
      b.addEventListener('click', () => { bkDay = d.date; renderMonth(); renderDayInfo(true); });
      kids.push(b);
    });
    cal.replaceChildren(...kids);
    if (bkDay && bkDay.slice(0, 7) === bkMonth) renderDayInfo(false); else $('#bk-dayinfo').hidden = true;
  }
  function renderDayInfo(focus) {
    const d = bkMonthDays.find((x) => x.date === bkDay);
    const box = $('#bk-dayinfo');
    if (!d) { box.hidden = true; return; }
    box.hidden = false;
    const h = make('h4', 'small-h bk-day-h', d.label);
    h.tabIndex = -1;
    const kids = [h];
    const line = (label, text) => { const p = make('p', 'bk-day-line'); p.append(make('span', 'o-label', label), make('span', null, text)); return p; };
    if (d.state === 'closed') kids.push(line('Hours', d.override ? 'Off all day (just this date)' : 'Off all day'));
    else if (d.state === 'usual_closed') kids.push(line('Hours', 'Closed on ' + DAYS[new Date(d.date + 'T12:00:00Z').getUTCDay()] + 's'));
    else kids.push(line('Hours', d.hours_label + (d.override ? ' (just this date; usually ' + d.usual_label + ')' : '')));
    if (d.time_off.length) kids.push(line('Time off', d.time_off.join(', ')));
    if (d.blocks.length) kids.push(line('Repeating block', d.blocks.join(', ')));
    if (d.busy.length) kids.push(line('Busy in your calendar', d.busy.join(', ')));
    if (d.full) kids.push(line('Full', 'This day has as many bookings as your limit allows.'));
    if (d.bookings.length) {
      const ul = make('ul', 'bk-day-books');
      d.bookings.forEach((b) => ul.append(make('li', null, b.time + ', ' + b.service_name + ' with ' + b.name)));
      kids.push(make('span', 'o-label', 'Booked'), ul);
    }
    if (d.state !== 'past') {
      const act = make('div', 'dc-btns bk-day-act');
      const btn = (text, cls, fn) => { const b = make('button', cls, text); b.type = 'button'; b.addEventListener('click', () => fn(b)); act.append(b); return b; };
      if (d.state === 'closed') btn(d.override || d.usual_label !== 'Closed' ? 'Open this day again' : 'Open this day', 'btn small', (b) => daySet(d.date, 'usual', null, b, 'Open again. People can book that day.'));
      if (d.state === 'open') btn('Take this day off', 'btn small', (b) => daySet(d.date, 'closed', null, b, 'That day is off. It’s closed for booking.'));
      if (d.state !== 'past') btn(d.state === 'usual_closed' ? 'Open this day' : 'Different hours this day', 'later', () => openDayHours(d, box));
      if (d.override && d.state !== 'closed') btn('Back to your usual hours', 'later', (b) => daySet(d.date, 'usual', null, b, 'Back to your usual hours.'));
      kids.push(act);
      if (d.bookings.length && d.state === 'open') kids.push(make('p', 'orders-fine', 'Taking a day off keeps the bookings already there. Move or cancel them under Coming up.'));
    }
    box.replaceChildren(...kids);
    if (focus) focusEl(h, true);
  }
  function openDayHours(d, box) {
    closeBkForms(box);
    const f = make('form', 'dc-form bk-form');
    f.noValidate = true;
    const wrap = make('div', 'bk-week');
    buildWeek(wrap, { mon: d.windows.length ? d.windows : [['10:00', '16:00']] }, 'day', [['mon', d.label]]);
    const err = make('p', 'err'); err.hidden = true;
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Save hours for this day'));
    const no = make('button', 'later', 'Cancel'); no.type = 'button';
    no.addEventListener('click', () => { f.remove(); });
    btns.append(go, no);
    f.append(make('p', 'o-hint', 'Hours for ' + d.label + ' only. Your other days stay as they are.'), wrap, err, btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const wins = collectWeek(wrap).mon || [];
      if (!wins.length) { err.textContent = 'Add the hours you’re open, or use Take this day off.'; err.hidden = false; return; }
      err.hidden = true;
      await daySet(d.date, 'hours', wins, go, 'Saved. Those are the hours for that day.', err);
    });
    box.append(f);
    focusEl(f.querySelector('input'));
  }
  async function daySet(date, mode, windows, btn, done, errEl) {
    setBusy(btn, true, 'Saving…');
    try {
      const body = { date, mode };
      if (windows) body.windows = windows;
      const r = await bookCall('/day-set', body);
      toast(overlapNote(r && r.overlaps, done), arr(r && r.overlaps).length ? 9000 : 0);
      bkDay = date;
      await loadBookings();
      if (bkTab === 'calendar') { await loadMonth(date.slice(0, 7)); const b = $('#bk-cal [data-date="' + date + '"]'); if (b) focusEl(b, true); }
    } catch (e) {
      setBusy(btn, false);
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      const msg = e.code === 'input' && e.field === 'windows' ? 'Check the hours: each start comes before its end, in quarter hours, without overlapping.' : bkWords(e);
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; } else toast(msg);
    }
  }

  // ---- different hours on a date (the list in Hours)
  function ovrRow(v) {
    const li = make('li', 'dc');
    const head = make('div', 'dc-head');
    head.append(make('span', 'bk-off-label', v.label), make('span', 'dc-off', v.closed ? 'Closed' : ''));
    li.append(head);
    if (!v.closed) li.append(make('p', 'dc-meta', v.hours_label));
    const act = make('div', 'o-act');
    const rm = make('button', 'open-btn', 'Back to usual'); rm.type = 'button';
    rm.setAttribute('aria-label', 'Back to your usual hours on ' + v.label);
    rm.addEventListener('click', () => daySet(v.date, 'usual', null, rm, 'Back to your usual hours on ' + v.label + '.'));
    act.append(rm);
    li.append(act);
    return li;
  }
  async function onBkOvr(ev) {
    ev.preventDefault();
    const err = $('#bk-ovr-err');
    err.hidden = true;
    const date = $('#in-bk-ovr-date').value;
    if (!date) { err.textContent = 'Pick the date.'; err.hidden = false; focusEl($('#in-bk-ovr-date')); return; }
    const closed = $('#in-bk-ovr-closed').checked;
    const a = $('#in-bk-ovr-start').value, b = $('#in-bk-ovr-end').value;
    if (!closed && (!a || !b)) { err.textContent = 'Add the hours you’re open that day, or tick Closed all day.'; err.hidden = false; focusEl($('#in-bk-ovr-start')); return; }
    await daySet(date, closed ? 'closed' : 'hours', closed ? null : [[a, b]], $('#b-bk-ovr'), closed ? 'Saved. That day is closed for booking.' : 'Saved. Those are the hours for that day.', err);
    if (err.hidden) { $('#in-bk-ovr-date').value = ''; $('#in-bk-ovr-start').value = ''; $('#in-bk-ovr-end').value = ''; $('#in-bk-ovr-closed').checked = false; $('#bk-ovr-hours').hidden = false; }
  }

  // ---- repeating blocks
  function repRow(r) {
    const li = make('li', 'dc');
    const head = make('div', 'dc-head');
    head.append(make('span', 'bk-off-label', r.label));
    li.append(head);
    if (r.note) li.append(make('p', 'dc-meta', r.note));
    const act = make('div', 'o-act o-act2');
    const ed = make('button', 'open-btn', 'Change'); ed.type = 'button';
    ed.setAttribute('aria-label', 'Change the block: ' + r.label);
    ed.addEventListener('click', () => openRep(r, li));
    const rm = make('button', 'open-btn', 'Remove'); rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove the block: ' + r.label);
    rm.addEventListener('click', async () => {
      setBusy(rm, true, 'Removing…');
      try { await bookCall('/repeat-remove', { id: r.id }); toast('Removed. Those times are open again.'); await loadBookings(); focusEl($('#b-bk-rep-new'), true); } catch (e) {
        setBusy(rm, false);
        if (e.code === 'signed_out') { quietSignOut(false); return; }
        toast(bkWords(e));
      }
    });
    act.append(ed, rm);
    li.append(act);
    return li;
  }
  function openRep(r, li) {
    closeBkForms($('#bk-p-hours'));
    const key = r ? r.id : 'new';
    const f = make('form', 'dc-form bk-form');
    f.noValidate = true;
    const fs = make('fieldset', 'bk-daypick');
    fs.append(make('legend', 'field-label', 'Which days'));
    BK_DAYS.forEach(([k, name]) => {
      const l = make('label', 'dc-check');
      const c = make('input'); c.type = 'checkbox'; c.value = k; c.checked = r ? r.days.includes(k) : k === 'tue';
      l.append(c, make('span', null, name));
      fs.append(l);
    });
    const field = (label, el, opt) => { const l = make('label', 'field-label', label + ' '); l.htmlFor = el.id; if (opt) l.append(make('span', 'opt-tag', opt)); return [l, el]; };
    const inp = (id, type, val) => { const i = make('input'); i.id = id + '-' + key; i.type = type; i.value = val; i.className = 'keeps'; if (type === 'time') i.step = 900; return i; };
    const from = inp('in-bk-rep-a', 'time', r ? r.start : '10:00'), until = inp('in-bk-rep-b', 'time', r ? (r.end === '24:00' ? '23:45' : r.end) : '14:00');
    const often = make('select'); often.id = 'in-bk-rep-every-' + key;
    [[1, 'Every week'], [2, 'Every other week'], [3, 'Every 3 weeks'], [4, 'Every 4 weeks']].forEach(([v, t]) => { const o = make('option', null, t); o.value = String(v); often.append(o); });
    often.value = String(r ? r.every_weeks : 1);
    const starts = inp('in-bk-rep-from', 'date', r ? r.starts_on : bk.owner.today), ends = inp('in-bk-rep-to', 'date', r ? r.ends_on : '');
    const note = inp('in-bk-rep-note', 'text', r ? r.note : ''); note.maxLength = 200; note.autocomplete = 'off'; note.placeholder = 'Like: Standing commitment';
    const times = make('div', 'dc-dates'); const ta = make('div'); ta.append(...field('From', from)); const tb = make('div'); tb.append(...field('Until', until)); times.append(ta, tb);
    const dates = make('div', 'dc-dates'); const da = make('div'); da.append(...field('Starting', starts)); const db = make('div'); db.append(...field('Ending', ends, '(optional)')); dates.append(da, db);
    const err = make('p', 'err'); err.hidden = true;
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Save the block'));
    const no = make('button', 'later', 'Cancel'); no.type = 'button';
    no.addEventListener('click', () => { f.remove(); focusEl(r ? li.querySelector('.open-btn') : $('#b-bk-rep-new')); });
    btns.append(go, no);
    f.append(make('h4', 'small-h', r ? 'Change the block' : 'A new repeating block'), fs, times, ...field('How often', often), dates, ...field('A note for you', note, '(optional, only you see it)'), err, btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      const days = $$('input[type="checkbox"]', fs).filter((c) => c.checked).map((c) => c.value);
      const bad = (msg, el) => { err.textContent = msg; err.hidden = false; focusEl(el); };
      if (!days.length) return bad('Pick at least one day.', fs.querySelector('input'));
      if (!from.value || !until.value || until.value <= from.value) return bad('Check the times: the end comes after the start.', from);
      if (!starts.value) return bad('Pick the first day it starts.', starts);
      if (ends.value && ends.value < starts.value) return bad('The ending date comes after the start.', ends);
      setBusy(go, true, 'Saving…');
      try {
        const res = await bookCall('/repeat-save', { id: r ? r.id : '', days, start: from.value, end: until.value, every_weeks: +often.value, starts_on: starts.value, ends_on: ends.value || '', note: cleanLine(note.value, 200) });
        f.remove();
        toast(overlapNote(res && res.overlaps, 'Saved. Those times close for booking.'), arr(res && res.overlaps).length ? 9000 : 0);
        await loadBookings();
        focusEl($('#b-bk-rep-new'), true);
      } catch (e) {
        setBusy(go, false, 'Save the block');
        if (e.code === 'signed_out') { quietSignOut(false); return; }
        err.textContent = e.code === 'input' && e.why !== 'too_many' ? 'Check the days, times and dates: times in quarter hours, the end after the start.' : bkWords(e);
        err.hidden = false;
      }
    });
    if (r) li.append(f); else $('#bk-reps').after(f);
    focusEl(fs.querySelector('input'));
  }

  // ---- time off
  function offRow(t) {
    const li = make('li', 'dc');
    const head = make('div', 'dc-head');
    head.append(make('span', 'bk-off-label', t.label));
    li.append(head);
    if (t.note) li.append(make('p', 'dc-meta', t.note));
    const act = make('div', 'o-act');
    const rm = make('button', 'open-btn', 'Remove');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove time off: ' + t.label);
    rm.addEventListener('click', async () => {
      setBusy(rm, true, 'Removing…');
      try { await bookCall('/time-off-remove', { id: t.id }); toast('Removed. Those times are open again.'); await loadBookings(); focusEl($('#in-bk-from'), true); } catch (e) {
        setBusy(rm, false, 'Remove');
        if (e.code === 'signed_out') { quietSignOut(false); return; }
        toast(bkWords(e));
      }
    });
    act.append(rm);
    li.append(act);
    return li;
  }
  async function onBkOff(ev) {
    ev.preventDefault();
    const err = $('#bk-off-err');
    err.hidden = true;
    const all = $('#in-bk-allday').checked;
    const body = { from: $('#in-bk-from').value, to: $('#in-bk-to').value || $('#in-bk-from').value, note: cleanLine($('#in-bk-offnote').value, 200) };
    if (!all) { body.to = body.from; body.start = $('#in-bk-start').value; body.end = $('#in-bk-end').value; }
    if (!body.from) { err.textContent = 'Pick the first day.'; err.hidden = false; focusEl($('#in-bk-from')); return; }
    const btn = $('#b-bk-off');
    setBusy(btn, true, 'Adding…');
    try {
      const r = await bookCall('/time-off-add', body);
      $('#in-bk-from').value = ''; $('#in-bk-to').value = ''; $('#in-bk-offnote').value = ''; $('#in-bk-start').value = ''; $('#in-bk-end').value = '';
      toast(overlapNote(r && r.overlaps, 'Added. Those times are closed for booking.'), arr(r && r.overlaps).length ? 9000 : 0);
      await loadBookings();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      err.textContent = e.code === 'input' ? 'Check the days and times: the end comes after the start, in quarter hours.' : bkWords(e);
      err.hidden = false;
    } finally { setBusy(btn, false, 'Add time off'); }
  }

  // ---- weekly hours (the same editor for the week, a service's own times, and one day in the month view)
  function hoursRow(win) {
    const row = make('div', 'bk-win');
    const a = make('input'); a.type = 'time'; a.step = 900; a.value = win[0]; a.className = 'keeps'; a.setAttribute('aria-label', 'From');
    const b = make('input'); b.type = 'time'; b.step = 900; b.value = win[1] === '24:00' ? '23:45' : win[1]; b.className = 'keeps'; b.setAttribute('aria-label', 'Until');
    const rm = make('button', 'later', 'Remove'); rm.type = 'button';
    rm.addEventListener('click', () => { const day = row.parentElement; row.remove(); syncDay(day); });
    row.append(a, make('span', 'bk-to', 'to'), b, rm);
    return row;
  }
  function syncDay(list) {
    const box = list.closest('.bk-day');
    box.querySelector('.bk-closed').hidden = list.children.length > 0;
    box.querySelector('.bk-add').hidden = list.children.length >= 4;
    $$('.bk-win', list).forEach((r) => {
      const name = box.dataset.name;
      const [a, b] = $$('input', r);
      a.setAttribute('aria-label', name + ', from');
      b.setAttribute('aria-label', name + ', until');
      r.querySelector('button').setAttribute('aria-label', 'Remove these ' + name + ' hours');
    });
  }
  function buildWeek(container, hours, closedWord, days) {
    container.replaceChildren(...(days || BK_DAYS).map(([k, name]) => {
      const box = make('div', 'bk-day');
      box.dataset.day = k;
      box.dataset.name = name;
      box.append(make('span', 'bk-dayname', name));
      const list = make('div', 'bk-wins');
      (hours[k] || []).forEach((w) => list.append(hoursRow(w)));
      box.append(list, make('span', 'bk-closed', closedWord === 'svc' ? 'Not offered' : 'Closed'));
      const add = make('button', 'later bk-add', 'Add hours'); add.type = 'button';
      add.setAttribute('aria-label', 'Add hours on ' + name);
      add.addEventListener('click', () => { const r = hoursRow(['10:00', '16:00']); list.append(r); syncDay(list); focusEl(r.querySelector('input')); });
      box.append(add);
      syncDay(list);
      return box;
    }));
  }
  function collectWeek(container) {
    const hours = {};
    $$('.bk-day', container).forEach((box) => {
      hours[box.dataset.day] = $$('.bk-win', box).map((r) => $$('input', r).map((i) => i.value))
        .filter((w) => w[0] && w[1]).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    });
    return hours;
  }
  async function onBkHours(ev) {
    ev.preventDefault();
    const err = $('#bk-hours-err');
    err.hidden = true;
    const hours = collectWeek($('#bk-week'));
    const btn = $('#b-bk-hours');
    setBusy(btn, true, 'Saving…');
    try {
      await bookCall('/hours', { hours });
      toast('Saved. New bookings fit inside these hours.');
      await loadBookings();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      const day = BK_DAYS.find(([k]) => k === e.field);
      err.textContent = day ? 'Check ' + day[1] + ': each start comes before its end, in quarter hours, without overlapping.' : bkWords(e);
      err.hidden = false;
    } finally { setBusy(btn, false, 'Save your hours'); }
  }

  // ---- services
  function svcRow(s) {
    const li = make('li', 'dc' + (s.active ? '' : ' st-off'));
    const head = make('div', 'dc-head');
    head.append(make('span', 'dc-name bk-svc-name', s.name), make('span', 'dc-off', s.price_cents ? '$' + dollars(s.price_cents) : ''));
    li.append(head);
    const bits = [s.minutes + ' minutes', BK_WHERE[s.location] || '', s.package_count > 1 ? s.package_count + ' sessions, booked together' : '',
      s.deposit_cents ? '$' + dollars(s.deposit_cents) + ' deposit' : '', s.active ? 'On' : 'Off, not shown'].filter(Boolean);
    li.append(make('p', 'dc-meta', bits.join(' · ')));
    const more = [s.hours ? 'Only at its own times' : '', s.max_per_day ? 'At most ' + s.max_per_day + ' a day' : '', s.max_per_week ? 'at most ' + s.max_per_week + ' a week' : ''].filter(Boolean);
    if (more.length) li.append(make('p', 'dc-meta', more.join(', ')));
    if (s.description) li.append(make('p', 'dc-meta', s.description));
    const act = make('div', 'o-act');
    const ed = make('button', 'open-btn', 'Change'); ed.type = 'button';
    ed.setAttribute('aria-label', 'Change ' + s.name);
    ed.addEventListener('click', () => openSvc(s, li));
    act.append(ed);
    li.append(act);
    return li;
  }
  function openSvc(s, li) {
    closeBkForms($('#bk-p-services'));
    const key = s ? s.id : 'new';
    const f = make('form', 'dc-form bk-form');
    f.noValidate = true;
    const field = (label, el, opt) => { const l = make('label', 'field-label', label + ' '); l.htmlFor = el.id; if (opt) l.append(make('span', 'opt-tag', opt)); return [l, el]; };
    const inp = (id, type, val, max) => { const i = make('input'); i.id = id + '-' + key; i.type = type; i.value = val; if (max) i.maxLength = max; i.autocomplete = 'off'; return i; };
    const name = inp('in-bks-name', 'text', s ? s.name : '', 80);
    const mins = inp('in-bks-min', 'text', s ? String(s.minutes) : '60', 3); mins.inputMode = 'numeric';
    const price = inp('in-bks-price', 'text', s && s.price_cents ? dollars(s.price_cents) : '', 9); price.inputMode = 'decimal';
    const where = make('select'); where.id = 'in-bks-where-' + key;
    bk.owner.locations.forEach((l) => { const o = make('option', null, BK_WHERE[l]); o.value = l; where.append(o); });
    if (s && bk.owner.locations.includes(s.location)) where.value = s.location;
    const pk = inp('in-bks-pk', 'text', s ? String(s.package_count) : '1', 2); pk.inputMode = 'numeric';
    const desc = make('textarea', 'short'); desc.id = 'in-bks-desc-' + key; desc.maxLength = 600; desc.value = s ? s.description : '';
    const depWrap = make('label', 'dc-check');
    const dep = make('input'); dep.type = 'checkbox'; dep.checked = !!(s && s.deposit_cents); dep.disabled = !bk.owner.payments && !dep.checked;
    depWrap.append(dep, make('span', null, bk.owner.payments ? 'Ask for a deposit to hold the time' : 'Ask for a deposit (needs your Stripe connected; email Taya)'));
    const depAmt = inp('in-bks-dep', 'text', s && s.deposit_cents ? dollars(s.deposit_cents) : '', 9); depAmt.inputMode = 'decimal';
    const depRow = make('div'); depRow.append(...field('Deposit, in dollars', depAmt)); depRow.hidden = !dep.checked;
    dep.addEventListener('change', () => { depRow.hidden = !dep.checked; });
    // its own times (only offer it then), and its own limits
    const ownWrap = make('label', 'dc-check');
    const own = make('input'); own.type = 'checkbox'; own.checked = !!(s && s.hours);
    ownWrap.append(own, make('span', null, 'Only offer it at certain times'));
    const ownWeek = make('div', 'bk-week');
    buildWeek(ownWeek, s && s.hours ? s.hours : bk.owner.hours, 'svc');
    const ownRow = make('div'); ownRow.append(make('p', 'orders-fine', 'People can book it only inside these times, and only when you’re open.'), ownWeek); ownRow.hidden = !own.checked;
    own.addEventListener('change', () => { ownRow.hidden = !own.checked; });
    const mDay = inp('in-bks-mday', 'text', s && s.max_per_day ? String(s.max_per_day) : '', 2); mDay.inputMode = 'numeric'; mDay.placeholder = 'No limit';
    const mWeek = inp('in-bks-mweek', 'text', s && s.max_per_week ? String(s.max_per_week) : '', 3); mWeek.inputMode = 'numeric'; mWeek.placeholder = 'No limit';
    const lims = make('div', 'dc-dates'); const la = make('div'); la.append(...field('Most a day', mDay, '(optional)')); const lb = make('div'); lb.append(...field('Most a week', mWeek, '(optional)')); lims.append(la, lb);
    const onWrap = make('label', 'dc-check');
    const on = make('input'); on.type = 'checkbox'; on.checked = s ? s.active : true;
    onWrap.append(on, make('span', null, 'On, people can book it'));
    const err = make('p', 'err'); err.hidden = true;
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Save the service'));
    const no = make('button', 'later', 'Cancel'); no.type = 'button';
    no.addEventListener('click', () => { f.remove(); focusEl(s ? li.querySelector('.open-btn') : $('#b-bk-svc-new')); });
    btns.append(go, no);
    f.append(make('h4', 'small-h', s ? 'Change ' + s.name : 'A new service'), ...field('Name', name), ...field('Length, in minutes', mins), ...field('Price shown', price, '(optional, in dollars)'),
      ...field('Where', where), ...field('Sessions in a package', pk, '(1 for a single session)'), ...field('A short description', desc, '(optional)'), depWrap, depRow, ownWrap, ownRow, lims, onWrap, err, btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      const pc = toCents(price.value), dc = dep.checked ? toCents(depAmt.value) : 0;
      const m = Math.round(+mins.value), n = Math.round(+pk.value || 1);
      const md = mDay.value.trim() ? +mDay.value.trim() : 0, mw = mWeek.value.trim() ? +mWeek.value.trim() : 0;
      const bad = (msg, el) => { err.textContent = msg; err.hidden = false; focusEl(el); };
      if (!cleanLine(name.value, 80)) return bad('Give it a name.', name);
      if (!(m >= 15 && m <= 480 && m % 5 === 0)) return bad('The length is in minutes, from 15 to 480 (in steps of 5).', mins);
      if (pc === null) return bad('The price is a dollar amount, like 90 or 92.50.', price);
      if (dep.checked && (!dc || dc < 100)) return bad('The deposit is a dollar amount, at least $1.', depAmt);
      if (!(n >= 1 && n <= 12)) return bad('Sessions in a package is 1 to 12.', pk);
      if (!(Number.isInteger(md) && md >= 0 && md <= 50)) return bad('Most a day is a number from 1 to 50, or leave it empty.', mDay);
      if (!(Number.isInteger(mw) && mw >= 0 && mw <= 200)) return bad('Most a week is a number from 1 to 200, or leave it empty.', mWeek);
      const hours = own.checked ? collectWeek(ownWeek) : null;
      if (hours && !BK_DAYS.some(([k]) => hours[k].length)) return bad('Add the times it’s offered, or untick Only offer it at certain times.', own);
      setBusy(go, true, 'Saving…');
      try {
        await bookCall('/service-save', { id: s ? s.id : '', name: cleanLine(name.value, 80), minutes: m, price_cents: pc, deposit_cents: dc, description: cleanText(desc.value, 600),
          location: where.value, package_count: n, active: on.checked, hours, max_per_day: md, max_per_week: mw });
        f.remove();
        toast('Saved.');
        await loadBookings();
        focusEl($('#b-bk-svc-new'), true);
      } catch (e) {
        setBusy(go, false, 'Save the service');
        if (e.code === 'signed_out') { quietSignOut(false); return; }
        err.textContent = e.code === 'input' && e.field === 'hours' ? 'Check its times: each start comes before its end, in quarter hours, without overlapping.' : bkWords(e);
        err.hidden = false;
      }
    });
    if (s) li.append(f); else $('#bk-svcs').append(f);
    focusEl(name);
  }

  // ---- questions on the booking form
  function qRow(q, i) {
    const li = make('li', 'dc');
    const head = make('div', 'dc-head');
    head.append(make('span', 'dc-name', q.label), make('span', 'dc-off', q.required ? 'Required' : 'Optional'));
    li.append(head);
    const names = q.services.map((id) => (bk.services.find((s) => s.id === id) || {}).name).filter(Boolean);
    li.append(make('p', 'dc-meta', BK_QTYPE[q.type] + (q.type === 'choice' ? ': ' + q.choices.join(', ') : '') + ' · ' + (names.length ? 'For ' + names.join(', ') : 'Every service')));
    const act = make('div', 'o-act o-act2');
    const ed = make('button', 'open-btn', 'Change'); ed.type = 'button';
    ed.setAttribute('aria-label', 'Change the question: ' + q.label);
    ed.addEventListener('click', () => openQ(q, i, li));
    const rm = make('button', 'open-btn', 'Remove'); rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove the question: ' + q.label);
    rm.addEventListener('click', () => saveQs(bk.owner.questions.filter((_, k) => k !== i), rm, 'Removed. It’s off the booking form.'));
    act.append(ed, rm);
    li.append(act);
    return li;
  }
  async function saveQs(list, btn, done, errEl) {
    setBusy(btn, true, 'Saving…');
    try {
      await bookCall('/questions-save', { questions: list.map((q) => ({ id: q.id || '', label: q.label, type: q.type, choices: q.type === 'choice' ? q.choices : [], required: !!q.required, services: q.services })) });
      toast(done);
      closeBkForms($('#bk-p-services'));
      await loadBookings();
      focusEl($('#b-bk-q-new'), true);
      return true;
    } catch (e) {
      setBusy(btn, false);
      if (e.code === 'signed_out') { quietSignOut(false); return false; }
      const msg = e.code === 'input' && e.field === 'choices' ? 'A pick one question needs at least two different choices, one on each line.' : bkWords(e);
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; } else toast(msg);
      return false;
    }
  }
  function openQ(q, i, li) {
    if (!q && bk.owner.questions.length >= 10) { toast('Ten questions is the most for now.'); return; }
    closeBkForms($('#bk-p-services'));
    const key = q ? q.id : 'new';
    const f = make('form', 'dc-form bk-form');
    f.noValidate = true;
    const field = (label, el, opt) => { const l = make('label', 'field-label', label + ' '); l.htmlFor = el.id; if (opt) l.append(make('span', 'opt-tag', opt)); return [l, el]; };
    const label = make('input'); label.id = 'in-bkq-label-' + key; label.type = 'text'; label.maxLength = 120; label.autocomplete = 'off'; label.value = q ? q.label : '';
    label.placeholder = 'Like: Any injuries or areas to avoid?';
    const type = make('select'); type.id = 'in-bkq-type-' + key;
    Object.keys(BK_QTYPE).forEach((k) => { const o = make('option', null, BK_QTYPE[k]); o.value = k; type.append(o); });
    type.value = q ? q.type : 'text';
    const choices = make('textarea', 'short'); choices.id = 'in-bkq-choices-' + key; choices.value = q ? q.choices.join('\n') : '';
    const chRow = make('div'); chRow.append(...field('The choices', choices, '(one on each line)')); chRow.hidden = type.value !== 'choice';
    type.addEventListener('change', () => { chRow.hidden = type.value !== 'choice'; });
    const reqWrap = make('label', 'dc-check');
    const req = make('input'); req.type = 'checkbox'; req.checked = q ? q.required : false;
    reqWrap.append(req, make('span', null, 'They need to answer it'));
    const fs = make('fieldset', 'bk-daypick');
    fs.append(make('legend', 'field-label', 'Ask it for'));
    const svcBoxes = bk.services.map((s) => {
      const l = make('label', 'dc-check');
      const c = make('input'); c.type = 'checkbox'; c.value = s.id; c.checked = !!(q && q.services.includes(s.id));
      l.append(c, make('span', null, s.name));
      fs.append(l);
      return c;
    });
    fs.append(make('p', 'orders-fine', 'Tick none to ask it for every service.'));
    const err = make('p', 'err'); err.hidden = true;
    const btns = make('div', 'dc-btns');
    const go = make('button', 'btn small'); go.type = 'submit'; go.append(make('span', null, 'Save the question'));
    const no = make('button', 'later', 'Cancel'); no.type = 'button';
    no.addEventListener('click', () => { f.remove(); focusEl(q ? li.querySelector('.open-btn') : $('#b-bk-q-new')); });
    btns.append(go, no);
    f.append(make('h4', 'small-h', q ? 'Change the question' : 'A new question'), ...field('The question', label), ...field('How they answer', type), chRow, reqWrap, fs, err, btns);
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      err.hidden = true;
      const text = cleanLine(label.value, 120);
      if (!text) { err.textContent = 'Write the question.'; err.hidden = false; focusEl(label); return; }
      const ch = choices.value.split('\n').map((c) => cleanLine(c, 60)).filter(Boolean);
      if (type.value === 'choice' && ch.length < 2) { err.textContent = 'Add at least two choices, one on each line.'; err.hidden = false; focusEl(choices); return; }
      const item = { id: q ? q.id : '', label: text, type: type.value, choices: type.value === 'choice' ? ch : [], required: req.checked, services: svcBoxes.filter((c) => c.checked).map((c) => c.value) };
      const list = bk.owner.questions.slice();
      if (q) list[i] = item; else list.push(item);
      await saveQs(list, go, 'Saved. It’s on the booking form.', err);
    });
    if (q) li.append(f); else $('#bk-qs').after(f);
    focusEl(label);
  }

  // ---- their own calendars
  const CAL_WORDS = {
    gone: 'That address doesn’t answer anymore. It may have been reset: copy the new one from your calendar and connect it again.',
    private: 'That calendar is private at that address. Use the secret iCal address (Google) or a public link (iCloud).',
    timeout: 'Your calendar was slow to answer. It tries again by itself every 15 minutes.',
    unreachable: 'I couldn’t reach your calendar just now. It tries again by itself every 15 minutes.',
    http: 'Your calendar didn’t answer properly just now. It tries again by itself every 15 minutes.',
    too_big: 'That calendar is very big (over 5 MB). A calendar kept just for busy times works best.',
    not_calendar: 'That address didn’t give back a calendar. Check that it’s the iCal (.ics) address.'
  };
  function ago(isoText) {
    const t = Date.parse(isoText), n = Date.parse(bk && bk.owner.now) || Date.now();
    if (!t) return '';
    const m = Math.max(0, Math.round((n - t) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return plural(m, 'minute', 'minutes') + ' ago';
    const h = Math.round(m / 60);
    if (h < 48) return plural(h, 'hour', 'hours') + ' ago';
    return plural(Math.round(h / 24), 'day', 'days') + ' ago';
  }
  function calRow(c) {
    const li = make('li', 'dc');
    const head = make('div', 'dc-head');
    head.append(make('span', 'dc-name', c.label || c.hint || 'Your calendar'));
    li.append(head);
    if (c.label && c.hint) li.append(make('p', 'dc-meta', c.hint));
    const state = c.error ? CAL_WORDS[c.error] || CAL_WORDS.http : '';
    if (state) li.append(make('p', 'dc-meta bk-cal-err', state + (c.ok_at ? ' The busy times it read ' + ago(c.ok_at) + ' still count.' : '')));
    li.append(make('p', 'dc-meta', c.checked_at ? 'Checked ' + ago(c.checked_at) + (c.error ? '' : ' · ' + plural(c.busy_count, 'busy time', 'busy times') + ' ahead') : 'Not checked yet'));
    const act = make('div', 'o-act o-act2');
    const ck = make('button', 'open-btn', 'Check now'); ck.type = 'button';
    ck.setAttribute('aria-label', 'Check ' + (c.label || c.hint || 'your calendar') + ' now');
    ck.addEventListener('click', async () => {
      setBusy(ck, true, 'Checking…');
      try {
        const r = await bookCall('/calendar-check', { id: c.id });
        const e = r && r.calendar && r.calendar.error;
        toast(e ? CAL_WORDS[e] || CAL_WORDS.http : 'Checked. Busy times are up to date.');
        await loadBookings();
      } catch (e) { setBusy(ck, false); if (e.code === 'signed_out') { quietSignOut(false); return; } toast(bkWords(e)); }
    });
    const rm = make('button', 'open-btn', 'Remove'); rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove ' + (c.label || c.hint || 'this calendar'));
    rm.addEventListener('click', async () => {
      setBusy(rm, true, 'Removing…');
      try { await bookCall('/calendar-remove', { id: c.id }); toast('Removed. Its busy times no longer close anything.'); await loadBookings(); focusEl($('#in-bk-cal-url'), true); } catch (e) {
        setBusy(rm, false); if (e.code === 'signed_out') { quietSignOut(false); return; } toast(bkWords(e));
      }
    });
    act.append(ck, rm);
    li.append(act);
    return li;
  }
  async function onBkCal(ev) {
    ev.preventDefault();
    const err = $('#bk-cal-err');
    err.hidden = true;
    const url = $('#in-bk-cal-url').value.trim();
    if (!url) { err.textContent = 'Paste your calendar’s private address first.'; err.hidden = false; focusEl($('#in-bk-cal-url')); return; }
    const btn = $('#b-bk-cal');
    setBusy(btn, true, 'Connecting…');
    try {
      const r = await bookCall('/calendar-add', { url, label: cleanLine($('#in-bk-cal-label').value, 60) });
      $('#in-bk-cal-url').value = ''; $('#in-bk-cal-label').value = '';
      const c = r && r.calendar;
      toast(c && c.error ? 'Saved. ' + (CAL_WORDS[c.error] || CAL_WORDS.http) : 'Connected. ' + plural(+(c && c.busy_count) || 0, 'busy time', 'busy times') + ' ahead now close for booking.', 9000);
      await loadBookings();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      const w = { format: 'That doesn’t look like a calendar address. It starts with https:// or webcal://.',
        host: 'That address isn’t from a calendar I know yet (Google, iCloud, Outlook, Proton, Fastmail, Yahoo). Email Taya and she can add yours.',
        too_many: 'Five calendars is the most for now.', already: 'That calendar is already connected.' };
      err.textContent = e.code === 'input' && w[e.why] ? w[e.why] : bkWords(e);
      err.hidden = false;
      focusEl($('#in-bk-cal-url'));
    } finally { setBusy(btn, false, 'Connect it'); }
  }

  // ---- settings
  const hoursWords = (h, zero) => (!h ? zero : h % 168 === 0 ? plural(h / 168, 'week', 'weeks') : h % 24 === 0 ? plural(h / 24, 'day', 'days') : plural(h, 'hour', 'hours'));
  const SET_OPTS = {
    'in-bk-notice': { key: 'notice_hours', list: [0, 1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 168], word: (v) => (v ? hoursWords(v) + ' ahead' : 'Right up to the start') },
    'in-bk-horizon': { key: 'horizon_days', list: [7, 14, 30, 45, 60, 90, 120, 180], word: (v) => (v % 7 === 0 && v <= 14 ? plural(v / 7, 'week', 'weeks') : v + ' days') + ' ahead' },
    'in-bk-buffer': { key: 'buffer_min', list: [0, 5, 10, 15, 20, 30, 45, 60, 90, 120], word: (v) => (v ? plural(v, 'minute', 'minutes') : 'No break') },
    'in-bk-window': { key: 'cancel_window_hours', list: [0, 1, 2, 4, 12, 24, 48, 72, 168], word: (v) => (v ? hoursWords(v) + ' before' : 'Right up to the start') },
    'in-bk-remind': { key: 'reminder_hours', list: [0, 1, 2, 4, 12, 24, 48], word: (v) => (v ? hoursWords(v) + ' before' : 'No reminder') },
    'in-bk-step': { key: 'slot_step', list: [0, 15, 30, 60], word: (v) => (v ? 'Every ' + plural(v, 'minute', 'minutes') : 'Every 30 minutes (15 for short services)') }
  };
  function fillSettings() {
    const st = bk.owner.settings;
    Object.keys(SET_OPTS).forEach((id) => {
      const o = SET_OPTS[id], sel = $('#' + id), cur = st[o.key] || 0;
      const list = o.list.includes(cur) ? o.list : o.list.concat([cur]).sort((a, b) => a - b);
      sel.replaceChildren(...list.map((v) => { const op = make('option', null, o.word(v)); op.value = String(v); return op; }));
      sel.value = String(cur);
    });
    $('#in-bk-maxday').value = st.max_per_day ? String(st.max_per_day) : '';
    $('#in-bk-maxweek').value = st.max_per_week ? String(st.max_per_week) : '';
  }
  async function onBkSet(ev) {
    ev.preventDefault();
    const err = $('#bk-set-err');
    err.hidden = true;
    const body = {};
    Object.keys(SET_OPTS).forEach((id) => { body[SET_OPTS[id].key] = +$('#' + id).value; });
    const md = $('#in-bk-maxday').value.trim(), mw = $('#in-bk-maxweek').value.trim();
    body.max_per_day = md ? +md : 0; body.max_per_week = mw ? +mw : 0;
    if (!(Number.isInteger(body.max_per_day) && body.max_per_day >= 0 && body.max_per_day <= 50)) { err.textContent = 'Most bookings in a day is a number from 1 to 50, or leave it empty.'; err.hidden = false; focusEl($('#in-bk-maxday')); return; }
    if (!(Number.isInteger(body.max_per_week) && body.max_per_week >= 0 && body.max_per_week <= 200)) { err.textContent = 'Most bookings in a week is a number from 1 to 200, or leave it empty.'; err.hidden = false; focusEl($('#in-bk-maxweek')); return; }
    const btn = $('#b-bk-set');
    setBusy(btn, true, 'Saving…');
    try {
      await bookCall('/settings', body);
      toast('Saved. New bookings follow these settings.');
      await loadBookings();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(false); return; }
      err.textContent = bkWords(e); err.hidden = false;
    } finally { setBusy(btn, false, 'Save settings'); }
  }
  function wireBookings() {
    $('#f-bk-off').addEventListener('submit', onBkOff);
    $('#in-bk-allday').addEventListener('change', () => { $('#bk-off-hours').hidden = $('#in-bk-allday').checked; $('#in-bk-to').disabled = !$('#in-bk-allday').checked; });
    $('#f-bk-hours').addEventListener('submit', onBkHours);
    $('#b-bk-svc-new').addEventListener('click', () => { if (bk) openSvc(null, null); });
    $('#b-bk-feed').addEventListener('click', () => copyFeed(false));
    $('#b-bk-feed-new').addEventListener('click', () => copyFeed(true));
    $$('#sec-bookings .bk-tab').forEach((t) => {
      t.addEventListener('click', () => selectTab(t.dataset.tab, false, false));
      t.addEventListener('keydown', onTabKey);
    });
    window.addEventListener('hashchange', () => { const h = hashTab(); if (h && bk) { selectTab(h, false, true); $('#sec-bookings').scrollIntoView({ block: 'start' }); } });
    $('#b-bk-prev').addEventListener('click', () => loadMonth(monthKeyAdd(bkMonth, -1)));
    $('#b-bk-next').addEventListener('click', () => loadMonth(monthKeyAdd(bkMonth, 1)));
    $('#f-bk-ovr').addEventListener('submit', onBkOvr);
    $('#in-bk-ovr-closed').addEventListener('change', () => { $('#bk-ovr-hours').hidden = $('#in-bk-ovr-closed').checked; });
    $('#b-bk-rep-new').addEventListener('click', () => { if (bk) openRep(null, null); });
    $('#b-bk-q-new').addEventListener('click', () => { if (bk) openQ(null, -1, null); });
    $('#f-bk-cal').addEventListener('submit', onBkCal);
    $('#f-bk-set').addEventListener('submit', onBkSet);
  }

  // ---- the calendar link
  async function copyFeed(fresh) {
    const note = $('#bk-feed-note');
    let url = bk && bk.owner.feed_url;
    const btn = fresh ? $('#b-bk-feed-new') : $('#b-bk-feed');
    try {
      if (fresh) { url = safeUrl((await bookCall('/feed-new')).feed_url); if (bk) bk.owner.feed_url = url; }
      if (!url) throw fail('server');
      await navigator.clipboard.writeText(url);
      note.textContent = fresh ? 'A new link is copied. The old one stops working, so update it on your phone.' : 'Copied. Paste it into your phone’s calendar as a subscribed calendar.';
    } catch (e) {
      if (e && e.code === 'signed_out') { quietSignOut(false); return; }
      note.textContent = url ? 'Copying didn’t work here. Your link: ' + url : bkWords(e || {});
    }
    focusEl(btn, true);
  }

  /* ---- your shop's products: the Products card (Oct 10 2026) ----
     The owner adds and keeps their own products: photos (shrunk right here to 2000 px before they send, which also
     leaves the camera details behind), name, description, price, sizes or options each with their own count, how
     many they have (every change is a move in the server's stock ledger), one of a kind, made to order, and draft,
     live, or a Pacific day and time it goes live by itself. Only for a client with a shop; never in the preview.
     Everything here talks to the server through prodDoor (below), the card's one way in. */
  const PR_MAX_PHOTOS = 6, PR_SIDE = 2000, PR_MIN_SIDE = 200, PR_MAX_FILE = 40 * MB;
  const PR_FILE_RE = /^\/api\/files\/[a-z0-9_]{1,40}\/[a-z0-9]{15}\/[A-Za-z0-9_.-]{1,120}(\?thumb=\d{1,4}x\d{1,4})?$/;
  // the card's one door to the server: the signed-in key goes in a header (never a web address), JSON or a photo form
  async function prodDoor(path, body) {
    const form = body instanceof FormData;
    const headers = { 'X-WF-Session': token };
    if (!form) headers['Content-Type'] = 'application/json';
    let res;
    try {
      res = await fetch(SHOP + path, { method: 'POST', headers, body: form ? body : JSON.stringify(body || {}),
        mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) { throw fail('network'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw errorFrom(res.status, data);
    return data;
  }
  const prodApi = {
    list: () => prodDoor('/products', {}),
    save: (b) => prodDoor('/product-save', b),
    photo: (id, blob, name) => { const fd = new FormData(); fd.append('product', id); fd.append('photo', blob, name); return prodDoor('/product-photo', fd); },
    photos: (id, names) => prodDoor('/product-photos', { product: id, photos: names })
  };

  let prods = null;          // { products: [...] } as the server last sent it (cleaned)
  let prEditing = null;      // the product in the editor (null: a new one)
  let prPics = [];           // the editor's photos, in order: { name, src } kept, or { blob, src, ext } new
  let prBusy = false;
  const prFileUrl = (u) => { const s = str(u, 300); return PR_FILE_RE.test(s) ? SERVER + s : ''; };
  const prInt = (v) => (Number.isInteger(v) ? v : null);
  function cleanProduct(p) {
    if (!p || typeof p !== 'object' || !/^[a-z0-9]{15}$/.test(str(p.id))) return null;
    const kind = ['limited', 'one_of_a_kind', 'made_to_order'].includes(p.kind) ? p.kind : 'limited';
    return {
      id: p.id, title: str(p.title, 120), blurb: str(p.blurb, 1000), price_cents: prInt(p.price_cents) || 0, price: str(p.price, 20),
      kind, state: ['draft', 'scheduled', 'live', 'sold_out'].includes(p.state) ? p.state : 'draft',
      drop_at: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str(p.drop_at)) ? p.drop_at : '', drop_label: str(p.drop_label, 40),
      option_stock: !!p.option_stock,
      options: arr(p.options).slice(0, 20).map((o) => ({ name: str(o && o.name, 30), stock: prInt(o && o.stock) })).filter((o) => o.name),
      stock: prInt(p.stock), held: prInt(p.held) || 0,
      photos: arr(p.photos).slice(0, 8).map((x) => ({ name: str(x && x.name, 120), src: prFileUrl(x && x.thumb) || prFileUrl(x && x.url) })).filter((x) => x.name && x.src),
      linked: prInt(p.linked_photos) || 0
    };
  }
  async function loadProducts() {
    if (DEMO) { $('#sec-products').hidden = true; return; }
    try {
      const d = await prodApi.list();
      prods = d && d.shop ? { products: arr(d.products).slice(0, 300).map(cleanProduct).filter(Boolean) } : null;
      renderProducts();
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      if (!prods) $('#sec-products').hidden = true;
    }
  }
  function hideProducts() { prods = null; $('#sec-products').hidden = true; }
  const PR_STATE = { draft: 'Draft', live: 'Live', sold_out: 'Sold out' };
  function prStockLine(p) {
    if (p.kind === 'one_of_a_kind') return 'One of a kind';
    if (p.kind === 'made_to_order') return 'Made to order';
    if (p.option_stock && p.options.length) return p.options.map((o) => o.name + ' ' + (o.stock || 0)).join(' · ');
    const n = p.stock || 0;
    return n + ' left' + (p.held ? ', ' + p.held + ' in a checkout' : '');
  }
  function renderProducts() {
    const sec = $('#sec-products');
    if (!prods) { sec.hidden = true; return; }
    sec.hidden = false;
    const editing = !$('#f-pr').hidden;
    $('#prs').hidden = editing;
    $('#prs-empty').hidden = editing || prods.products.length > 0;
    $('#prs').replaceChildren(...prods.products.map(productRow));
  }
  function productRow(p) {
    const li = make('li', 'pr st-' + p.state);
    li.dataset.product = p.id;
    const pic = make('div', 'pr-pic');
    if (p.photos[0]) {
      const img = make('img');
      img.src = p.photos[0].src;
      img.alt = '';
      img.decoding = 'async';
      pic.append(img);
    } else pic.append(icon('i-leaf'));
    const main = make('div', 'pr-main');
    main.append(make('p', 'pr-title', p.title));
    const line = make('p', 'pr-line');
    line.append(make('span', 'pr-price', p.price), make('span', 'pr-stock', prStockLine(p)));
    main.append(line);
    const act = make('div', 'pr-act');
    act.append(make('span', 'pr-status', p.state === 'scheduled' ? 'Goes live ' + p.drop_label : PR_STATE[p.state]));
    const edit = make('button', 'open-btn pr-edit', 'Change');
    edit.type = 'button';
    edit.setAttribute('aria-label', 'Change ' + p.title);
    edit.addEventListener('click', () => openProductForm(p));
    act.append(edit);
    li.append(pic, main, act);
    return li;
  }

  // ---- the editor
  const PR_ERRS = { title: 'pr-title', blurb: 'pr-blurb', price_cents: 'pr-price', options: 'pr-opts', stock: 'pr-stock', drop_at: 'pr-drop', status: 'pr', kind: 'pr', photo: 'pr-photo', photos: 'pr-photo' };
  const PR_INPUTS = { 'pr-title': '#in-pr-title', 'pr-blurb': '#in-pr-blurb', 'pr-price': '#in-pr-price', 'pr-stock': '#in-pr-stock', 'pr-drop': '#in-pr-drop' };
  function prErr(id, text) {
    const p = $('#' + id + '-err');
    p.textContent = text || '';
    p.hidden = !text;
    const input = PR_INPUTS[id] && $(PR_INPUTS[id]);
    if (input) { if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }
  const prClearErrs = () => ['pr-title', 'pr-blurb', 'pr-price', 'pr-opts', 'pr-stock', 'pr-drop', 'pr-photo', 'pr'].forEach((id) => prErr(id, ''));
  const prStatus = () => { const r = document.querySelector('input[name="pr-status"]:checked'); return r ? r.value : 'draft'; };
  function prSync() {
    const one = $('#in-pr-one').checked, mto = $('#in-pr-mto').checked;
    const rows = $$('#pr-opts > li');
    $('#pr-opt-block').hidden = one;
    const own = !one && !mto && rows.length > 0;
    $('#pr-own-wrap').hidden = !own;
    const perOpt = own && $('#in-pr-own').checked;
    rows.forEach((li) => { li.querySelector('.pr-opt-count').hidden = !perOpt; li.classList.toggle('no-count', !perOpt); });
    $('#pr-count-block').hidden = one || mto || perOpt;
    $('#pr-drop-block').hidden = prStatus() !== 'scheduled';
  }
  function optionRow(o) {
    const li = make('li', 'pr-opt');
    const n = $$('#pr-opts > li').length + 1;
    const name = make('input', 'pr-opt-name');
    name.type = 'text';
    name.maxLength = 30;
    name.autocomplete = 'off';
    name.placeholder = 'Like: M';
    name.setAttribute('aria-label', 'Size or option ' + n);
    name.value = o ? o.name : '';
    const count = make('input', 'pr-opt-count pr-num');
    count.type = 'text';
    count.inputMode = 'numeric';
    count.maxLength = 5;
    count.autocomplete = 'off';
    count.placeholder = 'How many';
    count.setAttribute('aria-label', 'How many of option ' + n);
    if (o && Number.isInteger(o.stock)) { count.value = String(o.stock); count.dataset.was = String(o.stock); li.dataset.was = o.name; }
    const del = make('button', 'pr-opt-del');
    del.type = 'button';
    del.setAttribute('aria-label', 'Take off option ' + n);
    del.append(icon('i-x'));
    del.addEventListener('click', () => { li.remove(); prSync(); focusEl($('#b-pr-opt-add'), true); });
    li.append(name, count, del);
    return li;
  }
  function renderPrPhotos() {
    const ul = $('#pr-photos');
    ul.replaceChildren(...prPics.map((ph, i) => {
      const li = make('li', 'ph' + (i === 0 ? ' lead' : ''));
      const img = make('img');
      img.src = ph.src;
      img.alt = 'Photo ' + (i + 1) + (i === 0 ? ', the one that leads' : '');
      li.append(img);
      const row = make('div', 'ph-btns');
      const btn = (cls, label, ico, fn, off) => {
        const b = make('button', cls);
        b.type = 'button';
        b.setAttribute('aria-label', label);
        b.append(icon(ico));
        b.disabled = !!off;
        b.addEventListener('click', fn);
        return b;
      };
      row.append(
        btn('ph-left', 'Move photo ' + (i + 1) + ' earlier', 'i-down', () => movePic(i, -1), i === 0),
        btn('ph-right', 'Move photo ' + (i + 1) + ' later', 'i-down', () => movePic(i, 1), i === prPics.length - 1),
        btn('ph-del', 'Take photo ' + (i + 1) + ' off', 'i-x', () => { const gone = prPics.splice(i, 1)[0]; if (gone && gone.blob) URL.revokeObjectURL(gone.src); renderPrPhotos(); focusEl($('#pr-add-photo'), true); })
      );
      li.append(row);
      return li;
    }));
    $('#pr-add-photo').hidden = prPics.length >= PR_MAX_PHOTOS;
  }
  function movePic(i, d) {
    const j = i + d;
    if (j < 0 || j >= prPics.length) return;
    const t = prPics[i]; prPics[i] = prPics[j]; prPics[j] = t;
    renderPrPhotos();
    const b = $$('#pr-photos > li')[j];
    if (b) focusEl(b.querySelector(d < 0 ? (j === 0 ? '.ph-right' : '.ph-left') : (j === prPics.length - 1 ? '.ph-left' : '.ph-right')), true);
    announce('Photo moved to place ' + (j + 1) + '.');
  }
  // a photo from the phone, drawn again at 2000 px at most: WebP where the browser can make it, else JPEG
  const toBlob = (canvas, type, q) => new Promise((res) => { try { canvas.toBlob((b) => res(b), type, q); } catch (e) { res(null); } });
  async function shrinkPhoto(file) {
    let src = null, w = 0, h = 0, url = '';
    try {
      src = await createImageBitmap(file, { imageOrientation: 'from-image' });
      w = src.width; h = src.height;
    } catch (e) {
      url = URL.createObjectURL(file);
      src = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
      if (src) { w = src.naturalWidth; h = src.naturalHeight; }
    }
    if (!src || !w || !h) { if (url) URL.revokeObjectURL(url); return { error: 'open' }; }
    if (Math.min(w, h) < PR_MIN_SIDE) { if (url) URL.revokeObjectURL(url); return { error: 'small' }; }
    const k = Math.min(1, PR_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const draw = (fill) => { ctx.clearRect(0, 0, cw, ch); if (fill) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); } ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, 0, 0, cw, ch); };
    draw(false);
    let blob = await toBlob(canvas, 'image/webp', 0.86);
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') { draw(true); blob = await toBlob(canvas, 'image/jpeg', 0.86); ext = 'jpg'; }
    if (url) URL.revokeObjectURL(url);
    if (src.close) src.close();
    if (!blob) return { error: 'open' };
    return { blob, ext, src: URL.createObjectURL(blob) };
  }
  async function onPrPhotos() {
    const input = $('#in-pr-photos');
    const files = Array.from(input.files || []);
    input.value = '';
    prErr('pr-photo', '');
    if (!files.length) return;
    const room = PR_MAX_PHOTOS - prPics.length;
    const notes = [];
    if (files.length > room) notes.push('That’s more than 6 in all, so I kept the first ' + plural(Math.max(0, room), 'one', 'ones') + '.');
    $('#pr-progress').hidden = false;
    $('#pr-progress').textContent = 'Getting your photos ready…';
    for (const f of files.slice(0, Math.max(0, room))) {
      if (f.size > PR_MAX_FILE) { notes.push('One of those is too big to open here. Try a smaller copy of it.'); continue; }
      const r = await shrinkPhoto(f);
      if (r.error === 'small') { notes.push('One of those is very small. A photo at least 200 pixels across looks best.'); continue; }
      if (r.error) { notes.push('One of those won’t open here. A JPEG or PNG photo works.'); continue; }
      prPics.push({ blob: r.blob, ext: r.ext, src: r.src });
    }
    $('#pr-progress').hidden = true;
    renderPrPhotos();
    if (notes.length) prErr('pr-photo', notes.join(' '));
  }
  function openProductForm(p) {
    const f = $('#f-pr');
    prEditing = p || null;
    prClearErrs();
    prPics.forEach((x) => { if (x.blob) URL.revokeObjectURL(x.src); });
    prPics = p ? p.photos.map((x) => ({ name: x.name, src: x.src })) : [];
    $('#pr-form-h').textContent = p ? 'Change ' + p.title : 'A new product';
    $('#in-pr-title').value = p ? p.title : '';
    $('#in-pr-blurb').value = p ? p.blurb : '';
    $('#in-pr-price').value = p ? dollars(p.price_cents) : '';
    $('#in-pr-one').checked = !!p && p.kind === 'one_of_a_kind';
    $('#in-pr-mto').checked = !!p && p.kind === 'made_to_order';
    $('#in-pr-own').checked = !p || p.option_stock || !p.options.length;
    $('#pr-opts').replaceChildren();
    if (p) p.options.forEach((o) => $('#pr-opts').append(optionRow(p.option_stock ? o : { name: o.name, stock: null })));
    const st = $('#in-pr-stock');
    st.value = p && p.kind === 'limited' && !p.option_stock && Number.isInteger(p.stock) ? String(p.stock) : '';
    if (st.value) st.dataset.was = st.value; else delete st.dataset.was;
    const status = !p ? 'draft' : p.state === 'scheduled' ? 'scheduled' : p.state === 'draft' ? 'draft' : 'live';
    document.querySelector('input[name="pr-status"][value="' + status + '"]').checked = true;
    $('#in-pr-drop').value = p ? p.drop_at : '';
    $('#pr-progress').hidden = true;
    renderPrPhotos();
    prSync();
    f.hidden = false;
    $('#b-pr-new').hidden = true;
    $('#b-pr-new').setAttribute('aria-expanded', 'true');
    renderProducts();
    $('#sec-products').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    focusEl($('#in-pr-title'), true);
  }
  function closeProductForm() {
    $('#f-pr').hidden = true;
    prPics.forEach((x) => { if (x.blob) URL.revokeObjectURL(x.src); });
    prPics = [];
    $('#b-pr-new').hidden = false;
    $('#b-pr-new').setAttribute('aria-expanded', 'false');
    renderProducts();
  }
  function keepProduct(p) {
    const i = prods.products.findIndex((x) => x.id === p.id);
    if (i >= 0) prods.products[i] = p; else prods.products.push(p);
  }
  async function onProductSave(ev) {
    ev.preventDefault();
    const btn = $('#b-pr-save');
    if (btn.disabled || prBusy) return;
    prClearErrs();
    const one = $('#in-pr-one').checked, mto = $('#in-pr-mto').checked;
    const kind = one ? 'one_of_a_kind' : mto ? 'made_to_order' : 'limited';
    const title = cleanLine($('#in-pr-title').value, 200);
    if (!title) { prErr('pr-title', 'A name for it, like Owl sticker.'); focusEl($('#in-pr-title')); return; }
    const price = toCents($('#in-pr-price').value);
    if (!price || price < 50) { prErr('pr-price', 'A price in dollars, like 28 or 6.50.'); focusEl($('#in-pr-price')); return; }
    const b = { title, blurb: cleanText($('#in-pr-blurb').value, 1200), price_cents: price, kind, status: prStatus() };
    if (prEditing) b.id = prEditing.id;
    const rows = one ? [] : $$('#pr-opts > li');
    const perOpt = kind === 'limited' && rows.length > 0 && $('#in-pr-own').checked;
    const count = (v) => { const s = String(v || '').trim(); return /^\d{1,5}$/.test(s) ? +s : null; };
    b.options = [];
    for (const li of rows) {
      const name = cleanLine(li.querySelector('.pr-opt-name').value, 40);
      if (!name) continue;
      const o = { name };
      if (perOpt) {
        const c = count(li.querySelector('.pr-opt-count').value);
        if (c === null) { prErr('pr-opts', 'How many of ' + name + ' you have, as a number (0 is fine).'); focusEl(li.querySelector('.pr-opt-count')); return; }
        o.stock = c;
        const was = li.querySelector('.pr-opt-count').dataset.was;
        if (was !== undefined && li.dataset.was === name) o.was = +was;
      }
      b.options.push(o);
    }
    if (kind === 'limited' && b.options.length) b.option_stock = perOpt;
    if (kind === 'limited' && !perOpt) {
      const raw = $('#in-pr-stock').value.trim();
      const c = count(raw);
      if (c === null && (raw || !prEditing)) { prErr('pr-stock', 'How many you have, as a number (0 is fine).'); focusEl($('#in-pr-stock')); return; }
      if (c !== null) { b.stock = c; if ($('#in-pr-stock').dataset.was !== undefined) b.stock_was = +$('#in-pr-stock').dataset.was; }
    }
    if (b.status === 'scheduled') {
      b.drop_at = $('#in-pr-drop').value || '';
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.drop_at)) { prErr('pr-drop', 'Pick a day and a time for it to go live.'); focusEl($('#in-pr-drop')); return; }
    }
    prBusy = true;
    setBusy(btn, true, 'Saving…');
    busy++;
    const progress = $('#pr-progress');
    let saved = null;
    try {
      const r = await prodApi.save(b);
      saved = cleanProduct(r && r.product);
      if (!saved) throw fail('server');
      prEditing = saved;
      keepProduct(saved);
      // then the photos: each new one sends on its own, and the order (and any taken off) is saved last
      const fresh = prPics.filter((x) => x.blob);
      let have = saved.photos.map((x) => x.name);
      for (let i = 0; i < prPics.length; i++) {
        const ph = prPics[i];
        if (!ph.blob) continue;
        progress.hidden = false;
        progress.textContent = 'Sending photo ' + (fresh.indexOf(ph) + 1) + ' of ' + fresh.length + '…';
        const r2 = await prodApi.photo(saved.id, ph.blob, 'photo.' + ph.ext);
        const name = r2 && r2.photo && str(r2.photo.name, 120);
        if (!name) throw fail('server');
        URL.revokeObjectURL(ph.src);
        prPics[i] = { name, src: prFileUrl(r2.photo.thumb) || prFileUrl(r2.photo.url) };
        saved = cleanProduct(r2.product) || saved;
        have = saved.photos.map((x) => x.name);
      }
      const want = prPics.map((x) => x.name);
      if (want.join('/') !== have.join('/')) {
        const r3 = await prodApi.photos(saved.id, want);
        saved = cleanProduct(r3 && r3.product) || saved;
      }
      keepProduct(saved);
      progress.hidden = true;
      closeProductForm();
      const row = $('#prs').querySelector('[data-product="' + saved.id + '"]');
      if (row) focusEl(row.querySelector('.pr-edit'), true);
      toast(saved.state === 'live' ? 'Saved. ' + saved.title + ' is on your site.' : saved.state === 'sold_out' ? 'Saved. ' + saved.title + ' shows as sold out.'
        : saved.state === 'scheduled' ? 'Saved. ' + saved.title + ' goes live ' + saved.drop_label + '.' : 'Saved. ' + saved.title + ' is a draft for now.');
    } catch (err) {
      progress.hidden = true;
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      if (saved) $('#pr-form-h').textContent = 'Change ' + saved.title;
      if (err.code === 'input' && err.msg) {
        const id = PR_ERRS[err.field] || 'pr';
        prErr(id, (saved && id === 'pr-photo' ? 'Saved, all but a photo. ' : '') + err.msg);
        if (PR_INPUTS[id]) focusEl($(PR_INPUTS[id]));
      } else prErr('pr', (saved ? 'Saved, but not every photo made it. ' : '') + words(err));
    } finally { prBusy = false; setBusy(btn, false); busy = Math.max(0, busy - 1); }
  }
  function wireProducts() {
    $('#b-pr-new').addEventListener('click', () => openProductForm(null));
    $('#b-pr-cancel').addEventListener('click', () => { const id = prEditing && prEditing.id; closeProductForm(); const row = id && $('#prs').querySelector('[data-product="' + id + '"]'); focusEl(row ? row.querySelector('.pr-edit') : $('#b-pr-new')); });
    $('#f-pr').addEventListener('submit', onProductSave);
    $('#in-pr-photos').addEventListener('change', onPrPhotos);
    $('#b-pr-opt-add').addEventListener('click', () => { const li = optionRow(null); $('#pr-opts').append(li); prSync(); focusEl(li.querySelector('.pr-opt-name')); });
    $('#in-pr-one').addEventListener('change', () => { if ($('#in-pr-one').checked) $('#in-pr-mto').checked = false; prSync(); });
    $('#in-pr-mto').addEventListener('change', () => { if ($('#in-pr-mto').checked) $('#in-pr-one').checked = false; prSync(); });
    $('#in-pr-own').addEventListener('change', prSync);
    $$('input[name="pr-status"]').forEach((r) => r.addEventListener('change', prSync));
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

  /* ---- your newsletter (Oct 12 2026) ----
     Only for a client whose newsletter runs on Web Faery's server (the server answers news: null for everyone else, and
     the section stays hidden). Four tabs, each with its own address (#newsletter-write, -sent, -people, -settings):
     write (drafts, a preview, a test to their own email, send now or at a time), sent (how many it reached), people
     (who is on the list, a CSV that is theirs), settings (where replies go, the mailing address the law asks for).
     Every call goes through newsCall, the one place this part signs in. The server side: hub DEPLOY.md section 64. */
  let nl = null;              // the overview as the server last sent it (cleaned)
  let nlBusy = false;
  let nlTab = 'write';
  let nlTabsReady = false;
  let nlEdit = null;          // the newsletter open in the editor: { id, status } (id '' until it is first saved)
  let nlDirty = false;
  let nlWhich = 'on';
  let nlPage = 1;
  let nlPeopleShown = false;
  const NL_TABS = ['write', 'sent', 'people', 'settings'];
  const NL_STATES = ['draft', 'scheduled', 'sending', 'sent', 'stopped'];
  const nlNum = (v) => Math.max(0, Math.floor(+v || 0));
  async function loadNews() {
    if (DEMO) { $('#sec-news').hidden = true; return; }
    if (nlBusy) return;
    nlBusy = true;
    try {
      nl = cleanNl(await newsCall('/overview'));
      renderNl();
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      if (!nl) $('#sec-news').hidden = true;
    } finally { nlBusy = false; }
  }
  function cleanNlRow(r) {
    if (!r || typeof r !== 'object' || !str(r.id) || !NL_STATES.includes(r.status)) return null;
    return { id: str(r.id, 20), subject: cleanLine(r.subject, 150), status: r.status, at: str(r.at, 30), total: nlNum(r.total), sent: nlNum(r.sent),
      failed: nlNum(r.failed), skipped: nlNum(r.skipped), by: r.by === 'taya' ? 'taya' : 'owner', wait: str(r.wait, 20), tested: str(r.tested, 30) };
  }
  function cleanNl(d) {
    d = d && typeof d === 'object' ? d : {};
    if (!d.news || typeof d.news !== 'object') return null;
    const n = d.news, l = n.list && typeof n.list === 'object' ? n.list : {}, c = n.counts && typeof n.counts === 'object' ? n.counts : {};
    const lim = n.limits && typeof n.limits === 'object' ? n.limits : {};
    return {
      list: { name: cleanLine(l.name, 120), business: cleanLine(l.business, 120), from: cleanLine(l.from, 300), reply_to: cleanLine(l.reply_to, 200),
        postal_address: cleanText(l.postal_address, 300), ready: !!l.ready, why: str(l.why, 20), address_missing: !!l.address_missing },
      counts: { on: nlNum(c.on), waiting: nlNum(c.waiting), left: nlNum(c.left), unreachable: nlNum(c.unreachable) },
      limits: { sends_left: nlNum(lim.sends_left), sends_7d: nlNum(lim.sends_7d) || 4, max_send: nlNum(lim.max_send) },
      working: arr(n.working).slice(0, 60).map(cleanNlRow).filter(Boolean),
      sent: arr(n.sent).slice(0, 30).map(cleanNlRow).filter(Boolean)
    };
  }
  // dates and times from the server (ISO), in this computer's own time
  const nlDate = (s) => { const t = Date.parse(str(s, 30)); return isNaN(t) ? null : new Date(t); };
  const nlDay = (s) => { const d = nlDate(s); return d ? MON[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== now.getFullYear() ? ', ' + d.getFullYear() : '') : ''; };
  const nlTime = (d) => { const h = d.getHours(); return (h % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM'); };
  const nlWhen = (s) => { const d = nlDate(s); return d ? DAYS[d.getDay()].slice(0, 3) + ', ' + nlDay(s) + ', ' + nlTime(d) : ''; };
  const NL_WAIT = {
    day_cap: ' It reached today’s sending limit and picks up by itself tomorrow.',
    throttle: ' Taking a short breather. It picks up in a minute.',
    paused: ' Paused for now. I’ve been told, and it picks up by itself once it’s sorted.',
    creds: ' Paused for now. I’ve been told, and it picks up by itself once it’s sorted.',
    sandbox: ' Paused for now. I’ve been told, and it picks up by itself once it’s sorted.',
    server: ' Paused for now. I’ve been told, and it picks up by itself once it’s sorted.',
    off: ' Paused for now. I’ve been told, and it picks up by itself once it’s sorted.',
    not_on: ' Waiting on your sending address. I’m on it.',
    domain: ' Waiting on your sending address. I’m on it.',
    address: ' Waiting for your mailing address (in Settings).'
  };
  function nlLine(r) {
    const wait = NL_WAIT[r.wait] || '';
    if (r.status === 'draft') return 'Draft, saved ' + nlDay(r.at) + '.' + (r.tested ? ' Test sent ' + nlDay(r.tested) + '.' : '');
    if (r.status === 'scheduled') return 'Goes out ' + nlWhen(r.at) + '.' + wait;
    if (r.status === 'sending') return 'Sending now: ' + r.sent + ' of ' + r.total + ' so far.' + wait;
    if (r.status === 'stopped') return 'Stopped ' + nlDay(r.at) + ' after ' + r.sent + ' of ' + r.total + '.';
    return 'Sent ' + nlDay(r.at) + ' to ' + plural(r.sent, 'person', 'people') + '.' +
      (r.failed ? ' ' + plural(r.failed, 'email', 'emails') + ' could not be delivered.' : '');
  }
  function renderNl() {
    const sec = $('#sec-news');
    if (!nl) { sec.hidden = true; return; }
    sec.hidden = false;
    const l = nl.list;
    const note = $('#nl-not-ready');
    note.textContent = l.ready ? '' : l.why === 'address'
      ? 'Add your mailing address in Settings before your first send. The law asks for one in every newsletter.'
      : 'Sending opens once I finish setting up your sending address. You can write and save drafts now.';
    note.hidden = l.ready;
    $('#nl-from').textContent = l.from ? 'Your newsletter comes from ' + l.from + '.' : '';
    $('#nl-from').hidden = !l.from;
    if (!$('#nl-working .nl-sure')) {
      $('#nl-working').replaceChildren(...nl.working.map((r) => nlRow(r, false)));
      $('#nl-working-empty').hidden = nl.working.length > 0;
    }
    $('#nl-sent').replaceChildren(...nl.sent.map((r) => nlRow(r, true)));
    $('#nl-sent-empty').hidden = nl.sent.length > 0;
    const c = nl.counts;
    $('#nl-counts').textContent = plural(c.on, 'person', 'people') + ' on your list.' +
      (c.waiting ? ' ' + c.waiting + ' waiting to confirm.' : '') + (c.left ? ' ' + c.left + ' left.' : '') +
      (c.unreachable ? ' ' + c.unreachable + ' can’t be reached.' : '');
    $('#nl-set-from').textContent = l.from ? l.from + '. I set up this address with you; email me to change it.' : 'I set up the address it comes from with you, on your own web address.';
    if (!$('#f-nl-set').contains(document.activeElement)) {
      $('#in-nl-reply').value = l.reply_to;
      $('#in-nl-postal').value = l.postal_address;
    }
    if (!$('#f-nl').hidden) nlSendWho();
    if (nlTab === 'people' && !nlPeopleShown) loadPeople(nlWhich, nlPage);
    if (!nlTabsReady) {
      nlTabsReady = true;
      const h = nlHashTab();
      if (h) { selectNlTab(h, false, true); requestAnimationFrame(() => sec.scrollIntoView({ block: 'start' })); }
    }
  }
  function nlRow(r, sent) {
    const li = make('li', 'order nl-row');
    li.dataset.issue = r.id;
    const head = make('div', 'o-head');
    head.append(make('span', 'o-what nl-subj', r.subject || 'No subject yet'));
    if (r.by === 'taya') head.append(make('span', 'o-date', 'From Taya'));
    li.append(head, make('p', 'o-opt nl-line', nlLine(r)));
    const act = make('div', 'o-act o-act2');
    const btn = (label, fn) => { const b = make('button', 'open-btn', label); b.type = 'button'; b.addEventListener('click', () => fn(b)); act.append(b); return b; };
    if (!sent && (r.status === 'draft' || r.status === 'scheduled')) btn(r.status === 'draft' ? 'Open' : 'Open and change', () => openNl(r.id));
    if (!sent && r.status === 'scheduled') sureBtn(btn, 'Don’t send it', 'Yes, back to drafts', () => nlStop(r, 'It won’t go out. It’s back in your drafts.'));
    if (!sent && r.status === 'sending') sureBtn(btn, 'Stop sending', 'Yes, stop it', () => nlStop(r, 'Stopped. Whoever didn’t get it yet won’t.'));
    if (!sent && r.status === 'draft') sureBtn(btn, 'Delete', 'Yes, delete it', () => nlRemove(r));
    if (act.childNodes.length) li.append(act);
    return li;
  }
  // a button that asks once more before it acts (the second tap does it; it settles back after a few seconds)
  function sureBtn(btn, label, sure, fn) {
    let armed = 0;
    const b = btn(label, async (el) => {
      if (!armed) {
        el.textContent = sure; el.classList.add('nl-sure');
        armed = setTimeout(() => { armed = 0; el.textContent = label; el.classList.remove('nl-sure'); }, 6000);
        return;
      }
      clearTimeout(armed); armed = 0;
      el.setAttribute('aria-busy', 'true');
      try { await fn(); } finally { el.removeAttribute('aria-busy'); el.classList.remove('nl-sure'); el.textContent = label; }
    });
    return b;
  }
  async function nlStop(r, said) {
    try { await newsCall('/stop', { id: r.id }); toast(said); await loadNews(); } catch (e) { if (e.code === 'signed_out') { quietSignOut(true); return; } toast(nlWords(e)); }
  }
  async function nlRemove(r) {
    try { await newsCall('/remove', { id: r.id }); toast('Deleted.'); await loadNews(); focusEl($('#b-nl-new'), true); } catch (e) { if (e.code === 'signed_out') { quietSignOut(true); return; } toast(nlWords(e)); }
  }

  // ---- the tabs
  const nlHashTab = () => { const m = /^#newsletter-([a-z]+)$/.exec(location.hash || ''); return m && NL_TABS.includes(m[1]) ? m[1] : ''; };
  function selectNlTab(key, focus, fromHash) {
    if (!NL_TABS.includes(key)) key = 'write';
    nlTab = key;
    $$('#sec-news .nl-tab').forEach((t) => {
      const on = t.dataset.tab === key;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    $$('#sec-news .nl-panel').forEach((p) => { p.hidden = p.id !== 'nl-p-' + key; });
    if (!fromHash) { try { history.replaceState(null, '', location.pathname + location.search + '#newsletter-' + key); } catch (e) { /* fine */ } }
    if (focus) focusEl($('#nl-tab-' + key));
    if (key === 'people' && nl) loadPeople(nlWhich, nlPage);
  }
  function onNlTabKey(ev) {
    const i = NL_TABS.indexOf(nlTab);
    let n = -1;
    if (ev.key === 'ArrowRight') n = (i + 1) % NL_TABS.length;
    else if (ev.key === 'ArrowLeft') n = (i + NL_TABS.length - 1) % NL_TABS.length;
    else if (ev.key === 'Home') n = 0;
    else if (ev.key === 'End') n = NL_TABS.length - 1;
    if (n < 0) return;
    ev.preventDefault();
    selectNlTab(NL_TABS[n], true, false);
  }

  // ---- what people read when something goes sideways here
  function nlWords(e) {
    const w = e && e.why;
    if (e && e.code === 'input' && e.field === 'postal_address') return 'Add your full mailing address, with the street number or PO box.';
    if (e && e.code === 'input' && e.field === 'reply_to') return 'That email doesn’t look quite right. Check for a little typo?';
    if (w === 'not_ready') return 'Sending opens once I finish setting up your sending address. Your draft is saved.';
    if (w === 'address') return 'Add your mailing address in Settings first. The law asks for one in every newsletter.';
    if (w === 'no_people') return 'No one has confirmed yet, so there’s no one to send to. Once people sign up on your site, it’s ready.';
    if (w === 'limit') return 'That’s ' + ((nl && nl.limits.sends_7d) || 4) + ' sends this week already. Need one more? Email me at ' + TAYA + ' and I’ll send it for you.';
    if (w === 'too_many') return 'Your list is bigger than one send can take here. Email me at ' + TAYA + ' and I’ll send it for you.';
    if (w === 'not_draft' || w === 'not_sending') return 'That one has already gone out. Try refreshing the page.';
    if (w === 'too_many_drafts') return 'That’s a lot of drafts. Delete one you don’t need, then try again.';
    if (w === 'not_sent') return 'The test didn’t go out. Try again in a little while.';
    if (w === 'no_email') return 'I don’t have an email for you to send the test to. Email me and I’ll fix that.';
    if (e && e.code === 'input' && e.field === 'subject') return e.why === 'too_long' ? 'That subject is a bit long. Keep it under 150 letters.' : 'Add a subject first.';
    if (e && e.code === 'input' && e.field === 'body') return e.why === 'too_long' ? 'That’s more words than one newsletter can hold. Try splitting it in two.' : 'Add your words first.';
    if (e && e.code === 'input' && e.field === 'at') return 'Choose a day and time from now up to 60 days ahead.';
    return words(e);
  }

  // ---- the editor
  const nlFields = () => ({ subject: cleanLine($('#in-nl-subject').value, 150), preheader: cleanLine($('#in-nl-pre').value, 150), body: cleanText($('#in-nl-body').value, 20000) });
  function nlErr(id, text) {
    const p = $('#nl-' + id + '-err');
    if (!p) return;
    p.textContent = text || '';
    p.hidden = !text;
    const input = { subject: '#in-nl-subject', body: '#in-nl-body', send: null, reply: '#in-nl-reply', postal: '#in-nl-postal' }[id];
    if (input) { if (text) $(input).setAttribute('aria-invalid', 'true'); else $(input).removeAttribute('aria-invalid'); }
  }
  function nlBodyCount() {
    const n = $('#in-nl-body').value.length;
    $('#nl-body-count').textContent = n > 16000 ? (20000 - n) + ' letters left' : '';
    $('#nl-body-count').classList.toggle('near', n > 18000);
  }
  function nlSendWho() {
    const n = nl ? nl.counts.on : 0;
    $('#nl-send-who').textContent = n ? 'It goes to the ' + plural(n, 'person', 'people') + ' on your list, each with their own link to leave.' : 'No one has confirmed yet. Once people sign up on your site, you can send.';
  }
  async function openNl(id) {
    ['subject', 'body', 'send'].forEach((k) => nlErr(k, ''));
    $('#nl-preview').hidden = true;
    $('#nl-confirm').hidden = true;
    $('#nl-saved').textContent = '';
    if (id) {
      try {
        const d = await newsCall('/issue', { id });
        const r = d && d.issue ? d.issue : null;
        if (!r) throw fail('not_found');
        $('#in-nl-subject').value = cleanLine(r.subject, 150);
        $('#in-nl-pre').value = cleanLine(r.preheader, 150);
        $('#in-nl-body').value = cleanText(r.body, 20000);
        nlEdit = { id: str(r.id, 20), status: str(r.status, 12) };
      } catch (e) { if (e.code === 'signed_out') { quietSignOut(true); return; } toast(nlWords(e)); return; }
    } else {
      $('#in-nl-subject').value = ''; $('#in-nl-pre').value = ''; $('#in-nl-body').value = '';
      nlEdit = { id: '', status: 'draft' };
    }
    nlDirty = false;
    $('input[name="nl-when"][value="now"]').checked = true;
    $('#nl-later').hidden = true;
    $('#nl-ed-h').textContent = id ? 'Your newsletter' : 'A new newsletter';
    nlBodyCount();
    nlSendWho();
    $('#nl-list-view').hidden = true;
    $('#f-nl').hidden = false;
    focusEl($('#nl-ed-h'));
  }
  function closeNl() {
    $('#f-nl').hidden = true;
    $('#nl-list-view').hidden = false;
    nlEdit = null;
    nlDirty = false;
    loadNews();
    focusEl($('#b-nl-new'), true);
  }
  // Save what is in the editor (quietly before a test or a send). -> true when saved
  async function nlSave(quiet) {
    if (!nlEdit) return false;
    nlErr('subject', ''); nlErr('body', '');
    const f = nlFields();
    const d = await newsCall('/save', Object.assign(nlEdit.id ? { id: nlEdit.id } : {}, f));
    const r = d && d.issue ? d.issue : null;
    if (!r || !str(r.id)) throw fail('server');
    nlEdit = { id: str(r.id, 20), status: str(r.status, 12) };
    nlDirty = false;
    if (!quiet) $('#nl-saved').textContent = 'Saved. It’s in your drafts until you send it.';
    return true;
  }
  async function onNlSave(ev) {
    ev.preventDefault();
    const btn = $('#b-nl-save');
    setBusy(btn, true, 'Saving…');
    try { await nlSave(false); loadNews(); }
    catch (e) { nlShowErr(e); }
    finally { setBusy(btn, false); }
  }
  function nlShowErr(e) {
    if (e.code === 'signed_out') { quietSignOut(true); return; }
    const t = nlWords(e);
    if (e.field === 'subject') { nlErr('subject', t); focusEl($('#in-nl-subject')); }
    else if (e.field === 'body') { nlErr('body', t); focusEl($('#in-nl-body')); }
    else { nlErr('send', t); }
  }
  async function onNlPreview() {
    const btn = $('#b-nl-preview');
    btn.setAttribute('aria-busy', 'true');
    try {
      const d = await newsCall('/preview', nlFields());
      renderPreview(d && d.preview);
      focusEl($('#nl-preview'));
    } catch (e) { nlShowErr(e); }
    finally { btn.removeAttribute('aria-busy'); }
  }
  // the preview: built from the server's blocks with text only (no HTML from anywhere reaches the page)
  function renderPreview(p) {
    const box = $('#nl-preview');
    if (!p || typeof p !== 'object') { box.hidden = true; return; }
    const acc = /^#[0-9a-f]{6}$/i.test(str(p.accent, 7)) ? str(p.accent, 7) : '';  // their color, already checked to read on white
    const runs = (rs, el) => {
      arr(rs).slice(0, 200).forEach((r) => {
        if (!r || typeof r.x !== 'string') return;
        const u = safeUrl(r.u);
        if (u) { const a = make('a', null, r.x.slice(0, 1500)); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; if (acc) a.style.color = acc; el.append(a); }
        else el.append(r.x.slice(0, 4000));
      });
      return el;
    };
    const head = make('div', 'nl-pv-head');
    head.append(make('p', 'nl-pv-meta', 'From: ' + cleanLine(p.from, 300)), make('p', 'nl-pv-meta', 'Subject: ' + (cleanLine(p.subject, 150) || 'No subject yet')));
    if (p.preheader) head.append(make('p', 'nl-pv-meta nl-pv-pre', 'Preview line: ' + cleanLine(p.preheader, 150)));
    const card = make('div', 'nl-pv-card');
    const biz = make('p', 'nl-pv-biz', cleanLine(p.business, 120));
    if (acc) biz.style.color = acc;
    card.append(biz);
    arr(p.blocks).slice(0, 400).forEach((b) => {
      if (!b || typeof b !== 'object') return;
      if (b.t === 'h') card.append(runs(b.runs, make('h4', 'nl-pv-h')));
      else if (b.t === 'ul') { const ul = make('ul', 'nl-pv-ul'); arr(b.items).slice(0, 200).forEach((i) => ul.append(runs(i, make('li')))); card.append(ul); }
      else if (b.t === 'p') {
        const para = make('p', 'nl-pv-p');
        arr(b.lines).slice(0, 200).forEach((ln, i) => { if (i) para.append(make('br')); runs(ln, para); });
        card.append(para);
      }
    });
    if (!arr(p.blocks).length) card.append(make('p', 'nl-pv-p nl-pv-empty', 'Your words show up here.'));
    const f = p.footer && typeof p.footer === 'object' ? p.footer : {};
    const foot = make('div', 'nl-pv-foot');
    foot.append(make('p', null, cleanLine(f.reason, 400)), make('p', null, cleanLine(f.address, 400)), make('p', 'nl-pv-leave', cleanLine(f.leave, 40)));
    card.append(foot);
    box.replaceChildren(make('h4', 'small-h nl-pv-title', 'Preview'), head, card);
    box.hidden = false;
  }
  async function onNlTest() {
    const btn = $('#b-nl-test');
    btn.setAttribute('aria-busy', 'true');
    nlErr('send', '');
    try {
      await nlSave(true);
      const d = await newsCall('/test', { id: nlEdit.id });
      toast('Test sent to ' + cleanLine(d && d.to, 200) + '. It can take a minute to arrive.');
      $('#nl-saved').textContent = 'Saved, and a test is on its way to you.';
    } catch (e) { nlShowErr(e); }
    finally { btn.removeAttribute('aria-busy'); }
  }
  const nlLater = () => { const r = document.querySelector('input[name="nl-when"]:checked'); return !!r && r.value === 'later'; };
  function nlAt() {
    if (!nlLater()) return '';
    const v = $('#in-nl-at').value;
    const t = v ? new Date(v) : null;
    return t && !isNaN(t.getTime()) ? t.toISOString() : 'bad';
  }
  function onNlSendAsk() {
    nlErr('send', '');
    const f = nlFields();
    if (!f.subject) { nlErr('subject', 'Add a subject first.'); focusEl($('#in-nl-subject')); return; }
    if (!f.body) { nlErr('body', 'Add your words first.'); focusEl($('#in-nl-body')); return; }
    const at = nlAt();
    if (at === 'bad') { nlErr('send', 'Choose a day and a time.'); focusEl($('#in-nl-at')); return; }
    const n = nl ? nl.counts.on : 0;
    $('#nl-confirm-text').textContent = 'Send “' + f.subject + '” to ' + plural(n, 'person', 'people') + (at ? ' on ' + nlWhen(at) : ' now') + '?';
    $('#nl-confirm').hidden = false;
    focusEl($('#b-nl-yes'));
  }
  async function onNlSend() {
    const btn = $('#b-nl-yes');
    setBusy(btn, true, 'Sending…');
    try {
      await nlSave(true);
      const at = nlAt();
      const d = await newsCall('/send', at && at !== 'bad' ? { id: nlEdit.id, at } : { id: nlEdit.id });
      const r = d && d.issue ? cleanNlRow(d.issue) : null;
      toast(at && r ? 'Scheduled. It goes out ' + nlWhen(r.at) + '.' : 'On its way! It goes out over the next few minutes.', 7000);
      $('#nl-confirm').hidden = true;
      closeNl();
    } catch (e) { $('#nl-confirm').hidden = true; nlShowErr(e); focusEl($('#nl-send-err')); }
    finally { setBusy(btn, false); }
  }

  // ---- people
  async function loadPeople(which, page) {
    nlWhich = which; nlPage = page;
    try {
      const d = await newsCall('/people', { which, page });
      const ppl = arr(d && d.people).slice(0, 100).map((p) => (p && typeof p.email === 'string' ? { email: cleanLine(p.email, 200), since: str(p.since, 30), why: str(p.why, 12) } : null)).filter(Boolean);
      const pages = Math.max(1, nlNum(d && d.pages)), pg = Math.min(pages, Math.max(1, nlNum(d && d.page)));
      nlPage = pg;
      nlPeopleShown = true;
      const verb = { on: 'joined', waiting: 'signed up', left: 'left', unreachable: '' }[which] || '';
      $('#nl-people').replaceChildren(...ppl.map((p) => {
        const li = make('li', 'nl-person');
        li.append(make('span', 'nl-p-email', p.email));
        const when = p.why === 'complaint' ? 'marked a newsletter as spam' : p.why === 'bounce' ? 'their inbox turned it away' : (verb ? verb + ' ' + nlDay(p.since) : '');
        if (when) li.append(make('span', 'nl-p-when', when));
        return li;
      }));
      $('#nl-people-empty').hidden = ppl.length > 0;
      $('#nl-people-empty-text').textContent = { on: 'No one on your list yet. People join from the sign-up box on your site.', waiting: 'No one is waiting to confirm.', left: 'No one has left. Lovely.', unreachable: 'Everyone can be reached.' }[which] || '';
      $('#nl-pager').hidden = pages < 2;
      $('#nl-page').textContent = 'Page ' + pg + ' of ' + pages;
      $('#b-nl-prev').disabled = pg <= 1;
      $('#b-nl-next').disabled = pg >= pages;
    } catch (e) { if (e.code === 'signed_out') { quietSignOut(true); return; } toast(nlWords(e)); }
  }
  async function onNlCsv() {
    const btn = $('#b-nl-csv');
    if (btn.getAttribute('aria-busy')) return;
    btn.setAttribute('aria-busy', 'true');
    try {
      const res = await post('/export', {}, token, NEWS);
      if (!res.ok) throw errorFrom(res.status, await res.json().catch(() => ({})));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter-list-' + todayISO + '.csv';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) { if (e.code === 'signed_out') { quietSignOut(true); return; } toast(nlWords(e)); }
    finally { btn.removeAttribute('aria-busy'); }
  }

  // ---- settings
  async function onNlSet(ev) {
    ev.preventDefault();
    nlErr('reply', ''); nlErr('postal', '');
    const reply = cleanLine($('#in-nl-reply').value, 200);
    const postal = cleanText($('#in-nl-postal').value, 300);
    if (reply && !EMAIL_RE.test(reply)) { nlErr('reply', 'That email doesn’t look quite right. Check for a little typo?'); focusEl($('#in-nl-reply')); return; }
    const btn = $('#b-nl-set');
    setBusy(btn, true, 'Saving…');
    try {
      await newsCall('/settings', { reply_to: reply, postal_address: postal });
      toast('Saved.');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      await loadNews();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(true); return; }
      if (e.field === 'reply_to') { nlErr('reply', nlWords(e)); focusEl($('#in-nl-reply')); }
      else if (e.field === 'postal_address') { nlErr('postal', nlWords(e)); focusEl($('#in-nl-postal')); }
      else toast(nlWords(e));
    } finally { setBusy(btn, false); }
  }

  function wireNews() {
    $$('#sec-news .nl-tab').forEach((t) => {
      t.addEventListener('click', () => selectNlTab(t.dataset.tab, false, false));
      t.addEventListener('keydown', onNlTabKey);
    });
    window.addEventListener('hashchange', () => { const h = nlHashTab(); if (h && nl) { selectNlTab(h, false, true); $('#sec-news').scrollIntoView({ block: 'start' }); } });
    $('#b-nl-new').addEventListener('click', () => { if (nl) openNl(''); });
    $('#b-nl-close').addEventListener('click', closeNl);
    $('#f-nl').addEventListener('submit', onNlSave);
    $('#b-nl-preview').addEventListener('click', onNlPreview);
    $('#b-nl-test').addEventListener('click', onNlTest);
    $('#b-nl-send').addEventListener('click', onNlSendAsk);
    $('#b-nl-yes').addEventListener('click', onNlSend);
    $('#b-nl-no').addEventListener('click', () => { $('#nl-confirm').hidden = true; focusEl($('#b-nl-send')); });
    ['#in-nl-subject', '#in-nl-pre', '#in-nl-body'].forEach((s) => $(s).addEventListener('input', () => { nlDirty = true; $('#nl-saved').textContent = ''; }));
    $('#in-nl-body').addEventListener('input', nlBodyCount);
    $$('input[name="nl-when"]').forEach((r) => r.addEventListener('change', () => {
      $('#nl-later').hidden = !nlLater();
      if (nlLater()) {
        const t = new Date(Date.now() + 60 * 60000);
        const local = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        $('#in-nl-at').min = local(new Date());
        $('#in-nl-at').max = local(new Date(Date.now() + 59 * 86400000));
        if (!$('#in-nl-at').value) $('#in-nl-at').value = local(t);
      }
    }));
    $('#in-nl-which').addEventListener('change', () => loadPeople($('#in-nl-which').value, 1));
    $('#b-nl-prev').addEventListener('click', () => loadPeople(nlWhich, nlPage - 1));
    $('#b-nl-next').addEventListener('click', () => loadPeople(nlWhich, nlPage + 1));
    $('#b-nl-csv').addEventListener('click', onNlCsv);
    $('#f-nl-set').addEventListener('submit', onNlSet);
  }

  /* ---- gift certificates (Oct 10 2026) ----
     Only for a client whose site sells gift certificates through Web Faery's server (the server answers gifts: null
     for everyone else, and the section stays hidden). Look up a code, see what is left on it, record what was used
     (part or all). The server checks the code is theirs, and refuses more than the balance. */
  let gifts = null;          // { business, test, outstanding, recent: [...] } (cleaned)
  let giftNow = null;        // the certificate on screen (cleaned)
  let giftNonce = '';
  const GIFT_STATES = ['paid', 'sent', 'partly_redeemed', 'redeemed', 'refunded', 'pending', 'canceled'];
  async function loadGifts() {
    if (DEMO) { $('#sec-gifts').hidden = true; return; }
    try {
      const d = await api.giftOwner();
      gifts = cleanGifts(d);
      renderGifts();
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(false); return; }
      if (!gifts) $('#sec-gifts').hidden = true;
    }
  }
  function cleanGifts(d) {
    const g = d && typeof d === 'object' && d.gifts && typeof d.gifts === 'object' ? d.gifts : null;
    if (!g) return null;
    return {
      test: !!g.test, outstanding: str(g.outstanding, 20),
      recent: arr(g.recent).slice(0, 30).map((r) => (r && typeof r === 'object' ? {
        code_end: str(r.code_end, 4), bought_on: str(r.bought_on, 10), amount: str(r.amount, 20), balance: str(r.balance, 20),
        status: GIFT_STATES.includes(r.status) ? r.status : 'paid', words: str(r.status_words, 40), to: str(r.to, 120), by: str(r.by, 120)
      } : null)).filter(Boolean)
    };
  }
  function cleanGift(x) {
    if (!x || typeof x !== 'object' || !str(x.code)) return null;
    const int = (v) => (Number.isInteger(+v) && +v >= 0 ? +v : 0);
    return {
      code: str(x.code, 14), amount: str(x.amount, 20), balance: str(x.balance, 20), balance_cents: int(x.balance_cents),
      status: GIFT_STATES.includes(x.status) ? x.status : 'paid', words: str(x.status_words, 40), usable: !!x.usable, test: !!x.test,
      bought_on: str(x.bought_on, 10), buyer_name: str(x.buyer_name, 120), buyer_email: str(x.buyer_email, 200),
      recipient_name: str(x.recipient_name, 120), recipient_email: str(x.recipient_email, 200), message: str(x.message, 600),
      send_on: str(x.send_on, 10), sent_on: str(x.sent_on, 10), expires_on: str(x.expires_on, 10), cash_note: !!x.cash_note,
      redemptions: arr(x.redemptions).slice(0, 200).map((r) => ({ day: str(r && r.day, 10), amount: str(r && r.amount, 20), note: str(r && r.note, 200), left: str(r && r.left, 20) }))
    };
  }
  function renderGifts() {
    const sec = $('#sec-gifts');
    if (!gifts) { sec.hidden = true; return; }
    sec.hidden = false;
    $('#gifts-test').hidden = !gifts.test;
    $('#gifts-empty').hidden = gifts.recent.length > 0;
    const out = $('#gifts-out');
    out.textContent = gifts.recent.length ? 'Still to be used, in all: ' + gifts.outstanding + '.' : '';
    out.hidden = !gifts.recent.length;
    $('#gifts').replaceChildren(...gifts.recent.map((r) => {
      const li = make('li', 'dc gift-row st-' + r.status);
      const head = make('div', 'dc-head');
      head.append(make('span', 'dc-name', '••••' + r.code_end), make('span', 'dc-off', r.balance === r.amount ? r.amount : r.balance + ' of ' + r.amount));
      li.append(head, make('p', 'dc-meta', [shortDate(r.bought_on), r.to ? 'For ' + r.to : (r.by ? 'Bought by ' + r.by : ''), r.words].filter(Boolean).join(' · ')));
      return li;
    }));
  }
  // what the code box takes: letters and numbers, shown in its three groups
  const giftCodeOf = (v) => {
    const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 10 ? s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8) : '';
  };
  const giftErr = (text) => {
    const p = $('#gift-code-err');
    p.textContent = text || '';
    p.hidden = !text;
    if (text) $('#in-gift-code').setAttribute('aria-invalid', 'true'); else $('#in-gift-code').removeAttribute('aria-invalid');
  };
  async function onGiftFind(ev) {
    ev.preventDefault();
    const code = giftCodeOf($('#in-gift-code').value);
    giftErr('');
    if (!code) { giftErr('A code has 10 letters and numbers, like ABCD-EFGH-JK.'); focusEl($('#in-gift-code')); return; }
    const btn = $('#b-gift-find');
    setBusy(btn, true, 'Looking…');
    busy++;
    try {
      const d = await api.giftLookup(code);
      giftNow = cleanGift(d && d.gift);
      giftNonce = newNonce().replace(/[^A-Za-z0-9]/g, '');
      renderGiftCard(true);
    } catch (err) {
      if (err.code === 'signed_out') { quietSignOut(true); return; }
      $('#gift-card').hidden = true;
      giftNow = null;
      giftErr(err.code === 'not_found' ? 'That code isn’t one of your certificates. Check the letters, and ask to see the email it came in.'
        : err.code === 'input' ? 'A code has 10 letters and numbers, like ABCD-EFGH-JK.' : words(err));
      focusEl($('#in-gift-code'));
    } finally { setBusy(btn, false); busy = Math.max(0, busy - 1); }
  }
  function renderGiftCard(moveFocus) {
    const card = $('#gift-card');
    const g = giftNow;
    if (!g) { card.hidden = true; return; }
    card.hidden = false;
    card.className = 'gift-card st-' + g.status;
    const head = make('div', 'gift-head');
    head.append(make('span', 'gift-code', g.code), make('span', 'gift-state', g.words));
    const bal = make('p', 'gift-bal');
    bal.append(make('span', 'gift-left', g.balance), make('span', 'gift-of', ' left of ' + g.amount));
    const who = [g.recipient_name ? 'For ' + g.recipient_name : '', g.buyer_name ? 'From ' + g.buyer_name : '', g.bought_on ? 'Bought ' + shortDate(g.bought_on) : '',
      g.expires_on ? 'Good through ' + shortDate(g.expires_on) : 'No expiry date'].filter(Boolean).join(' · ');
    const parts = [head, bal, make('p', 'dc-meta', who)];
    if (g.test) parts.push(make('p', 'gift-note', 'A test certificate: no real money.'));
    if (g.cash_note) parts.push(make('p', 'gift-note', 'Under $15 left: in California they can ask for it in cash instead. If you pay it out, record it here as used.'));
    if (g.usable) {
      const f = make('form', 'gift-use');
      f.noValidate = true;
      const lab = make('label', 'field-label', 'Amount they used');
      lab.htmlFor = 'in-gift-amt';
      const row = make('div', 'dc-amt');
      const pre = make('span', null, '$');
      pre.setAttribute('aria-hidden', 'true');
      const amt = make('input');
      amt.type = 'text'; amt.id = 'in-gift-amt'; amt.className = 'keeps'; amt.inputMode = 'decimal'; amt.maxLength = 9; amt.autocomplete = 'off';
      amt.setAttribute('aria-describedby', 'gift-amt-err');
      row.append(pre, amt);
      const all = make('button', 'later', 'Use all of it (' + g.balance + ')');
      all.type = 'button';
      all.addEventListener('click', () => { amt.value = (g.balance_cents / 100).toFixed(g.balance_cents % 100 ? 2 : 0); amt.focus(); });
      const nl = make('label', 'field-label', 'A note for yourself ');
      nl.htmlFor = 'in-gift-note';
      nl.append(make('span', 'opt-tag', '(optional)'));
      const note = make('input');
      note.type = 'text'; note.id = 'in-gift-note'; note.className = 'keeps'; note.maxLength = 200; note.autocomplete = 'off';
      note.placeholder = 'Like: a massage, or paid out in cash';
      const err = make('p', 'err', '');
      err.id = 'gift-amt-err';
      err.hidden = true;
      const btns = make('div', 'dc-btns');
      const save = make('button', 'btn small');
      save.type = 'submit';
      save.append(make('span', null, 'Record it'));
      btns.append(save, all);
      f.append(lab, row, nl, note, err, btns);
      f.addEventListener('submit', (ev) => { ev.preventDefault(); onGiftRedeem(amt, note, err, save); });
      parts.push(f);
    } else if (g.status === 'redeemed') parts.push(make('p', 'gift-note', 'This one is used up.'));
    else if (g.status === 'refunded') parts.push(make('p', 'gift-note', 'This one was refunded, so it can’t be used.'));
    else if (g.status === 'pending') parts.push(make('p', 'gift-note', 'This one isn’t paid yet, so it can’t be used.'));
    else if (g.expires_on) parts.push(make('p', 'gift-note', 'This one is past its date.'));
    if (g.redemptions.length) {
      const h = make('h3', 'small-h', 'Used so far');
      const ul = make('ul', 'gift-uses');
      g.redemptions.slice().reverse().forEach((r) => {
        const li = make('li');
        li.append(make('span', 'gift-use-what', shortDate(r.day) + ': ' + r.amount + (r.note ? ', ' + r.note : '')), make('span', 'gift-use-left', r.left + ' left'));
        ul.append(li);
      });
      parts.push(h, ul);
    }
    card.replaceChildren(...parts);
    if (moveFocus) focusEl(card);
  }
  async function onGiftRedeem(amt, note, err, save) {
    const g = giftNow;
    if (!g) return;
    const show = (t) => { err.textContent = t || ''; err.hidden = !t; if (t) amt.setAttribute('aria-invalid', 'true'); else amt.removeAttribute('aria-invalid'); };
    show('');
    const cents = toCents(amt.value);
    if (!cents) { show('How much they used, in dollars, like 25 or 12.50.'); amt.focus(); return; }
    if (cents > g.balance_cents) { show('That’s more than is left (' + g.balance + ').'); amt.focus(); return; }
    setBusy(save, true, 'Saving…');
    busy++;
    try {
      const d = await api.giftRedeem({ code: g.code, cents, note: cleanLine(note.value, 200), nonce: giftNonce });
      giftNow = cleanGift(d && d.gift);
      giftNonce = newNonce().replace(/[^A-Za-z0-9]/g, '');
      renderGiftCard(true);
      announce('Recorded. ' + (giftNow ? giftNow.balance + ' left on it.' : ''));
      loadGifts();
    } catch (e) {
      if (e.code === 'signed_out') { quietSignOut(true); return; }
      show(e.code === 'over_balance' ? 'That’s more than is left on it. Look it up again to see the balance.'
        : e.code === 'refunded' ? 'This one was refunded, so it can’t be used.'
        : e.code === 'expired' ? 'This one is past its date.'
        : e.code === 'not_paid' ? 'This one isn’t paid yet.' : words(e));
      amt.focus();
    } finally { if (document.body.contains(save)) setBusy(save, false); busy = Math.max(0, busy - 1); }
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
    wireProducts(); // the Products card (Oct 10 2026)
    $('#f-gift').addEventListener('submit', onGiftFind);
    wireBookings();
    wireNews();
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
