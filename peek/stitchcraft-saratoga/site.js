/* StitchCraft mockup: shared script for every page (Web Faery). Each page sets data-root on <html>: "" for the home page, "../" for the others. */
(function(){ window.SC_ROOT = document.documentElement.getAttribute('data-root') || ''; })();
  (function () {
    var h = document.querySelector('.hero, .phero'), img = h && h.querySelector('.hero-photo img, .phero .photo img');
    if (!h || !img || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    h.classList.add('wait');
    var started = false;
    var go = function () { if (started) return; started = true; h.classList.remove('wait'); h.classList.add('go'); };
    if (img.complete) go(); else { img.addEventListener('load', go); img.addEventListener('error', go); }
    setTimeout(go, 1500);
  })();
  /* light or dark, for this preview */
  (function () {
    var root = document.documentElement;
    function $(id) { return document.getElementById(id); }
    var tab = $('theme-tab'), panel = $('theme-panel'), auto = $('theme-auto'), live = $('theme-live');
    if (!tab || !panel || !auto || !live) return;
    var btns = [].slice.call(tab.querySelectorAll('[data-theme]')), last = null;
    function quietFocus(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    function set(t) {
      if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme') === t ? 'true' : 'false'); });
      panel.hidden = !t;
      live.textContent = t ? (t === 'dark' ? 'Dark' : 'Light') + ' look, for this preview. Your site follows each visitor’s phone setting.' : 'Back to auto: following the phone setting again.';
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { var t = b.getAttribute('data-theme'); last = b; set(root.getAttribute('data-theme') === t ? null : t); });
    });
    auto.addEventListener('click', function () { set(null); quietFocus(last || btns[0]); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); quietFocus(last || btns[0]); } });
    tab.hidden = false;
  })();
  /* the hours banner: it reads the shop's real hours (Mountain time) and tells people if you are open right now */
  (function () {
    function $(id) { return document.getElementById(id); }
    var HRS = { 0: null, 1: [12, 19], 2: [12, 19], 3: null, 4: [12, 19], 5: [12, 19], 6: [12, 19] };
    var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    function hr(h) { return (h > 12 ? h - 12 : h) + (h >= 12 ? ' pm' : ' am'); }
    function nowMT() {
      try {
        var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()), o = {};
        p.forEach(function (x) { o[x.type] = x.value; });
        return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), m: (+o.hour) * 60 + (+o.minute) };
      } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
    }
    function nextOpen(d) { for (var i = 1; i <= 7; i++) { var k = (d + i) % 7; if (HRS[k]) return { k: k, i: i }; } return null; }
    function auto() {
      var t = nowMT(), h = HRS[t.d], n;
      if (h && t.m >= h[0] * 60 && t.m < h[1] * 60) return { label: 'Open now until ' + hr(h[1]), cta: 'Hours and where to find us', href: window.SC_ROOT + 'visit/' };
      if (h && t.m < h[0] * 60) return { label: 'Opens today at ' + hr(h[0]), cta: 'Hours and where to find us', href: window.SC_ROOT + 'visit/' };
      n = nextOpen(t.d);
      var when = n.i === 1 ? 'tomorrow' : DAY[n.k];
      var why = t.d === 3 ? 'Closed Wednesdays' : t.d === 0 ? 'Sundays are by appointment' : 'Closed for the day';
      return { label: why + '. Opens ' + when + ' at ' + hr(HRS[n.k][0]), cta: 'Book a fitting', href: window.SC_ROOT + 'book/' };
    }
    var STATES = {
      open: null,
      spot: { label: 'Holiday hours: open until 5 on December 24', cta: 'See the hours', href: window.SC_ROOT + 'visit/' },
      full: { label: 'Away until December 2: fittings resume then', cta: 'Leave a note', href: window.SC_ROOT + 'book/' }
    };
    var strip = document.querySelector('.status-strip'), link = $('status-link'), tryBtn = $('status-try'), panel = $('status-panel');
    if (!strip || !link || !tryBtn || !panel) return;
    var btns = [].slice.call(panel.querySelectorAll('[data-state]')), current = 'open';
    function setState(k, announce) {
      var s = STATES[k] || auto();
      current = k; strip.dataset.state = k;
      $('status-label').textContent = s.label; $('status-cta').textContent = s.cta; link.setAttribute('href', s.href);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.state === k ? 'true' : 'false'); });
      if (announce) $('status-live').textContent = 'The banner now reads: ' + s.label + '. ' + s.cta + '.';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { setState(b.dataset.state, true); }); });
    function openPanel(open) { panel.hidden = !open; tryBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    tryBtn.addEventListener('click', function () { openPanel(panel.hidden); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); tryBtn.focus(); openPanel(false); } });
    setState('open', false);
    setInterval(function () { if (current === 'open') setState('open', false); }, 60000);
    /* today's row in the hours list */
    var t = nowMT(), row = document.querySelector('#hours li[data-d="' + t.d + '"]');
    if (row) row.classList.add('today');
  })();
  /* the herb wall: tap jars, build a list, and the list writes the note */
  (function () {
    function $(id) { return document.getElementById(id); }
    var wall = $('wall-photo'), chips = $('chips'), msg = $('list-msg'), send = $('list-send'), clear = $('list-clear'), hint = $('list-hint');
    if (!wall || !chips) return;
    var picked = [], BASE = 'Hi, I’d like to stop by the shop. Could you set some aside for me?';
    function join(a) { return a.length < 2 ? a.join('') : a.length === 2 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
    function paint() {
      chips.innerHTML = '';
      if (!picked.length) { var li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Tap a jar to add it.'; chips.appendChild(li); }
      picked.forEach(function (h) {
        var li = document.createElement('li'); li.appendChild(document.createTextNode(h));
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Remove ' + h); b.textContent = '×';
        b.addEventListener('click', function () { toggle(h); }); li.appendChild(b); chips.appendChild(li);
      });
      [].forEach.call(wall.querySelectorAll('.jar'), function (j) { j.setAttribute('aria-pressed', picked.indexOf(j.getAttribute('data-herb')) > -1 ? 'true' : 'false'); });
      msg.textContent = picked.length ? 'Hi, I’d like to stop by the shop and take a look at the ' + join(picked.map(function (h) { return h.toLowerCase(); })) + '. Could you set some aside for me?' : BASE;
      send.disabled = !picked.length; clear.hidden = !picked.length; hint.textContent = '';
    }
    function toggle(h) { var i = picked.indexOf(h); if (i > -1) picked.splice(i, 1); else picked.push(h); paint(); }
    wall.addEventListener('click', function (e) { var j = e.target.closest('.jar'); if (j) toggle(j.getAttribute('data-herb')); });
    clear.addEventListener('click', function () { picked = []; paint(); });
    var form = $('list-write'), done = $('list-done');
    send.addEventListener('click', function () {
      if (!picked.length) { hint.textContent = 'Tap at least one jar first.'; return; }
      $('list-what').textContent = join(picked.map(function (h) { return h.toLowerCase(); }));
      form.hidden = true; done.hidden = false; try { $('list-thanks').focus({ preventScroll: true }); } catch (e) {}
    });
    $('list-again').addEventListener('click', function () { picked = []; paint(); done.hidden = true; form.hidden = false; });
    $('list-edit').addEventListener('click', function () { done.hidden = true; form.hidden = false; });
    paint();
  })();
  /* booking preview (Advance): what, when, you, done. Closed Wednesdays, Sundays by appointment. */
  (function () {
    function $(id) { return document.getElementById(id); }
    var card = $('bk-card'); if (!card) return;
    var svc = 'Fitting or alteration drop-off', day = null, time = null;
    var steps = [].slice.call(document.querySelectorAll('#bk-steps span')), panes = { 1: $('bk-1'), 2: $('bk-2'), 3: $('bk-3') }, done = $('bk-done');
    function show(n) { [1, 2, 3].forEach(function (k) { panes[k].hidden = k !== n; }); done.hidden = true; $('bk-steps').hidden = false; steps.forEach(function (s) { s.classList.toggle('on', +s.dataset.s === n); }); }
    var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var days = [], base = new Date(); base.setHours(12, 0, 0, 0);
    for (var i = 1; i <= 10; i++) { var d = new Date(base); d.setDate(base.getDate() + i); days.push(d); }
    var dayBox = $('bk-days'), timeBox = $('bk-times');
    function fmtDay(d) { return DAYN[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate(); }
    function fmtT(m) { var h = Math.floor(m / 60), mm = m % 60; return (h > 12 ? h - 12 : h) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? ' pm' : ' am'); }
    days.forEach(function (d, idx) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'bk-day';
      var closed = d.getDay() === 3 || d.getDay() === 0; b.disabled = closed;
      b.innerHTML = '<b>' + DAYN[d.getDay()] + '</b>' + MON[d.getMonth()] + ' ' + d.getDate();
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { day = d; time = null; [].forEach.call(dayBox.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); drawTimes(idx); $('bk-to3').disabled = true; });
      dayBox.appendChild(b);
    });
    function drawTimes(seed) {
      timeBox.innerHTML = '';
      for (var m = 12 * 60; m < 19 * 60; m += 30) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'bk-time'; b.textContent = fmtT(m);
        b.disabled = ((m / 30 + seed * 3) % 5 === 0); b.setAttribute('aria-pressed', 'false');
        (function (m, b) { b.addEventListener('click', function () { time = m; [].forEach.call(timeBox.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); $('bk-to3').disabled = false; }); })(m, b);
        timeBox.appendChild(b);
      }
    }
    [].forEach.call(document.querySelectorAll('#bk-1 .bk-opt'), function (o) { o.addEventListener('click', function () { svc = o.dataset.svc; [].forEach.call(document.querySelectorAll('#bk-1 .bk-opt'), function (x) { x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); }); }); });
    function sum() { return '<b>' + svc + '</b><br>' + fmtDay(day) + ' at ' + fmtT(time) + '<br>112 E Bridge Ave, Ste 2, Saratoga'; }
    $('bk-to2').addEventListener('click', function () { show(2); });
    $('bk-back1').addEventListener('click', function () { show(1); });
    $('bk-to3').addEventListener('click', function () { if (!day || time === null) return; $('bk-sum').innerHTML = sum(); show(3); });
    $('bk-back2').addEventListener('click', function () { show(2); });
    $('bk-form').addEventListener('submit', function (e) {
      e.preventDefault(); var h = $('bk-hint'), m = $('bk-mail').value;
      if (!$('bk-name').value.trim()) { h.textContent = 'Please add your name.'; return; }
      if (!/^\S+@\S+\.\S+$/.test(m)) { h.textContent = 'That email looks a little off.'; return; }
      h.textContent = ''; $('bk-sum2').innerHTML = sum(); [1, 2, 3].forEach(function (k) { panes[k].hidden = true; }); $('bk-steps').hidden = true; done.hidden = false; try { $('bk-thanks').focus({ preventScroll: true }); } catch (x) {}
    });
    $('bk-again').addEventListener('click', function () { day = null; time = null; timeBox.innerHTML = ''; [].forEach.call(dayBox.children, function (x) { x.setAttribute('aria-pressed', 'false'); }); $('bk-to3').disabled = true; show(1); });
    $('bk-edit').addEventListener('click', function () { show(2); });
    show(1);
  })();
  /* contact form + new-on-the-shelf list (Color) */
  (function () {
    function $(id) { return document.getElementById(id); }
    var cf = $('cf'), nl = $('nl'); if (!cf || !nl) return;
    var ok = function (m) { return /^\S+@\S+\.\S+$/.test(m); };
    cf.addEventListener('submit', function (e) {
      e.preventDefault(); var h = $('cf-hint');
      if (!$('cf-name').value.trim()) { h.textContent = 'Please add your name.'; return; }
      if (!ok($('cf-mail').value)) { h.textContent = 'That email looks a little off.'; return; }
      if (!$('cf-msg').value.trim()) { h.textContent = 'Please write a short message.'; return; }
      h.textContent = ''; cf.hidden = true; $('cf-done').hidden = false; try { $('cf-thanks').focus({ preventScroll: true }); } catch (x) {}
    });
    $('cf-again').addEventListener('click', function () { cf.reset(); $('cf-done').hidden = true; cf.hidden = false; });
    $('cf-edit').addEventListener('click', function () { $('cf-done').hidden = true; cf.hidden = false; });
    nl.addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('nl-mail').value;
      if (!ok(m)) { $('nl-hint').textContent = 'That email looks a little off.'; return; }
      $('nl-hint').textContent = ''; $('nl-to').textContent = m; nl.hidden = true; $('nl-done').hidden = false; try { $('nl-done-h').focus({ preventScroll: true }); } catch (x) {}
    });
    $('nl-again').addEventListener('click', function () { nl.reset(); $('nl-done').hidden = true; nl.hidden = false; });
  })();
  /* the secret: type "stitch", or tap the footer mark three times. A running stitch sews itself around the name. */
  (function () {
    var egg = document.getElementById('egg'), cue = document.getElementById('egg-cue'), ring = document.getElementById('egg-ring'), mark = document.getElementById('foot-mark');
    if (!egg || !cue || !ring) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches, timers = [], last = null, typed = '', taps = 0, tapT = 0;
    var LINES = ['Stitch by stitch', 'Jar by jar', 'Saratoga’s one-stop stitchy witchy shop'];
    function clearT() { timers.forEach(clearTimeout); timers = []; }
    function open() {
      last = document.activeElement; egg.hidden = false; clearT();
      ring.style.transition = 'none'; ring.style.strokeDashoffset = reduce ? '0' : '100';
      if (reduce) { cue.textContent = LINES[2]; } else {
        cue.textContent = '';
        ring.getBoundingClientRect(); ring.style.transition = 'stroke-dashoffset 3.6s ease-in-out'; ring.style.strokeDashoffset = '0';
        LINES.forEach(function (l, i) { timers.push(setTimeout(function () { cue.textContent = l; }, 400 + i * 1300)); });
      }
      try { egg.focus({ preventScroll: true }); } catch (e) {}
    }
    function close() { clearT(); egg.hidden = true; if (last && last.focus) { try { last.focus({ preventScroll: true }); } catch (e) {} } }
    egg.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!egg.hidden) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } return; }
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-6); if (typed.slice(-6) === 'stitch') { typed = ''; open(); }
    });
    if (mark) mark.addEventListener('click', function () { var n = Date.now(); taps = n - tapT < 900 ? taps + 1 : 1; tapT = n; if (taps >= 3) { taps = 0; open(); } });
  })();
  /* alterations question form (Color) */
  (function () {
    function $(id) { return document.getElementById(id); }
    var f = $('af'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var h = $('af-hint');
      if (!$('af-name').value.trim()) { h.textContent = 'Please add your name.'; return; }
      if (!/^\S+@\S+\.\S+$/.test($('af-mail').value)) { h.textContent = 'That email looks a little off.'; return; }
      if (!$('af-msg').value.trim()) { h.textContent = 'Please tell us what you would like done.'; return; }
      h.textContent = ''; $('af-sum').textContent = $('af-what').value.toLowerCase(); f.hidden = true; $('af-done').hidden = false; try { $('af-thanks').focus({ preventScroll: true }); } catch (x) {}
    });
    $('af-again').addEventListener('click', function () { f.reset(); $('af-done').hidden = true; f.hidden = false; });
    $('af-edit').addEventListener('click', function () { $('af-done').hidden = true; f.hidden = false; });
  })();
  /* photos drift a touch as you scroll; sections rise in */
  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    var frames = [].slice.call(document.querySelectorAll('main .photo'));
    if (frames.length) {
      var ticking = false;
      var drift = function () {
        ticking = false;
        var vh = window.innerHeight;
        frames.forEach(function (f) {
          var r = f.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50) return;
          var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
          p = Math.max(-1, Math.min(1, p));
          f.style.setProperty('--drift', (p * r.height * 0.03).toFixed(1) + 'px');
        });
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
      window.addEventListener('resize', drift);
      drift();
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add('pre'); io.observe(el); }
    });
  })();
(function () {
  /* the whole shop: filter by shelf, search, ounces or pieces into a bag, ship or pick up, Stripe checkout preview */
  function $(id) { return document.getElementById(id); }
  var grid = $('hgrid'); if (!grid) return;
  var bag = {}, unit = {}, get = 'ship', list = $('bag-list'), go = $('bag-go'), cat = 'all', q = '';
  var cards = [].slice.call(grid.querySelectorAll('.hcard'));
  cards.forEach(function (c) { var w = c.querySelector('.qty'); unit[w.dataset.h] = w.dataset.u || ''; });
  function total() { var n = 0; for (var k in bag) n += bag[k]; return n; }
  function line(k, n) { return unit[k] === 'oz' ? n + ' oz ' + k.toLowerCase() : n + ' \u00d7 ' + k.toLowerCase(); }
  function paint() {
    var names = Object.keys(bag).filter(function (k) { return bag[k] > 0; });
    list.textContent = '';
    if (!names.length) { var e = document.createElement('li'); e.className = 'empty'; e.textContent = 'Add something to start.'; list.appendChild(e); }
    names.forEach(function (k) { var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = k; b.textContent = unit[k] === 'oz' ? bag[k] + ' oz' : '\u00d7 ' + bag[k]; li.appendChild(a); li.appendChild(b); list.appendChild(li); });
    cards.forEach(function (c) { var w = c.querySelector('.qty'); w.querySelector('output').textContent = bag[w.dataset.h] || 0; });
    $('bag-oz').textContent = total(); go.disabled = !total();
    var j = $('bag-jump'); if (j) { j.hidden = !total(); j.textContent = 'Go to your bag (' + total() + ')'; }
  }
  function apply() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (cat === 'all' || c.dataset.cat === cat) && (!q || c.querySelector('b').textContent.toLowerCase().indexOf(q) > -1);
      c.hidden = !ok; if (ok) shown++;
    });
    $('shop-count').textContent = 'Showing ' + shown + ' of ' + cards.length;
    $('shop-none').hidden = shown > 0;
  }
  grid.addEventListener('click', function (e) {
    var w = e.target.closest('.qty'); if (!w) return; var b = e.target.closest('button'); if (!b) return; var h = w.dataset.h;
    bag[h] = Math.max(0, (bag[h] || 0) + (b.classList.contains('q-plus') ? 1 : -1)); paint();
  });
  [].forEach.call(document.querySelectorAll('.fchip'), function (c) {
    c.addEventListener('click', function () { cat = c.dataset.cat; [].forEach.call(document.querySelectorAll('.fchip'), function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); }); apply(); });
  });
  $('shop-q').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); apply(); });
  [].forEach.call(document.querySelectorAll('.bag-opts .bk-opt'), function (o) { o.addEventListener('click', function () { get = o.dataset.get; [].forEach.call(document.querySelectorAll('.bag-opts .bk-opt'), function (x) { x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); }); }); });
  go.addEventListener('click', function () {
    var names = Object.keys(bag).filter(function (k) { return bag[k] > 0; }).map(function (k) { return line(k, bag[k]); });
    $('bag-sum').textContent = names.join(', ') + (get === 'pick' ? '. Ready to pick up at the shop.' : '. Standard shipping.');
    $('bag-open').hidden = true; $('bag-done').hidden = false; try { $('bag-thanks').focus({ preventScroll: true }); } catch (x) {}
  });
  $('bag-again').addEventListener('click', function () { bag = {}; paint(); $('bag-done').hidden = true; $('bag-open').hidden = false; });
  $('bag-edit').addEventListener('click', function () { $('bag-done').hidden = true; $('bag-open').hidden = false; });
  paint(); apply();
})();

  /* see your site as Pocket, Color, Advance or Everything (keys: maiden, mother, crone, all) */
  (function () {
    var root = document.documentElement, body = document.body;
    function $(id) { return document.getElementById(id); }
    var bar = $('views'), vp = $('vp'), pill = $('vp-pill'), panel = $('vp-panel'), live = $('views-live');
    if (!bar || !vp || !pill || !panel || !live || !('IntersectionObserver' in window)) return;
    function quietFocus(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    var V = {
      maiden: { name: 'Pocket', price: '$300', what: 'the core of your site, planted and kept healthy, with your shop, your alteration prices, your custom orders, your hours and where to find you, and a Book button to the Calendly you already use.', next: 'mother' },
      mother: { name: 'Color', price: '$600', what: 'a full site, tended through the seasons, with everything in Pocket plus the herb wall list, a contact form, an alterations question form with a photo, FAQ and a New on the shelf list on your own Buttondown.', next: 'crone' },
      crone: { name: 'Advance', price: '$900', what: 'your site in full bloom, with everything in Color plus booking right on your site, on my server, with your own portal and no separate booking app to pay for, plus your full shop, with every product on its own shelf. Custom order deposits and shop orders are paid into your own Stripe. That\u2019s every piece on this site.' },
      all: { name: 'Everything' }
    };
    var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var view = 'all';
    var shows = [].slice.call(document.querySelectorAll('[data-show]'));
    var things = [].slice.call(document.querySelectorAll('[data-thing]'));
    function has(el, v) { return (' ' + el.getAttribute('data-show') + ' ').indexOf(' ' + v + ' ') > -1; }
    function goesIn(el, v) { for (var n = el; n && n.nodeType === 1; n = n.parentElement) if (n.hasAttribute('data-show') && !has(n, v)) return false; return true; }
    function more(from, to) { return things.filter(function (t) { return goesIn(t, to) && !goesIn(t, from); }).length; }
    function moreText(n) { return n + (n === 1 ? ' more thing comes' : ' more things come'); }
    function note(v) {
      if (v === 'all') return { lead: 'everything', text: ', each piece tagged with the build that includes it. Tap a build, or any tag on the page, to see just what it includes.' };
      var rest = '';
      if (v === 'maiden' && more('maiden', 'crone')) rest = ' On this page, ' + moreText(more('maiden', 'mother')) + ' with Color, ' + more('maiden', 'crone') + ' with Advance.';
      if (v === 'mother' && more('mother', 'crone')) rest = ' On this page, ' + moreText(more('mother', 'crone')) + ' with Advance.';
      return { lead: V[v].name, text: ': ' + V[v].what + rest };
    }
    [].forEach.call(document.querySelectorAll('span.tag[data-go]'), function (t) {
      var go = t.getAttribute('data-go'); if (!V[go]) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = t.className; b.setAttribute('data-go', go);
      while (t.firstChild) b.appendChild(t.firstChild);
      var s = document.createElement('span'); s.className = 'vh'; s.textContent = ': see your site as ' + V[go].name; b.appendChild(s);
      b.title = 'See your site as ' + V[go].name;
      t.parentNode.replaceChild(b, t);
    });
    var segBtns = [].slice.call(document.querySelectorAll('.vseg [data-view]'));
    var notes = [$('views-note'), $('vp-note')];
    function paintNote(p) {
      var n = note(view), x = V[view];
      p.textContent = 'Showing ';
      var b = document.createElement('b'); b.textContent = n.lead; p.appendChild(b);
      p.appendChild(document.createTextNode(n.text));
      if (x.next) {
        p.appendChild(document.createTextNode(' '));
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'views-next'; btn.setAttribute('data-view', x.next);
        btn.textContent = 'See ' + V[x.next].name + ' · ' + V[x.next].price;
        var ar = document.createElement('span'); ar.setAttribute('aria-hidden', 'true'); ar.textContent = ' →'; btn.appendChild(ar);
        p.appendChild(btn);
      }
    }
    function paint() {
      var fe = document.activeElement, fromNote = fe && fe.classList && fe.classList.contains('views-next') ? fe.parentNode : null;
      segBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false'); });
      notes.forEach(paintNote);
      $('vp-v').textContent = view === 'all' ? 'Everything' : V[view].name + ' · ' + V[view].price;
      if (fromNote) quietFocus(fromNote.querySelector('.views-next') || fromNote.parentNode.querySelector('.vseg [aria-pressed="true"]'));
    }
    function say() { var n = note(view); live.textContent = 'Showing ' + n.lead + (V[view].price ? ', ' + V[view].price : '') + n.text; }
    var PROPS = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderBottomWidth'];
    var FLAT = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', opacity: 0 };
    function box(el) { var cs = getComputedStyle(el), o = {}; PROPS.forEach(function (p) { o[p] = cs[p]; }); o.opacity = +cs.opacity; return o; }
    function stopFold(el) { var a = el._fold; if (a) { el._fold = null; a.cancel(); el.style.overflow = ''; } }
    function fold(el, on, animate) {
      var run = el._fold;
      if (!run && el.hidden === !on) return 0;
      if (!animate || !el.hasAttribute('data-fold') || typeof el.animate !== 'function') { stopFold(el); el.hidden = !on; return 0; }
      var from = run ? box(el) : on ? FLAT : box(el);
      stopFold(el); el.hidden = false;
      var to = on ? box(el) : FLAT;
      var h = Math.max(parseFloat(from.height) || 0, parseFloat(to.height) || 0);
      var dur = Math.round(Math.min(760, 420 + h * 0.25));
      var frames = run ? [from, to] : on ? [from, { opacity: 0, offset: 0.3 }, to] : [from, { opacity: 0, offset: 0.55 }, to];
      el.style.overflow = 'hidden';
      var a = el.animate(frames, { duration: dur, easing: 'cubic-bezier(.45, 0, .2, 1)', fill: 'forwards' });
      el._fold = a;
      a.onfinish = function () { if (el._fold !== a) return; el._fold = null; if (!on) el.hidden = true; a.cancel(); el.style.overflow = ''; };
      return dur;
    }
    var CAND = 'section, [data-show], h1, h2, h3, p, li, figure, table, dl, .btn, .bk-card, .reach, .where > div, .menu, .faq-list details, .vseg';
    function anchorFor(v, src) {
      if (src && !vp.contains(src) && src.getClientRects().length && goesIn(src, v)) return { el: src, top: src.getBoundingClientRect().top };
      var list = document.querySelectorAll(CAND), foldTop = null;
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (vp.contains(el) || el.closest('dialog') || el.classList.contains('vh')) continue;
        if (!el.getClientRects().length) { if (foldTop !== null && el.hasAttribute('data-show') && goesIn(el, v)) return { el: el, top: Math.max(foldTop, 0) }; continue; }
        var r = el.getBoundingClientRect(); if (r.bottom <= 0) continue;
        if (!goesIn(el, v)) {
          if (foldTop === null) {
            foldTop = r.top;
            var f = el.closest('[data-show]'), fr = f.getBoundingClientRect();
            var alt = [].filter.call(f.parentElement.children, function (x) { return x !== f && x.hasAttribute('data-show') && x.hidden && has(x, v); })[0];
            if (alt) return { el: alt, top: Math.max(fr.top, 0) };
          }
          continue;
        }
        if (foldTop === null && (el.tagName === 'SECTION' || el.hasAttribute('data-show'))) continue;
        return { el: el, top: foldTop === null ? r.top : Math.max(foldTop, 0) };
      }
      return null;
    }
    var job = null, USER = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    function hold(a, dur) {
      if (job) job.stop();
      if (!a) return;
      var j = { live: true, end: performance.now() + dur + 90 };
      j.stop = function () { if (!j.live) return; j.live = false; if (job === j) job = null; root.style.overflowAnchor = ''; body.style.overflowAnchor = ''; USER.forEach(function (t) { window.removeEventListener(t, j.stop, true); }); };
      job = j;
      root.style.overflowAnchor = 'none'; body.style.overflowAnchor = 'none';
      USER.forEach(function (t) { window.addEventListener(t, j.stop, { capture: true, passive: true }); });
      function fix() { var d = a.el.getBoundingClientRect().top - a.top; if (Math.abs(d) >= 1) window.scrollTo(window.pageXOffset, window.pageYOffset + d); }
      fix();
      (function tick() { if (!j.live) return; fix(); if (performance.now() < j.end) requestAnimationFrame(tick); else j.stop(); })();
    }
    function setView(v, src, instant) {
      if (!V[v]) return;
      if (v === view) { say(); return; }
      var animate = !reduce.matches && !instant;
      if (src && src.closest('.views-note')) src = src.closest('.views-card, .vpanel').querySelector('.vseg');
      var a = anchorFor(v, src);
      var fe = document.activeElement, lost = fe && fe !== body && !vp.contains(fe) && !goesIn(fe, v);
      view = v; root.setAttribute('data-view', v); try { sessionStorage.setItem('sc-view', v); } catch (e) {}
      var outer = [], longest = 0;
      shows.forEach(function (el) {
        var on = has(el, v), p = el.parentElement ? el.parentElement.closest('[data-show]') : null;
        if (p && (p.hidden || !has(p, v))) { stopFold(el); el.hidden = !on; } else outer.push([el, on]);
      });
      outer.forEach(function (x) { longest = Math.max(longest, fold(x[0], x[1], animate)); });
      paint();
      try { document.dispatchEvent(new CustomEvent('ex:view', { detail: { view: v } })); } catch (e) {}
      hold(a, longest);
      if (lost) {
        var sec = fe.closest('section'), alt = sec && [].filter.call(sec.querySelectorAll('[data-show][tabindex]'), function (x) { return has(x, v); })[0];
        quietFocus(alt || bar.querySelector('.vseg [aria-pressed="true"]'));
      }
      say();
    }
    var past = false, open = false;
    function paintPill() { vp.classList.toggle('off', !(past || open || vp.contains(document.activeElement))); }
    new IntersectionObserver(function (es) { var e = es[es.length - 1]; past = !e.isIntersecting && e.boundingClientRect.top < 0; paintPill(); }).observe(bar);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; var p = bar.getBoundingClientRect().bottom <= 0; if (p !== past) { past = p; paintPill(); } });
    }, { passive: true });
    function setOpen(o, back) { open = o; panel.hidden = !o; pill.setAttribute('aria-expanded', o ? 'true' : 'false'); paintPill(); if (!o && back) pill.focus(); }
    pill.addEventListener('click', function () { setOpen(!open); });
    vp.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && open) { e.preventDefault(); setOpen(false, true); } });
    vp.addEventListener('focusout', function (e) { if (open && e.relatedTarget && !vp.contains(e.relatedTarget)) setOpen(false); setTimeout(paintPill, 0); });
    document.addEventListener('click', function (e) { if (open && !vp.contains(e.target)) setOpen(false); });
    function away(e) { if (open && !vp.contains(e.target)) setOpen(false); }
    window.addEventListener('wheel', away, { passive: true }); window.addEventListener('touchmove', away, { passive: true });
    [bar, panel].forEach(function (c) {
      c.addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (!b || !c.contains(b)) return; setView(b.getAttribute('data-view'), b); if (c === panel) setOpen(false, true); });
    });
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('button.tag[data-go]'); if (t) setView(t.getAttribute('data-go'), t); });
    root.setAttribute('data-view', view);
    [].forEach.call(document.querySelectorAll('[data-js]'), function (el) { el.hidden = false; });
    bar.hidden = false; vp.hidden = false;
    paint();
    var sv = null; try { sv = new URLSearchParams(location.search).get('view') || sessionStorage.getItem('sc-view'); } catch (e) {}
    if (sv && sv !== 'all' && V[sv]) setView(sv, null, true);
  })();
  /* sticky nav: stays at the top; Menu button on phones; tucks up while scrolling down and returns on scroll up (no tucking with reduced motion) */
  (function () {
    var bar = document.getElementById('snav'), wrap = document.getElementById('snav-wrap'), btn = document.getElementById('snav-btn'), links = document.getElementById('snav-links');
    if (!bar || !wrap || !btn || !links) return;
    document.documentElement.classList.add('snav-js');
    var mq = window.matchMedia('(max-width: 760px)'), rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    var last = window.pageYOffset || 0, open = false, tucked = false, raf = 0;
    function tuck(t) { if (t === tucked) return; tucked = t; bar.classList.toggle('tuck', t); document.body.classList.toggle('nav-tuck', t); }
    function setOpen(o) { open = o; bar.classList.toggle('open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) tuck(false); }
    function update() {
      raf = 0; var y = window.pageYOffset || 0;
      bar.classList.toggle('solid', wrap.getBoundingClientRect().top <= 1 && y > 8);
      if (!rm.matches && !open && y > 360 && y > last + 6 && !bar.contains(document.activeElement)) tuck(true);
      else if (y < last - 6 || y <= 360 || open) tuck(false);
      if (Math.abs(y - last) > 6 || y <= 360) last = y;
    }
    btn.addEventListener('click', function () { setOpen(!open); });
    links.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { setOpen(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (open && !bar.contains(e.target)) setOpen(false); });
    bar.addEventListener('focusin', function () { tuck(false); });
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', function () { if (!mq.matches && open) setOpen(false); update(); });
    update();
  })();
  (function () {
    var t = document.getElementById('theme-tab'); if (!t) return;
    var c = getComputedStyle(t); t.style.borderTop = c.borderLeftWidth + ' solid ' + c.borderLeftColor;
    t.title = 'Try light or dark. Tap your choice again to follow the phone.';
    var vp = document.getElementById('vp') || document.getElementById('vp-pill'), q = false;
    function place() {
      q = false; t.style.bottom = '';
      if (!vp || vp.hidden) return;
      var a = t.getBoundingClientRect(), b = vp.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) t.style.bottom = (innerHeight - b.top + 8) + 'px';
    }
    function soon() { if (!q) { q = true; requestAnimationFrame(place); } }
    addEventListener('scroll', soon, { passive: true }); addEventListener('resize', soon);
    if (vp && window.MutationObserver) new MutationObserver(soon).observe(vp, { attributes: true, subtree: true, childList: true });
    place();
  })();
