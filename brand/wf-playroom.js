/* Web Faery draft: playroom viewing windows. Each add-on shows a live demo inside a little framed window, with a few designs to pick from. Canvas only, paused when off screen, still frame for reduced motion. */
(function () {
  var INK = '#1a1420', PAST = ['#f6a8c8', '#f7e07a', '#9ec5f0', '#a8e3c8', '#c7b3f2'], rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rnd(a, b) { return a + Math.random() * (b - a); } function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function star(c, x, y, r, rot, f) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); var k = .28; for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr = i % 2 ? r * k : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = f; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.restore(); }
  function shape(c, t, x, y, r, rot, f) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); if (t === 0) { c.moveTo(0, -r); c.lineTo(r, r * .8); c.lineTo(-r, r * .8); c.closePath(); } else if (t === 1) c.rect(-r * .8, -r * .8, r * 1.6, r * 1.6); else c.arc(0, 0, r * .85, 0, 6.3); c.fillStyle = f; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.restore(); }
  var stages = [];
  [].forEach.call(document.querySelectorAll('.stage[data-demo]'), function (el) {
    var kind = el.dataset.demo, S = { el: el, kind: kind, v: 0, parts: [], pts: [], vis: true, last: performance.now(), ptr: null };
    if (kind !== 'banner') { var cv = document.createElement('canvas'); el.insertBefore(cv, el.firstChild); S.cv = cv; S.c = cv.getContext('2d'); }
    function size() { if (!S.cv) return; var d = Math.min(2, window.devicePixelRatio || 1); S.W = el.clientWidth; S.H = el.clientHeight; S.cv.width = S.W * d; S.cv.height = S.H * d; S.c.setTransform(d, 0, 0, d, 0, 0); S.d = d; init(S); }
    S.size = size; stages.push(S); size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(el);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { S.vis = e[0].isIntersecting; if (S.vis) loop(); }).observe(el);
    if (kind === 'trail') {
      function mv(e) { var r = el.getBoundingClientRect(); S.ptr = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; spawn(S, S.ptr); loop(); }
      el.addEventListener('pointermove', mv); el.addEventListener('pointerdown', function (e) { mv(e); burst(S); });
    }
    var group = document.querySelector('.opts[data-for="' + kind + '"]');
    if (group) group.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (!b) return; [].forEach.call(group.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); S.v = +b.dataset.v; S.parts = []; S.pts = []; init(S); loop(); });
    if (kind === 'banner') init(S);
  });
  function init(S) {
    if (S.kind === 'saver') {
      S.parts = [];
      if (S.v === 0) for (var i = 0; i < 14; i++) S.parts.push({ x: rnd(0, S.W), y: rnd(0, S.H), vx: rnd(-18, 18), vy: rnd(-12, 12), rot: rnd(0, 6), vr: rnd(-.6, .6), t: i % 3, r: rnd(12, 20), f: PAST[i % 5] });
      if (S.v === 1) for (var j = 0; j < 70; j++) S.parts.push({ a: rnd(0, 6.283), d: rnd(0, 1), f: pick(PAST) });
      if (S.v === 2) { S.c.fillStyle = '#171a44'; S.c.fillRect(0, 0, S.W, S.H); S.next = 0; }
    }
    if (S.kind === 'banner') banner(S);
    if (S.kind !== 'banner' && (rm || S.kind === 'trail')) frame(S, performance.now(), 0);
  }
  function tile(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  var TILES = [
    null,
    { w: 140, bg: '#fff8f1', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="40" viewBox="0 0 140 40"><g stroke="#1a1420" stroke-width="3" stroke-linejoin="round"><path d="M18 8l12 24H6z" fill="#f6a8c8"/><rect x="42" y="9" width="22" height="22" fill="#9ec5f0"/><circle cx="90" cy="20" r="12" fill="#a8e3c8"/><path d="M118 6l12 14-12 14-12-14z" fill="#f7e07a"/></g></svg>' },
    { w: 160, bg: '#1a1420', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><g fill="none" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M0 12H44L56 24H100L112 12H160" stroke="#a8e3c8"/><path d="M0 28H30L42 16H70" stroke="#f6a8c8"/><path d="M90 30H118L130 18H160" stroke="#f7e07a"/></g><g stroke="#1a1420" stroke-width="2"><circle cx="44" cy="12" r="5" fill="#fff8f1"/><circle cx="100" cy="24" r="5" fill="#fff8f1"/><circle cx="70" cy="16" r="5" fill="#9ec5f0"/><circle cx="130" cy="18" r="5" fill="#c7b3f2"/></g></svg>' },
    { w: 64, bg: '#fff8f1', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32" shape-rendering="crispEdges"><g stroke="#1a1420" stroke-width="2"><rect x="1" y="1" width="14" height="14" fill="#f6a8c8"/><rect x="17" y="1" width="14" height="14" fill="#f7e07a"/><rect x="33" y="1" width="14" height="14" fill="#9ec5f0"/><rect x="49" y="1" width="14" height="14" fill="#a8e3c8"/><rect x="1" y="17" width="14" height="14" fill="#a8e3c8"/><rect x="17" y="17" width="14" height="14" fill="#9ec5f0"/><rect x="33" y="17" width="14" height="14" fill="#f7e07a"/><rect x="49" y="17" width="14" height="14" fill="#f6a8c8"/></g></svg>' },
    { w: 120, bg: '#c7b3f2', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><g stroke="#1a1420" stroke-width="2.5" stroke-linejoin="round"><path d="M20 4l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#f7e07a"/><path d="M62 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff8f1"/><path d="M96 4l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#f6a8c8"/></g></svg>' }
  ];
  function banner(S) {
    var strip = S.el.querySelector('.strip'), words = ['Websites for healers', 'bakers', 'dreamers', 'witches', 'faeries', 'orcs', 'small local businesses', 'made by one person'];
    strip.className = 'strip'; strip.style.cssText = 'bottom:0';
    if (S.v === 0) { var h = ''; for (var r = 0; r < 2; r++) words.forEach(function (w, i) { h += w + '<span class="dm" style="background:' + PAST[i % 5] + '"></span>'; }); strip.style.background = '#f7e07a'; strip.innerHTML = '<div class="lbl">New</div><div class="run" style="padding-left:70px">' + h + '</div>'; return; }
    if (S.v === 5) { var w2 = ['Seven steps to blast off your site', 'No pressure', 'No rush', 'Snacks optional', 'A website you get to keep', 'Made by one person', 'Launch day is a party'], h2 = ''; for (var q = 0; q < 2; q++) w2.forEach(function (w, i) { h2 += '<span style="color:' + PAST[i % 5] + '">' + w + '</span><span class="dm" style="background:#fff8f1;border-color:#fff8f1"></span>'; }); strip.style.background = '#1a1420'; strip.innerHTML = '<div class="run">' + h2 + '</div>'; return; }
    var t = TILES[S.v]; strip.className = 'strip design'; strip.innerHTML = ''; strip.style.cssText = 'bottom:0;height:' + (S.v === 3 ? 38 : 46) + 'px;background-color:' + t.bg + ';background-image:' + tile(t.svg) + ';background-size:' + t.w + 'px auto;background-repeat:repeat-x;background-position:0 50%;--tw:' + t.w + 'px';
  }
  function spawn(S, p) {
    var q = S.pts[S.pts.length - 1]; if (S.v === 2) { S.pts.push({ x: p.x, y: p.y, t: p.t }); if (S.pts.length > 60) S.pts.shift(); return; }
    var need = S.v === 1 ? 34 : 14; if (q && Math.hypot(p.x - q.x, p.y - q.y) < need) return; S.pts.push({ x: p.x, y: p.y });
    if (S.pts.length > 3) S.pts.shift();
    if (S.v === 0) S.parts.push({ x: p.x + rnd(-5, 5), y: p.y + rnd(-5, 5), vx: rnd(-14, 14), vy: rnd(14, 40), rot: rnd(0, 6), vr: rnd(-3, 3), r: rnd(7, 11), f: pick(PAST), t0: performance.now(), life: 750 });
    if (S.v === 1) S.parts.push({ x: p.x + 14, y: p.y - 12, vx: rnd(-8, 12), vy: -rnd(16, 28), rot: rnd(-.4, .4), vr: rnd(-1, 1), r: rnd(11, 15), f: pick(PAST), tp: Math.floor(rnd(0, 3)), t0: performance.now(), life: 900 });
    if (S.v === 3) for (var i = 0; i < 2; i++) S.parts.push({ x: p.x + rnd(-8, 8), y: p.y + rnd(-8, 8), vx: rnd(-30, 30), vy: rnd(-20, 10), g: 140, f: pick(PAST), t0: performance.now(), life: 800 });
  }
  function burst(S) { if (!S.ptr || S.v === 2) return; for (var i = 0; i < 6; i++) { var a = i * 1.047; S.parts.push({ x: S.ptr.x, y: S.ptr.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, rot: 0, vr: 2, r: 8, f: PAST[i % 5], t0: performance.now(), life: 520, tp: S.v === 1 ? i % 3 : -1, g: S.v === 3 ? 60 : 0 }); } }
  function frame(S, now, dt) {
    var c = S.c, W = S.W, H = S.H, i;
    if (S.kind === 'trail') {
      c.clearRect(0, 0, W, H);
      if (S.v === 2) { var P = S.pts.filter(function (p) { return now - p.t < 650; }); S.pts = P; if (P.length > 1) { for (var s = -1; s <= 1; s++) { c.beginPath(); P.forEach(function (p, k) { var n = P[Math.min(k + 1, P.length - 1)], pv = P[Math.max(k - 1, 0)], dx = n.x - pv.x, dy = n.y - pv.y, L = Math.hypot(dx, dy) || 1, ox = -dy / L * s * 6, oy = dx / L * s * 6; k ? c.lineTo(p.x + ox, p.y + oy) : c.moveTo(p.x + ox, p.y + oy); }); c.lineWidth = 2.4; c.strokeStyle = INK; c.lineJoin = 'round'; c.globalAlpha = .9; c.stroke(); } P.forEach(function (p, k) { if (k % 7 === 0 || k === P.length - 1) { c.globalAlpha = 1; c.beginPath(); c.arc(p.x, p.y, k === P.length - 1 ? 6 : 4, 0, 6.3); c.fillStyle = k === P.length - 1 ? '#e63b2e' : '#fff8f1'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); } }); c.globalAlpha = 1; } return P.length > 0; }
      S.parts = S.parts.filter(function (p) { var k = (now - p.t0) / p.life; if (k >= 1) return false; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; p.rot += p.vr * dt; c.globalAlpha = k > .5 ? 1 - (k - .5) / .5 : 1; var sc = S.v === 1 ? (k < .16 ? .3 + 4.4 * k : 1) : 1 - .5 * k;
        if (S.v === 3 || p.tp === -1 && S.v === 3) { var sz = 7 * (1 - .4 * k), qx = Math.round(p.x / 4) * 4, qy = Math.round(p.y / 4) * 4; c.fillStyle = p.f; c.fillRect(qx, qy, sz, sz); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(qx, qy, sz, sz); }
        else if (S.v === 1) shape(c, p.tp >= 0 ? p.tp : 0, p.x, p.y, p.r * sc, p.rot, p.f); else star(c, p.x, p.y, p.r * sc, p.rot, p.f); return true; });
      c.globalAlpha = 1; return S.parts.length > 0;
    }
    if (S.kind === 'saver') {
      if (S.v === 0) { c.fillStyle = '#171a44'; c.fillRect(0, 0, W, H); S.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.x < -30) p.x = W + 30; if (p.x > W + 30) p.x = -30; if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30; shape(c, p.t, p.x, p.y, p.r, p.rot, p.f); }); }
      if (S.v === 1) { c.fillStyle = '#171a44'; c.fillRect(0, 0, W, H); var cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2; S.parts.forEach(function (p) { p.d += dt * .35; if (p.d > 1) { p.d = 0; p.a = rnd(0, 6.283); } var d = p.d * p.d, x = cx + Math.cos(p.a) * d * R, y = cy + Math.sin(p.a) * d * R, sz = 2 + d * 10; c.fillStyle = p.f; c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, sz, sz); }); }
      if (S.v === 2) { c.fillStyle = 'rgba(23,26,68,.025)'; c.fillRect(0, 0, W, H); S.next -= dt; if (S.next <= 0) { S.next = .22; var e = Math.floor(rnd(0, 4)), x0 = e < 2 ? rnd(0, W) : (e === 2 ? 0 : W), y0 = e < 2 ? (e ? H : 0) : rnd(0, H), a = (e === 2 ? 0 : e === 3 ? 2 : e === 0 ? 1 : 3) * Math.PI / 2; S.parts.push({ x: x0, y: y0, a: a, n: 0, f: pick(PAST) }); }
        S.parts = S.parts.filter(function (p) { var st = 70 * dt, nx = p.x + Math.cos(p.a) * st, ny = p.y + Math.sin(p.a) * st; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(nx, ny); c.lineWidth = 3; c.strokeStyle = p.f; c.stroke(); p.x = nx; p.y = ny; p.n += st; if (p.n > rnd(30, 70)) { p.n = 0; p.a += (Math.random() < .5 ? -1 : 1) * Math.PI / 4; } if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10 || Math.random() < .004) { c.beginPath(); c.arc(p.x, p.y, 4, 0, 6.3); c.fillStyle = p.f; c.fill(); return false; } return true; }); }
      return !rm;
    }
    return false;
  }
  var raf = 0;
  function loop() { if (raf) return; raf = requestAnimationFrame(tick); }
  function tick(now) { raf = 0; var more = false; stages.forEach(function (S) { if (S.kind === 'banner' || !S.vis || !S.c) return; var dt = Math.min(.05, (now - S.last) / 1000); S.last = now; if (frame(S, now, dt)) more = true; }); if (more) raf = requestAnimationFrame(tick); }
  stages.forEach(function (S) { S.last = performance.now(); }); loop();
})();
