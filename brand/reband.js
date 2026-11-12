/* Margin shapes wired together on a page's board (desktop only). Needs wf-shapes.js and wf-wires.js.
   The shapes sit in the side margins, never over the words; they are decoration (aria-hidden, no pointer events). */
(function () {
  var b = document.getElementById('board');
  if (!b || !window.WFShapes || !window.WFWires) return;
  if (window.innerWidth < 960) return;
  var types = ['triangle', 'disc', 'square', 'target', 'chip', 'peak', 'checker', 'zigzag', 'wave', 'hatched', 'dots'];
  var cols = ['butter', 'blue', 'mint', 'pink', 'lav'];
  var seed = 11 + (document.title || '').length;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function place() {
    [].slice.call(b.querySelectorAll('.sh.dec')).forEach(function (e) { e.remove(); });
    var H = b.scrollHeight, W = b.clientWidth;
    var colW = Math.min(680, W - 40), margin = Math.max(0, (W - colW) / 2 - 20);
    if (margin < 90) return;
    var n = Math.max(4, Math.min(16, Math.round(H / 170))), i, links = [];
    for (i = 0; i < n; i++) {
      var t = types[Math.floor(rnd() * types.length)], c = cols[Math.floor(rnd() * cols.length)];
      var size = Math.min(margin - 20, 52 + Math.floor(rnd() * 30)) + ((t === 'wave' || t === 'zigzag') ? 20 : 0);
      var el = document.createElement('div');
      el.className = 'sh dec'; el.setAttribute('aria-hidden', 'true');
      el.setAttribute('data-wire', 'z' + i); el.setAttribute('data-shape', t); el.setAttribute('data-color', c); el.setAttribute('data-size', String(size));
      var off = Math.floor(rnd() * Math.max(1, margin - size - 10)) + 6;
      el.style.top = Math.max(6, (i + 0.5) / n * H - size / 2 + (rnd() - 0.5) * 40) + 'px';
      if (i % 2 === 0) el.style.left = off + 'px'; else el.style.right = off + 'px';
      b.appendChild(el);
      if (i > 1) links.push(['z' + (i - 2), 'z' + i]);   // same side only, so wires stay in the margin
    }
    WFShapes.mount(b);
    WFWires.attach(b, links, { n: 3, spacing: 9, color: '#1a1420' });
  }
  place();
  var last = window.innerWidth;
  window.addEventListener('resize', function () { if (Math.abs(window.innerWidth - last) > 80) { last = window.innerWidth; if (window.innerWidth < 960) { [].slice.call(b.querySelectorAll('.dec')).forEach(function (e) { e.remove(); }); } else place(); } });
})();
