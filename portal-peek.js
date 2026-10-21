/* portal-peek.js (Oct 21 2026): "A peek at your portal" on every mockup, one script tag, no other change to the page.
   <script src="/portal-peek.js" defer data-kind="studio|practice|service|shop|food"></script>
   Shows only what the portal really does today (to-dos, answers that save as you type, the agreement, the project steps), clearly marked as a sample.
   Inserts itself just above the footer, takes its colors from the page's own button, respects dark mode and reduced motion.
   Nothing is sent anywhere. */
(function () {
  if (document.getElementById('portal-peek')) return;
  var me = document.currentScript || document.querySelector('script[src*="portal-peek.js"]');
  var kind = (me && me.getAttribute('data-kind')) || 'practice';
  var biz = (me && me.getAttribute('data-biz')) || (document.title || '').split(/[|·–—-]/)[0].trim() || 'your business';
  var SETS = {
    studio:   [['Look over your mockup', 1, ''], ['Confirm your class times', 0, 'Mon to Thu 6 to 8 pm'], ['Send your logo and photos', 0, ''], ['Tell me anything the page should say', 0, '']],
    practice: [['Look over your mockup', 1, ''], ['Tell me your hours', 0, 'Tue to Sat, 10 to 6'], ['Send your logo and photos', 0, ''], ['Tell me anything the page should say', 0, '']],
    service:  [['Look over your mockup', 1, ''], ['Tell me where you work', 0, 'Eureka and Arcata'], ['Send your logo and photos', 0, ''], ['Tell me anything the page should say', 0, '']],
    shop:     [['Look over your mockup', 1, ''], ['Add your first products', 0, ''], ['Send your logo and photos', 0, ''], ['Tell me your shipping details', 0, '']],
    food:     [['Look over your mockup', 1, ''], ['Confirm your hours', 0, '7 am to 3 pm'], ['Send your menu and photos', 0, ''], ['Tell me anything the page should say', 0, '']]
  };
  var items = SETS[kind] || SETS.practice;
  var BIZ = {
    studio:   { b: [['Tue 6:00 pm, Fit Flow', '4 spots left'], ['Wed 9:30 am, Beginners', '2 spots left'], ['Thu 6:00 pm, Fit Flow', 'Full, waitlist 2']], s: [], g: true, bl: 'Classes and spots' },
    practice: { b: [['Tue 11:00 am, 60 min', 'Sam W.'], ['Tue 2:00 pm, 90 min', 'Open'], ['Fri 10:00 am, 60 min', 'Jess P.']], s: [], g: true, bl: 'Bookings' },
    service:  { b: [['Mon, 3 bed 2 bath', 'Quote requested'], ['Wed, Organizing, 4 hours', 'Booked'], ['Fri, Deep clean', 'Open']], s: [], g: true, bl: 'Requests and bookings' },
    shop:     { b: [], s: [['Little bowl', 'In stock'], ['Mug, blue', 'In stock'], ['Plate set', 'Sold out']], g: true, bl: '' },
    food:     { b: [['Sat 9:00 am, 2 dozen pastries', 'Pickup, paid'], ['Sun 8:00 am, quiche', 'Pickup, paid']], s: [['Cinnamon rolls', 'In stock'], ['Pumpkin bars', 'Sold out']], g: true, bl: 'Pre-orders' }
  };
  var BZ = BIZ[kind] || BIZ.practice;
  var accent = '#471655', on = '#ffffff';
  try {
    var b = document.querySelector('.btn, .btn-go, a.btn, button.btn, .cta, .book-btn');
    if (b) { var cs = getComputedStyle(b); if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') { accent = cs.backgroundColor; on = cs.color; } }
  } catch (e) {}
  var css = '#portal-peek{padding:56px 20px 64px;border-top:1px solid rgba(128,128,128,.25);font-family:inherit}' +
    '#portal-peek .pp-wrap{max-width:860px;margin:0 auto}#portal-peek h2{margin:0 0 6px;font-size:clamp(24px,3vw,32px);line-height:1.15}' +
    '#portal-peek .pp-tag{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;opacity:.75;margin-bottom:8px}' +
    '#portal-peek .pp-sub{margin:0 0 18px;max-width:60ch;opacity:.85}' +
    '#portal-peek .pp-card{border:1px solid rgba(128,128,128,.35);border-radius:16px;padding:18px;background:rgba(128,128,128,.07)}' +
    '#portal-peek .pp-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}' +
    '#portal-peek .pp-tabs button{font:inherit;font-size:15px;padding:8px 14px;border-radius:999px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;cursor:pointer;min-height:40px}' +
    '#portal-peek .pp-tabs button[aria-selected="true"]{background:var(--pp-a);color:var(--pp-on);border-color:var(--pp-a)}' +
    '#portal-peek ul{list-style:none;margin:0;padding:0}#portal-peek li{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(128,128,128,.2)}#portal-peek li:first-child{border-top:0}' +
    '#portal-peek input[type=checkbox]{width:22px;height:22px;margin-top:2px;accent-color:var(--pp-a)}' +
    '#portal-peek .pp-in{font:inherit;width:100%;max-width:340px;padding:8px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:rgba(255,255,255,.85);color:#222;margin-top:6px}' +
    '#portal-peek .pp-saved{font-size:13px;opacity:0;margin-left:8px;transition:opacity .3s}#portal-peek .pp-saved.on{opacity:.9}' +
    '#portal-peek .pp-steps{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}#portal-peek .pp-steps span{padding:6px 12px;border-radius:999px;border:1px solid rgba(128,128,128,.45);font-size:14px}' +
    '#portal-peek .pp-steps span.now{background:var(--pp-a);color:var(--pp-on);border-color:var(--pp-a)}#portal-peek .pp-steps span.done{opacity:.6;text-decoration:line-through}' +
    '#portal-peek .pp-btn{font:inherit;padding:10px 16px;border-radius:999px;border:0;background:var(--pp-a);color:var(--pp-on);cursor:pointer;min-height:44px}#portal-peek .pp-btn.ghost{background:transparent;color:inherit;border:1px solid rgba(128,128,128,.5);margin-left:8px}' +
    '#portal-peek .pp-foot{margin-top:14px;font-size:14px;opacity:.8}#portal-peek a{color:inherit}' +
    '@media (prefers-reduced-motion:reduce){#portal-peek .pp-saved{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var sec = document.createElement('section'); sec.id = 'portal-peek'; sec.setAttribute('aria-labelledby', 'pp-h');
  sec.style.setProperty('--pp-a', accent); sec.style.setProperty('--pp-on', on);
  sec.innerHTML = '<div class="pp-wrap"><span class="pp-tag">A sample, not your real one</span><h2 id="pp-h">A peek at your portal</h2>' +
    '<p class="pp-sub">When you say yes, I open a private portal for ' + biz.replace(/</g, '') + ': your to-dos in order, your agreement and your project in one place, so nothing gets lost in an email. Try it below.</p>' +
    '<div class="pp-card"><div class="pp-tabs" role="tablist"><button role="tab" aria-selected="true" data-t="todos">Your to-dos</button><button role="tab" aria-selected="false" data-t="agree">Your agreement</button><button role="tab" aria-selected="false" data-t="proj">Your project</button><button role="tab" aria-selected="false" data-t="biz" id="pp-biz-tab" hidden>Your business <small>(In Bloom)</small></button></div><div class="pp-body"></div></div>' +
    '<p class="pp-foot">Already have one? <a href="https://webfaery.love/portal.html">Log in</a>. Nothing here is sent or saved anywhere.</p></div>';
  var foot = document.querySelector('footer');
  if (foot && foot.parentNode) foot.parentNode.insertBefore(sec, foot); else (document.querySelector('main') || document.body).appendChild(sec);
  var body = sec.querySelector('.pp-body'), tabs = sec.querySelectorAll('[data-t]');
  var state = items.map(function (i) { return !!i[1]; });
  function todos() {
    var h = '<ul>';
    items.forEach(function (it, i) {
      h += '<li><input type="checkbox" id="pp-c' + i + '" ' + (state[i] ? 'checked' : '') + ' aria-label="' + it[0] + '"><div><label for="pp-c' + i + '">' + it[0] + '</label>' +
        (it[2] ? '<br><input class="pp-in" data-i="' + i + '" placeholder="' + it[2] + '" aria-label="' + it[0] + '"><span class="pp-saved" aria-live="polite">Saved</span>' : '') + '</div></li>';
    });
    body.innerHTML = h + '</ul><p><button type="button" class="pp-btn ghost" data-reset style="margin-left:0">Start over</button></p>';
    [].forEach.call(body.querySelectorAll('input[type=checkbox]'), function (c, i) { c.addEventListener('change', function () { state[i] = c.checked; }); });
    [].forEach.call(body.querySelectorAll('.pp-in'), function (inp) {
      var t, tag = inp.nextElementSibling;
      inp.addEventListener('input', function () { tag.classList.remove('on'); clearTimeout(t); t = setTimeout(function () { tag.classList.add('on'); }, 600); });
    });
    body.querySelector('[data-reset]').addEventListener('click', function () { state = items.map(function (i) { return !!i[1]; }); todos(); });
  }
  function agree() {
    body.innerHTML = '<p><b>Your agreement</b> says in plain words what I build, what your monthly subscription covers, and what is yours to keep. You read it in your portal and say yes when you are ready.</p>' +
      '<p><button type="button" class="pp-btn" data-s>Read it (sample)</button><button type="button" class="pp-btn ghost" data-b hidden>Back</button></p><div class="pp-msg" role="status"></div>';
    body.querySelector('[data-s]').addEventListener('click', function () { body.querySelector('.pp-msg').textContent = 'In your real portal, this opens your agreement. This one is only a sample.'; body.querySelector('[data-b]').hidden = false; });
    body.querySelector('[data-b]').addEventListener('click', agree);
  }
  function proj() {
    var steps = ['Said yes', 'Your content', 'Draft', 'Changes', 'Launch'];
    body.innerHTML = '<p>Your project page shows where things stand, so you never have to ask.</p><div class="pp-steps">' + steps.map(function (s, i) { return '<span class="' + (i < 1 ? 'done' : i === 1 ? 'now' : '') + '">' + s + '</span>'; }).join('') + '</div><p class="pp-foot">The step glows when I am waiting on you, and goes quiet when it is my turn.</p>';
  }
  function bizTab() {
    var h = '<p>With <b>In Bloom</b>, your bookings, shop and gift certificates live in the same portal, running on my server, with nothing separate to pay for. These are made-up examples.</p>';
    if (BZ.b.length) { h += '<p><b>' + BZ.bl + '</b></p><ul>'; BZ.b.forEach(function (x, i) { h += '<li><div><label>' + x[0] + '</label><br><span style="opacity:.8">' + x[1] + '</span></div><button type="button" class="pp-btn ghost" data-block="' + i + '" style="margin-left:auto">Block this time</button></li>'; }); h += '</ul>'; }
    if (BZ.s.length) { h += '<p><b>Your shop</b></p><ul>'; BZ.s.forEach(function (x, i) { h += '<li><div><label>' + x[0] + '</label><br><span style="opacity:.8" data-st="' + i + '">' + x[1] + '</span></div><button type="button" class="pp-btn ghost" data-sold="' + i + '" style="margin-left:auto">Mark sold out</button></li>'; }); h += '</ul>'; }
    if (BZ.g) h += '<p><b>Gift certificates</b></p><p><input class="pp-in" id="pp-gc" placeholder="Look up a code, like GIFT-4821" aria-label="Look up a gift certificate code"> <button type="button" class="pp-btn ghost" data-gc>Look up</button></p><div class="pp-msg" role="status"></div>';
    body.innerHTML = h + '<p><button type="button" class="pp-btn ghost" data-reset style="margin-left:0">Start over</button></p>';
    [].forEach.call(body.querySelectorAll('[data-block]'), function (b) { b.addEventListener('click', function () { var on = b.textContent === 'Block this time'; b.textContent = on ? 'Time blocked, undo' : 'Block this time'; }); });
    [].forEach.call(body.querySelectorAll('[data-sold]'), function (b) { b.addEventListener('click', function () { var i = b.getAttribute('data-sold'), sp = body.querySelector('[data-st="' + i + '"]'), on = b.textContent === 'Mark sold out'; sp.textContent = on ? 'Sold out' : BZ.s[i][1]; b.textContent = on ? 'Back in stock' : 'Mark sold out'; }); });
    var gcb = body.querySelector('[data-gc]'); if (gcb) gcb.addEventListener('click', function () { var v = (document.getElementById('pp-gc').value || 'GIFT-4821').trim(); body.querySelector('.pp-msg').textContent = v + ': a sample gift certificate, 1 of 1 left, balance 100 dollars, no expiry. Yours would show a real code.'; });
    body.querySelector('[data-reset]').addEventListener('click', bizTab);
  }
  function viewOk() { var v = document.documentElement.getAttribute('data-view') || 'all'; return v === 'crone' || v === 'all'; }
  function syncBiz() { var tab = document.getElementById('pp-biz-tab'); if (!tab) return; var ok = viewOk(); tab.hidden = !ok; if (!ok && tab.getAttribute('aria-selected') === 'true') show('todos'); }
  function show(t) { [].forEach.call(tabs, function (b) { b.setAttribute('aria-selected', b.getAttribute('data-t') === t ? 'true' : 'false'); }); (t === 'agree' ? agree : t === 'proj' ? proj : t === 'biz' ? bizTab : todos)(); }
  [].forEach.call(tabs, function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-t')); }); });
  show('todos'); syncBiz();
  try { new MutationObserver(syncBiz).observe(document.documentElement, { attributes: true, attributeFilter: ['data-view'] }); } catch (e) {}
})();
