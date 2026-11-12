/* Web Faery shape library (draft). Fixed shapes, same everywhere. Use: <div data-wire="a" data-shape="chip" data-color="mint" data-size="120"></div> then WFShapes.mount(root). */
(function () {
  var INK = '#1a1420';
  var COL = { butter: '#f7e07a', blue: '#9ec5f0', mint: '#a8e3c8', pink: '#f6a8c8', lav: '#c7b3f2', red: '#e63b2e', paper: '#fff8f1', ink: INK };
  var uid = 0;
  function rng(seed) { var s = seed || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function hatch(id) { return '<pattern id="' + id + '" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3.4" height="9" fill="' + INK + '"/></pattern>'; }
  function jag(id, poly, box, seed) {
    var r = rng(seed), s = '', step = 26, x, y;
    for (y = box[1] - step; y < box[1] + box[3] + step; y += step * 0.9) for (x = box[0] - step; x < box[0] + box[2] + step; x += step) {
      var cx = x + ((Math.round(y / step) % 2) ? 13 : 0) + (r() - .5) * 10, cy = y + (r() - .5) * 10, rr = 6 + r() * 3.5, k = r();
      if (k < .62) { var n = 1 + Math.floor(r() * 3), a0 = r() * 6.28, i; for (i = 0; i < n; i++) { var sp = (1.7 + r() * 2), a1 = a0, a2 = a0 + sp, big = sp > 3.14 ? 1 : 0;
        s += '<path d="M' + (cx + rr * Math.cos(a1)).toFixed(1) + ' ' + (cy + rr * Math.sin(a1)).toFixed(1) + ' A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 ' + big + ' 1 ' + (cx + rr * Math.cos(a2)).toFixed(1) + ' ' + (cy + rr * Math.sin(a2)).toFixed(1) + '" fill="none" stroke="' + INK + '" stroke-width="4.6" stroke-linecap="round"/>'; a0 += sp + .7; } }
      else { s += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="3.6" ry="2.4" transform="rotate(' + Math.floor(r() * 180) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" fill="' + INK + '"/>'; }
    }
    return '<g clip-path="url(#' + id + ')">' + s + '</g>';
  }
  var T = {
    triangle: function (c) { var p = '14,104 104,104 14,14'; return ['0 0 120 120', '<polygon points="' + p + '" fill="' + INK + '" transform="translate(7 7)"/><polygon points="' + p + '" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="miter"/>']; },
    peak: function (c) { var p = '60,12 106,104 14,104'; return ['0 0 120 120', '<polygon points="' + p + '" fill="' + INK + '" transform="translate(7 7)"/><polygon points="' + p + '" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="miter"/>']; },
    jaguar: function (c, id) { var p = '14,104 104,104 14,14'; return ['0 0 120 120', '<defs><clipPath id="' + id + '"><polygon points="' + p + '"/></clipPath></defs><polygon points="' + p + '" fill="' + INK + '" transform="translate(7 7)"/><polygon points="' + p + '" fill="' + c + '"/>' + jag(id, p, [14, 14, 90, 90], 11) + '<polygon points="' + p + '" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="miter"/>']; },
    disc: function (c, id) { return ['0 0 120 120', '<defs><clipPath id="' + id + '"><circle cx="66" cy="66" r="44"/></clipPath>' + hatch(id + 'h') + '</defs><g clip-path="url(#' + id + ')"><rect width="120" height="120" fill="url(#' + id + 'h)"/></g><circle cx="58" cy="58" r="44" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5"/>']; },
    target: function (c) { return ['0 0 120 120', '<circle cx="66" cy="66" r="44" fill="' + INK + '"/><circle cx="58" cy="58" r="44" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5"/><circle cx="58" cy="58" r="27" fill="' + COL.lav + '" stroke="' + INK + '" stroke-width="3.5"/><circle cx="58" cy="58" r="12" fill="' + COL.red + '" stroke="' + INK + '" stroke-width="3.5"/>']; },
    dots: function (c, id) { var s = '', i, j; for (i = -1; i < 9; i++) for (j = -1; j < 9; j++) s += '<circle cx="' + (14 + i * 13 + (j % 2 ? 6.5 : 0)) + '" cy="' + (14 + j * 12) + '" r="3.3" fill="' + INK + '"/>';
      return ['0 0 120 120', '<defs><clipPath id="' + id + '"><circle cx="58" cy="58" r="44"/></clipPath></defs><circle cx="66" cy="66" r="44" fill="' + INK + '"/><circle cx="58" cy="58" r="44" fill="' + c + '"/><g clip-path="url(#' + id + ')">' + s + '</g><circle cx="58" cy="58" r="44" fill="none" stroke="' + INK + '" stroke-width="3.5"/>']; },
    square: function (c) { return ['0 0 120 120', '<rect x="22" y="22" width="84" height="84" fill="' + INK + '"/><rect x="14" y="14" width="84" height="84" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="miter"/>']; },
    hatched: function (c, id) { return ['0 0 120 120', '<defs>' + hatch(id) + '</defs><rect x="23" y="23" width="84" height="84" fill="url(#' + id + ')"/><rect x="14" y="14" width="84" height="84" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="miter"/>']; },
    checker: function (c, id) { return ['0 0 120 120', '<defs><pattern id="' + id + '" x="14" y="14" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="' + INK + '"/><rect x="14" y="14" width="14" height="14" fill="' + INK + '"/></pattern></defs><rect x="22" y="22" width="84" height="84" fill="' + INK + '"/><rect x="14" y="14" width="84" height="84" fill="' + c + '"/><rect x="14" y="14" width="84" height="84" fill="url(#' + id + ')"/><rect x="14" y="14" width="84" height="84" fill="none" stroke="' + INK + '" stroke-width="3.5"/>']; },
    chip: function (c) { var s = '', i; for (i = 1; i <= 5; i++) { var t = 22 + i * 12; s += '<rect x="' + (t - 2.5) + '" y="8" width="5" height="12" fill="' + INK + '"/><rect x="' + (t - 2.5) + '" y="100" width="5" height="12" fill="' + INK + '"/><rect x="8" y="' + (t - 2.5) + '" width="12" height="5" fill="' + INK + '"/><rect x="100" y="' + (t - 2.5) + '" width="12" height="5" fill="' + INK + '"/>'; }
      return ['0 0 120 120', '<rect x="27" y="27" width="76" height="76" fill="' + INK + '"/>' + s + '<rect x="20" y="20" width="76" height="76" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5"/><rect x="40" y="40" width="36" height="36" fill="' + INK + '"/><circle cx="29" cy="29" r="3.5" fill="' + INK + '"/>']; },
    wave: function (c) { var d = 'M24 56 q20 -44 40 0 t40 0 t40 0'; return ['0 0 220 110', '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="22" stroke-linecap="round" transform="translate(6 6)"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="15" stroke-linecap="round" stroke="' + c + '"/>']; },
    zigzag: function (c) { var d = 'M20 70 L56 30 L92 70 L128 30 L164 70 L200 30'; return ['0 0 220 110', '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="22" stroke-miterlimit="10" transform="translate(6 6)"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="14" stroke-miterlimit="10"/>']; },
    trace: function (c) { var d = 'M24 56 q20 -44 40 0 t40 0 t40 0'; return ['0 0 220 110', '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="6" stroke-linecap="round" transform="translate(0 12)"/><circle cx="24" cy="56" r="6" fill="' + COL.paper + '" stroke="' + INK + '" stroke-width="3"/><circle cx="184" cy="56" r="6" fill="' + COL.paper + '" stroke="' + INK + '" stroke-width="3"/>']; }
  };
  window.WFShapes = {
    colors: COL, types: Object.keys(T),
    svg: function (type, color, size) { var f = T[type]; if (!f) return ''; var id = 'wf' + (++uid), r = f(COL[color] || color || COL.mint, id); return '<svg class="wf-shape-svg" viewBox="' + r[0] + '" style="width:' + (size || 120) + 'px;height:auto;display:block;overflow:visible" aria-hidden="true">' + r[1] + '</svg>'; },
    mount: function (root) { Array.prototype.forEach.call((root || document).querySelectorAll('[data-shape]'), function (el) { el.innerHTML = WFShapes.svg(el.getAttribute('data-shape'), el.getAttribute('data-color'), +el.getAttribute('data-size') || 120); }); }
  };
})();
