/* Web Faery mouse tracer (Nov 11 2026), made like Linnea's charm trail but in Web Faery's own colors and stickers.
   With a desktop mouse, a ribbon of hand drawn stars (wobbly ink outline, bubblegum fills) follows the cursor. Over anything you can
   click, the die-cut stickers from ceiling.css (star, bolt, moon, flower, butterfly, face) pop on one after another with a little bounce,
   and a click throws a small burst. Off for touch and with reduced motion, paused in a hidden tab, quiet over forms and dialogs.
   Pooled elements, capped, one requestAnimationFrame loop that only writes transform and opacity. Needs ceiling.css for the sticker art
   (--st0 to --st7); without it only the stars show. Nothing here is read from or sent to anywhere. */
(function () {
  'use strict';
  if (!window.matchMedia || !('PointerEvent' in window) || !window.requestAnimationFrame || !document.body) return;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (rm.matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var NS = 'http://www.w3.org/2000/svg', INK = '#1a1420';
  var FILLS = ['#f5967a', '#ffd37a', '#b5e3c8', '#f7a9b4', '#d6c8f5', '#9ed6dc'];
  // four hand drawn star outlines: points are nudged off true so no two look stamped
  var STARS = [
    'M20 3.4C21.6 11 24.6 14.3 36.6 19.6C25 25.2 22 28 20.4 36.8C18 27.4 15.2 24.6 3.2 20.8C14.6 15.8 18.2 12.6 20 3.4Z',
    'M19.4 3C22 10.6 24 15 37 19.2C26.2 23.6 22.6 28.4 21 37C17.6 28.6 14.4 24 3.4 21.4C13.6 17.2 17.8 13.4 19.4 3Z',
    'M20.6 3.6C20.8 12 24.4 14 36.4 20.6C24.2 24.4 21.4 27.6 19.2 36.4C17.4 27 14.6 23.8 3.6 19.4C14.8 16.6 19 13 20.6 3.6Z',
    'M20 2.8C22.4 10.2 23.6 15.6 37.2 20.4C26.4 23.4 21.8 27 20.2 37.2C16.8 28.4 15 23.6 2.8 19.6C15.6 16.6 18.4 12.2 20 2.8Z'
  ];
  var STICKERS = ['--st0', '--st1', '--st2', '--st3', '--st5', '--st6', '--st7', '--st4'];
  var HOT = 'a[href], button:not(:disabled), summary, label, select:not(:disabled), [role="button"], [role="tab"]';
  var QUIET = 'dialog, textarea, .wfm, .wfm-pin, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])';

  var st = document.createElement('style');
  st.textContent = '.wf-tracer{position:fixed;inset:0;z-index:2147482000;pointer-events:none;overflow:hidden;contain:strict}' +
    '.wf-tracer i{position:absolute;left:0;top:0;display:block;opacity:0;will-change:transform,opacity}' +
    '.wf-tracer svg{display:block;overflow:visible}' +
    '.wf-tracer .wt-st{width:44px;height:44px;background:center/contain no-repeat;' +
    'filter:drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff) drop-shadow(2px 3px 0 rgb(42 31 92 / .3))}' +
    '@media print{.wf-tracer{display:none}}';
  document.head.appendChild(st);

  function mk(tag, at) { var el = document.createElementNS(NS, tag); for (var k in at) el.setAttribute(k, at[k]); return el; }
  var box = document.createElement('div'); box.className = 'wf-tracer'; box.setAttribute('aria-hidden', 'true');
  var tw = [], ch = [], i;
  for (i = 0; i < 22; i++) {
    var svg = mk('svg', { viewBox: '0 0 40 40', width: 28, height: 28, focusable: 'false' });
    var p = mk('path', { d: STARS[i % STARS.length], fill: FILLS[i % FILLS.length], stroke: INK, 'stroke-width': '3', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    svg.appendChild(p);
    var w = document.createElement('i'); w.appendChild(svg); box.appendChild(w); tw.push({ el: w, on: false, sz: 28 });
  }
  for (i = 0; i < 6; i++) {
    var s = document.createElement('i'); s.className = 'wt-st'; s.style.width = s.style.height = '44px';
    s.style.backgroundImage = 'var(' + STICKERS[i] + ')';
    var cw = document.createElement('i'); cw.appendChild(s); box.appendChild(cw); ch.push({ el: cw, on: false, sz: 44 });
  }
  document.body.appendChild(box);

  var raf = 0, ti = 0, ki = 0, ks = 0, vw = window.innerWidth;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function take(list, from) {
    for (var j = 0; j < list.length; j++) { var q = list[(from + j) % list.length]; if (!q.on) return q; }
    return null;
  }
  function go(q, x, y, dx, dy, r0, r1, s0, life) {
    q.x = x; q.y = y; q.dx = dx; q.dy = dy; q.r0 = r0; q.r1 = r1; q.s0 = s0; q.life = life; q.t0 = performance.now(); q.on = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function twinkle(x, y, dx, dy, life, s0) {
    var q = take(tw, ti); if (!q) return; ti = (tw.indexOf(q) + 1) % tw.length;
    var r0 = rnd(0, 45);
    go(q, x, y, dx, dy, r0, r0 + rnd(50, 110) * (Math.random() < 0.5 ? -1 : 1), s0, life);
  }
  function sticker(x, y, s0) {
    var q = take(ch, ki); if (!q) return; ki = (ch.indexOf(q) + 1) % ch.length;
    // each pop shows the next sticker in the sheet, so a sweep over a menu rolls through all of them
    q.el.firstChild.style.backgroundImage = 'var(' + STICKERS[ks++ % STICKERS.length] + ')';
    q.pop = s0 === 1;
    var r0 = rnd(8, 18) * (Math.random() < 0.5 ? -1 : 1);
    go(q, (x + 50 > vw ? x - 22 : x + 22) + (q.pop ? 0 : rnd(-6, 6)), Math.max(24, y - 22) + (q.pop ? 0 : rnd(-4, 4)), rnd(-4, 6), -rnd(14, 22), r0, r0 * -0.25, s0, q.pop ? 950 : 800);
  }
  function paint(list, now, isSticker) {
    var n = 0;
    for (var j = 0; j < list.length; j++) {
      var q = list[j]; if (!q.on) continue;
      var k = (now - q.t0) / q.life; if (k < 0) k = 0;
      if (k >= 1) { q.on = false; q.el.style.opacity = '0'; continue; }
      n++;
      var e = 1 - Math.pow(1 - k, 3), sc, op;
      if (isSticker) {
        sc = q.s0 * (k < 0.16 ? 0.25 + 0.93 * (k / 0.16) : k < 0.3 ? 1.18 - 0.18 * ((k - 0.16) / 0.14) : 1 - 0.15 * ((k - 0.3) / 0.7));
        op = k < 0.06 ? k / 0.06 : k > 0.62 ? 1 - (k - 0.62) / 0.38 : 1;
      } else {
        sc = q.s0 * (1 - 0.55 * k);
        op = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
      }
      q.el.style.opacity = op.toFixed(3);
      q.el.style.transform = 'translate(' + (q.x + q.dx * e - q.sz / 2).toFixed(1) + 'px,' + (q.y + q.dy * e - q.sz / 2).toFixed(1) + 'px) rotate(' + (q.r0 + (q.r1 - q.r0) * e).toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
    }
    return n;
  }
  function frame(now) {
    raf = 0;
    if (paint(tw, now, false) + paint(ch, now, true)) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0; hot = null;
    tw.concat(ch).forEach(function (q) { if (q.on) { q.on = false; q.el.style.opacity = '0'; } });
  }

  var last = 0, lx = -99, ly = -99, hot = null, hotT = 0, hx = -99, hy = -99;
  function ok(e) { return e.pointerType === 'mouse' && !document.hidden && !rm.matches; }
  document.addEventListener('pointermove', function (e) {
    if (!ok(e)) return;
    var t = e.target; if (!t || !t.closest || t.closest(QUIET)) { hot = null; return; }
    var x = e.clientX, y = e.clientY, now = performance.now(), h = t.closest(HOT);
    if (h) {
      var fresh = h !== hot, d = (x - hx) * (x - hx) + (y - hy) * (y - hy); hot = h;
      if (fresh || (now - hotT > 150 && d > 900)) { sticker(x, y, fresh ? 1 : 0.8); hotT = now; hx = x; hy = y; }
      return;
    }
    hot = null;
    if (now - last < 36) return;
    var vx = x - lx, vy = y - ly; if (vx * vx + vy * vy < 160) return;
    if (lx < -50) { vx = 0; vy = 0; }
    last = now; lx = x; ly = y;
    twinkle(x + rnd(-5, 5), y + rnd(-5, 5), rnd(-9, 9) - vx * 0.2, rnd(10, 22) - vy * 0.15, 700, rnd(0.75, 1.05));
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (!ok(e) || e.button !== 0) return;
    var t = e.target; if (!t || !t.closest || t.closest(QUIET) || !t.closest(HOT)) return;
    var a0 = rnd(0, 60);
    for (var j = 0; j < 6; j++) { var a = (a0 + j * 60) * Math.PI / 180, r = rnd(24, 34); twinkle(e.clientX, e.clientY, Math.cos(a) * r, Math.sin(a) * r, 540, 0.85); }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) { if (!e.relatedTarget) { hot = null; lx = -99; ly = -99; } }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  window.addEventListener('resize', function () { vw = window.innerWidth; }, { passive: true });
  var onRm = function () { if (rm.matches) stop(); };
  if (rm.addEventListener) rm.addEventListener('change', onRm); else if (rm.addListener) rm.addListener(onRm);
})();
