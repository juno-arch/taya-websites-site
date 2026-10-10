/* "Lost your link?" (Oct 10 2026). Every client has one private link from Taya's emails, webfaery.love/my/#wf=...
   This little form asks the server to send it again, to the email Taya has on file for them (not to an address
   typed here, unless it's the same one). The answer is the same for everyone, client or not, so nobody can use it to
   find out who works with Taya. Used by my/index.html (the door). No outside scripts, no trackers. */
(function () {
  'use strict';

  // the server: Taya's PocketBase
  function apiBase() { return 'https://bookings.gardenfaery.love/api/webfaery/portal'; }
  window.wfApiBase = apiBase;

  var SENT = 'If that email is one I have, your link is on its way. Peek in spam if it’s shy.';
  var SLOW = 'That’s a lot of tries for now. Try again in an hour, or email me at taya@webfaery.love.';
  var OFF = 'I can’t reach my server right now. Try again in a minute, or email me at taya@webfaery.love.';

  function bind(form) {
    if (form.dataset.bound) return;
    form.dataset.bound = '1';
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var err = form.querySelector('.err');
    var done = form.parentNode.querySelector('.la-done');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      err.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.textContent = 'That email doesn’t look quite right. Try it once more?';
        err.hidden = false; input.focus(); return;
      }
      btn.disabled = true;
      fetch(apiBase() + '/link-again', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }),
        mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
      }).then(function (res) {
        btn.disabled = false;
        if (res.status === 429) { err.textContent = SLOW; err.hidden = false; return; }
        if (!res.ok) { err.textContent = OFF; err.hidden = false; return; }
        form.hidden = true;
        if (done) { done.textContent = SENT; done.hidden = false; done.focus(); }
      }, function () {
        btn.disabled = false; err.textContent = OFF; err.hidden = false;
      });
    });
  }
  function bindAll() { Array.prototype.forEach.call(document.querySelectorAll('form.link-again'), bind); }
  window.wfLinkAgain = bindAll;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindAll); else bindAll();
})();
