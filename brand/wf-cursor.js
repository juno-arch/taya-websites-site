/* Web Faery mouse shape. Your pointer becomes ONE shape (a silver star, or any Web Faery shape). Not a trail: one shape that follows the mouse.
   Desktop mouse only; touch and pen keep the normal pointer. Needs wf-shapes.js for the shapes.
   WFCursor.attach(el, name) puts the shape on one element (the playroom window); WFCursor.page(on, name) puts it on the whole page; WFCursor.names lists the choices. */
(function () {
  if (!document.body) return;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var INK = '#1a1420';
  var SHAPES = [['star', 'Silver star', null], ['triangle', 'Triangle', 'butter'], ['square', 'Square', 'pink'], ['disc', 'Disc', 'blue'], ['target', 'Target', 'butter'], ['chip', 'Chip', 'mint'], ['peak', 'Peak', 'lav'], ['jaguar', 'Spotted', 'mint'], ['hatched', 'Hatched', 'pink'], ['checker', 'Checker', 'lav'], ['zigzag', 'Zigzag', 'butter'], ['wave', 'Wave', 'blue'], ['dots', 'Dots', 'pink']];
  var STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="100%" height="100%"><defs><linearGradient id="wfsilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c9d0d6"/><stop offset="1" stop-color="#8d969e"/></linearGradient></defs><path d="M22 3 L26 17 L38 19 L26 23 L22 37 L18 23 L4 19 L18 17 Z" fill="url(#wfsilver)" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function html(name) {
    if (name === 'star') return STAR;
    var c = 'mint'; SHAPES.forEach(function (s) { if (s[0] === name) c = s[2] || c; });
    return window.WFShapes && WFShapes.svg ? WFShapes.svg(name, c, 100) : STAR;
  }
  function make(size) {
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true'); d.setAttribute('data-wf-cursor', '');
    d.style.cssText = 'position:fixed;left:0;top:0;width:' + size + 'px;height:' + size + 'px;margin:' + (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px;pointer-events:none;z-index:2147482000;display:none;will-change:transform';
    var inner = document.createElement('div'); inner.style.cssText = 'width:100%;height:100%;transition:transform .12s'; inner.className = 'wf-cur-in'; d.appendChild(inner);
    document.body.appendChild(d); return d;
  }
  function paint(d, name) { var i = d.firstChild; i.innerHTML = html(name); var s = i.firstChild; if (s && s.style) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; s.style.overflow = 'visible'; } }
  var NATIVE = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select';
  var api = window.WFCursor = { names: SHAPES.map(function (s) { return [s[0], s[1]]; }), supported: fine };
  var styleEl = null;
  function css(on) {
    if (on && !styleEl) { styleEl = document.createElement('style'); styleEl.textContent = 'html.wf-cur, html.wf-cur *{cursor:none!important}html.wf-cur :is(input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select){cursor:auto!important}'; document.head.appendChild(styleEl); }
    document.documentElement.classList.toggle('wf-cur', !!on);
  }
  // one follower, used by the page mode and by attached elements
  var f = null, name = 'star', scope = null, pageOn = false;
  function show(x, y, over) { if (!f) return; if (over) { f.style.display = 'none'; return; } f.style.display = 'block'; f.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function move(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var t = e.target, native = t && t.closest && t.closest(NATIVE);
    if (!pageOn && scope && !scope.contains(t)) { show(0, 0, true); return; }
    show(e.clientX, e.clientY, !!native);
  }
  function ensure(size) { if (!f) { f = make(size); paint(f, name); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', function () { if (f) f.firstChild.style.transform = 'scale(.8) rotate(-10deg)'; }, true); window.addEventListener('pointerup', function () { if (f) f.firstChild.style.transform = ''; }, true); document.addEventListener('mouseleave', function () { if (f) f.style.display = 'none'; }); } }
  api.set = function (n) { name = n; if (f) paint(f, n); };
  api.attach = function (el, n) {
    if (!fine) return false; name = n || name; scope = el; pageOn = false; ensure(44); paint(f, name);
    el.style.cursor = 'none'; el.addEventListener('pointerleave', function () { if (!pageOn && f) f.style.display = 'none'; });
    return true;
  };
  api.page = function (on, n) {
    if (!fine) return false; if (n) name = n;
    pageOn = !!on; ensure(40); paint(f, name); css(on);
    if (!on && !scope && f) f.style.display = 'none';
    return true;
  };
})();
