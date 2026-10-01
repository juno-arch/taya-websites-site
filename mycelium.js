/* The living mycelium in the soil (the look and the why are in soil.css; the network is made by
   _mycelium/grow.py and _mycelium/build.py).

   Every page's <head> has a one-line script that adds .myc-js to <html> (unless the visitor asks for reduced
   motion), so the threads can start hidden; without it the soil simply shows the whole network, still.
   This file fetches mycelium.svg (shared by every page, so it's cached after the first), lays it into the
   soil with its traveling lights, and grows it in the first time the soil shows in a visit: on the main
   page when Recent work comes up the screen, on the other pages under their photo (or right away, if a
   page opens further down). When the grow is done the dashes come off (.myc-rest). Later pages in the same
   visit show it already grown; a reload grows it again. Nothing here runs per frame: the CSS does all the
   moving. If anything goes wrong, it takes .myc-js away and the still network shows instead. */
(function () {
  var html = document.documentElement;
  var soil = document.querySelector('.soil');
  if (!html.classList.contains('myc-js')) return;
  var still = function () { html.classList.remove('myc-js', 'myc-go', 'myc-rest'); };
  if (!soil || !window.fetch) { still(); return; }

  var KEY = 'webfaery-mycelium-grown';
  var grown = false;
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    grown = sessionStorage.getItem(KEY) === '1' && !(nav && nav.type === 'reload');
  } catch (e) { /* no storage (a private window): it simply grows on each page */ }

  var lay = function (text) {
    var box = document.createElement('div');
    box.className = 'myc';
    box.innerHTML = text;
    var svg = box.querySelector('svg');
    if (!svg) throw new Error('no network');
    var end = parseFloat(svg.getAttribute('data-end')) || 9;
    (svg.getAttribute('data-lights') || '').split(' ').forEach(function (zone, i) {
      if (!zone) return;
      var s = document.createElement('span');
      s.className = 'myc-lt myc-l' + i + (zone === 'd' ? ' d' : '');
      box.appendChild(s);
    });

    if (grown) {
      /* already grown this visit: it fades in at rest, and the lights start their rounds */
      box.classList.add('fade');
      html.classList.add('myc-go', 'myc-rest');
      soil.appendChild(box);
      requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('on'); }); });
      return;
    }
    soil.appendChild(box);
    var started = false;
    var go = function () {
      if (started) return;
      started = true;
      html.classList.add('myc-go');
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      setTimeout(function () { html.classList.add('myc-rest'); }, end * 1000);
    };
    /* the soil first shows when the part under the photo comes up the screen (checked on scroll, so a jump
       straight past it, say to #prices, counts too) */
    var start = document.getElementById('work') || document.querySelector('main') || document.body;
    var check = function () {
      if (start.getBoundingClientRect().top > innerHeight * 0.88) return;
      removeEventListener('scroll', check); removeEventListener('resize', check);
      go();
    };
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check, { passive: true });
    check();
  };

  /* after the page (and its photo) has loaded, so the network never holds anything up */
  var fetchIt = function () {
    fetch('mycelium.svg', { priority: 'low' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(lay)
      .catch(still);
  };
  if (document.readyState === 'complete') fetchIt(); else window.addEventListener('load', fetchIt);
})();
