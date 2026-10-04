/* Tap a gallery photo to see the whole thing (Oct 3 2026). Every gallery on every site opens into this lightbox.
   Use: put data-lightbox on any container of photos, and load <script src="/lightbox.js?v=1" defer></script>.
   Each [data-lightbox] container is its own flip-through group of the <img> elements inside it. The alt text is the
   caption; data-full="big.jpg" on an img shows a bigger file in the lightbox. Theme it per site with CSS variables:
   --lb-veil (backdrop), --lb-ink (text and icons), --lb-accent (focus ring), --lb-caption-font, --lb-max-scale
   (how far a small photo may be enlarged, default 2). Dependency-free; without it the photos just sit there. */
(function () {
  'use strict';
  if (window.__wfLightbox) return; window.__wfLightbox = true;

  var css = [
    '[data-lightbox] .lb-thumb { cursor: zoom-in; }',
    '[data-lightbox] .lb-thumb img { transition: filter 0.3s ease; }',
    '[data-lightbox] .lb-thumb:hover img { filter: brightness(1.06) saturate(1.04); }',
    '[data-lightbox] .lb-thumb:focus-visible { outline: 2px solid var(--lb-accent, currentColor); outline-offset: 3px; }',
    '.lb { position: fixed; inset: 0; z-index: 1000; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; align-items: center; justify-items: center;',
    '  background: var(--lb-veil, rgba(12, 10, 11, 0.94)); color: var(--lb-ink, #f6f2ee); font-family: inherit;',
    '  opacity: 0; transition: opacity 0.25s ease; -webkit-tap-highlight-color: transparent; touch-action: pan-y; }',
    '.lb[hidden] { display: none; }',
    '.lb.lb-on { opacity: 1; }',
    '.lb-bar { justify-self: stretch; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px 0 18px; box-sizing: border-box; }',
    '.lb-count { font-size: 13px; letter-spacing: 0.14em; font-variant-numeric: tabular-nums; opacity: 0.8; }',
    '.lb-stage { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 0; max-height: 100%; padding: 8px 72px; box-sizing: border-box; width: 100%; }',
    '.lb-img { display: block; max-width: 100%; height: auto; object-fit: contain; border-radius: 4px; box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.8);',
    '  user-select: none; -webkit-user-select: none; -webkit-user-drag: none; transition: opacity 0.22s ease, scale 0.32s cubic-bezier(.2, .8, .3, 1); }',
    '.lb:not(.lb-on) .lb-img { scale: 0.94; }',
    '.lb-img.lb-wait { opacity: 0; }',
    '.lb-cap { margin: 0; max-width: 62ch; padding: 0 8px; text-align: center; font-family: var(--lb-caption-font, inherit); font-size: 16px; line-height: 1.45; opacity: 0.88; text-wrap: balance; }',
    '.lb-cap:empty { display: none; }',
    '.lb button { display: grid; place-items: center; width: 48px; height: 48px; margin: 0; padding: 0; cursor: pointer; color: inherit; font: inherit;',
    '  background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 50%; -webkit-appearance: none; appearance: none; transition: background-color 0.2s ease; }',
    '.lb button:hover { background: rgba(255, 255, 255, 0.18); }',
    '.lb button:focus-visible { outline: 2px solid var(--lb-accent, currentColor); outline-offset: 3px; }',
    '.lb-prev, .lb-next { position: absolute; top: 50%; translate: 0 -50%; }',
    '.lb-prev { left: 12px; } .lb-next { right: 12px; }',
    '.lb-single .lb-prev, .lb-single .lb-next, .lb-single .lb-count { visibility: hidden; }',
    '.lb-foot { height: 18px; }',
    '@media (max-width: 640px) {',
    '  .lb-stage { padding: 4px 0 0; }',
    '  .lb-img { border-radius: 0; }',
    '  .lb-cap { padding: 0 16px; font-size: 15px; }',
    '  .lb-prev, .lb-next { top: auto; bottom: 14px; translate: none; position: fixed; }',
    '  .lb-prev { left: 16px; } .lb-next { right: 16px; }',
    '  .lb-foot { height: 76px; }',
    '}',
    '@media (prefers-reduced-motion: reduce) { .lb, .lb-img, [data-lightbox] .lb-thumb img { transition: none; } .lb:not(.lb-on) .lb-img { scale: none; } }'
  ].join('\n');

  var ICON = {
    close: '<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    prev: '<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 5 5-5 5"/></svg>'
  };

  var box, img, cap, count, btnClose, btnPrev, btnNext;
  var group = [], at = 0, opener = null, inerted = [], saved = null, token = 0;

  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function srcOf(im) { return im.getAttribute('data-full') || im.currentSrc || im.src; }

  function build() {
    var st = document.createElement('style');
    st.id = 'lb-style'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);

    box = document.createElement('div');
    box.className = 'lb'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML =
      '<div class="lb-bar"><span class="lb-count" aria-live="polite"></span><button type="button" class="lb-close" aria-label="Close photo">' + ICON.close + '</button></div>' +
      '<figure class="lb-stage" style="margin:0"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption>' +
      '<button type="button" class="lb-prev" aria-label="Previous photo">' + ICON.prev + '</button>' +
      '<button type="button" class="lb-next" aria-label="Next photo">' + ICON.next + '</button></figure>' +
      '<div class="lb-foot"></div>';
    document.body.appendChild(box);
    img = box.querySelector('.lb-img'); cap = box.querySelector('.lb-cap'); count = box.querySelector('.lb-count');
    btnClose = box.querySelector('.lb-close'); btnPrev = box.querySelector('.lb-prev'); btnNext = box.querySelector('.lb-next');

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { go(-1); });
    btnNext.addEventListener('click', function () { go(1); });
    box.addEventListener('click', function (e) {   // a tap on the dark veil (not the photo or a button) closes
      if (e.target === box || e.target.classList.contains('lb-stage') || e.target.classList.contains('lb-bar') || e.target.classList.contains('lb-foot')) close();
    });
    box.addEventListener('keydown', onKey);
    var sx = 0, sy = 0, st0 = 0;
    box.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st0 = Date.now(); }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (!st0 || e.changedTouches.length !== 1) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; st0 = 0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close();   // swipe down to close
    }, { passive: true });
    window.addEventListener('resize', function () { if (!box.hidden) size(); });
  }

  function size() {
    var w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return;
    var cs = getComputedStyle(box);
    var maxScale = parseFloat(cs.getPropertyValue('--lb-max-scale')) || 2;
    var narrow = window.innerWidth <= 640;
    var availW = narrow ? window.innerWidth : window.innerWidth - 144;
    var capH = cap.offsetHeight ? cap.offsetHeight + 14 : 0;
    var availH = window.innerHeight - 58 - (narrow ? 80 : 18) - capH - 16;
    var s = Math.min(availW / w, availH / h, maxScale);
    img.style.width = Math.max(1, Math.round(w * s)) + 'px';
  }

  function show(i) {
    at = (i + group.length) % group.length;
    var im = group[at], my = ++token;
    cap.textContent = im.getAttribute('alt') || '';
    img.setAttribute('alt', im.getAttribute('alt') || '');
    count.textContent = (at + 1) + ' / ' + group.length;
    img.classList.add('lb-wait');
    var pre = new Image();
    pre.onload = pre.onerror = function () {
      if (my !== token) return;
      img.src = pre.src;
      var done = function () { size(); img.classList.remove('lb-wait'); };
      if (img.complete) done(); else img.onload = done;
    };
    pre.src = srcOf(im);
    if (group.length > 1) [1, -1].forEach(function (d) { var n = new Image(); n.src = srcOf(group[(at + d + group.length) % group.length]); });
  }

  function go(d) { if (group.length > 1) show(at + d); }

  function focusables() { return [btnClose, btnPrev, btnNext].filter(function (b) { return b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden'; }); }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Tab') {   // keep focus inside the viewer
      var f = focusables(); if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      else if (i === -1) { e.preventDefault(); f[0].focus(); }
    }
  }

  function lock(on) {
    var de = document.documentElement, b = document.body;
    if (on) {
      var sbw = window.innerWidth - de.clientWidth;
      saved = { o: de.style.overflow, p: b.style.paddingRight };
      de.style.overflow = 'hidden';
      if (sbw > 0) b.style.paddingRight = sbw + 'px';
      [].forEach.call(b.children, function (el) { if (el !== box && !el.inert && el.tagName !== 'SCRIPT') { el.inert = true; inerted.push(el); } });
    } else if (saved) {
      de.style.overflow = saved.o; b.style.paddingRight = saved.p; saved = null;
      inerted.forEach(function (el) { el.inert = false; }); inerted = [];
    }
  }

  function open(list, i, from) {
    if (!box) build();
    group = list; opener = from;
    box.classList.toggle('lb-single', list.length < 2);
    box.hidden = false; lock(true);
    show(i);
    void box.offsetWidth;   // let the fade start from transparent
    box.classList.add('lb-on');
    btnClose.focus({ preventScroll: true });
  }

  function close() {
    if (!box || box.hidden) return;
    token++;
    box.classList.remove('lb-on');
    var back = (group[at] && group[at].__lbThumb) || opener;
    var fin = function () { box.hidden = true; img.removeAttribute('src'); img.style.width = ''; };
    lock(false);
    if (back) { try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); } }
    if (reduced()) fin(); else setTimeout(fin, 250);
  }

  function attach(c) {
    if (c.__lbOn) return; c.__lbOn = true;
    var imgs = [].slice.call(c.querySelectorAll('img')).filter(function (im) { return im.getAttribute('src') || im.getAttribute('data-full'); });
    imgs.forEach(function (im, i) {
      var t = im.closest('a, button, figure, li') || im;
      if (!c.contains(t) || t === c) t = im;
      im.__lbThumb = t;
      t.classList.add('lb-thumb');
      var label = 'Open photo' + (im.getAttribute('alt') ? ': ' + im.getAttribute('alt') : '');
      var native = t.tagName === 'BUTTON' || t.tagName === 'A';   // these already open on Enter by themselves
      if (!native) { t.setAttribute('role', 'button'); t.tabIndex = 0; }
      t.setAttribute('aria-label', label);
      t.setAttribute('aria-haspopup', 'dialog');
      t.addEventListener('click', function (e) { e.preventDefault(); open(imgs, i, t); });
      if (!native) t.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(imgs, i, t); }
      });
    });
  }

  function start() { [].forEach.call(document.querySelectorAll('[data-lightbox]'), attach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
