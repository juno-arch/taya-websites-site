/* =====================================================================================================
   The pretend server for portal.html?demo=1 (Nov 16 2026). The REAL portal runs as a made-up client (Rosa Linden of
   Fern & Clay Pottery) with every tool on: shop, bookings, newsletter, gift certificates, visitors, receipts and more.
   Every call the portal makes to Web Faery's server is answered here, in this browser tab's memory; nothing leaves the
   page and a reload starts the sample fresh. The answers have the shapes the server sends (hub API.md).
   portal-demo.js is the project half (the Web Faery tab); this file is every tool.
   ===================================================================================================== */
(function () {
  'use strict';
  var SERVER = 'https://bookings.gardenfaery.love';
  var routes = {};            // 'family/path' -> function (body, st) -> answer object | Response-ish { __status, body } | { __blob }
  var S = {};                 // the sample's state, one object per tool, filled by the fixtures below

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function day(n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
  function isoDay(n) { return iso(day(n)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var W = { S: S, day: day, isoDay: isoDay, iso: iso, pad: pad, clone: clone,
    on: function (route, fn) { routes[route] = fn; },
    fail: function (status, error) { return { __status: status, body: { error: error } }; } };
  window.WFSample = W;

  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opt) {
    var u = String(url && url.url ? url.url : url);
    if (u.indexOf(SERVER + '/api/webfaery/') !== 0) return realFetch(url, opt);
    var path = u.slice((SERVER + '/api/webfaery/').length).split('?')[0].replace(/\/+$/, '');
    var body = {};
    try { body = opt && typeof opt.body === 'string' ? JSON.parse(opt.body) : {}; } catch (e) { body = {}; }
    var fn = routes[path];
    if (!fn) { try { console.warn('[sample] no answer for ' + path); } catch (e) { /* fine */ } return wait(80).then(function () { return json(404, { error: 'not_found' }); }); }
    return wait(120).then(function () { return fn(body || {}, S); }).then(function (a) {
      if (a && a.__blob) return new Response(a.__blob, { status: 200, headers: { 'Content-Type': a.type || 'text/plain' } });
      if (a && a.__status) return json(a.__status, a.body);
      return json(200, a == null ? {} : a);
    });
  };
  function json(status, o) { return new Response(JSON.stringify(o), { status: status, headers: { 'Content-Type': 'application/json' } }); }
})();
