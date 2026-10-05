/* The little script on a client's own website that fills in the spots Taya keeps current for them (hours,
   banner, prices, events, photos), read from the portal server. Clients email Taya their changes; there is
   no do-it-yourself editing (retired Oct 5 2026). One line on their site:

     <script src="https://webfaery.love/content.js" data-site="amber" defer></script>

   It reads https://bookings.gardenfaery.love/api/webfaery/portal/content/amber (public, cached a minute)
   and fills whatever spots the page has marked. The page's own HTML is the fallback: if the read fails
   (offline, server down), nothing is touched, so search engines and slow phones still see real words.

     data-wf="hours"            the week: a simple list, or fills child [data-day="mon"] ... [data-day="sun"]
     data-wf="hours-note"       the hours note (or "Closed through ..." while a closure is on)
     data-wf="banner"           the banner (optional children [data-wf="banner-text"], a[data-wf="banner-link"]);
                                hidden when off. Shows a closure, or "Next up: ..." when the client asked for that.
     data-wf-price="ID"         a price
     data-wf="phone" / "email"  text, and the href when it's a link (tel:, mailto:); hidden when empty
     data-wf="address"          the address, a line each
     data-wf-social="instagram" (an <a>) the href; hidden when empty
     data-wf="events"           the events coming up, as a list ([data-wf-empty] child shows when there are none)
     data-wf="featured-event"   one big card: the flyer shown whole, then title, date, time, place, a link
     data-wf="booking"          (an <a>) the href, on every one
     img[data-wf-photo="hero"]  a photo Taya swapped in (src and srcset)

   Everything goes in as text (never as HTML), and only https links ever become links. No cookies, no
   tracking, nothing sent about the visitor. On a dev machine, data-api="http://127.0.0.1:PORT/api/webfaery/portal"
   points it at a local test server (only https or this computer). */
(function () {
  'use strict';
  if (window.__wfContent) return; window.__wfContent = true;

  var me = document.currentScript || document.querySelector('script[data-site][src*="content.js"]');
  if (!me) return;
  var site = String(me.getAttribute('data-site') || '');
  if (!/^[a-z0-9-]{1,40}$/.test(site)) return;
  var api = String(me.getAttribute('data-api') || 'https://bookings.gardenfaery.love/api/webfaery/portal').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[A-Za-z0-9\/_-]*)?$/i.test(api) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[A-Za-z0-9\/_-]*)?$/.test(api)) return;
  var origin = api.replace(/^(https?:\/\/[^\/]+).*$/, '$1');

  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var SOCIAL_NAMES = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', etsy: 'Etsy', depop: 'Depop', ebay: 'eBay', linkedin: 'LinkedIn', other: 'Link' };

  var s = function (v, max) { return (typeof v === 'string' ? v : '').slice(0, max || 400); };
  var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var el = function (tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  var https = function (u) { u = s(u, 400).trim(); return /^https:\/\/[^\s"'<>\\]+$/i.test(u) ? u : ''; };
  var fileUrl = function (p) { p = s(p, 600); return /^\/api\/files\/[A-Za-z0-9_]+\/[a-z0-9]{15}\/[A-Za-z0-9._-]+(\?thumb=\d{1,4}x\d{1,4})?$/.test(p) ? origin + p : ''; };
  var show = function (x, on) { if (on) x.removeAttribute('hidden'); else x.setAttribute('hidden', ''); if (!on) x.style.display = 'none'; else if (x.style.display === 'none') x.style.display = ''; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var now = new Date();
  var today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  // "17:30" -> "5:30 PM"
  function clock(t) {
    var m = /^(\d{2}):(\d{2})$/.exec(s(t));
    if (!m) return '';
    var h = +m[1];
    return (h % 12 || 12) + (m[2] === '00' ? '' : ':' + m[2]) + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  // "2026-10-12" -> "Sat, Oct 12"; a range -> "Oct 12 to 14" or "Oct 30 to Nov 2"
  function parts(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s(d)); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function niceDay(d) {
    var p = parts(d);
    if (!p) return '';
    var w = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
    return WEEK[w] + ', ' + MON[p.m - 1] + ' ' + p.d + (p.y !== now.getFullYear() ? ', ' + p.y : '');
  }
  function niceRange(a, b) {
    var p = parts(a), q = parts(b);
    if (!p) return '';
    if (!q || b === a) return niceDay(a);
    return MON[p.m - 1] + ' ' + p.d + ' to ' + (q.m === p.m && q.y === p.y ? '' : MON[q.m - 1] + ' ') + q.d + (q.y !== now.getFullYear() ? ', ' + q.y : '');
  }
  function dayLine(d) {
    if (!d || d.closed) return 'Closed';
    if (d.appt) return 'By appointment';
    var o = clock(d.open), c = clock(d.close);
    return o && c ? o + ' to ' + c : 'Closed';
  }
  function closedLine(c) { return 'Closed through ' + niceDay(c.to) + (c.note ? ': ' + c.note : ''); }

  // a link (only https) around some text, or the text alone
  function setLink(a, href) {
    if (href) { a.setAttribute('href', href); if (!/^#/.test(href)) { a.setAttribute('rel', 'noopener'); } show(a, true); }
    else { a.removeAttribute('href'); }
  }

  function fill(d) {
    // ---- hours
    var h = d.hours && Array.isArray(d.hours.days) && d.hours.days.length === 7 ? d.hours : null;
    if (h) {
      all('[data-wf="hours"]').forEach(function (box) {
        var slots = box.querySelectorAll('[data-day]');
        if (slots.length) {
          Array.prototype.forEach.call(slots, function (slot) {
            var i = DAYS.indexOf(slot.getAttribute('data-day'));
            if (i >= 0) slot.textContent = dayLine(h.days[i]);
          });
          return;
        }
        var long = box.getAttribute('data-wf-days') === 'long';
        var list = /^(UL|OL)$/.test(box.tagName) ? box : el('ul', 'wf-hours');
        list.textContent = '';
        h.days.forEach(function (day, i) {
          var li = el('li', 'wf-hours-day' + (day.closed ? ' wf-closed' : ''));
          li.appendChild(el('span', 'wf-day', long ? DAY_LONG[i] : DAY_SHORT[i]));
          li.appendChild(document.createTextNode(' '));
          li.appendChild(el('span', 'wf-time', dayLine(day)));
          list.appendChild(li);
        });
        if (list !== box) { box.textContent = ''; box.appendChild(list); }
      });
    }
    var closed = d.closed_now && d.closed_now.to ? d.closed_now : null;
    all('[data-wf="hours-note"]').forEach(function (x) {
      if (closed) { x.textContent = closedLine(closed); show(x, true); return; }
      if (!h) return;
      x.textContent = s(h.note, 120);
      show(x, !!h.note);
    });

    // ---- banner: their own words; else a closure; else (if they asked) the next event; else hidden
    var b = d.banner && d.banner.text && !(d.banner.until && today > d.banner.until) ? d.banner : null;
    var line = '', href = '';
    if (b) { line = s(b.text, 140); href = https(b.link); }
    else if (closed) { line = closedLine(closed); }
    else if (d.next_event && d.next_event.title && parts(d.next_event.date)) {
      line = 'Next up: ' + s(d.next_event.title, 80) + ', ' + niceDay(d.next_event.date);
      href = https(d.next_event.link) || (document.getElementById('events') ? '#events' : '');
    }
    all('[data-wf="banner"]').forEach(function (box) {
      if (!line) { show(box, false); return; }
      var text = box.querySelector('[data-wf="banner-text"]');
      var a = box.querySelector('a[data-wf="banner-link"]');
      if (text) {
        text.textContent = line;
        if (a) { if (href) setLink(a, href); else show(a, false); }
      } else if (href && box.tagName !== 'A') {
        var link = el('a', 'wf-banner-link', line);
        setLink(link, href);
        box.textContent = '';
        box.appendChild(link);
      } else {
        box.textContent = line;
        if (box.tagName === 'A') setLink(box, href);
      }
      show(box, true);
    });

    // ---- prices
    (Array.isArray(d.prices) ? d.prices : []).forEach(function (p) {
      var id = s(p && p.id, 40);
      if (!/^[a-z0-9-]+$/.test(id)) return;
      all('[data-wf-price="' + id + '"]').forEach(function (x) { x.textContent = s(p.price, 24); });
    });

    // ---- contact
    var c = d.contact || null;
    if (c) {
      var phone = s(c.phone, 30), email = s(c.email, 120);
      all('[data-wf="phone"]').forEach(function (x) {
        x.textContent = phone;
        if (x.tagName === 'A' && phone) x.setAttribute('href', 'tel:' + phone.replace(/[^\d+]/g, ''));
        show(x, !!phone);
      });
      all('[data-wf="email"]').forEach(function (x) {
        x.textContent = email;
        if (x.tagName === 'A' && /^[^\s@<>"]+@[^\s@<>"]+$/.test(email)) x.setAttribute('href', 'mailto:' + email);
        show(x, !!email);
      });
      var lines = (Array.isArray(c.address) ? c.address : []).slice(0, 3).map(function (l) { return s(l, 80); }).filter(Boolean);
      all('[data-wf="address"]').forEach(function (x) {
        x.textContent = '';
        lines.forEach(function (l, i) { if (i) x.appendChild(document.createElement('br')); x.appendChild(document.createTextNode(l)); });
        show(x, lines.length > 0);
      });
      var socials = {};
      (Array.isArray(c.socials) ? c.socials : []).forEach(function (so) { var u = https(so && so.url); if (u && !socials[so.kind]) socials[so.kind] = u; });
      all('[data-wf-social]').forEach(function (a) {
        var u = socials[a.getAttribute('data-wf-social')];
        if (u) { a.setAttribute('href', u); a.setAttribute('rel', 'noopener me'); show(a, true); } else show(a, false);
      });
    }

    // ---- events
    if (Array.isArray(d.events)) {
      var evs = d.events.filter(function (ev) { return ev && ev.title && ((ev.end_date || ev.date) >= today); });
      all('[data-wf="events"]').forEach(function (box) {
        var empty = box.querySelector('[data-wf-empty]');
        var list = box.querySelector('ul.wf-events') || el('ul', 'wf-events');
        list.textContent = '';
        evs.forEach(function (ev) {
          var li = el('li', 'wf-event');
          li.appendChild(el('span', 'wf-event-title', s(ev.title, 80)));
          li.appendChild(el('span', 'wf-event-date', niceRange(ev.date, ev.end_date)));
          if (ev.time) li.appendChild(el('span', 'wf-event-time', s(ev.time, 40)));
          if (ev.place) li.appendChild(el('span', 'wf-event-place', s(ev.place, 80)));
          var u = https(ev.link);
          if (u) { var a = el('a', 'wf-event-link', 'More about it'); setLink(a, u); li.appendChild(a); }
          list.appendChild(li);
        });
        if (!list.parentNode) box.appendChild(list);
        show(list, evs.length > 0);
        if (empty) { show(empty, !evs.length); show(box, true); }
        else show(box, evs.length > 0);
      });
    }

    // ---- the featured event: one big card (a flyer is shown whole, never cropped)
    var f = d.featured_event && d.featured_event.title && ((d.featured_event.end_date || d.featured_event.date) >= today) ? d.featured_event : null;
    all('[data-wf="featured-event"]').forEach(function (box) {
      if (!f) { show(box, false); return; }
      box.textContent = '';
      box.classList.add('wf-featured');
      var src = f.flyer ? fileUrl(f.flyer.src) : '';
      if (src) {
        var img = el('img', 'wf-featured-flyer');
        img.src = src;
        var set = s(f.flyer.srcset, 800).split(', ').map(function (part) { var m = /^(\S+) (\d{2,4}w)$/.exec(part); return m && fileUrl(m[1]) ? fileUrl(m[1]) + ' ' + m[2] : ''; }).filter(Boolean);
        if (set.length) { img.srcset = set.join(', '); img.sizes = '(min-width: 700px) 600px, 100vw'; }
        img.alt = s(f.title, 80);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.style.objectFit = 'contain';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        box.appendChild(img);
      }
      box.appendChild(el('h3', 'wf-featured-title', s(f.title, 80)));
      box.appendChild(el('p', 'wf-featured-date', niceRange(f.date, f.end_date) + (f.time ? ', ' + s(f.time, 40) : '')));
      if (f.place) box.appendChild(el('p', 'wf-featured-place', s(f.place, 80)));
      var u = https(f.link);
      if (u) { var a = el('a', 'wf-featured-link', 'Find out more'); setLink(a, u); box.appendChild(a); }
      show(box, true);
    });

    // ---- booking
    var book = d.booking ? https(d.booking.url) : '';
    if (book) all('[data-wf="booking"]').forEach(function (a) { a.setAttribute('href', book); });

    // ---- photos (the baked-in src stays if this one isn't there)
    var photos = d.photos && typeof d.photos === 'object' ? d.photos : {};
    all('img[data-wf-photo]').forEach(function (img) {
      var p = photos[img.getAttribute('data-wf-photo')];
      var src = p ? fileUrl(p.src) : '';
      if (!src) return;
      var set = s(p.srcset, 800).split(', ').map(function (part) { var m = /^(\S+) (\d{2,4}w)$/.exec(part); return m && fileUrl(m[1]) ? fileUrl(m[1]) + ' ' + m[2] : ''; }).filter(Boolean);
      if (set.length) { img.srcset = set.join(', '); if (!img.getAttribute('sizes')) img.sizes = '100vw'; }
      else img.removeAttribute('srcset');
      img.src = src;
    });

    try { document.dispatchEvent(new CustomEvent('wf:content', { detail: { site: site } })); } catch (e) { /* old browser: fine */ }
  }

  function go() {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : 0;
    fetch(api + '/content/' + site, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { clearTimeout(t); if (d && typeof d === 'object' && !d.error) fill(d); })
      .catch(function () { clearTimeout(t); /* the page's own words stay */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
