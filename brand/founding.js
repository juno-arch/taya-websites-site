/* The founding count, live (Nov 12 2026, Pollen): the server counts paid founding deposits (5 spots, through Dec 31 2026)
   and this keeps every page honest without anyone editing it:
     [data-founding-left]   its text becomes "N left" (or "All 5 taken")
     [data-founding-only]   hidden once the spots are gone (the founding card)
     the ticker             hidden once the spots are gone
     .price with .was       shows the regular build price once the spots are gone
   If the server can't be reached, the page stays as written (the number in the HTML). Read-only, no cookies. */
(function () {
  if (!window.fetch) return;
  var URL = 'https://bookings.gardenfaery.love/api/webfaery/founding';
  fetch(URL, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || typeof d.left !== 'number') return;
    [].forEach.call(document.querySelectorAll('[data-founding-left]'), function (n) {
      n.textContent = d.left > 0 ? d.left + ' left' : 'All ' + d.total + ' taken';
    });
    if (d.left > 0) return;
    document.documentElement.classList.add('founding-closed');
    [].forEach.call(document.querySelectorAll('[data-founding-only], .ticker'), function (n) { n.hidden = true; n.style.display = 'none'; });
    [].forEach.call(document.querySelectorAll('.price'), function (p) {
      var was = p.querySelector('.was'), big = p.querySelector('.big'); if (!was || !big) return;
      var m = (was.textContent.match(/\$[\d,]+/) || [])[0]; if (!m) return;
      big.textContent = m; was.remove();
      var s = p.parentNode && p.parentNode.querySelector('p.small');
      if (s) s.textContent = s.textContent.replace(/^Founding price, then a /, 'Then a ');
    });
  }).catch(function () {});
})();
