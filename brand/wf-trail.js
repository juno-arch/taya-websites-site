/* Web Faery cursor tracer (draft), in the spirit of the Linnea charm trail.
   Stars follow the cursor. Over anything you can click, the brand shapes (triangle, square, disc, target, chip, peak) pop on one after another like stickers, and a click throws a little burst of stars. Same behavior as her code.
   Desktop mouse only, off with reduced motion, paused in a hidden tab. Pooled elements and one requestAnimationFrame loop (only transform and opacity).
   Needs wf-shapes.js. Turn off and on with WFTrail.on = false / true. */
(function () {
  if (!window.matchMedia || !window.requestAnimationFrame || !document.body) return;
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  var api = window.WFTrail = { on: !rm.matches && matchMedia('(hover: hover) and (pointer: fine)').matches };
  var NS = 'http://www.w3.org/2000/svg', INK = '#1a1420', PAST = ['#f6a8c8', '#f7e07a', '#9ec5f0', '#a8e3c8', '#c7b3f2'];
  var TYPES = ['triangle', 'square', 'disc', 'target', 'chip', 'peak'], COLS = ['pink', 'blue', 'lav', 'butter', 'mint', 'pink'];
  var HOT = 'a[href], button:not(:disabled), summary, label, select:not(:disabled), [role="button"], [role="tab"]';
  var QUIET = 'dialog, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])';
  function mk(tag, at) { var el = document.createElementNS(NS, tag); for (var k in at) el.setAttribute(k, at[k]); return el; }
  var box = document.createElement('div'); box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;inset:0;z-index:90;pointer-events:none;overflow:hidden;contain:strict';
  var st = [], sh = [], i;
  for (i = 0; i < 22; i++) {                                   /* stars and beads */
    var s = mk('svg', { viewBox: '0 0 40 40', width: 20, height: 20, focusable: 'false' }), bead = i % 4 === 3;
    var g = bead ? mk('circle', { cx: 20, cy: 20, r: 9 }) : mk('path', { d: 'M20 3l5.4 11.6L37 20l-11.6 5.4L20 37l-5.4-11.6L3 20l11.6-5.4Z', 'stroke-linejoin': 'round' });
    g.setAttribute('fill', PAST[i % 5]); g.setAttribute('stroke', INK); g.setAttribute('stroke-width', '3.2');
    var w = document.createElement('i'); w.style.cssText = 'position:absolute;left:0;top:0;display:block;opacity:0;will-change:transform,opacity';
    s.style.cssText = 'display:block;overflow:visible'; s.appendChild(g); w.appendChild(s); box.appendChild(w); st.push({ el: w, on: false, sz: 20, bead: bead });
  }
  function buildShapes() {                                      /* bigger shapes, built once WFShapes is there */
    if (sh.length || !window.WFShapes) return;
    for (var j = 0; j < 6; j++) {
      var sz = 36, w2 = document.createElement('i'); w2.style.cssText = 'position:absolute;left:0;top:0;display:block;opacity:0;width:' + sz + 'px;will-change:transform,opacity';
      w2.innerHTML = WFShapes.svg(TYPES[j % TYPES.length], COLS[(j * 2 + 1) % COLS.length], sz); box.appendChild(w2); sh.push({ el: w2, on: false, sz: sz });
    }
  }
  document.body.appendChild(box);
  var raf = 0, si = 0, hi = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function take(list, from) { for (var j = 0; j < list.length; j++) { var p = list[(from + j) % list.length]; if (!p.on) return p; } return null; }
  function go(p, x, y, dx, dy, r0, r1, s0, life) { p.x = x; p.y = y; p.dx = dx; p.dy = dy; p.r0 = r0; p.r1 = r1; p.s0 = s0; p.life = life; p.t0 = performance.now(); p.on = true; if (!raf) raf = requestAnimationFrame(frame); }
  function star(x, y, dx, dy, s0, life) { var p = take(st, si); if (!p) return; si = (st.indexOf(p) + 1) % st.length; var r0 = rnd(0, 45); go(p, x, y, dx, dy, r0, r0 + rnd(50, 110) * (Math.random() < .5 ? -1 : 1), (p.bead ? .62 : 1) * s0, life || 680); }
  function shape(x, y, s0) { buildShapes(); var p = take(sh, hi); if (!p) return; hi = (sh.indexOf(p) + 1) % sh.length; p.pop = s0 === 1; var r0 = rnd(8, 18) * (Math.random() < .5 ? -1 : 1); go(p, (x + 38 > innerWidth ? x - 18 : x + 18) + (p.pop ? 0 : rnd(-6, 6)), Math.max(20, y - 18) + (p.pop ? 0 : rnd(-4, 4)), rnd(-4, 6), -rnd(14, 22), r0, r0 * -.25, s0, p.pop ? 950 : 800); }
  function paint(list, now, big) {
    var n = 0;
    for (var j = 0; j < list.length; j++) {
      var p = list[j]; if (!p.on) continue; var k = (now - p.t0) / p.life; if (k < 0) k = 0;
      if (k >= 1) { p.on = false; p.el.style.opacity = '0'; continue; } n++;
      var e = 1 - Math.pow(1 - k, 3), sc = big ? p.s0 * (k < .16 ? .25 + .93 * (k / .16) : k < .3 ? 1.18 - .18 * ((k - .16) / .14) : 1 - .15 * ((k - .3) / .7)) : p.s0 * (1 - .55 * k), op = big ? (k < .06 ? k / .06 : k > .62 ? 1 - (k - .62) / .38 : 1) : (k < .45 ? 1 : 1 - (k - .45) / .55);
      p.el.style.opacity = op.toFixed(3);
      p.el.style.transform = 'translate(' + (p.x + p.dx * e - p.sz / 2).toFixed(1) + 'px,' + (p.y + p.dy * e - p.sz / 2).toFixed(1) + 'px) rotate(' + (p.r0 + (p.r1 - p.r0) * e).toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
    }
    return n;
  }
  function frame(now) { raf = 0; if (paint(st, now, false) + paint(sh, now, true)) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; st.concat(sh).forEach(function (p) { if (p.on) { p.on = false; p.el.style.opacity = '0'; } }); }
  var last = 0, lx = -99, ly = -99, hot = null, hotT = 0, hx = -99, hy = -99;
  function ok(e) { return api.on && e.pointerType === 'mouse' && !document.hidden && !rm.matches; }
  document.addEventListener('pointermove', function (e) {
    if (!ok(e)) return;
    var t = e.target; if (!t || !t.closest || t.closest(QUIET)) { hot = null; return; }
    var x = e.clientX, y = e.clientY, now = performance.now(), h = t.closest(HOT);
    if (h) {
      var fresh = h !== hot, d = (x - hx) * (x - hx) + (y - hy) * (y - hy); hot = h;
      if (fresh || (now - hotT > 150 && d > 900)) { shape(x, y, fresh ? 1 : .8); hotT = now; hx = x; hy = y; }
      return;
    }
    hot = null;
    if (now - last < 36) return;
    var vx = x - lx, vy = y - ly; if (vx * vx + vy * vy < 160) return;
    if (lx < -50) { vx = 0; vy = 0; }
    last = now; lx = x; ly = y;
    star(x + rnd(-5, 5), y + rnd(-5, 5), rnd(-9, 9) - vx * .2, rnd(10, 22) - vy * .15, rnd(.7, 1), 680);
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (!ok(e) || e.button !== 0) return;
    var t = e.target; if (!t || !t.closest || t.closest(QUIET) || !t.closest(HOT)) return;
    var a0 = rnd(0, 60);
    for (var j = 0; j < 6; j++) { var a = (a0 + j * 60) * Math.PI / 180, r = rnd(22, 32); star(e.clientX, e.clientY, Math.cos(a) * r, Math.sin(a) * r, .85, 520); }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) { if (!e.relatedTarget) { hot = null; lx = -99; ly = -99; } }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
})();
