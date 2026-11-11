/* card borders cut like grass: a zigzag with a single point at every corner, as a clip-path sized to each card (redrawn when it changes) */
(function () {
  var SEL = '.gutter .card, .gutter .cream, .gutter .qcard, .gutter .verdict, .site-foot .foot-in';
  var TOOTH = 44, AMP = 15, OUT = 3;
  function edge(len, n, amp, dir) { /* peaks at 0 and len, n teeth */
    var pts = [], step = len / n;
    for (var i = 0; i <= n * 2; i++) { var p = i * step / 2; pts.push([p, i % 2 === 0 ? 0 : amp]); }
    return pts;
  }
  function poly(w, h, amp, grow) {
    var nx = Math.max(2, Math.round(w / TOOTH)), ny = Math.max(2, Math.round(h / TOOTH)), g = grow, o = [];
    var t = edge(w, nx, amp), r = edge(h, ny, amp), i;
    for (i = 0; i < t.length; i++) o.push([t[i][0], t[i][1] - g * 0 + 0]);          /* top, left to right: peaks at y 0 */
    for (i = 1; i < r.length; i++) o.push([w - r[i][1], r[i][0]]);                    /* right, top to bottom */
    for (i = t.length - 2; i >= 0; i--) o.push([t[i][0], h - t[i][1]]);               /* bottom, right to left */
    for (i = r.length - 2; i > 0; i--) o.push([r[i][1], r[i][0]]);                    /* left, bottom to top */
    return o;
  }
  function str(pts, dx, dy) { return 'polygon(' + pts.map(function (p) { return (p[0] + dx).toFixed(1) + 'px ' + (p[1] + dy).toFixed(1) + 'px'; }).join(',') + ')'; }
  function outer(w, h, amp) { /* the same shape pushed outward by OUT on every side, in a box OUT bigger all round */
    var nx = Math.max(2, Math.round(w / TOOTH)), ny = Math.max(2, Math.round(h / TOOTH)), o = [], i;
    var t = edge(w, nx, amp), r = edge(h, ny, amp);
    for (i = 0; i < t.length; i++) o.push([t[i][0] + OUT, t[i][1] + OUT - OUT]);
    for (i = 1; i < r.length; i++) o.push([w - r[i][1] + OUT + OUT, r[i][0] + OUT]);
    for (i = t.length - 2; i >= 0; i--) o.push([t[i][0] + OUT, h - t[i][1] + OUT + OUT]);
    for (i = r.length - 2; i > 0; i--) o.push([r[i][1] + OUT - OUT, r[i][0] + OUT]);
    return 'polygon(' + o.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
  }
  function draw(el) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (w < 80 || h < 80) return;
    el.style.setProperty('--zi', str(poly(w, h, AMP, 0), 0, 0));
    el.style.setProperty('--zo', outer(w, h, AMP));
  }
  function run() {
    var els = document.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) draw(els[i]);
    if (window.ResizeObserver) { var ro = new ResizeObserver(function (es) { es.forEach(function (e) { draw(e.target); }); }); for (var j = 0; j < els.length; j++) ro.observe(els[j]); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var els = document.querySelectorAll(SEL); for (var i = 0; i < els.length; i++) draw(els[i]); });
})();
