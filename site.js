/* Web Faery, the main page: the door, the hero's slow fade-in, the header, the faery dust, and the little star
   glints on the cards.
   Calm on purpose: the only things that move are the walk through the door, the hero words arriving once,
   the dust that follows a mouse, and the slow shimmer and twinkle on the cards (that part is CSS).
   With prefers-reduced-motion the door simply fades away when tapped, the words are just there, there is no
   dust, and the card sparkle holds still.
   The inline script under the door in index.html shows it before the first paint (once per visit in a tab) and
   keeps Skip and Escape working on its own until this file says it has taken over (window.wfDoorReady). */
(function () {
  'use strict';
  var $ = function (q, el) { return (el || document).querySelector(q); };
  var $$ = function (q, el) { return [].slice.call((el || document).querySelectorAll(q)); };
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var root = document.documentElement;

  /* ======================= faery dust: one small canvas, capped, asleep when idle ======================= */
  var Dust = (function () {
    var cv = document.createElement('canvas');
    cv.className = 'dust'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:120';
    document.body.appendChild(cv);
    var cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);

    /* the colors of the paintings' lights: lantern gold, pale gold, sunset pink, rose, moonlit lavender */
    var COLORS = ['255,208,118', '255,234,186', '247,168,200', '240,138,188', '224,214,255'];
    /* each color drawn once as a soft glow and as a four-point glint, then stamped (fast, no per-frame blur) */
    function sprite(rgb, star) {
      var s = document.createElement('canvas'), n = 64, c = s.getContext('2d'); s.width = s.height = n;
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,253,245,1)'); g.addColorStop(.12, 'rgba(' + rgb + ',1)');
      g.addColorStop(.38, 'rgba(' + rgb + ',.42)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      c.fillStyle = g;
      if (!star) { c.fillRect(0, 0, n, n); return s; }
      c.globalAlpha = .6; c.fillRect(0, 0, n, n); c.globalAlpha = 1;
      var arms = function (k, fill) {   /* a four-point glint, k = how far its arms reach */
        c.fillStyle = fill; c.beginPath();
        c.moveTo(32, 32 - k); c.quadraticCurveTo(33.5, 30.5, 32 + k, 32); c.quadraticCurveTo(33.5, 33.5, 32, 32 + k);
        c.quadraticCurveTo(30.5, 33.5, 32 - k, 32); c.quadraticCurveTo(30.5, 30.5, 32, 32 - k); c.fill();
      };
      arms(31, 'rgba(' + rgb + ',1)'); arms(17, 'rgba(255,253,245,1)');
      return s;
    }
    var GLOW = COLORS.map(function (c) { return sprite(c, false); });
    var STAR = COLORS.map(function (c) { return sprite(c, true); });

    var P = [], MAX = 520, raf = 0, last = 0, trailN = 0;
    function add(p) {
      if (P.length >= MAX) return;
      p.t = p.t || 0; p.ph = Math.random() * 6.28; P.push(p); if (p.trail) trailN++;
      if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }
    function tick(now) {
      var dt = Math.min(50, now - last) / 1000; last = now;
      cx.clearRect(0, 0, W, H);
      for (var i = P.length - 1; i >= 0; i--) {
        var p = P[i]; p.t += dt;
        if (p.t >= p.life) { if (p.trail) trailN--; P.splice(i, 1); continue; }
        if (p.t < 0) continue;
        if (p.out) { p.vx += (p.x - p.ox) * p.out * dt; p.vy += (p.y - p.oy) * p.out * dt; }   /* the "walking in" rush */
        p.vx *= 1 - p.drag * dt; p.vy = p.vy * (1 - p.drag * dt) + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        var k = p.t / p.life, a = (k < .12 ? k / .12 : 1 - (k - .12) / .88) * p.a;
        if (p.tw) a *= .62 + .38 * Math.sin(p.t * p.tw + p.ph);
        if (a <= 0.01) continue;
        var s = p.r * (p.star ? 9 : 6);
        cx.globalAlpha = Math.min(1, a);
        cx.drawImage((p.star ? STAR : GLOW)[p.c], p.x - s / 2, p.y - s / 2, s, s);
      }
      cx.globalAlpha = 1;
      raf = P.length && !document.hidden ? requestAnimationFrame(tick) : 0;
      if (!P.length) cx.clearRect(0, 0, W, H);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) { P.length = 0; trailN = 0; cancelAnimationFrame(raf); raf = 0; cx.clearRect(0, 0, W, H); } });
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    var pick = function () { return Math.floor(Math.random() * COLORS.length); };
    var small = function () { return innerWidth < 700; };

    return {
      /* a soft shimmer rising out of the door the moment it's tapped */
      shimmer: function (x, y, r) {
        for (var i = 0; i < (small() ? 26 : 40); i++) {
          add({ x: x + rnd(-r, r), y: y + rnd(-r * 1.2, r * .8), vx: rnd(-14, 14), vy: rnd(-70, -20), g: -8, drag: 1.2, r: rnd(1.1, 2.4), star: Math.random() < .45,
            c: pick(), a: rnd(.7, 1), tw: rnd(6, 12), t: -rnd(0, .5), life: rnd(1.2, 2) });
        }
      },
      /* gold and pink sparkles pouring out of the doorway, rushing past as the view moves in */
      burst: function (x, y) {
        var n = small() ? 120 : 200, D = Math.max(W, H);
        for (var i = 0; i < n; i++) {
          var ang = Math.random() * 6.283, sp = rnd(30, D * .35);
          add({ x: x + Math.cos(ang) * rnd(0, 30), y: y + Math.sin(ang) * rnd(0, 40), ox: x, oy: y, out: rnd(1.4, 2.6),
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30, g: 0, drag: .6, r: rnd(1.3, 3.2), star: Math.random() < .4,
            c: pick(), a: rnd(.75, 1), tw: rnd(4, 10), t: -rnd(0, .9), life: rnd(1.3, 2.1) });
        }
      },
      /* glitter settling over the hero as the light clears */
      glitter: function () {
        var n = small() ? 70 : 120;
        for (var i = 0; i < n; i++) {
          add({ x: rnd(0, W), y: rnd(-20, H * .85), vx: rnd(-8, 8), vy: rnd(10, 38), g: 6, drag: .4, r: rnd(1, 2.6), star: Math.random() < .5,
            c: pick(), a: rnd(.6, 1), tw: rnd(5, 13), t: -rnd(0, .7), life: rnd(1.6, 2.8) });
        }
      },
      /* the cursor trail: a few tiny specks that drift down and are gone in under a second */
      trail: function (x, y) {
        if (trailN > 70) return;
        add({ trail: true, x: x + rnd(-4, 4), y: y + rnd(2, 9), vx: rnd(-10, 10), vy: rnd(10, 28), g: 20, drag: 1.4, r: rnd(1, 2.2), star: Math.random() < .4,
          c: pick(), a: .95, tw: rnd(7, 13), life: rnd(.7, 1.1) });
      }
    };
  })();

  /* mouse only (not touch or pen), and only when motion is welcome */
  var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var lastDrop = 0;
  addEventListener('pointermove', function (e) {
    if (reduce.matches || !fine.matches || e.pointerType !== 'mouse') return;
    var now = performance.now(); if (now - lastDrop < 18) return; lastDrop = now;
    Dust.trail(e.clientX, e.clientY);
  }, { passive: true });

  /* ======================= the hero's slow fade-in ======================= */
  var hero = $('.hero'), heroArt = $('#hero-art'), heroOn = false;
  function heroStart(settle) {
    if (heroOn || !hero) return; heroOn = true;
    if (reduce.matches) { hero.classList.add('rest'); return; }
    if (settle) hero.classList.add('settle');
    hero.classList.add('go');
  }
  function heroWhenReady() {
    var done = false, go = function () { if (!done) { done = true; heroStart(false); } };
    if (heroArt.complete && heroArt.naturalWidth) { (heroArt.decode ? heroArt.decode() : Promise.resolve()).then(go, go); }
    else { heroArt.addEventListener('load', go); heroArt.addEventListener('error', go); }
    setTimeout(function () { if (!done) { done = true; heroOn = true; hero.classList.add('rest'); } }, 4000);
  }

  /* ======================= the door ======================= */
  var door = $('#door'), page = $('#page');
  if (door && !door.hidden) {
    var art = $('#door-art'), stage = $('#door-stage'), entered = false;
    var FX = parseFloat(door.dataset.doorX) || .5, FY = parseFloat(door.dataset.doorY) || .7;
    var POS = [.51, .6];   /* = .door-art's object-position in site.css */
    if ('inert' in page) page.inert = true;
    var place = function () {
      var vw = innerWidth, vh = innerHeight, iw = art.naturalWidth || 1456, ih = art.naturalHeight || 816;
      var s = Math.max(vw / iw, vh / ih), rw = iw * s, rh = ih * s;
      var dx = (vw - rw) * POS[0] + FX * rw, dy = (vh - rh) * POS[1] + FY * rh;
      door.style.setProperty('--dx', dx.toFixed(1) + 'px');
      door.style.setProperty('--dy', dy.toFixed(1) + 'px');
      door.style.setProperty('--dr', Math.max(38, rw * .046).toFixed(1) + 'px');
      /* zoom until the doorway nearly fills the screen, but no further (the light covers the end) */
      door.style.setProperty('--zoom', Math.min(4.2, Math.max(2.6, vh / (rh * .2))).toFixed(2));
      door.dx = dx; door.dy = dy; door.dr = rw * .046;
    };
    place(); art.addEventListener('load', place); addEventListener('resize', function () { if (!entered) place(); });

    var finish = function () {
      door.hidden = true;
      root.classList.remove('door-up');
      if ('inert' in page) page.inert = false;
      var m = $('#main'); if (m) m.focus({ preventScroll: true });
      onScroll();
    };
    var enter = function (quick) {
      if (entered) return; entered = true;
      door.classList.add('opening');
      if (quick || reduce.matches) {
        door.classList.add('quick');
        heroStart(false);
        setTimeout(finish, 480);
        return;
      }
      var x = door.dx, y = door.dy;
      Dust.shimmer(x, y, door.dr);
      setTimeout(function () { door.classList.add('zoom'); }, 250);
      setTimeout(function () { Dust.burst(x, y); }, 420);
      setTimeout(function () { door.classList.add('flood'); }, 1150);
      setTimeout(function () { Dust.burst(x, y); }, 1450);
      setTimeout(function () { heroStart(true); door.classList.add('gone'); Dust.glitter(); }, 2250);
      setTimeout(finish, 3400);
    };
    window.wfDoorReady = true;   /* the inline fallback in index.html stands down */
    $('#door-go').addEventListener('click', function () { enter(false); });
    $('#door-skip').addEventListener('click', function (e) { e.preventDefault(); enter(true); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !door.hidden) enter(true); });
  } else {
    window.wfDoorReady = true;
    heroWhenReady();
  }

  /* ======================= header: clear over the hero, frosted glass after ======================= */
  var head = $('#site-head'), ticking = false;
  function onScroll() {
    if (head) head.classList.toggle('solid', scrollY > Math.min(innerHeight * .55, 420));
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ======================= the card glints ======================= */
  /* three tiny star glints on every card, each twinkling at its own slow pace (the look is in site.css) */
  $$('.card, .faq details').forEach(function (card, i) {
    /* a question card is a <details>: its glints ride in the summary, so they show while it's closed too */
    var home = card.tagName === 'DETAILS' ? $('summary', card) : card;
    ['g1', 'g2', 'g3'].forEach(function (g, k) {
      var el = document.createElement('i');
      el.className = 'glint ' + g; el.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--tw', (5.4 + ((i * 3 + k * 5) % 7) * .45).toFixed(2) + 's');
      el.style.setProperty('--td', (-((i * 1.7 + k * 2.3) % 6)).toFixed(2) + 's');
      home.appendChild(el);
    });
  });

  onScroll();
})();
