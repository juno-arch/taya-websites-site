/* Phone alerts for the portal (Nov 14 2026). Loaded by portal.html only, before portal.js.
   window.wfAlerts.sync({ call, server, name, toast }) is called by portal.js each time a booking owner's portal opens:
     - a phone that already said yes is registered with the server again (every open; the server keeps one row per phone),
     - a phone that hasn't gets the "Turn on alerts" card: on an iPhone in Safari it first shows the Add to Home Screen
       steps (Apple only allows alerts for a site that is on the Home Screen, iOS 16.4 or newer), then, opened from the
       Home Screen, one tap on Turn on alerts and one tap on Allow.
   The alert words come from the server and carry no customer details. No outside scripts, no trackers. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ctx = null, wired = false, busy = false, synced = false, textsWired = false;

  var standalone = function () {
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
  };
  var isIOS = function () { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
  var canPush = function () { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; };
  var b64uToBytes = function (s) {
    var p = (s + '===='.slice(s.length % 4 || 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(p), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  };
  var sameKey = function (sub, key) {
    try {
      var cur = sub && sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      if (!cur) return true; // can't tell: keep it
      var want = b64uToBytes(key);
      if (cur.length !== want.length) return false;
      for (var i = 0; i < cur.length; i++) if (cur[i] !== want[i]) return false;
      return true;
    } catch (e) { return true; }
  };

  function show(state) {
    var card = $('sec-alerts');
    if (!card) return;
    card.hidden = state === 'hidden';
    ['al-install', 'al-ask', 'al-on', 'al-blocked', 'al-sorry'].forEach(function (id) { $(id).hidden = id !== 'al-' + state; });
    var h = $('h-alerts');
    if (state === 'on') h.textContent = 'Alerts are on';
    else if (state === 'install') h.textContent = 'Get an alert on your phone';
    else if (state === 'blocked') h.textContent = 'Alerts are switched off on this phone';
    else if (state === 'sorry') h.textContent = 'Alerts aren’t available here';
    else h.textContent = 'Turn on alerts';
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('portal-sw.js').then(function () { return navigator.serviceWorker.ready; }).catch(function () { return null; });
  }
  function getKey() {
    return fetch(ctx.server + '/api/webfaery/portal/push-key', { mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { return d && typeof d.key === 'string' ? d.key : ''; }).catch(function () { return ''; });
  }
  // subscribe this phone (or refresh it) and tell the server. Resolves true when the server has it.
  function register(ask) {
    return registerWorker().then(function (reg) {
      if (!reg) return false;
      return getKey().then(function (key) {
        if (!key) return false;
        return reg.pushManager.getSubscription().then(function (sub) {
          if (sub && !sameKey(sub, key)) return sub.unsubscribe().then(function () { return null; });
          return sub;
        }).then(function (sub) {
          if (sub) return sub;
          if (!ask && Notification.permission !== 'granted') return null;
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
        }).then(function (sub) {
          if (!sub) return false;
          return ctx.call('/push-subscribe', { subscription: sub.toJSON() }).then(function () { return true; });
        });
      });
    }).catch(function () { return false; });
  }

  function wire() {
    if (wired) return; wired = true;
    $('b-al-on').addEventListener('click', function () {
      if (busy) return; busy = true;
      var done = function () { busy = false; };
      // the permission question must be asked straight from the tap
      Notification.requestPermission().then(function (p) {
        if (p !== 'granted') { show(p === 'denied' ? 'blocked' : 'ask'); done(); return; }
        return register(true).then(function (ok) {
          if (ok) { show('on'); ctx.toast('Alerts are on. Tap “Send me a test alert” to see one.'); } else show('sorry');
          done();
        });
      }).catch(function () { show('sorry'); done(); });
    });
    $('b-al-test').addEventListener('click', function () {
      var b = $('b-al-test'); b.disabled = true;
      register(false).then(function () { return ctx.call('/push-test', {}); }).then(function (d) {
        ctx.toast(d && d.sent > 0 ? 'Sent. Your phone should buzz in a moment.' : 'No phone is set up yet. Tap Turn on alerts on your phone first.');
      }).catch(function (e) {
        ctx.toast(e && e.code === 'slow_down' ? 'That’s a lot of tests for now. Try again in a few minutes.' : 'That didn’t go through. Try again?');
      }).then(function () { b.disabled = false; });
    });
    $('b-al-off').addEventListener('click', function () {
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
        if (!sub) { show('ask'); return null; }
        var ep = sub.endpoint;
        return ctx.call('/push-unsubscribe', { endpoint: ep }).catch(function () { /* fine */ }).then(function () { return sub.unsubscribe(); }).then(function () { show('ask'); ctx.toast('Alerts are off on this phone.'); });
      }).catch(function () { ctx.toast('That didn’t go through. Try again?'); });
    });
  }

  // ---- texts too (Nov 15 2026): her own yes, kept by the server with the time and the exact words
  function renderTexts(sms) {
    var box = $('al-text');
    if (!box) return;
    if (!sms || !sms.available) { box.hidden = true; return; }
    box.hidden = false;
    $('al-text-on').hidden = !sms.on;
    $('f-al-text').hidden = !!sms.on;
    $('al-text-h').textContent = sms.on ? 'Texts are on' : 'Get a text too';
    $('al-text-now').textContent = 'A short text goes to the number ending in ' + sms.last4 + ' when someone books, changes or cancels, or asks for another time. Reply STOP anytime to stop.';
    if (sms.consent) $('al-text-consent').textContent = sms.consent;
  }
  function wireTexts() {
    var err = function (m) { var p = $('al-text-err'); p.hidden = !m; p.textContent = m || ''; };
    $('f-al-text').addEventListener('submit', function (ev) {
      ev.preventDefault(); err('');
      var digits = $('in-al-cell').value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
      if (digits.length !== 10) { err('That doesn’t look like a 10-digit number.'); $('in-al-cell').focus(); return; }
      if (!$('in-al-agree').checked) { err('Tick the box to say yes to texts.'); $('in-al-agree').focus(); return; }
      var b = $('b-al-text'); b.disabled = true;
      ctx.call('/sms-alerts', { on: true, phone: digits, agree: true }).then(function (d) {
        renderTexts(Object.assign({}, lastSms, d.sms || {})); ctx.toast('Texts are on.');
      }).catch(function (e) {
        err(e && e.code === 'slow_down' ? 'That’s a lot of changes for now. Try again in a bit.' : 'That didn’t go through. Try again?');
      }).then(function () { b.disabled = false; });
    });
    $('b-al-text-test').addEventListener('click', function () {
      var b = $('b-al-text-test'); b.disabled = true;
      ctx.call('/sms-alerts-test', {}).then(function (d) {
        ctx.toast(d && d.ok ? 'Sent. A text should arrive in a moment.' : 'That didn’t go through. Try again in a bit.');
      }).catch(function () { ctx.toast('That didn’t go through. Try again?'); }).then(function () { b.disabled = false; });
    });
    $('b-al-text-off').addEventListener('click', function () {
      ctx.call('/sms-alerts', { on: false }).then(function () { renderTexts(Object.assign({}, lastSms, { on: false })); ctx.toast('Texts are off.'); })
        .catch(function () { ctx.toast('That didn’t go through. Try again?'); });
    });
  }
  var lastSms = null;

  function setTitle(name) {
    var m = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (m && name) m.setAttribute('content', String(name).slice(0, 30));
  }

  window.wfAlerts = {
    // ctx: { call(path, body) -> Promise of the answer, server, name, toast(text) }
    sync: function (c) {
      ctx = c;
      if (!$('sec-alerts')) return;
      setTitle(c.name);
      wire();
      if (!textsWired) { textsWired = true; wireTexts(); }
      ctx.call('/push-status', {}).then(function (d) { lastSms = d && d.sms ? d.sms : null; renderTexts(lastSms); }).catch(function () { /* no texts box */ });
      var iosTab = isIOS() && !standalone();
      if (!canPush()) { show(iosTab ? 'install' : 'sorry'); registerWorker(); return; }
      registerWorker();
      if (Notification.permission === 'granted') {
        show('on');
        if (!synced) { synced = true; register(false).then(function (ok) { if (!ok) show('ask'); }); }
      } else if (Notification.permission === 'denied') show('blocked');
      else show('ask');
    }
  };
})();
