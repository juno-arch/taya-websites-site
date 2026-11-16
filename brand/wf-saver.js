/* Web Faery idle screensaver. After a quiet while a full-screen saver plays; any move, key, tap or scroll wakes the page.
   It rotates through the three designs from the playroom (drifting stickers, pixel starfield, growing circuits): each new idle starts the next one.
   Canvas only, off for reduced motion, paused in a hidden tab. WFSaver.start(v) plays design v now (the playroom button); WFSaver.on = false turns it off. */
(function () {
  if (!window.requestAnimationFrame || !document.body) return;
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var api = window.WFSaver = { on: !(rm && rm.matches), idle: 45000, start: start, stop: stop };
  var INK = '#1a1420', BG = '#171a44', PAST = ['#f6a8c8', '#f7e07a', '#9ec5f0', '#a8e3c8', '#c7b3f2'], KEY = 'wf-saver-next';
  var cv, c, W, H, parts, v, raf = 0, last = 0, next = 0, timer = 0, running = false, armedAt = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shape(t, x, y, r, rot, f) {
    c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
    if (t === 0) { c.moveTo(0, -r); c.lineTo(r, r * .8); c.lineTo(-r, r * .8); c.closePath(); } else if (t === 1) c.rect(-r * .8, -r * .8, r * 1.6, r * 1.6); else c.arc(0, 0, r * .85, 0, 6.3);
    c.fillStyle = f; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(); c.restore();
  }
  function init() {
    parts = []; c.fillStyle = BG; c.fillRect(0, 0, W, H);
    var s = Math.max(1, Math.min(2.2, W / 900));
    if (v === 0) for (var i = 0; i < 18; i++) parts.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-22, 22), vy: rnd(-14, 14), rot: rnd(0, 6), vr: rnd(-.6, .6), t: i % 3, r: rnd(14, 24) * s, f: PAST[i % 5] });
    if (v === 1) for (var j = 0; j < 140; j++) parts.push({ a: rnd(0, 6.283), d: rnd(0, 1), f: pick(PAST) });
    if (v === 2) next = 0;
  }
  function frame(dt) {
    if (v === 0) { c.fillStyle = BG; c.fillRect(0, 0, W, H); parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.x < -40) p.x = W + 40; if (p.x > W + 40) p.x = -40; if (p.y < -40) p.y = H + 40; if (p.y > H + 40) p.y = -40; shape(p.t, p.x, p.y, p.r, p.rot, p.f); }); }
    if (v === 1) { c.fillStyle = BG; c.fillRect(0, 0, W, H); var cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2; parts.forEach(function (p) { p.d += dt * .35; if (p.d > 1) { p.d = 0; p.a = rnd(0, 6.283); } var d = p.d * p.d, x = cx + Math.cos(p.a) * d * R, y = cy + Math.sin(p.a) * d * R, sz = 2 + d * 12; c.fillStyle = p.f; c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, sz, sz); }); }
    if (v === 2) {
      c.fillStyle = 'rgba(23,26,68,.025)'; c.fillRect(0, 0, W, H); next -= dt;
      if (next <= 0) { next = .22; var e = Math.floor(rnd(0, 4)), x0 = e < 2 ? rnd(0, W) : (e === 2 ? 0 : W), y0 = e < 2 ? (e ? H : 0) : rnd(0, H), a = (e === 2 ? 0 : e === 3 ? 2 : e === 0 ? 1 : 3) * Math.PI / 2; parts.push({ x: x0, y: y0, a: a, n: 0, f: pick(PAST) }); }
      parts = parts.filter(function (p) {
        var st = 90 * dt, nx = p.x + Math.cos(p.a) * st, ny = p.y + Math.sin(p.a) * st; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(nx, ny); c.lineWidth = 3; c.strokeStyle = p.f; c.stroke(); p.x = nx; p.y = ny; p.n += st;
        if (p.n > rnd(30, 70)) { p.n = 0; p.a += (Math.random() < .5 ? -1 : 1) * Math.PI / 4; }
        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10 || Math.random() < .004) { c.beginPath(); c.arc(p.x, p.y, 4, 0, 6.3); c.fillStyle = p.f; c.fill(); return false; } return true;
      });
    }
  }
  function tick(now) {
    raf = 0; if (!running) return; var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!document.hidden) frame(dt);
    raf = requestAnimationFrame(tick);
  }
  function size() { if (!cv) return; var d = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); init(); }
  function nextDesign() { var n = 0; try { n = parseInt(localStorage.getItem(KEY), 10) || 0; localStorage.setItem(KEY, String((n + 1) % 3)); } catch (e) { n = Math.floor(Math.random() * 3); } return ((n % 3) + 3) % 3; }
  function start(which) {
    if (running || !document.body) return;
    v = typeof which === 'number' ? which : nextDesign();
    cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('data-wf-saver', '');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;background:' + BG + ';cursor:none;touch-action:none';
    document.body.appendChild(cv); c = cv.getContext('2d'); running = true; armedAt = performance.now(); size(); window.addEventListener('resize', size);
    last = performance.now(); raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running) return; running = false; window.removeEventListener('resize', size);
    if (raf) { cancelAnimationFrame(raf); raf = 0; } if (cv && cv.parentNode) cv.parentNode.removeChild(cv); cv = null;
  }
  function arm() { clearTimeout(timer); if (!api.on) return; timer = setTimeout(function () { if (document.hidden || !api.on) { arm(); return; } start(); }, api.idle); }
  function wake(e) {
    if (running) {
      if (performance.now() - armedAt < 600) return; // the touch or click that started it by hand (the playroom button) does not also end it
      stop(); if (e && e.cancelable && e.type !== 'scroll' && e.type !== 'pointermove') e.preventDefault();
    }
    arm();
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (t) { window.addEventListener(t, wake, { passive: false, capture: true }); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) arm(); });
  if (rm && rm.addEventListener) rm.addEventListener('change', function () { api.on = !rm.matches; if (!api.on) stop(); arm(); });
  arm();
})();
