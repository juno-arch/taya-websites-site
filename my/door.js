/* The door (Oct 10 2026): webfaery.love/my/#wf=KEY, every client's one private link, in every email Taya sends.
   It takes the key out of the address bar at once, asks the server where they belong now (their mockup, their
   getting-started page, their draft or their live site), and opens it, the key riding in the # part, which browsers
   do not send to any server. It never sits in their back history with a key (location.replace).
   A key that this device only remembers (none in the address) asks "Continue as {first}" first, so one tap of a
   client's link on a shared iPad or on Taya's own phone doesn't make webfaery.love/my open as them from then on.
   The server down: it goes to the last place it knew for this key. No key at all: "Lost your link?".
   Loaded by my/index.html only. No outside scripts, no trackers. */
(function () {
  'use strict';
  var KEY_RE = /^[A-Za-z0-9]{24,64}$/;
  var STORE = 'wf-key-v1:door', LAST = 'wf-door-go-v1';
  var $ = function (id) { return document.getElementById(id); };
  var both = function (fn) { try { fn(sessionStorage); } catch (e) { /* off */ } try { fn(localStorage); } catch (e) { /* off */ } };
  var API = (window.wfApiBase ? window.wfApiBase() : 'https://bookings.gardenfaery.love/api/webfaery/portal');

  // 1. the key from the address (#wf=, or an older #k=), kept on this device and taken out of the address bar
  var key = '', fromLink = false;
  var m = /[#&](?:wf|k)=([A-Za-z0-9]{24,64})(?:&|$)/.exec(location.hash);
  if (m) { key = m[1]; fromLink = true; both(function (s) { s.setItem(STORE, key); }); }
  if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* old browser */ } }
  if (!key) both(function (s) { var v = s.getItem(STORE) || ''; if (!key && KEY_RE.test(v)) key = v; });

  var lastFor = function () {
    var o = null;
    try { o = JSON.parse(localStorage.getItem(LAST) || 'null'); } catch (e) { o = null; }
    return o && o.tag === key.slice(-6) ? o : null;
  };
  var forget = function () {
    both(function (s) { s.removeItem(STORE); });
    try { localStorage.removeItem(LAST); } catch (e) { /* off */ }
    key = '';
  };

  // the cards: one shows at a time
  var CARDS = ['d-wait', 'd-continue', 'd-say', 'd-lost'];
  function show(id) {
    CARDS.forEach(function (c) { $(c).hidden = c !== id; });
    var h = $(id).querySelector('h2'); if (h) h.focus();
  }
  function say(title, words, link) {
    $('d-say-h').textContent = title;
    $('d-say-p').textContent = words;
    var a = $('d-say-a');
    if (link) { a.href = link.href; a.textContent = link.text; a.hidden = false; } else a.hidden = true;
    show('d-say');
  }
  function lost(why) {
    $('d-lost-why').textContent = why || '';
    $('d-lost-why').hidden = !why;
    show('d-lost');
  }
  function go(where, keyed) {
    location.replace(where + (keyed ? '#wf=' + key : ''));
  }
  function hostOf(url) { var x = /^https?:\/\/([^\/?#]+)/.exec(url || ''); return x ? x[1].replace(/^www\./, '') : url; }

  // 3 to 6. ask the server where they belong now, and go there
  function open() {
    show('d-wait');
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch(API + '/door', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k: key }),
      mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return null; }).then(function (d) { return { status: res.status, d: d || {} }; });
    }).then(function (r) {
      var d = r.d;
      if (r.status === 401 && d.error === 'bad_link') { forget(); lost('This link was replaced with a new one.'); return; }
      if (r.status === 429) { say('Just a moment', 'That’s a lot of tries for now. Try again in an hour, or email me at taya@webfaery.love.'); return; }
      if (r.status !== 200 || !d.ok) { offline(); return; }
      if (d.paused) { say('Resting for now', 'This link is resting for now. Anything you need, just email me at taya@webfaery.love 💛'); return; }
      try { localStorage.setItem(LAST, JSON.stringify({ tag: key.slice(-6), go: d.go || '', keyed: !!d.keyed, first: d.first || '' })); } catch (e) { /* off */ }
      if (!d.go) { say('Nothing new just yet', 'Nothing new to look at just yet. I’ll email you as soon as there is 💛 Anything you need, just email me at taya@webfaery.love.'); return; }
      if (!d.keyed) {
        say('Your site', 'Your site is at ' + hostOf(d.go) + '. To leave me a note there, just email me at taya@webfaery.love for now.', { href: d.go, text: 'Open ' + hostOf(d.go) });
        return;
      }
      go(d.go, true);
    }, function () { clearTimeout(timer); offline(); });
  }
  // the server can't be reached: the last place this key went (their site, draft and mockup stay up without it)
  function offline() {
    var last = lastFor();
    if (last && last.go) { go(last.go, last.keyed); return; }
    say('Can’t reach my server', 'I can’t reach my server right now. Try again in a minute, or email me at taya@webfaery.love.');
  }

  // 2. what to do first
  if (!key) { lost(''); return; }
  if (fromLink) { open(); return; }
  // remembered on this device, not from the link: ask first
  var known = lastFor();
  var first = known && known.first ? known.first : '';
  $('d-cont-btn').textContent = first ? 'Continue as ' + first : 'Continue with my link';
  $('d-cont-not').textContent = first ? 'Not ' + first + '?' : 'Not me';
  $('d-cont-btn').addEventListener('click', open);
  $('d-cont-not').addEventListener('click', function () { forget(); lost(''); });
  show('d-continue');
})();
