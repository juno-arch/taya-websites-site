/* Web Faery wires (draft). Draws bundles of thin parallel traces between elements on a "board".
   By default wires route directly and may overlap (Pollen preferred the look).
   Option avoid:true turns on a router that finds a free path for every bundle so wires never cross or overlap; links that cannot fit are listed in board.__wf.unrouted.
   Use: WFWires.attach(boardEl, [['a','b'], ['b','c']], {n:4, spacing:10, color:'#1a1420'}); elements need data-wire="a". */
(function () {
  var G = 10, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function Heap() { this.a = []; }
  Heap.prototype.push = function (f, s) { var a = this.a, i = a.length; a.push([f, s]); while (i > 0) { var p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; } };
  Heap.prototype.pop = function () { var a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0, n = a.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && a[l][0] < a[m][0]) m = l; if (r < n && a[r][0] < a[m][0]) m = r; if (m === i) break; var t = a[m]; a[m] = a[i]; a[i] = t; i = m; } } return top; };
  Heap.prototype.size = function () { return this.a.length; };

  function unit(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  function chamfer(pts, d0) {                         /* cut every 90 degree corner into two 45 degree turns */
    if (pts.length < 3) return pts; var out = [pts[0]], i;
    for (i = 1; i < pts.length - 1; i++) {
      var p = pts[i], u1 = unit(pts[i - 1], p), u2 = unit(p, pts[i + 1]), l1 = Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]), l2 = Math.hypot(pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]), d = Math.min(d0, l1 / 2 - 1, l2 / 2 - 1);
      if (d < 2) { out.push(p); continue; }
      out.push([p[0] - u1[0] * d, p[1] - u1[1] * d], [p[0] + u2[0] * d, p[1] + u2[1] * d]);
    }
    out.push(pts[pts.length - 1]); return out;
  }
  function bundle(pts, n, sp, color) {
    var clean = [pts[0]], i; for (i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - clean[clean.length - 1][0], pts[i][1] - clean[clean.length - 1][1]) > .5) clean.push(pts[i]);
    pts = clean; if (pts.length < 2) return '';
    var segs = [], out = '', k; for (i = 0; i < pts.length - 1; i++) segs.push(unit(pts[i], pts[i + 1]));
    for (k = 0; k < n; k++) {
      var off = (k - (n - 1) / 2) * sp, q = [];
      pts.forEach(function (P, i) {
        if (i === 0) { var d = segs[0]; q.push([P[0] - d[1] * off, P[1] + d[0] * off]); }
        else if (i === pts.length - 1) { var e = segs[segs.length - 1]; q.push([P[0] - e[1] * off, P[1] + e[0] * off]); }
        else { var d1 = segs[i - 1], d2 = segs[i], n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]], den = 1 + n1[0] * n2[0] + n1[1] * n2[1] || 1; q.push([P[0] + off * (n1[0] + n2[0]) / den, P[1] + off * (n1[1] + n2[1]) / den]); }
      });
      out += '<path d="M' + q.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
      [q[0], q[q.length - 1]].forEach(function (p) { out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.6" fill="' + color + '"/>'; });
    }
    return out;
  }
  function rectOf(el, board) { var r = el.getBoundingClientRect(), b = board.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }; }

  function simpleRoute(a, b, gap) {            /* direct routing: wires may overlap each other (Pollen preferred the look) */
    var ac = [a.x + a.w / 2, a.y + a.h / 2], bc = [b.x + b.w / 2, b.y + b.h / 2], dx = bc[0] - ac[0], dy = bc[1] - ac[1], pts;
    if (Math.abs(dx) >= Math.abs(dy)) {
      var s = dx > 0 ? 1 : -1, x1 = s > 0 ? a.x + a.w + gap : a.x - gap, x2 = s > 0 ? b.x - gap : b.x + b.w + gap, y1 = ac[1], y2 = bc[1], xm = (x1 + x2) / 2, sg = y2 > y1 ? 1 : -1, ady = Math.abs(y2 - y1);
      if (ady < 3) pts = [[x1, y1], [x2, y1]];
      else { var d = Math.min(22, ady / 2, Math.abs(x2 - x1) / 3); pts = [[x1, y1], [xm - s * d, y1], [xm, y1 + sg * d], [xm, y2 - sg * d], [xm + s * d, y2], [x2, y2]]; }
    } else {
      var t = dy > 0 ? 1 : -1, y1v = t > 0 ? a.y + a.h + gap : a.y - gap, y2v = t > 0 ? b.y - gap : b.y + b.h + gap, x1v = ac[0], x2v = bc[0], ym = (y1v + y2v) / 2, sx = x2v > x1v ? 1 : -1, adx = Math.abs(x2v - x1v);
      if (adx < 3) pts = [[x1v, y1v], [x1v, y2v]];
      else { var dd = Math.min(22, adx / 2, Math.abs(y2v - y1v) / 3); pts = [[x1v, y1v], [x1v, ym - t * dd], [x1v + sx * dd, ym], [x2v - sx * dd, ym], [x2v, ym + t * dd], [x2v, y2v]]; }
    }
    return pts;
  }
  function drawSimple(board, links, o) {
    var out = ''; links.forEach(function (l) {
      var A = board.querySelector('[data-wire="' + l[0] + '"]'), B = board.querySelector('[data-wire="' + l[1] + '"]'); if (!A || !B) return;
      var opt = l[2] || {}; out += bundle(simpleRoute(rectOf(A, board), rectOf(B, board), opt.gap == null ? 8 : opt.gap), opt.n || o.n, opt.spacing || o.spacing, opt.color || o.color);
    }); return out;
  }
  function plan(board, links, o, perm) {
    var br = board.getBoundingClientRect(), W = Math.ceil(br.width / G), H = Math.ceil(br.height / G), n = o.n, sp = o.spacing;
    var half = (n - 1) * sp / 2 + 5, infl = Math.max(2, Math.ceil(half / G)), lane = Math.max(2, Math.ceil(2 * half / G) - 1), gap = 6;
    var base = new Uint8Array(W * H), occ = new Uint8Array(W * H), els = {}, i, j;
    Array.prototype.forEach.call(board.querySelectorAll('[data-wire]'), function (el) { var r = rectOf(el, board); els[el.getAttribute('data-wire')] = { r: r, c: [Math.floor(r.x / G), Math.floor(r.y / G), Math.floor((r.x + r.w) / G), Math.floor((r.y + r.h) / G)] };
      for (j = Math.max(0, Math.floor(r.y / G) - infl); j <= Math.min(H - 1, Math.floor((r.y + r.h) / G) + infl); j++) for (i = Math.max(0, Math.floor(r.x / G) - infl); i <= Math.min(W - 1, Math.floor((r.x + r.w) / G) + infl); i++) base[j * W + i] = 1; });
    for (i = 0; i < W; i++) { base[i] = 1; base[(H - 1) * W + i] = 1; } for (j = 0; j < H; j++) { base[j * W] = 1; base[j * W + W - 1] = 1; }
    function ports(e) {
      var out = [], r = e.r, c = e.c, ts = [.5, .28, .72], t, s;
      ts.forEach(function (t, ti) { var pen = ti ? 3 : 0, cx = Math.floor((r.x + r.w * t) / G), cy = Math.floor((r.y + r.h * t) / G);
        out.push({ ci: cx, cj: c[1] - infl - 1, dir: 0, pen: pen, edge: [cx * G + G / 2, r.y - gap] });
        out.push({ ci: c[2] + infl + 1, cj: cy, dir: 1, pen: pen, edge: [r.x + r.w + gap, cy * G + G / 2] });
        out.push({ ci: cx, cj: c[3] + infl + 1, dir: 2, pen: pen, edge: [cx * G + G / 2, r.y + r.h + gap] });
        out.push({ ci: c[0] - infl - 1, cj: cy, dir: 3, pen: pen, edge: [r.x - gap, cy * G + G / 2] }); });
      return out.filter(function (p) { return p.ci > 0 && p.cj > 0 && p.ci < W - 1 && p.cj < H - 1; });
    }
    var order = links.map(function (l, idx) { var A = els[l[0]], B = els[l[1]]; return { l: l, idx: idx, d: A && B ? Math.abs(A.r.x - B.r.x) + Math.abs(A.r.y - B.r.y) : 1e9 }; }).sort(function (a, b) { return a.d - b.d; });
    if (perm) order = perm(order);
    var results = [], unrouted = [];
    function tryLink(it, laneUse, nUse) {
      var l = it.l, A = els[l[0]], B = els[l[1]]; if (!A || !B) return;
      var pa = ports(A).filter(function (p) { return !occ[p.cj * W + p.ci] && !base[p.cj * W + p.ci]; }), pb = ports(B).filter(function (p) { return !occ[p.cj * W + p.ci] && !base[p.cj * W + p.ci]; });
      if (!pa.length || !pb.length) return false;
      var goal = {}; pb.forEach(function (p) { goal[p.cj * W + p.ci] = p; });
      var bcx = Math.floor((B.r.x + B.r.w / 2) / G), bcy = Math.floor((B.r.y + B.r.h / 2) / G);
      var g = new Float32Array(W * H * 4).fill(1e9), par = new Int32Array(W * H * 4).fill(-1), hp = new Heap();
      pa.forEach(function (p) { var s = (p.cj * W + p.ci) * 4 + p.dir; g[s] = p.pen; par[s] = -2; hp.push(p.pen + Math.abs(p.ci - bcx) + Math.abs(p.cj - bcy), s); });
      var found = -1, expand = 0;
      while (hp.size() && expand++ < 60000) {
        var top = hp.pop(), s = top[1], idx = s >> 2, d = s & 3, x = idx % W, y = (idx / W) | 0;
        if (goal[idx]) { found = s; break; }
        for (var nd = 0; nd < 4; nd++) {
          if (nd === ((d + 2) & 3)) continue;
          var nx = x + DIRS[nd][0], ny = y + DIRS[nd][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          var ni = ny * W + nx; if ((base[ni] || occ[ni]) && !goal[ni]) continue;
          var ns = ni * 4 + nd, ng = g[s] + 1 + (nd !== d ? 7 : 0);
          if (ng < g[ns]) { g[ns] = ng; par[ns] = s; hp.push(ng + 0.9 * (Math.abs(nx - bcx) + Math.abs(ny - bcy)), ns); }
        }
      }
      if (found < 0) return false;
      var cells = [], s2 = found; while (s2 >= 0) { cells.push(s2 >> 2); s2 = par[s2]; } cells.reverse();
      var start = pa.filter(function (p) { return p.cj * W + p.ci === cells[0]; })[0] || pa[0], end = goal[cells[cells.length - 1]];
      var pts = cells.map(function (c) { return [(c % W) * G + G / 2, ((c / W) | 0) * G + G / 2]; });
      cells.forEach(function (c) { var cx = c % W, cy = (c / W) | 0, a, b; for (b = -laneUse; b <= laneUse; b++) for (a = -laneUse; a <= laneUse; a++) { var xx = cx + a, yy = cy + b; if (xx >= 0 && yy >= 0 && xx < W && yy < H) occ[yy * W + xx] = 1; } });
      var line = [start.edge], k; for (k = 0; k < pts.length; k++) { var p = pts[k], q = line[line.length - 1]; if (k === 0) { line.push(p); continue; } var nx2 = pts[k + 1], u1 = unit(q, p); if (nx2) { var u2 = unit(p, nx2); if (Math.abs(u1[0] - u2[0]) < 1e-6 && Math.abs(u1[1] - u2[1]) < 1e-6) continue; } line.push(p); }
      line.push(end.edge);
      var lp = [line[0]], m; for (m = 1; m < line.length; m++) { var pr = lp[lp.length - 1]; if (Math.hypot(line[m][0] - pr[0], line[m][1] - pr[1]) > 1) lp.push(line[m]); }
      /* make the lead-in and lead-out straight and square to the shape */
      results.push({ pts: chamfer(lp, 16), opt: l[2] || {}, n: nUse });
      return true;
    }
    order.forEach(function (it) { var l = it.l; if (!els[l[0]] || !els[l[1]]) return; if (tryLink(it, lane, n)) return; if (n > 1 && tryLink(it, Math.max(2, Math.ceil((2 * ((Math.ceil(n / 2) - 1) * sp / 2 + 5)) / G) - 1), Math.ceil(n / 2))) return; if (tryLink(it, 2, 1)) return; unrouted.push(l); });
    return { results: results, unrouted: unrouted };
  }
  function bestPlan(board, links, o, tries) {
    var best = plan(board, links, o), t, seed = 1;
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { seed = (seed * 16807) % 2147483647; var j = seed % (i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    for (t = 0; t < tries && best.unrouted.length; t++) { var p = plan(board, links, o, t === 0 ? function (a) { return a.slice().reverse(); } : shuffle); if (p.unrouted.length < best.unrouted.length) best = p; }
    return best;
  }
  function draw(board, links, o, tries) {
    var svg = board.querySelector('svg.wf-wires');
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'wf-wires'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:0'; board.insertBefore(svg, board.firstChild); }
    var br = board.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
    if (!o.avoid) { svg.innerHTML = drawSimple(board, links, o); board.__wf.unrouted = []; if (o.onRoute) o.onRoute([]); return; }
    var p = bestPlan(board, links, o, tries || 0), out = ''; p.results.forEach(function (r) { out += bundle(r.pts, r.opt.n || r.n || o.n, r.opt.spacing || o.spacing, r.opt.color || o.color); });
    svg.innerHTML = out; board.__wf.unrouted = p.unrouted; if (o.onRoute) o.onRoute(p.unrouted);
  }
  window.WFWires = {
    attach: function (board, links, o) {
      o = Object.assign({ n: 4, spacing: 10, color: '#1a1420', avoid: false }, o || {}); board.__wf = { links: links, o: o, unrouted: [] };
      var f = function () { draw(board, board.__wf.links, board.__wf.o); }; board.__wf.update = f;
      if (window.ResizeObserver) new ResizeObserver(f).observe(board); window.addEventListener('resize', f); f(); return f;
    },
    update: function (board) { if (board.__wf) board.__wf.update(); },
    settle: function (board) { if (board.__wf) draw(board, board.__wf.links, board.__wf.o, 14); },
    set: function (board, patch) { Object.assign(board.__wf.o, patch); board.__wf.update(); }
  };
})();
