/* Taya's sticky notes come alive (Oct 3 2026). On every mockup, each "note for you, from Taya" post-it
   (the ::after tag on .wf-note, .status-panel > .wrap and .found-wrap) lands with a little wobble the first
   time it scrolls into view, and lifts like it's catching a breeze when someone hovers over its note.
   Shared by all peek pages: <script src="/note-motion.js" defer></script>. Nothing moves for people who
   turn off motion, and if this file never loads the notes simply sit still, fully visible. */
(function () {
  'use strict';
  if (window.__wfNoteMotion) return; window.__wfNoteMotion = true;
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var SEL = '.wf-note, .status-panel > .wrap, .found-wrap';
  var css = [
    /* waiting to land: hidden only once this script is running, so the notes never vanish without it */
    'html.tn-ready :is(' + SEL + '):not(.tn-in)::after { opacity: 0; }',
    'html.tn-ready :is(' + SEL + ').tn-in::after { animation: tn-land 0.75s cubic-bezier(.2, .9, .3, 1.25) both; }',
    '@keyframes tn-land {',
    '  0% { opacity: 0; translate: 6px -16px; rotate: -9deg; scale: 0.9; }',
    '  55% { opacity: 1; translate: 0 2px; rotate: 6deg; scale: 1.02; }',
    '  78% { translate: 0 -1px; rotate: 1deg; }',
    '}',
    /* hover: the note lifts a little and tilts, as if a breeze caught its corner */
    'html.tn-ready :is(' + SEL + ')::after { transition: translate 0.35s ease, rotate 0.35s ease, box-shadow 0.35s ease; }',
    'html.tn-ready :is(' + SEL + ').tn-in.tn-done::after { animation: none; }',
    'html.tn-ready :is(' + SEL + ').tn-done:hover::after { translate: 0 -3px; rotate: -2deg; box-shadow: 0 7px 14px rgba(0, 0, 0, 0.22); }'
  ].join('\n');

  var st = document.createElement('style');
  st.id = 'tn-style'; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function start() {
    var els = [].slice.call(document.querySelectorAll(SEL));
    if (!els.length) return;
    document.documentElement.classList.add('tn-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        el.classList.add('tn-in');
        setTimeout(function () { el.classList.add('tn-done'); }, 800);   // hover lift only after it has landed
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
