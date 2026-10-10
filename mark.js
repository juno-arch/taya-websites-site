/* mark.js v5 (Oct 10 2026): no sign-in. Every client has one private link from Taya's emails, webfaery.love/my/#wf=KEY
   (the door, my/door.js), and this file runs in two places:
     on their mockup (webfaery.love/peek/SLUG/?mark=1, loaded by the peek page's own loader): the key comes from #wf=
       (the door), an older ?k= link, or this page's memory, and is taken out of the address bar at once;
     on their own draft or live site: the note bar loader at the top of their page (web-faery-kit, the same block on
       every client site) takes the key out of the address, reloads the page clean, and only then loads this file,
       which reads the key from storage only. Visitors get nothing: without a key the loader loads nothing.
   On a site or draft: no build picker, nothing of theirs hidden; "Leave a note" then tap the spot (a photo too), "Your
   notes", "Send me anything", "Done with this round" on a draft, and a small "Notes" tab when they're just browsing.
   Every page: "Add to my home screen" on phones, "Forget this device", and a friendly "just email me" door whenever a
   cap is reached or something fails, with the note kept. Answers: bad_link (the link was replaced: forget it here),
   closed (a good link, nothing open on this page: "Open my newest"), origin (another site's link).

   The magic mockup (Oct 1 2026). On a client's private mockup (webfaery.love/peek/KEY/?mark=1) they tap
   anything they'd change and type a note. It saves to their portal as a change request, so Taya sees it in
   her dashboard (and gets an email), sets a status and replies, and the client sees all of it right here,
   pinned where they tapped. Uses the portal's own sign-in (the same key portal.js keeps on this website),
   or a private magic link from Taya's email (?mark=1&k=...): the key is kept for this one page (so a reload or
   a later visit still works), taken out of the address bar, and opens notes on this mockup only.
   Loaded only when the address has ?mark=1, by a one-line loader the peek pages carry. No outside scripts,
   and it never changes the mockup itself. It works as the client's own portal, so Taya's studio sees their notes,
   their pick and when they last opened it. Separately, the peek pages themselves (a tiny inline script next to
   that loader, Oct 4 2026) count anonymous opens for Taya's outreach list: just the page's name, no cookies and
   no personal data. That count skips ?mark=1 links like this one.
   The build picker (Oct 2 2026): the first time they open it, a welcome card asks "Which one feels like you?"
   (each build by the name and price the page itself shows: see "the build picker" below). Picking switches the mockup's own "See it as" view and saves the
   pick to their portal (/pick), so the view comes back on their next visit. "Change my pick" in the notes
   panel opens the card again.
   Send me anything (Oct 2 2026; the step after Done): a card for photos, a logo, a menu, reviews, anything not on the mockup yet.
   Files go one at a time to /mockup-upload and land on one list item in their portal ("Things you sent from
   your mockup"). "Done" says thank you and that Taya will email them: this is the whole first visit. Nothing
   to sign or pay here; that comes later, once Taya has written back. */

/* Your notes (Oct 7 2026): Taya's own notes on a mockup before it goes out. Her studio's "Leave notes" opens
   webfaery.love/peek/SLUG/?mark=1#pre=KEY. The key comes out of the address bar at once (the ?mark=1 stays, so
   the page's open count skips this visit), is kept for this tab only (sessionStorage, wf-pre-v1:/peek/SLUG/,
   gone when the tab closes, kept apart from a client's wf-magic-v1 key), and opens two things on the server,
   for this one page only: save a note, read her notes back. Nothing else: no client sign-in or magic link, no
   build picker, no Done, no files. The page looks exactly as the business would see it, and its own "See it as"
   buttons keep working (each note keeps the build it was left on, and a short CSS path to the spot). After the
   first good answer this device is marked as hers (wf-me, the same flag webfaery.love/peek/me/ sets), so her
   later looks do not count as the business opening it. Without a #pre= key (or one kept in this tab) this part
   does nothing at all and the magic mockup below runs exactly as before. Her bar and her list say only she sees
   them, and wear a solid gold border, so they do not look like the dashed, mockup-only pieces the business sees.
   Light and dark (Oct 7 2026): her bar carries a small Light / Dark / Auto switch, so she can see the mockup both
   ways while she edits. It sets data-theme on <html> the way the page's own Light / Dark pill does, keeps that
   pill's pressed state in step (and the buttons of a pill panel, on a mockup that has one), and keeps her choice
   for this tab (sessionStorage, wf-pre-theme-v1:/peek/SLUG/), so a reload keeps the look. It works on a mockup with
   no pill at all. Each note is saved with the look it was made in ("dark mode: " or "light mode: " in front of the
   spot, going by the device setting when she has not picked one), and shows as a small dark or light chip on its pin
   and in My notes. The pill and its panel count as controls (a tap on them is not a note), sit above the bar and the
   note box, and move up above the bar (and the list) when they would sit under it.
   Edits done (Oct 7 2026): once her notes are all in, she taps "Edits done" on her bar (next to Close). That tells
   the studio the edits can start (the same key, this page only: /ready). The button then waits ("Waiting on edits")
   until the edits are done, and the bar says a note will be in her Studio. A second tap while waiting changes
   nothing. It shows only once the server answers with where her edits stand, so this file can go up first. */
// Founding spots (Pollen, Oct 9): the ONE place to update the count. Juliet holds 1. At 0 the picker card drops
// founding, and every <span class="wf-founding-left"> on a mockup reads "all 5 spots are taken".
var FOUNDING_TOTAL = 5, FOUNDING_LEFT = 4;
function foundingLeftWords() {
  return FOUNDING_LEFT > 0
    ? FOUNDING_LEFT + ' of ' + FOUNDING_TOTAL + (FOUNDING_LEFT === 1 ? ' spot is' : ' spots are') + ' still open. While one is, the build is half off, and your deposit holds yours'
    : 'all ' + FOUNDING_TOTAL + ' spots are taken';
}
document.querySelectorAll('.wf-founding-left').forEach(function (n) { n.textContent = foundingLeftWords(); });

(function () {
  'use strict';
  if (window.__wfMark) return;
  const pm = location.pathname.match(/^\/peek\/([a-z0-9-]{1,40})\/?/);
  if (!pm) return;
  const PAGE = '/peek/' + pm[1] + '/';
  const PRE_BASE = 'https://bookings.gardenfaery.love/api/webfaery/preedit';
  const KEY_RE = /^[A-Za-z0-9]{48}$/;
  const STORE = 'wf-pre-v1:' + PAGE;
  let pk = '', tried = false;
  const hm = /[#&]pre=([^&]*)/.exec(location.hash);
  if (hm) {
    tried = true;
    if (KEY_RE.test(hm[1])) pk = hm[1];
    let rest = location.hash.replace(hm[0], '');
    if (rest && rest.charAt(0) !== '#') rest = '#' + rest.slice(1);
    try { history.replaceState(history.state, '', location.pathname + location.search + rest); } catch (e) {}
  }
  // a client's own magic link in the address (?k=) always opens the magic mockup, even in a tab that kept her key
  if (!tried && (new URLSearchParams(location.search).has('k') || /[#&]wf=/.test(location.hash))) return; // (#wf= from the door too, Oct 10 2026)
  if (pk) { try { sessionStorage.setItem(STORE, pk); } catch (e) {} }
  else { try { const v = sessionStorage.getItem(STORE) || ''; if (KEY_RE.test(v)) pk = v; } catch (e) {} }
  if (!pk && !tried) return; // not her link: the magic mockup below, as always
  window.__wfMark = true;

  const STATUS = { new: 'Waiting', doing: 'On it', done: 'Done', declined: 'Skipped' };
  const VIEWS = ['maiden', 'mother', 'crone', 'all'];
  const css = `
  .wfm, .wfm * { box-sizing: border-box; font-family: 'Spectral', Georgia, serif; }
  .wfm-bar { position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); translate: -50% 0; z-index: 2147483002;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 14px; width: max-content; max-width: calc(100vw - 20px);
    padding: 10px 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4; border: 1.5px solid rgba(240, 184, 103, 0.7);
    box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.6); font-size: 15px; line-height: 1.35; }
  .wfm-bar b { color: #f2c77c; font-weight: 600; }
  .wfm-btn { appearance: none; border: 0; border-radius: 999px; padding: 8px 14px; font: 600 14px 'Spectral', Georgia, serif; cursor: pointer;
    background: #f0b867; color: #1c1209; text-decoration: none; display: inline-block; }
  .wfm-btn.ghost { background: transparent; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.4); }
  .wfm-btn.wfm-edits.wait { background: transparent; color: #f2c77c; border: 1px solid rgba(240, 184, 103, 0.7); cursor: default; }
  .wfm-btn.wfm-edits[disabled] { opacity: 0.6; cursor: default; }
  .wfm-hover { outline: 2px dashed #f0b867 !important; outline-offset: 3px !important; cursor: crosshair !important; }
  .wfm-pick { outline: 3px solid #f0b867 !important; outline-offset: 3px !important; }
  .wfm-pop { position: absolute; z-index: 2147483001; width: min(340px, calc(100vw - 20px)); padding: 14px; border-radius: 14px;
    background: #1b1a17; color: #efe6d4; border: 1px solid rgba(240, 184, 103, 0.55); box-shadow: 0 18px 50px -10px rgba(0, 0, 0, 0.7); }
  .wfm-pop p { margin: 0 0 8px; font-size: 13.5px; color: #c9bfac; }
  .wfm-pop textarea { width: 100%; min-height: 92px; resize: vertical; padding: 10px; border-radius: 10px; border: 1px solid rgba(239, 230, 212, 0.25);
    background: #121210; color: #efe6d4; font-size: 16px; line-height: 1.45; }
  .wfm-pop .row { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  .wfm-pop .err { color: #f3a98c; font-size: 13.5px; margin: 8px 0 0; }
  .wfm-pin { position: absolute; z-index: 2147482999; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%;
    display: grid; place-items: center; background: #f0b867; color: #1c1209; font: 700 13px 'Spectral', Georgia, serif;
    box-shadow: 0 0 0 3px rgba(27, 26, 23, 0.85), 0 4px 12px rgba(0, 0, 0, 0.5); border: 0; cursor: pointer; }
  .wfm-pin.done { background: #9fc59a; }
  .wfm-pin.skip { background: #a99f8d; }
  .wfm-panel { position: fixed; right: 12px; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; width: min(360px, calc(100vw - 24px));
    max-height: min(60vh, 520px); overflow: auto; padding: 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4;
    border: 1.5px solid rgba(240, 184, 103, 0.7); box-shadow: 0 18px 50px -10px rgba(0, 0, 0, 0.7); }
  .wfm-panel h2 { margin: 0 0 10px; font: 400 20px 'Gloock', Georgia, serif; color: #efe6d4; }
  .wfm-panel ol { margin: 0 !important; padding: 0 !important; list-style: none !important; display: grid !important; gap: 10px; grid-template-columns: minmax(0, 1fr) !important; }
  .wfm-panel li { display: block !important; width: auto !important; margin: 0 !important; padding: 10px 12px !important; border-radius: 12px; background: #23221e;
    font-size: 14.5px; line-height: 1.45; text-align: left !important; columns: auto !important; }
  .wfm-panel li::before, .wfm-panel li::after { content: none !important; }
  .wfm-panel li > div { display: block !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
  .wfm-panel .where { font-size: 12.5px; color: #c9bfac; }
  .wfm-panel .st { display: inline-block; margin-top: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(240, 184, 103, 0.16); color: #f2c77c; }
  .wfm-panel .st.done { background: rgba(159, 197, 154, 0.18); color: #9fc59a; }
  .wfm-panel .st.declined { background: rgba(201, 191, 172, 0.14); color: #c9bfac; }
  .wfm-panel .reply { margin-top: 6px; padding-left: 10px; border-left: 2px solid rgba(240, 184, 103, 0.5); color: #e6dccb; }
  .wfm-panel .none { color: #c9bfac; font-size: 14.5px; }
  .wfm-panel .mine { margin: -4px 0 12px; font-size: 14px; color: #c9bfac; }
  .wfm-panel .ph { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: -14px; z-index: 1; margin: -14px -14px 8px; padding: 10px 10px 6px 14px; background: #1b1a17; }
  .wfm-panel .ph h2 { margin: 0; }
  .wfm-panel .x { flex: none; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; margin: 0; border-radius: 50%; border: 1.5px solid rgba(240, 184, 103, 0.6); background: transparent;
    color: #efe6d4; font: 400 26px/1 Georgia, serif; cursor: pointer; }
  .wfm-panel .x:hover, .wfm-panel .x:focus-visible { background: rgba(240, 184, 103, 0.18); outline: none; }
  .wfm-seg { display: inline-flex; border: 1px solid rgba(239, 230, 212, 0.4); border-radius: 999px; overflow: hidden; }
  .wfm-seg button { appearance: none; border: 0; margin: 0; border-radius: 0; background: transparent; color: #efe6d4; cursor: pointer; padding: 8px 13px;
    font: 600 14px 'Spectral', Georgia, serif; line-height: 1.35; }
  .wfm-seg button + button { border-left: 1px solid rgba(239, 230, 212, 0.25); }
  .wfm-seg button[aria-pressed="true"] { background: #f0b867; color: #1c1209; }
  .wfm-seg button:focus-visible { outline: 2px solid #f2c77c; outline-offset: -3px; }
  .wfm-look { display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 999px; font: 600 11px/1.6 'Spectral', Georgia, serif;
    vertical-align: 1px; background: #0d0c0a; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.45); }
  .wfm-look.light { background: #f6efe0; color: #1c1209; border-color: rgba(240, 184, 103, 0.9); }
  .wfm-pin[data-look]::after { content: attr(data-look); position: absolute; left: 50%; top: 100%; margin-top: 4px; translate: -50% 0; padding: 0 6px;
    border-radius: 999px; font: 600 10.5px/1.6 'Spectral', Georgia, serif; white-space: nowrap; pointer-events: none;
    background: #0d0c0a; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.45); }
  .wfm-pin[data-look="light"]::after { background: #f6efe0; color: #1c1209; border-color: rgba(240, 184, 103, 0.9); }
  /* the page's own Light / Dark pill: above the bar and the note box, and lifted clear of the bar when it would sit under it */
  #theme-tab, #theme-panel { z-index: 2147483002 !important; }
  html.wfm-lift #theme-tab { bottom: var(--wfm-lift) !important; }
  html.wfm-lift #theme-panel { bottom: calc(var(--wfm-lift) + 40px) !important; }
  @media (prefers-reduced-motion: no-preference) { .wfm-pin { transition: transform 0.2s ease; } .wfm-pin:hover { transform: scale(1.12); } }`;
  const sty = document.createElement('style'); sty.textContent = css; document.head.appendChild(sty);

  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const ours = (n) => !!(n && n.closest && n.closest('.wfm, .wfm-bar, .wfm-pop, .wfm-panel, .wfm-pin, [class^="wf-"], [class*=" wf-"]'));

  /* ---------------- the bar ---------------- */
  const bar = el('div', 'wfm wfm-bar'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Your notes');
  document.body.appendChild(bar);
  const exitUrl = location.pathname + location.hash; // the plain page, as the business sees it
  const closeLink = () => { const a = el('a', 'wfm-btn ghost', 'Close'); a.href = exitUrl; return a; };
  const panel = el('section', 'wfm wfm-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Your notes');
  document.body.appendChild(panel);
  // the title row, with a little X so the list can always be put away
  const panelHead = () => {
    const h = el('div', 'ph'); const x = el('button', 'x', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', 'Close my notes');
    x.addEventListener('click', () => { panel.hidden = true; });
    h.append(el('h2', '', 'Your notes'), x); return h;
  };
  let marking = !!pk, notes = [], pinLayer = [];

  // the link's key no longer opens anything (a fresh one was made, or the mockup moved)
  function replaced() {
    pk = ''; try { sessionStorage.removeItem(STORE); } catch (e) {}
    marking = false; clearHover(); closePop(); panel.hidden = true;
    pinLayer.forEach((p) => p.remove()); pinLayer = [];
    bar.textContent = '';
    bar.append(el('span', '', 'This notes link was replaced. Open a fresh one from your Studio.'), closeLink());
  }

  const HINT = 'only you see these. Tap anything you’d like changed.';
  const say = el('span'); say.append(el('b', '', 'Your notes: '), document.createTextNode(HINT));
  const listBtn = el('button', 'wfm-btn ghost', 'My notes'); listBtn.type = 'button';
  const pauseBtn = el('button', 'wfm-btn ghost', 'Pause'); pauseBtn.type = 'button';
  pauseBtn.addEventListener('click', () => {
    marking = !marking; pauseBtn.textContent = marking ? 'Pause' : 'Keep marking';
    say.lastChild.textContent = marking ? HINT : 'paused, so the page works as usual.';
    clearHover(); closePop();
  });

  /* ---------------- Edits done: her go ahead for the edits ---------------- */
  const editsBtn = el('button', 'wfm-btn wfm-edits', 'Edits done'); editsBtn.type = 'button'; editsBtn.hidden = true;
  let edits = null, editsSending = false;
  const SENT_SAY = 'sent for edits. You’ll get a note in your Studio when they’re done.';
  function paintEdits() {
    editsBtn.hidden = !edits; // only once the server says where her edits stand
    const w = !!edits && edits.state === 'waiting';
    editsBtn.classList.toggle('wait', w);
    editsBtn.textContent = w ? 'Waiting on edits' : 'Edits done';
    editsBtn.setAttribute('aria-disabled', w ? 'true' : 'false');
    editsBtn.title = w ? 'Sent. You’ll get a note in your Studio when the edits are done.' : 'Tap once your notes are all in, and the edits start';
  }
  editsBtn.addEventListener('click', async () => {
    if (!pk || editsSending || !edits) return;
    if (edits.state === 'waiting') { say.lastChild.textContent = SENT_SAY; return; } // already sent: nothing changes
    editsSending = true; editsBtn.disabled = true; editsBtn.textContent = 'Sending…';
    try {
      const res = await call('/ready', { page: PAGE });
      if (res.edits) edits = res.edits;
      say.lastChild.textContent = SENT_SAY;
    } catch (x) {
      if (x.code === 'bad_link') { editsSending = false; replaced(); return; }
      say.lastChild.textContent = 'that didn’t send. Check your connection and tap Edits done again.';
    }
    editsSending = false; editsBtn.disabled = false; paintEdits();
  });

  /* ---------------- light or dark: the page both ways while she edits ---------------- */
  const root = document.documentElement;
  const LOOK_STORE = 'wf-pre-theme-v1:' + PAGE; // her last choice in this tab: light, dark or auto
  const PILL_BTNS = '#theme-tab [data-theme], #theme-panel [data-theme], .theme-tab [data-theme], .theme-panel [data-theme]';
  const pageLook = () => { const v = root.getAttribute('data-theme'); return v === 'light' || v === 'dark' ? v : ''; };
  const modeNow = () => pageLook() || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const lookBox = el('div', 'wfm-seg'); lookBox.setAttribute('role', 'group'); lookBox.setAttribute('aria-label', 'Light or dark look');
  const lookBtns = [['light', 'Light', 'See the page in light mode'], ['dark', 'Dark', 'See the page in dark mode'], ['auto', 'Auto', 'Follow this device’s setting']].map((x) => {
    const b = el('button', '', x[1]); b.type = 'button'; b.dataset.look = x[0]; b.title = x[2]; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setLook(x[0]));
    lookBox.append(b); return b;
  });
  let popChip = null; // the small dark or light chip in the open note box
  function paintLook() {
    const cur = pageLook() || 'auto';
    lookBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.look === cur ? 'true' : 'false'));
    // the page's own pill (and the buttons of a pill panel) show the same state
    document.querySelectorAll(PILL_BTNS).forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-theme') === cur ? 'true' : 'false'));
    if (popChip) { const m = modeNow(); popChip.className = 'wfm-look ' + m; popChip.textContent = m; }
  }
  const keepLook = () => { try { sessionStorage.setItem(LOOK_STORE, pageLook() || 'auto'); } catch (e) {} };
  function setLook(v) {
    if (v === 'light' || v === 'dark') root.setAttribute('data-theme', v); else root.removeAttribute('data-theme');
    keepLook(); paintLook();
  }
  function startLook() {
    let saved = ''; try { saved = sessionStorage.getItem(LOOK_STORE) || ''; } catch (e) {}
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
    paintLook();
    // the page's own pill changes the same attribute: follow it, and keep that choice too
    if (window.MutationObserver) new MutationObserver(() => { keepLook(); paintLook(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  // each note says which look it was made in, in front of its spot ("dark mode: ..."), and shows it as a small chip
  const LOOK_RE = /^(dark|light) mode: /;
  const lookOf = (s) => { const m = LOOK_RE.exec(String(s || '')); return m ? m[1] : ''; };
  const bareSpot = (s) => String(s || '').replace(LOOK_RE, '');
  const withLook = (spot, look) => { // the server keeps a spot to 150 characters: the spot is trimmed to fit
    const pre = look + ' mode: ', room = 150 - pre.length;
    if (spot.length <= room) return pre + spot;
    return pre + (/”$/.test(spot) ? spot.slice(0, room - 2) + '…”' : spot.slice(0, room - 1) + '…');
  };
  // The pill sits at the bottom left (or bottom right), where the bar covers it on a phone: then it moves up above
  // the bar, and above the list when that is open. Where the bar does not reach it, it stays where the page puts it.
  function dock() {
    const tab = document.getElementById('theme-tab'); if (!tab) return;
    root.classList.remove('wfm-lift');
    if (!tab.getClientRects().length || !bar.getClientRects().length) return;
    const a = tab.getBoundingClientRect();
    const boxes = [bar, panel].filter((n) => !n.hidden && n.getClientRects().length).map((n) => n.getBoundingClientRect())
      .filter((b) => a.left < b.right - 6 && b.left + 6 < a.right); // (a few pixels of rounded corner touching is fine)
    if (!boxes.some((b) => a.top < b.bottom && b.top < a.bottom)) return;
    const h = root.clientHeight, top = Math.min.apply(null, boxes.map((b) => b.top));
    root.style.setProperty('--wfm-lift', Math.max(0, Math.min(h - top + 8, h - a.height - 8)) + 'px');
    root.classList.add('wfm-lift');
  }
  let dq = 0;
  const dockSoon = () => { if (!dq) dq = requestAnimationFrame(() => { dq = 0; dock(); }); };

  /* ---------------- choosing a spot (the same rules as the magic mockup) ---------------- */
  const PICKABLE = 'img, video, figure, h1, h2, h3, h4, p, li, a, button, label, blockquote, dt, dd, .price, .photo, section, article, [class*="hero"], header';
  const CONTROL = 'summary, select, option, button[aria-expanded], button[aria-pressed], [role="tab"], button[data-view], a[data-view], button[data-go], .tag[data-go], .build[data-go], a[data-go], '
    + '.theme-tab, .theme-panel, #theme-tab, #theme-panel, button[data-theme], a[data-theme]'; // (the Light / Dark pill and its panel; not <html data-theme>)
  const isControl = (t) => { const c = t.closest && t.closest(CONTROL); return !!(c && !ours(c)); };
  const pickOf = (t) => {
    if (isControl(t)) return null;
    const w = t.closest && t.closest('[data-mark-whole]'); if (w && !ours(w)) return w;
    const n = t.closest && t.closest(PICKABLE); return n && !ours(n) ? n : null;
  };
  let hovered = null;
  function clearHover() { if (hovered) hovered.classList.remove('wfm-hover'); hovered = null; }
  document.addEventListener('mouseover', (e) => {
    if (!marking || popOpen) return;
    const n = pickOf(e.target); if (n === hovered) return;
    clearHover(); if (n) { hovered = n; n.classList.add('wfm-hover'); }
  }, true);
  document.addEventListener('click', (e) => {
    if (!marking || ours(e.target)) return;
    if (isControl(e.target)) return; // "See it as", dropdowns and tabs work as usual
    const n = pickOf(e.target); if (!n) return;
    e.preventDefault(); e.stopPropagation();
    openPop(n);
  }, true);
  const label = (n) => {
    if (n.getAttribute('data-mark-label')) return n.getAttribute('data-mark-label');
    const txt = (n.getAttribute('alt') || n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim();
    const img = n.matches('img, figure, .photo') ? (n.querySelector && n.querySelector('img') || n) : null;
    const alt = img && img.getAttribute && img.getAttribute('alt');
    const thing = alt ? 'photo: ' + alt : txt;
    return thing.length > 70 ? thing.slice(0, 67).replace(/\s+\S*$/, '') + '…' : thing;
  };
  const section = (n) => {
    const s = n.closest('section, header, footer, [data-page]');
    if (!s) return '';
    const h = s.querySelector('h1, h2'); const t = h ? h.textContent.replace(/\s+/g, ' ').trim() : (s.id || '');
    return t.length > 40 ? t.slice(0, 38) + '…' : t;
  };
  const spotOf = (n) => { const sec = section(n), l = label(n); return (sec && l && sec !== l ? sec + ' › ' : '') + (l ? '“' + l + '”' : sec || 'the page'); };
  // a short CSS path to the spot (from the nearest id, else from body), so a note finds its exact element again
  const cssPath = (n) => {
    const parts = [];
    for (let x = n; x && x.nodeType === 1 && x !== document.body && x !== document.documentElement; x = x.parentElement) {
      if (x.id && /^[A-Za-z][A-Za-z0-9_-]{0,60}$/.test(x.id) && document.querySelectorAll('#' + x.id).length === 1) { parts.unshift('#' + x.id); break; }
      let i = 1; for (let s = x.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === x.tagName) i++;
      parts.unshift(x.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      if (!x.parentElement || x.parentElement === document.body) parts.unshift('body');
    }
    const p = parts.join(' > ');
    return p.length <= 200 ? p : '';
  };
  // the build the page is showing ("See it as"), so the note lands on the right view
  const viewNow = () => {
    const b = document.querySelector('.vseg [data-view][aria-pressed="true"]');
    const v = (b && b.getAttribute('data-view')) || document.documentElement.getAttribute('data-view') || '';
    return VIEWS.indexOf(v) >= 0 ? v : '';
  };
  const viewName = (v) => {
    if (!v || v === 'all') return '';
    const b = document.querySelector('.vseg [data-view="' + v + '"]');
    const t = b && ((b.dataset && b.dataset.tierName) || (b.querySelector('b') && b.querySelector('b').textContent) || '');
    return t ? t.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
  };

  /* ---------------- the note ---------------- */
  let pop = null, popOpen = false, picked = null;
  function closePop() { if (pop) pop.remove(); pop = null; popOpen = false; popChip = null; if (picked) picked.classList.remove('wfm-pick'); picked = null; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); panel.hidden = true; } });
  function openPop(n) {
    closePop(); clearHover(); panel.hidden = true; // one thing open at a time: the list does not sit under a note box
    picked = n; n.classList.add('wfm-pick'); popOpen = true;
    const spot = spotOf(n), path = cssPath(n), view = viewNow();
    pop = el('div', 'wfm wfm-pop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Your note');
    const ta = el('textarea'); ta.placeholder = 'What would you like changed here?'; ta.maxLength = 1000; ta.setAttribute('aria-label', 'Your note');
    const err = el('p', 'err'); err.hidden = true;
    const row = el('div', 'row');
    const cancel = el('button', 'wfm-btn ghost', 'Cancel'); cancel.type = 'button';
    const send = el('button', 'wfm-btn', 'Save note'); send.type = 'button';
    const head = el('p', '', spot); popChip = el('span', 'wfm-look'); popChip.title = 'Saved with the note: the look this page is in';
    head.append(popChip); paintLook();
    row.append(cancel, send); pop.append(head, ta, err, row);
    document.body.appendChild(pop);
    const r = n.getBoundingClientRect();
    dock();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.max(10, Math.min(r.left, window.innerWidth - pw - 10));
    let vtop = Math.min(r.bottom + 10, window.innerHeight - 260);
    // keep the box clear of the bar and the Light / Dark pill
    for (const x of [bar, document.getElementById('theme-tab')]) {
      if (!x || !x.getClientRects().length) continue;
      const b = x.getBoundingClientRect();
      if (left < b.right && b.left < left + pw) vtop = Math.min(vtop, b.top - 10 - ph);
    }
    pop.style.top = (window.scrollY + Math.max(10, vtop)) + 'px'; pop.style.left = (window.scrollX + left) + 'px';
    ta.focus({ preventScroll: true });
    cancel.addEventListener('click', closePop);
    const nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    send.addEventListener('click', async () => {
      const what = ta.value.trim();
      if (what.length < 3) { err.hidden = false; err.textContent = 'Just a few words is plenty.'; ta.focus(); return; }
      send.disabled = true; send.textContent = 'Saving…'; err.hidden = true;
      try {
        const look = modeNow(), spotOut = withLook(spot, look);
        const res = await call('/mark', { page: PAGE, what, spot: spotOut, spot_path: path, view, nonce }); // a retry reuses the nonce
        if (!notes.some((x) => x.id === res.id)) notes.push({ id: res.id, what, spot: spotOut, spot_path: path, view, status: 'new', reply: '', el: n });
        closePop(); renderPins(); renderPanel();
        say.lastChild.textContent = 'saved in ' + look + ' mode. Tap anything else, or see My notes.';
      } catch (x) {
        if (x.code === 'bad_link') { replaced(); return; }
        send.disabled = false; send.textContent = 'Save note'; err.hidden = false;
        err.textContent = x.code === 'slow_down' ? 'That’s a lot of notes at once. Try again a little later.'
          : 'That didn’t save. Check your connection and try again.';
      }
    });
  }

  /* ---------------- talking to the server: only her two routes, with this page's key ---------------- */
  async function call(path, body) {
    let res;
    try {
      res = await fetch(PRE_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, body, { pk: pk })), mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.ok) { const x = new Error('fail'); x.code = (data && data.error) || 'server'; throw x; }
    return data;
  }

  /* ---------------- pins and the list ---------------- */
  const byPath = (p) => { if (!p) return null; try { const n = document.querySelector(p); return n && !ours(n) ? n : null; } catch (e) { return null; } };
  const byWords = (spot) => {
    const q = (String(spot || '').match(/“(.+?)…?”/) || [])[1];
    if (!q) return null;
    const words = q.replace(/^photo: /, '');
    for (const g of document.querySelectorAll('[data-mark-label]')) if (g.getAttribute('data-mark-label') === words && !ours(g)) return g;
    for (const n of document.querySelectorAll(PICKABLE)) {
      if (ours(n)) continue;
      const t = (n.getAttribute('alt') || n.textContent || '').replace(/\s+/g, ' ').trim();
      const img = n.querySelector && n.querySelector('img');
      if ((t && t.indexOf(words) === 0) || (img && (img.getAttribute('alt') || '').indexOf(words) === 0)) return n;
    }
    return null;
  };
  function renderPins() {
    pinLayer.forEach((p) => p.remove()); pinLayer = [];
    notes.forEach((note, i) => {
      const n = note.el || (note.el = byPath(note.spot_path) || byWords(note.spot));
      if (!n || !n.getClientRects().length) return;
      const r = n.getBoundingClientRect();
      const pin = el('button', 'wfm-pin' + (note.status === 'done' ? ' done' : note.status === 'declined' ? ' skip' : ''), String(i + 1));
      const lk = lookOf(note.spot); if (lk) pin.dataset.look = lk;
      pin.type = 'button'; pin.setAttribute('aria-label', 'Note ' + (i + 1) + (lk ? ', ' + lk + ' mode' : '') + ', ' + (STATUS[note.status] || 'Waiting') + ': ' + note.what);
      // a pin on an edge to edge photo or section would stick out past the screen (and its light or dark chip with it): it is kept on screen
      pin.style.top = (window.scrollY + r.top + 4) + 'px'; pin.style.left = Math.min(window.scrollX + r.right - 4, window.scrollX + root.clientWidth - 22) + 'px';
      pin.addEventListener('click', () => { panel.hidden = false; renderPanel(i); });
      document.body.appendChild(pin); pinLayer.push(pin);
    });
  }
  // the list sits just above the bar, however many lines the bar takes (two on a phone)
  const placePanel = () => { panel.style.bottom = 'calc(' + Math.round(bar.getBoundingClientRect().height + 24) + 'px + env(safe-area-inset-bottom, 0px))'; };
  function renderPanel(focusIndex) {
    panel.textContent = '';
    placePanel();
    panel.append(panelHead(), el('p', 'mine', 'Only you see these notes.'));
    if (!notes.length) panel.append(el('p', 'none', 'Nothing yet. Tap anything on the page to leave a note.'));
    else {
      const ol = el('ol');
      notes.forEach((n, i) => {
        const li = el('li');
        const vn = viewName(n.view), lk = lookOf(n.spot);
        const where = el('div', 'where', (i + 1) + '. ' + bareSpot(n.spot) + (vn ? '  ·  ' + vn : ''));
        if (lk) where.append(el('span', 'wfm-look ' + lk, lk));
        li.append(where, el('div', '', n.what),
          el('span', 'st ' + (n.status || 'new'), STATUS[n.status] || 'Waiting'));
        if (n.reply) li.append(el('div', 'reply', n.reply));
        ol.append(li);
        if (i === focusIndex) setTimeout(() => li.scrollIntoView({ block: 'nearest' }), 30);
      });
      panel.append(ol);
    }
    listBtn.textContent = 'My notes' + (notes.length ? ' (' + notes.length + ')' : '');
  }
  listBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); });

  // the Light / Dark pill keeps clear of the bar and the list, whatever the bar is saying
  if (window.ResizeObserver) { const ro = new ResizeObserver(dockSoon); ro.observe(bar); ro.observe(panel); }
  window.addEventListener('load', dockSoon);
  window.addEventListener('resize', dockSoon);
  window.addEventListener('scroll', () => { if (!root.classList.contains('wfm-lift')) dockSoon(); }, { passive: true });
  dockSoon();
  if (!pk) { replaced(); return; } // a link with a broken key
  bar.append(say, lookBox, listBtn, pauseBtn, editsBtn, closeLink());
  startLook();
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { renderPins(); placePanel(); }, 120); });
  window.addEventListener('hashchange', () => setTimeout(renderPins, 350));
  document.addEventListener('click', (e) => { if (!ours(e.target)) setTimeout(renderPins, 450); });

  const load = () => call('/marks', { page: PAGE }).then((d) => {
    try { localStorage.setItem('wf-me', '1'); } catch (e) {} // this device is hers: her looks are not counted as an open
    notes = (Array.isArray(d.marks) ? d.marks : []).map((x) => ({ id: x.id, what: x.what, spot: x.spot, spot_path: x.spot_path || '', view: x.view || '', status: x.status, reply: x.reply || '' }));
    edits = d.edits && typeof d.edits === 'object' ? d.edits : null;
    paintEdits(); renderPins(); renderPanel();
  });
  load().catch((x) => {
    if (x.code === 'bad_link') { replaced(); return; }
    say.lastChild.textContent = 'the server can’t be reached just now, so notes may not save. Try reloading in a minute.';
  });
  // back on this tab while the edits are being made: check again, so the button and her notes catch up
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !pk || !edits || edits.state !== 'waiting' || popOpen) return;
    load().catch((x) => { if (x.code === 'bad_link') replaced(); });
  });
})();

(function () {
  'use strict';
  if (window.__wfMark) return; window.__wfMark = true;

  /* ---------------- where this is, and the key ---------------- */
  const BASE = 'https://bookings.gardenfaery.love/api/webfaery/portal';
  const KEY_RE = /^[A-Za-z0-9]{24,64}$/;
  const pm = location.pathname.match(/^\/peek\/([a-z0-9-]{1,40})\/?/);
  // (a peek page served on 127.0.0.1 by a local rehearsal counts as webfaery.love: a client site has no /peek/ pages)
  const ON_WF = /^(www\.)?webfaery\.love$/.test(location.hostname) || (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && !!pm);
  // a mockup on webfaery.love, or a client's own site or draft (loaded there only by the loader, with a key)
  const MODE = ON_WF ? (pm ? 'mockup' : '') : 'site';
  if (!MODE) return;
  const MOCK = MODE === 'mockup';
  const PAGE = MOCK ? '/peek/' + pm[1] + '/' : (location.pathname.replace(/\/index\.html$/, '/') || '/').slice(0, 120);
  const STATUS = { new: 'Sent', seen: 'Seen', quoted: 'Priced', doing: 'On it', done: 'Done', declined: 'Not this time' };
  const DOOR = 'https://webfaery.love/my/';
  // the same storage names as the loader (wf-key-v1, or wf-key-v1:/<repo>/ on a shared *.github.io address), and per
  // page on webfaery.love (wf-magic-v1:/peek/SLUG/), where every client's mockup shares one address with Taya's own pages
  const gh = /\.github\.io$/.test(location.hostname) ? (location.pathname.split('/')[1] || '') : '';
  const STORE = MOCK ? 'wf-magic-v1:' + PAGE : 'wf-key-v1' + (gh ? ':/' + gh + '/' : '');
  const HIDE = 'wf-bar-hidden' + (gh ? ':/' + gh + '/' : '');
  const both = (fn) => { try { fn(sessionStorage); } catch (e) {} try { fn(localStorage); } catch (e) {} };

  let key = '';
  if (MOCK) {
    // #wf= from the door first, then an older ?k= link, then this page's own memory; out of the address bar at once
    const hm = /[#&]wf=([A-Za-z0-9]{24,64})(?:&|$)/.exec(location.hash);
    const qs = new URLSearchParams(location.search);
    if (hm) key = hm[1];
    else if (qs.has('k') && KEY_RE.test(qs.get('k') || '')) key = qs.get('k');
    if (hm || qs.has('k')) {
      qs.delete('k');
      let rest = location.hash;
      if (hm) { rest = rest.replace(hm[0], ''); if (rest && rest.charAt(0) !== '#') rest = '#' + rest.slice(1); }
      const q = qs.toString();
      try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + rest); } catch (e) {}
    }
    if (key) both((s) => s.setItem(STORE, key));
    else both((s) => { const v = s.getItem(STORE) || ''; if (!key && KEY_RE.test(v)) key = v; });
  } else {
    // their own site or draft: the loader already took the key out of the address, so it comes from storage only
    both((s) => { const v = s.getItem(STORE) || ''; if (!key && KEY_RE.test(v)) key = v; });
    if (!key) return;
  }
  let arrived = false; // on their site: they came from their link or their icon (the full bar), not just browsing (a small tab)
  if (!MOCK) { try { arrived = sessionStorage.getItem('wf-arrived') === '1'; } catch (e) {} }
  if (arrived) { try { localStorage.removeItem(HIDE); } catch (e) {} }
  const forget = () => { key = ''; both((s) => { s.removeItem(STORE); s.removeItem('wf-arrived'); }); };

  /* ---------------- the look ---------------- */
  const css = `
  .wfm, .wfm * { box-sizing: border-box; font-family: 'Spectral', Georgia, serif; }
  .wfm-bar { position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); translate: -50% 0; z-index: 2147483000;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 14px; width: max-content; max-width: calc(100vw - 20px);
    padding: 10px 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4; border: 1.5px dashed rgba(240, 184, 103, 0.7);
    box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.6); font-size: 15px; line-height: 1.35; text-align: left; }
  .wfm-bar b { color: #f2c77c; font-weight: 600; }
  .wfm-tab { position: fixed; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; appearance: none; cursor: pointer;
    padding: 8px 14px; border-radius: 999px; background: #1b1a17; color: #f2c77c; border: 1.5px dashed rgba(240, 184, 103, 0.7);
    font: 600 14px 'Spectral', Georgia, serif; box-shadow: 0 8px 26px -8px rgba(0, 0, 0, 0.6); }
  .wfm-btn { appearance: none; border: 0; border-radius: 999px; padding: 8px 14px; font: 600 14px 'Spectral', Georgia, serif; cursor: pointer;
    background: #f0b867; color: #1c1209; text-decoration: none; display: inline-block; line-height: 1.35; }
  .wfm-btn.ghost { background: transparent; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.4); }
  .wfm-btn[disabled] { opacity: 0.6; cursor: default; }
  .wfm-hover { outline: 2px dashed #f0b867 !important; outline-offset: 3px !important; cursor: crosshair !important; }
  .wfm-pick { outline: 3px solid #f0b867 !important; outline-offset: 3px !important; }
  .wfm-pop { position: absolute; z-index: 2147483001; width: min(340px, calc(100vw - 20px)); padding: 14px; border-radius: 14px; text-align: left;
    background: #1b1a17; color: #efe6d4; border: 1px solid rgba(240, 184, 103, 0.55); box-shadow: 0 18px 50px -10px rgba(0, 0, 0, 0.7); }
  .wfm-pop p { margin: 0 0 8px; font-size: 13.5px; color: #c9bfac; }
  .wfm-pop p.pf { color: #f2c77c; }
  .wfm-pop textarea { width: 100%; min-height: 92px; resize: vertical; padding: 10px; border-radius: 10px; border: 1px solid rgba(239, 230, 212, 0.25);
    background: #121210; color: #efe6d4; font-size: 16px; line-height: 1.45; }
  .wfm-pop .row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 10px; }
  .wfm-pop .err { color: #f3a98c; font-size: 13.5px; margin: 8px 0 0; }
  .wfm-pop .photo { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 13.5px; color: #c9bfac; }
  .wfm-pop .photo img { width: 54px; height: 54px; object-fit: cover; border-radius: 8px; }
  .wfm-pop .photo input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .wfm-door { margin: 10px 0 0; padding: 10px 12px; border-radius: 12px; background: #23221e; font-size: 14px; line-height: 1.45; color: #efe6d4; }
  .wfm-door .row { justify-content: flex-start; margin-top: 8px; }
  .wfm-pin { position: absolute; z-index: 2147482999; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%;
    display: grid; place-items: center; background: #f0b867; color: #1c1209; font: 700 13px 'Spectral', Georgia, serif;
    box-shadow: 0 0 0 3px rgba(27, 26, 23, 0.85), 0 4px 12px rgba(0, 0, 0, 0.5); border: 0; cursor: pointer; }
  .wfm-pin.done { background: #9fc59a; }
  .wfm-pin::after { content: attr(data-chip); position: absolute; left: 50%; top: 100%; margin-top: 4px; translate: -50% 0; padding: 0 6px; border-radius: 999px;
    font: 600 10.5px/1.6 'Spectral', Georgia, serif; white-space: nowrap; pointer-events: none; background: #1b1a17; color: #f2c77c; border: 1px solid rgba(240, 184, 103, 0.6); }
  .wfm-pin.done::after { color: #9fc59a; border-color: rgba(159, 197, 154, 0.7); }
  .wfm-panel { position: fixed; right: 12px; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; width: min(360px, calc(100vw - 24px));
    max-height: min(60vh, 520px); overflow: auto; padding: 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4; text-align: left;
    border: 1.5px dashed rgba(240, 184, 103, 0.7); box-shadow: 0 18px 50px -10px rgba(0, 0, 0, 0.7); }
  .wfm-panel h2 { margin: 0 0 10px; font: 400 20px 'Gloock', Georgia, serif; color: #efe6d4; }
  .wfm-panel ol { margin: 0 !important; padding: 0 !important; list-style: none !important; display: grid !important; gap: 10px; grid-template-columns: minmax(0, 1fr) !important; }
  /* a mockup's or a site's own list styles (flex rows, columns, counters) stay out of the notes panel */
  .wfm-panel li { display: block !important; width: auto !important; margin: 0 !important; padding: 10px 12px !important; border-radius: 12px; background: #23221e;
    font-size: 14.5px; line-height: 1.45; text-align: left !important; columns: auto !important; }
  .wfm-panel li::before, .wfm-panel li::after { content: none !important; }
  .wfm-panel li > div { display: block !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
  .wfm-panel .where { font-size: 12.5px; color: #c9bfac; }
  .wfm-panel .st { display: inline-block; margin-top: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(240, 184, 103, 0.16); color: #f2c77c; }
  .wfm-panel .reply { margin-top: 6px; padding-left: 10px; border-left: 2px solid rgba(240, 184, 103, 0.5); color: #e6dccb; }
  .wfm-panel .none { color: #c9bfac; font-size: 14.5px; }
  .wfm-panel .mypick, .wfm-panel .small { margin: -4px 0 12px; font-size: 14px; color: #c9bfac; }
  .wfm-panel .small { margin: 12px 0 0; }
  .wfm-panel .links { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 12px; }
  .wfm-panel .ph { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: -14px; z-index: 1; margin: -14px -14px 8px; padding: 10px 10px 6px 14px; background: #1b1a17; }
  .wfm-panel .ph h2 { margin: 0; }
  .wfm-panel .x { flex: none; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; margin: 0; border-radius: 50%; border: 1.5px solid rgba(240, 184, 103, 0.6); background: transparent;
    color: #efe6d4; font: 400 26px/1 Georgia, serif; cursor: pointer; }
  .wfm-panel .x:hover, .wfm-panel .x:focus-visible { background: rgba(240, 184, 103, 0.18); outline: none; }
  .wfm-link { appearance: none; background: none; border: 0; padding: 0; color: #f2c77c; font: inherit; text-decoration: underline; cursor: pointer; }
  .wfm-scrim { position: fixed; inset: 0; z-index: 2147483002; background: rgba(12, 11, 10, 0.72); display: grid; place-items: center;
    padding: 16px; overflow-y: auto; }
  .wfm-card { width: min(860px, 100%); margin: auto; padding: 24px 22px 20px; border-radius: 20px; background: #1b1a17; color: #efe6d4; text-align: left;
    border: 1px solid rgba(240, 184, 103, 0.5); box-shadow: 0 24px 70px -12px rgba(0, 0, 0, 0.75); }
  .wfm-card.narrow { width: min(460px, 100%); }
  .wfm-card h2 { margin: 0 0 6px; font: 400 28px/1.15 'Gloock', Georgia, serif; color: #efe6d4; }
  .wfm-card .lead { margin: 0 0 18px; font-size: 16px; line-height: 1.5; color: #d9cfbd; }
  .wfm-builds { display: grid; gap: 12px; grid-template-columns: 1fr; }
  @media (min-width: 720px) { .wfm-builds { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .wfm-build { appearance: none; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 6px; padding: 16px; border-radius: 14px;
    background: #23221e; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.18); font: inherit; }
  .wfm-build:hover, .wfm-build:focus-visible { border-color: #f0b867; outline: none; box-shadow: 0 0 0 2px rgba(240, 184, 103, 0.35); }
  .wfm-build.on { border-color: #f0b867; }
  .wfm-build .nm { font: 400 22px/1.1 'Gloock', Georgia, serif; }
  .wfm-build .price { font-size: 15px; color: #f2c77c; font-weight: 600; }
  .wfm-build .price s { color: #a99f8d; font-weight: 400; margin-left: 4px; }
  .wfm-build .price .once { color: #c9bfac; font-weight: 400; }
  .wfm-build .price .care-mo { display: block; font-size: 14px; margin-top: 2px; }
  .wfm-build .what { font-size: 14.5px; line-height: 1.45; color: #d9cfbd; }
  .wfm-card .spots { margin: 14px 0 0; font-size: 14px; color: #c9bfac; font-style: italic; }
  .wfm-card .care { margin: 16px 0 0; font-size: 14px; color: #c9bfac; }
  .wfm-card .care a { color: #f2c77c; }
  .wfm-card .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; margin-top: 14px; }
  .wfm-card .soft { margin: 0; font-size: 14px; color: #c9bfac; font-style: italic; }
  .wfm-card ul.ideas { margin: 0 0 14px; padding-left: 20px; display: grid; gap: 4px; font-size: 15px; line-height: 1.45; color: #e6dccb; }
  .wfm-card .small { margin: 0 0 14px; font-size: 13.5px; line-height: 1.45; color: #c9bfac; }
  .wfm-card ol.steps { margin: 0 0 14px; padding-left: 22px; font-size: 16px; line-height: 1.5; color: #e6dccb; }
  .wfm-drop { display: grid; place-items: center; gap: 8px; padding: 18px; border-radius: 14px; border: 1.5px dashed rgba(240, 184, 103, 0.6);
    background: #23221e; text-align: center; font-size: 15px; color: #d9cfbd; cursor: pointer; }
  .wfm-drop.over { border-color: #f0b867; background: #2a2823; }
  .wfm-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .wfm-files { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 14px; }
  .wfm-files li { display: flex; justify-content: space-between; gap: 10px; padding: 7px 10px; border-radius: 10px; background: #23221e; }
  .wfm-files .fs { color: #c9bfac; white-space: nowrap; }
  .wfm-files .ok { color: #9fc59a; } .wfm-files .bad { color: #f3a98c; }
  .wfm-card .sentcount { margin: 12px 0 0; font-size: 14px; color: #9fc59a; }
  .wfm-card .anything { margin: 18px 0 0; }
  .wfm-card .anything label { display: block; margin: 0 0 6px; font-size: 15px; color: #e6dccb; }
  .wfm-card .anything textarea { width: 100%; min-height: 84px; resize: vertical; padding: 10px; border-radius: 10px; border: 1px solid rgba(239, 230, 212, 0.25);
    background: #121210; color: #efe6d4; font-size: 16px; line-height: 1.45; font-family: inherit; }
  .wfm-card .anything .row { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  .wfm-card .anything .msg { margin: 0; font-size: 14px; color: #9fc59a; } .wfm-card .anything .msg.bad { color: #f3a98c; }
  /* Once they've picked a build, the page is their site as it would be (Pollen, Oct 2: "I don't want it to show
     anything that's not on the website"): Taya's tags, notes, demo labels, view switchers and the Google preview go.
     (Mockups only: on a client's own site nothing of theirs is ever hidden.) */
  html.wfm-real .tag, html.wfm-real .wf-note, html.wfm-real .legend, html.wfm-real .tier-note, html.wfm-real .views-card,
  html.wfm-real .vp, html.wfm-real .status-tab, html.wfm-real .status-panel, html.wfm-real .theme-tab, html.wfm-real .ribbon,
  html.wfm-real .bk-demo, html.wfm-real .not-site, html.wfm-real .found-sec, html.wfm-real .portrait-spot, html.wfm-real [data-mock-only] { display: none !important; }
  /* (Oct 3 mockup audit) each mockup names its helpers a little differently */
  html.wfm-real .views, html.wfm-real .views-slot,
  html.wfm-real .mock-note, html.wfm-real .to-you, html.wfm-real .you-note, html.wfm-real .pv-note,
  html.wfm-real .notes, html.wfm-real .notes-2, html.wfm-real .found-wrap, html.wfm-real .build,
  html.wfm-real span.demo, html.wfm-real span.pv { display: none !important; }
  html.wfm-real :is(.bk, .tour, .hold):has(> .bk-side) { grid-template-columns: minmax(0, 1fr) !important; }
  @media (prefers-reduced-motion: no-preference) { .wfm-pin { transition: transform 0.2s ease; } .wfm-pin:hover { transform: scale(1.12); } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };
  const ours = (n) => !!(n && n.closest && n.closest('.wfm, .wfm-bar, .wfm-pop, .wfm-panel, .wfm-pin, .wfm-tab, [class^="wf-"], [class*=" wf-"]'));
  const linkBtn = (cls, text, href) => { const a = el('a', cls, text); a.href = href; return a; };
  const exitUrl = location.pathname + location.search.replace(/[?&]mark=1/, '').replace(/^&/, '?') + location.hash;
  const HOUSE_KEY = 'It’s like a house key, just for you, so please keep passwords out of notes.';

  /* ---------------- the bar ---------------- */
  const bar = el('div', 'wfm wfm-bar'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', MOCK ? 'Magic mockup' : 'Your notes');
  document.body.appendChild(bar);
  const tab = el('button', 'wfm wfm-tab', 'Notes'); tab.type = 'button'; tab.hidden = true; tab.setAttribute('aria-label', 'Open my notes bar');
  document.body.appendChild(tab);
  let marking = MOCK, stopped = false;

  // the server says this key matches nobody: a fresh link was made. Forget it here.
  function replaced() {
    forget(); stopped = true; marking = false; clearHover(); closePop(); closeCard(); panel.hidden = true; tab.hidden = true; bar.hidden = false;
    pinLayer.forEach((p) => p.remove()); pinLayer = [];
    bar.textContent = '';
    bar.append(el('span', '', 'This link was replaced with a new one. Check your email, or get it again here.'), linkBtn('wfm-btn', 'Get my link', DOOR));
    if (MOCK) bar.append(linkBtn('wfm-btn ghost', 'Just look', exitUrl));
    else bar.append(hideBtn('Close'));
  }
  // a good key, but nothing open on this page now (a mockup after the draft moved on, a draft after launch): keep it
  function resting() {
    stopped = true; marking = false; clearHover(); closePop(); closeCard(); panel.hidden = true; tab.hidden = true; bar.hidden = false;
    bar.textContent = '';
    bar.append(el('span', '', 'This page is resting now. Your link opens your newest things.'), linkBtn('wfm-btn', 'Open my newest', DOOR + '#wf=' + key));
    bar.append(MOCK ? linkBtn('wfm-btn ghost', 'Just look', exitUrl) : hideBtn('Close'));
  }
  function foreign() {
    forget(); stopped = true; marking = false; closePop(); bar.textContent = ''; bar.hidden = false; tab.hidden = true;
    bar.append(el('span', '', 'This link belongs to another site.'), MOCK ? linkBtn('wfm-btn ghost', 'Just look', exitUrl) : hideBtn('Close'));
  }
  function answerTrouble(x) {
    if (x.code === 'bad_link') { replaced(); return true; }
    if (x.code === 'closed') { resting(); return true; }
    if (x.code === 'origin') { foreign(); return true; }
    return false;
  }

  if (!key) {
    // a mockup with no key: a private link, lost on this device
    bar.append(el('span', '', 'This is a private link. Lost yours?'), linkBtn('wfm-btn', 'Get my link', DOOR), linkBtn('wfm-btn ghost', 'Just look', exitUrl));
    return;
  }

  const say = el('span'); const sayB = el('b', '', MOCK ? 'Magic mockup: ' : 'Your site: ');
  say.append(sayB, document.createTextNode(MOCK ? 'tap anything you’d like changed.' : 'tap Leave a note, then tap the spot.'));
  const listBtn = el('button', 'wfm-btn ghost', 'Your notes'); listBtn.type = 'button';
  const pauseBtn = el('button', 'wfm-btn ghost', 'Pause'); pauseBtn.type = 'button';
  const pickBtn = el('button', 'wfm-btn ghost', 'Pick a build'); pickBtn.type = 'button'; pickBtn.hidden = true;
  const done = el('button', 'wfm-btn', 'Done'); done.type = 'button';
  const noteBtn = el('button', 'wfm-btn', 'Leave a note'); noteBtn.type = 'button';
  const anyBtn = el('button', 'wfm-btn ghost', 'Send me anything'); anyBtn.type = 'button';
  const roundBtn = el('button', 'wfm-btn ghost', 'Done with this round'); roundBtn.type = 'button'; roundBtn.hidden = true;
  const homeBtn = el('button', 'wfm-btn ghost', 'Add to my home screen'); homeBtn.type = 'button';
  function hideBtn(words) {
    const b = el('button', 'wfm-btn ghost', words || 'Hide'); b.type = 'button';
    b.addEventListener('click', () => { closePop(); panel.hidden = true; marking = false; clearHover(); bar.hidden = true; tab.hidden = !!stopped || hiddenHere(); });
    return b;
  }
  const hiddenHere = () => { try { return localStorage.getItem(HIDE) === '1'; } catch (e) { return false; } };
  // phones and tablets in a browser tab (not already a home-screen app) get "Add to my home screen"
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 1;
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const canHome = coarse && !standalone;
  if (MOCK) bar.append(say, pickBtn, listBtn, pauseBtn, done);
  else bar.append(say, noteBtn, listBtn, anyBtn, roundBtn, hideBtn());
  if (canHome) bar.append(homeBtn);
  if (!MOCK) {
    // browsing their own site later, without the link: only the small "Notes" tab ("Hide on this device": not even that)
    if (!arrived) { bar.hidden = true; tab.hidden = hiddenHere(); }
    tab.addEventListener('click', () => { tab.hidden = true; bar.hidden = false; });
    noteBtn.addEventListener('click', () => {
      marking = !marking; noteBtn.textContent = marking ? 'Cancel' : 'Leave a note';
      say.lastChild.textContent = marking ? 'tap the spot you’d like changed.' : 'tap Leave a note, then tap the spot.';
      if (!marking) clearHover();
    });
  }
  pauseBtn.addEventListener('click', () => {
    marking = !marking; pauseBtn.textContent = marking ? 'Pause' : 'Keep marking';
    showPick();
    clearHover();
  });

  /* ---------------- choosing a spot ---------------- */
  const PICKABLE = 'img, video, figure, h1, h2, h3, h4, p, li, a, button, label, blockquote, dt, dd, .price, .photo, section, article, [class*="hero"], header';
  // The page's own controls keep working while marking (Pollen, Oct 2: the "See it as" switcher and
  // dropdowns opened a note instead): view switches, toggles, dropdowns, tabs and build tags.
  const CONTROL = 'summary, select, option, button[aria-expanded], button[aria-pressed], [role="tab"], button[data-view], a[data-view], button[data-go], .tag[data-go], .build[data-go], a[data-go]';
  const isControl = (t) => { const c = t.closest && t.closest(CONTROL); return !!(c && !ours(c)); };
  // a page can mark a group as one spot (data-mark-whole), like the hours: one note for all of it
  const pickOf = (t) => {
    if (isControl(t)) return null;
    const w = t.closest && t.closest('[data-mark-whole]'); if (w && !ours(w)) return w;
    const n = t.closest && t.closest(PICKABLE); return n && !ours(n) ? n : null;
  };
  let hovered = null;
  const clearHover = () => { if (hovered) hovered.classList.remove('wfm-hover'); hovered = null; };
  document.addEventListener('mouseover', (e) => {
    if (!marking || stopped || !canMark() || popOpen || card) return;
    const n = pickOf(e.target); if (n === hovered) return;
    clearHover(); if (n) { hovered = n; n.classList.add('wfm-hover'); }
  }, true);
  document.addEventListener('click', (e) => {
    if (!marking || stopped || driving || card || ours(e.target)) return;
    if (!canMark()) { if (isControl(e.target)) setTimeout(syncView, 120); return; } // just looking: the page works as usual
    if (isControl(e.target)) { setTimeout(syncView, 120); return; } // let the page do its thing
    const n = pickOf(e.target); if (!n) return;
    e.preventDefault(); e.stopPropagation();
    openPop(n);
  }, true);

  // a few words a person would use to say where this is: the page's section, and the thing itself
  const label = (n) => {
    if (n.getAttribute('data-mark-label')) return n.getAttribute('data-mark-label');
    const txt = (n.getAttribute('alt') || n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim();
    const img = n.matches('img, figure, .photo') ? (n.querySelector && n.querySelector('img') || n) : null;
    const alt = img && img.getAttribute && img.getAttribute('alt');
    const thing = alt ? 'photo: ' + alt : txt;
    return thing.length > 70 ? thing.slice(0, 67).replace(/\s+\S*$/, '') + '…' : thing;
  };
  const section = (n) => {
    const s = n.closest('section, header, footer, [data-page]');
    if (!s) return '';
    const h = s.querySelector('h1, h2'); const t = h ? h.textContent.replace(/\s+/g, ' ').trim() : (s.id || '');
    return t.length > 40 ? t.slice(0, 38) + '…' : t;
  };
  const spotOf = (n) => { const sec = section(n), l = label(n); return (sec && l && sec !== l ? sec + ' › ' : '') + (l ? '“' + l + '”' : sec || 'the page'); };
  // a short CSS path to the spot (from the nearest id, else from body), so a pin finds its exact element again
  // (the same rule as Taya's own notes above)
  const cssPath = (n) => {
    const parts = [];
    for (let x = n; x && x.nodeType === 1 && x !== document.body && x !== document.documentElement; x = x.parentElement) {
      if (x.id && /^[A-Za-z][A-Za-z0-9_-]{0,60}$/.test(x.id) && document.querySelectorAll('#' + x.id).length === 1) { parts.unshift('#' + x.id); break; }
      let i = 1; for (let s = x.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === x.tagName) i++;
      parts.unshift(x.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      if (!x.parentElement || x.parentElement === document.body) parts.unshift('body');
    }
    const p = parts.join(' > ');
    return p.length <= 200 && /^[A-Za-z0-9 >#:()._-]*$/.test(p) ? p : '';
  };

  /* ---------------- the friendly door: a cap or a failure is not a dead end ---------------- */
  const DOOR_WORDS = {
    busy: 'Busy day! I’ve got everything so far. For the rest, just email me at taya@webfaery.love 💛',
    full: 'That’s everything I can hold for your site right now. Just email me and I’ll make room 💛',
    safe: 'That didn’t go through, but your note is safe right here.',
    big: 'That one’s too big for here. Email me and I’ll send you an easy way to share it.',
  };
  const doorKind = (x) => (x.code === 'busy_day' ? (x.reason === 'full' ? 'full' : 'busy') : x.status === 413 ? 'big' : x.status === 429 && x.code !== 'busy' ? 'busy' : 'safe');
  function doorBox(kind, words, spot) {
    const box = el('div', 'wfm-door');
    box.append(el('p', '', DOOR_WORDS[kind] || DOOR_WORDS.safe));
    if (words) {
      const body = (spot ? 'On my site, ' + location.host + PAGE + ', at ' + spot + ':\n\n' : '') + words;
      const row = el('div', 'row');
      row.append(linkBtn('wfm-btn', 'Email it to me', 'mailto:taya@webfaery.love?subject=' + encodeURIComponent('A note for my site') + '&body=' + encodeURIComponent(body)));
      const cp = el('button', 'wfm-btn ghost', 'Copy my note'); cp.type = 'button';
      cp.addEventListener('click', () => {
        const ok = () => { cp.textContent = 'Copied'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(body).then(ok, () => { cp.textContent = 'Select and copy it from the box'; });
        else cp.textContent = 'Select and copy it from the box';
      });
      row.append(cp); box.append(row);
    }
    return box;
  }
  // a note typed but not sent stays on this device (this tab), so closing the box or reloading doesn't lose it
  const KEEP = 'wf-note-v1:' + PAGE;
  const kept = () => { try { return JSON.parse(sessionStorage.getItem(KEEP) || 'null'); } catch (e) { return null; } };
  const keep = (o) => { try { if (o) sessionStorage.setItem(KEEP, JSON.stringify(o)); else sessionStorage.removeItem(KEEP); } catch (e) {} };

  // phone photos are shrunk first (longest side 2400 px, JPEG), like the getting-started page
  async function shrink(f) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5 * 1048576 || !window.createImageBitmap) return f;
    try {
      const bmp = await createImageBitmap(f);
      const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.86));
      if (!blob || blob.size >= f.size) return f;
      return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: f.lastModified });
    } catch (e) { return f; }
  }

  /* ---------------- the note ---------------- */
  let pop = null, popOpen = false, picked = null, priceFirst = false;
  const closePop = () => { if (pop) pop.remove(); pop = null; popOpen = false; if (picked) picked.classList.remove('wfm-pick'); picked = null; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); panel.hidden = true; } });
  function openPop(n) {
    closePop(); clearHover(); panel.hidden = true; // one thing open at a time: the list never sits under a note box
    picked = n; n.classList.add('wfm-pick'); popOpen = true;
    const spot = spotOf(n), path = cssPath(n);
    pop = el('div', 'wfm wfm-pop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Your note');
    const where = el('p', '', spot);
    pop.append(where);
    if (!MOCK && priceFirst) pop.append(el('p', 'pf', 'Want a change? Tell me here, and I’ll reply with a price before I start. If anything breaks, or I got something wrong, I fix it.'));
    const ta = el('textarea'); ta.placeholder = n.getAttribute('data-mark-hint') || 'What would you change here?'; ta.maxLength = 1000; ta.setAttribute('aria-label', 'Your note');
    const k0 = kept(); if (k0 && k0.spot === spot && typeof k0.what === 'string') ta.value = k0.what;
    ta.addEventListener('input', () => keep(ta.value.trim() ? { spot: spot, what: ta.value } : null));
    // a photo with the note (one, shrunk on the phone first), on their draft or site
    let photo = null;
    const ph = el('label', 'photo');
    const pin = el('input'); pin.type = 'file'; pin.accept = 'image/*';
    const phWords = el('span', 'wfm-link', 'Add a photo'); const thumb = el('img'); thumb.hidden = true; thumb.alt = '';
    ph.append(pin, thumb, phWords);
    pin.addEventListener('change', async () => {
      const f = pin.files && pin.files[0]; pin.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { phWords.textContent = 'A photo only, please (or email me the file)'; return; }
      photo = await shrink(f);
      if (photo.size > MAX) { photo = null; phWords.textContent = DOOR_WORDS.big; return; }
      try { thumb.src = URL.createObjectURL(photo); thumb.hidden = false; } catch (e) {}
      phWords.textContent = 'Photo added (tap to change)';
    });
    const err = el('p', 'err'); err.hidden = true;
    const row = el('div', 'row');
    const cancel = el('button', 'wfm-btn ghost', 'Cancel'); cancel.type = 'button';
    const send = el('button', 'wfm-btn', 'Send to Taya'); send.type = 'button';
    row.append(cancel, send);
    pop.append(ta);
    if (!MOCK) pop.append(ph);
    pop.append(err, row);
    document.body.appendChild(pop);
    const r = n.getBoundingClientRect();
    const top = window.scrollY + Math.min(r.bottom + 10, window.innerHeight - 300);
    const left = window.scrollX + Math.max(10, Math.min(r.left, window.innerWidth - pop.offsetWidth - 10));
    pop.style.top = Math.max(window.scrollY + 10, top) + 'px'; pop.style.left = left + 'px';
    ta.focus({ preventScroll: true });
    cancel.addEventListener('click', closePop);
    const nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    let noteId = '';
    send.addEventListener('click', async () => {
      const what = ta.value.trim();
      if (what.length < 3) { err.hidden = false; err.textContent = 'Just a few words is plenty.'; ta.focus(); return; }
      send.disabled = true; send.textContent = 'Sending…'; err.hidden = true;
      const oldDoor = pop.querySelector('.wfm-door'); if (oldDoor) oldDoor.remove();
      try {
        if (!noteId) {
          const res = await call('/mark', { what, page: PAGE, spot, spot_path: path, nonce }); // a retry reuses the nonce
          noteId = res.id;
          if (!notes.some((x) => x.id === res.id)) notes.push({ id: res.id, what, page: PAGE, spot, spot_path: path, status: 'new', reply: '', el: n, photo: false });
        }
        if (photo) {
          await upload(photo, { note: noteId });
          const nn = notes.find((x) => x.id === noteId); if (nn) nn.photo = true;
        }
        keep(null);
        closePop(); renderPins(); renderPanel();
        if (!MOCK) { marking = false; noteBtn.textContent = 'Leave a note'; }
        say.lastChild.textContent = MOCK ? 'sent! Tap anything else, or see your notes.' : 'Sent! I’ll take it from here.';
      } catch (x) {
        if (answerTrouble(x)) return;
        send.disabled = false; send.textContent = noteId ? 'Send the photo again' : 'Send to Taya';
        if (noteId && photo) { err.hidden = false; err.textContent = 'Your note went through. The photo didn’t, yet.'; }
        pop.insertBefore(doorBox(doorKind(x), what, spot), row);
      }
    });
  }

  /* ---------------- the build picker (mockups only) ---------------- */
  // Tier names and prices come from the page itself (the pricing changed Oct 5 2026, and mockups already
  // emailed must keep showing exactly what they were sent). The contract, also written down in
  // web-faery-kit/pricing-oct2026.md under "Mockup page contract":
  //   On each "See it as" tier button, .vseg button[data-view="maiden|mother|crone"], a repriced page sets
  //     data-tier-name="Planted"   the visible name
  //     data-tier-price="600"      full build price, digits only
  //     data-tier-founding="300"   founding build price, digits only
  //     data-tier-price="0"        a written 0 is a real price, not an unset attribute: no build fee (a trade or a
  //                                gift); the founding strikeout is skipped. First used on Linnea's page, Oct 6 2026
  //     data-tier-build="..."      the words shown in place of a 0 build price (else "No build fee")
  //     data-tier-care="12"        the subscription a month, digits only
  //     data-tier-what="..."       optional one sentence for the card (else the webfaery.love words below)
  //   A page with data-tier-name on its buttons shows those names and prices, plus the subscription line for
  //   the new pricing (the monthly part is called a "subscription" since Oct 6 2026). A page without them
  //   ("as sent") takes each name from the button's own <b> text and keeps
  //   the old prices, words and "Care is optional" line it was sent with. Keys (data-view, data-go, the saved
  //   pick, the server's mockup_pick) stay maiden / mother / crone / all either way.
  const KEYS = ['maiden', 'mother', 'crone'];
  // the words those first mockups were sent with (Oct 1 to 4 2026): keep these exactly
  const AS_SENT = {
    maiden: { name: 'Maiden', full: 600, founding: 300, what: 'One beautiful page with everything people need to find you and reach you.' },
    mother: { name: 'Mother', full: 1200, founding: 600, what: 'A full site with a contact form, newsletter signup and a Book now button to the booking app you already use.' },
    crone: { name: 'Crone', full: 1800, founding: 900, what: 'Everything in Mother, plus booking, selling or both, set up for you (a small shop, up to about 20 items), and your latest Instagram posts on your site.' },
  };
  // webfaery.love's own words for each tier, used when a repriced page doesn't give its own data-tier-what
  // (the booking ladder, Oct 6 2026 afternoon: every build's Book button opens the booking app they already use,
  // Planted's too; Tended's can open a free Cal.com set up for them; In Bloom's booking sits right on the site.
  // Planted's line below doesn't name the Book button, so it stays true either way; the mockups' own words come later)
  const WHAT_NOW = {
    maiden: 'One page, planted and kept healthy: who you are, what you offer, and how to reach you, with a tap to call, text or email, or a Book button to the booking app you already use.',
    mother: 'A full site, tended as the seasons change: your pages, a contact form, a newsletter sign-up and a Book button that opens your booking page.',
    crone: 'Your site in full bloom, doing business for you: everything in Tended, plus booking right on your site, payments or a small shop.',
  };
  const num = (v) => { const n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10); return n > 0 ? n : 0; };
  const zero = (v) => v !== undefined && /^\s*0+\s*$/.test(String(v)); // a written "0", not a missing attribute
  function readBuilds() {
    const btnFor = (k) => document.querySelector('.vseg [data-view="' + k + '"][data-tier-name]');
    if (KEYS.some(btnFor)) {
      return { priced: true, list: KEYS.map((k) => {
        const b = btnFor(k), o = AS_SENT[k];
        if (!b) return Object.assign({ key: k }, o);
        const full = zero(b.dataset.tierPrice) ? 0 : (num(b.dataset.tierPrice) || o.full);
        const found = full === 0 || zero(b.dataset.tierFounding) ? 0 : (num(b.dataset.tierFounding) || Math.round(full / 2));
        return { key: k, name: b.dataset.tierName.trim() || o.name, full: full, founding: found, build: (b.dataset.tierBuild || '').trim(),
          care: num(b.dataset.tierCare), what: (b.dataset.tierWhat || '').trim() || WHAT_NOW[k] };
      }) };
    }
    return { priced: false, list: KEYS.map((k) => {
      const b = document.querySelector('.vseg [data-view="' + k + '"] b');
      const shown = b && b.textContent.replace(/\s+/g, ' ').trim();
      return Object.assign({ key: k }, AS_SENT[k], shown ? { name: shown } : {});
    }) };
  }
  let BUILDS = [], PRICED = false;
  const NAMES = { maiden: 'Maiden', mother: 'Mother', crone: 'Crone', all: 'Everything' };
  function loadBuilds() {
    if (!MOCK) return;
    const r = readBuilds(); BUILDS = r.list; PRICED = r.priced;
    BUILDS.forEach((bd) => { NAMES[bd.key] = bd.name; });
  }
  loadBuilds();
  const usd = (n) => '$' + n.toLocaleString('en-US');
  let myPick = '', founding = false, pickReady = false, driving = false, card = null;

  // the mockup's own "See it as" buttons do the switching (they keep the page steady while it folds)
  function showView(v) {
    const btn = document.querySelector('#views .vseg [data-view="' + v + '"]') || document.querySelector('.vseg [data-view="' + v + '"]');
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
    driving = true;
    try { btn.click(); } finally { driving = false; }
    setTimeout(renderPins, 450);
  }

  function closeCard() { if (card) { card.remove(); card = null; } }
  function openCard() {
    closeCard(); closePop(); clearHover(); loadBuilds();
    card = el('div', 'wfm wfm-scrim');
    const box = el('div', 'wfm-card'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'wfm-card-h');
    const h = el('h2', '', 'Which one feels like you?'); h.id = 'wfm-card-h';
    box.append(h, el('p', 'lead', 'Your mockup shows every piece I could build for you. Pick a build and the page shows just what it includes. Then tap anything on it to leave me a note.'));
    const grid = el('div', 'wfm-builds');
    BUILDS.forEach((bd) => {
      const btn = el('button', 'wfm-build' + (myPick === bd.key ? ' on' : '')); btn.type = 'button';
      const price = el('span', 'price');
      if (bd.full === 0) {
        // no build price (data-tier-price="0"): the page's own words, e.g. a trade, and no founding strikeout
        price.append(document.createTextNode(bd.build || 'No build fee'));
      } else if (founding) {
        price.append(document.createTextNode(usd(bd.founding)));
        const s = el('s', '', usd(bd.full)); s.setAttribute('aria-label', 'regular price ' + usd(bd.full));
        price.append(s, el('span', 'once', ' founding price'));
      } else {
        price.append(document.createTextNode(usd(bd.full)), el('span', 'once', ' for the build'));
      }
      if (PRICED && bd.care) price.append(el('span', 'once care-mo', 'then a ' + usd(bd.care) + ' a month subscription'));
      btn.append(el('span', 'nm', bd.name), price, el('span', 'what', bd.what));
      btn.setAttribute('aria-pressed', myPick === bd.key ? 'true' : 'false');
      btn.addEventListener('click', () => choose(bd.key));
      grid.append(btn);
    });
    box.append(grid);
    // founding spots (Pollen, Oct 9): one calm line, only while the founding price shows
    if (founding && FOUNDING_LEFT > 0 && BUILDS.some((bd) => bd.full !== 0)) box.append(el('p', 'spots', 'Founding price: I’m taking ' + FOUNDING_TOTAL + ' founding clients this year, and ' + foundingLeftWords() + '.'));
    const care = el('p', 'care', PRICED ? 'Every site comes with a subscription: it keeps yours healthy and current. If you ever cancel, your site is still yours and I hand you every file and login. Every cost is written out at '
      : 'Care is optional, and every cost is written out at ');
    const a = el('a', '', 'webfaery.love'); a.href = 'https://webfaery.love/'; a.target = '_blank'; a.rel = 'noopener';
    care.append(a, document.createTextNode('.'));
    box.append(care);
    const foot = el('div', 'foot');
    // a straight path (Pollen, Oct 2): pick a build, leave notes, done. No "show me everything".
    foot.append(el('p', 'soft', 'You can switch anytime, and nothing is final until we’ve emailed.'));
    box.append(foot);
    card.append(box);
    card.dataset.picker = '1';
    card.addEventListener('click', (e) => { if (e.target === card && canMark()) closeCard(); }); // a pick first
    document.body.appendChild(card);
    const first = grid.querySelector('.wfm-build'); if (first) first.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && card && !busy && !(card.dataset.picker && !canMark())) closeCard(); });

  // The words that only make sense on a mockup: "Send (preview)" buttons read "Send", and the little
  // "With Mother, this button opens..." lines under a build's button go. Put back for "show me everything".
  let wordsDone = false;
  function realWords(on) {
    if (!wordsDone) {
      wordsDone = true;
      document.querySelectorAll('button, a, input[type="submit"]').forEach((n) => {
        if (ours(n)) return;
        const t = n.lastChild;
        if (t && t.nodeType === 3 && / \(preview\)\s*$/.test(t.nodeValue)) { n.dataset.wfmWords = t.nodeValue; n.dataset.wfmReal = t.nodeValue.replace(/ \(preview\)\s*$/, ''); }
      });
      // little lines that only explain the mockup ("With Mother, ...", "On your real site ...", "preview")
      const MOCK_LINE = /^\s*(With (Maiden|Mother|Crone|Planted|Tended|In Bloom)\b|On your real site|On the one-page build|Sample tiles|These three are stand-ins|Preview\b|preview\b)/;
      document.querySelectorAll('.demo-note, p.pv, p.gbp, span.sample').forEach((n) => { if (!ours(n) && MOCK_LINE.test(n.textContent) && !/[Nn]othing (is|was) (charged|sent)/.test(n.textContent)) n.setAttribute('data-mock-only', ''); }); // a pretend checkout keeps its "nothing is charged"
    }
    document.querySelectorAll('[data-wfm-words]').forEach((n) => { n.lastChild.nodeValue = on ? n.dataset.wfmReal : n.dataset.wfmWords; });
  }

  // Notes only on a real build (Pollen, Oct 2: "they need to be only editing whenever it's showing what's
  // actually on their site"). Not picked yet, or "show me everything": just looking. A client's own site: always.
  function canMark() { return !MOCK || !pickReady || (!!myPick && myPick !== 'all'); }
  function showPick() {
    if (!MOCK) return;
    if (pickReady) {
      pickBtn.hidden = false;
      pickBtn.textContent = canMark() ? 'Seeing: ' + NAMES[myPick] : 'Pick a build';
      pickBtn.className = canMark() ? 'wfm-btn ghost' : 'wfm-btn';
      pickBtn.setAttribute('aria-label', (myPick ? 'Seeing ' + NAMES[myPick] + '. ' : '') + 'Choose which build you’re seeing');
    }
    pauseBtn.hidden = !canMark();
    const real = pickReady && canMark();
    if (document.documentElement.classList.contains('wfm-real') !== real) {
      document.documentElement.classList.toggle('wfm-real', real);
      realWords(real);
      setTimeout(renderPins, 60);
    }
    if (!canMark()) { clearHover(); closePop(); }
    sayB.textContent = 'Magic mockup: ';
    say.lastChild.textContent = !canMark() ? 'pick a build first, then tap anything to leave a note.'
      : !marking ? 'paused, so the page works as usual.'
      : 'showing ' + NAMES[myPick] + '. Tap anything you’d like changed.';
  }
  // they switched the view with the mockup's own buttons: that's their pick now
  function syncView() {
    if (!MOCK || !pickReady) return;
    const on = document.querySelector('.vseg [data-view][aria-pressed="true"]');
    const v = on && on.getAttribute('data-view');
    if (!v || !NAMES[v] || v === 'all' || v === myPick) return;
    myPick = v; renderPanel(); showPick();
    call('/pick', { page: PAGE, pick: v }).catch(answerTrouble);
  }
  function choose(v) {
    myPick = v; closeCard(); showView(v); renderPanel(); showPick();
    call('/pick', { page: PAGE, pick: v }).catch(answerTrouble);
  }

  /* ---------------- send me anything ---------------- */
  let sentFiles = 0, first = '';
  const IDEAS = ['Your logo, the biggest version you have', 'Photos of you, your space or your work (phone photos are great)',
    'A menu, price list or list of what you offer', 'Reviews or kind words people have sent you', 'A bio, your story, or any words you love',
    'Flyers, cards or anything you’ve had printed', 'Colors or fonts you love'];
  const EXTS = /\.(jpe?g|png|webp|heic|heif|gif|pdf|svg|eps|ai|ps|zip)$/i;
  const MAX = 30 * 1024 * 1024;
  const sizeOf = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function scrim(labelId, narrow) {
    closeCard(); closePop(); clearHover(); panel.hidden = true;
    card = el('div', 'wfm wfm-scrim');
    const box = el('div', 'wfm-card' + (narrow ? ' narrow' : '')); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', labelId);
    card.append(box);
    card.addEventListener('click', (e) => { if (e.target === card && !busy) closeCard(); });
    document.body.appendChild(card);
    return box;
  }
  let busy = false;
  function openFiles() {
    const box = scrim('wfm-files-h');
    const h = el('h2', '', MOCK ? 'One last thing: anything else for your site?' : 'Send me anything'); h.id = 'wfm-files-h';
    box.append(h, el('p', 'lead', MOCK ? 'If you’ve got something that isn’t on here yet, send it my way and I’ll find it a home. A few ideas, in case they help:'
      : 'New photos, a flyer, a menu, anything you’d like on your site. Send it my way and I’ll find it a home.'));
    if (MOCK) { const ul = el('ul', 'ideas'); IDEAS.forEach((t) => ul.append(el('li', '', t))); box.append(ul); }
    box.append(el('p', 'small', MOCK ? 'Things like your hours or social links? Just tap the spot on your mockup and type them in a note. Nothing here is required.'
      : 'A change to something already on your site? Tap Leave a note and tap the spot instead.'));
    const drop = el('label', 'wfm-drop');
    const input = el('input'); input.type = 'file'; input.multiple = true;
    input.accept = 'image/*,.pdf,.svg,.eps,.ai,.ps,.zip,.heic,.heif';
    drop.append(input, el('b', '', 'Choose files'), el('span', '', 'or drop them here. Photos, PDFs, logo files or a zip, up to 30 MB each.'));
    const list = el('ul', 'wfm-files');
    const count = el('p', 'sentcount', ''); count.hidden = !sentFiles;
    if (sentFiles) count.textContent = 'You’ve sent me ' + sentFiles + (sentFiles === 1 ? ' file' : ' files') + ' so far. Thank you!';
    // and a box for anything at all (Pollen, Oct 2), saved as one more note
    const any = el('div', 'anything');
    const lab = el('label', '', 'Anything else you’d like me to know?'); lab.htmlFor = 'wfm-any';
    const ta = el('textarea'); ta.id = 'wfm-any'; ta.maxLength = 1000; ta.placeholder = 'Your story, a link to your Instagram, a color you love, anything at all.';
    const ANY_KEEP = 'wf-any-v1:' + PAGE;
    try { ta.value = sessionStorage.getItem(ANY_KEEP) || ''; } catch (e) {}
    ta.addEventListener('input', () => { try { sessionStorage.setItem(ANY_KEEP, ta.value); } catch (e) {} });
    const arow = el('div', 'row'); const amsg = el('p', 'msg'); amsg.hidden = true;
    const asend = el('button', 'wfm-btn ghost', 'Send to Taya'); asend.type = 'button';
    arow.append(amsg, asend); any.append(lab, ta, arow);
    const top = el('div'); // the friendly door shows here, above everything, when a cap is reached
    box.append(top, drop, list, count, any);
    const anyNonce = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    let anyNo = 0, anyP = null;
    function sendAny() { return anyP || (anyP = sendAnyNow().finally(() => { anyP = null; })); } // one at a time
    async function sendAnyNow() {
      const what = ta.value.trim();
      if (!what) return true;
      if (what.length < 3) { amsg.hidden = false; amsg.className = 'msg bad'; amsg.textContent = 'Just a few words is plenty.'; return false; }
      asend.disabled = true; asend.textContent = 'Sending…';
      const old = any.querySelector('.wfm-door'); if (old) old.remove();
      try {
        const spot = MOCK ? 'Anything else (the last step)' : 'Anything else (Send me anything)';
        const res = await call('/mark', { what, page: PAGE, spot, nonce: (anyNonce + '-' + anyNo).slice(0, 40) }); // a retry reuses it
        anyNo++;
        notes.push({ id: res.id, what, page: PAGE, spot, status: 'new', reply: '', el: null });
        ta.value = ''; try { sessionStorage.removeItem(ANY_KEEP); } catch (e) {}
        amsg.hidden = false; amsg.className = 'msg'; amsg.textContent = 'Sent ✓ Thank you!';
        asend.disabled = false; asend.textContent = 'Send to Taya'; close.textContent = 'All done'; renderPanel();
        return true;
      } catch (x) {
        if (answerTrouble(x)) { closeCard(); return false; }
        asend.disabled = false; asend.textContent = 'Send to Taya';
        any.append(doorBox(doorKind(x), what, ''));
        return false;
      }
    }
    asend.addEventListener('click', sendAny);
    const foot = el('div', 'foot');
    // on a mockup, the step after their notes (Pollen, Oct 2: uploads come after Done): back to the notes, or on to the thank-you
    const back = el('button', 'wfm-btn ghost', MOCK ? 'Back to my notes' : 'Close'); back.type = 'button';
    back.addEventListener('click', () => { if (!busy) closeCard(); });
    const close = el('button', 'wfm-btn', MOCK ? (sentFiles ? 'All done' : 'Skip, I’m done') : 'Done'); close.type = 'button';
    close.addEventListener('click', async () => {
      if (busy || close.disabled) return;
      close.disabled = true;
      try { if (await sendAny()) { if (MOCK) thanks(); else closeCard(); } } finally { close.disabled = false; } // typed but not sent: send it
    });
    const btns = el('div', 'foot'); btns.style.margin = '0'; btns.append(back, close);
    foot.append(el('p', 'soft', 'You can come back and send more anytime.'), btns);
    box.append(foot);
    input.addEventListener('change', () => { send([...input.files]); input.value = ''; });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); send([...(e.dataTransfer && e.dataTransfer.files || [])]); });
    async function send(files) {
      if (!files.length || busy) return;
      busy = true; close.disabled = true;
      const rows = files.slice(0, 20).map((f) => {
        const li = el('li'); const stt = el('span', 'fs', 'Waiting…');
        li.append(el('span', '', f.name.length > 40 ? f.name.slice(0, 37) + '…' : f.name), stt); list.append(li);
        return { f, stt };
      });
      let stop = '';
      for (const { f, stt } of rows) {
        if (stop) { stt.className = 'fs bad'; stt.textContent = 'Not sent yet'; continue; }
        if (!EXTS.test(f.name)) { stt.className = 'fs bad'; stt.textContent = 'This kind of file won’t go. Email it to me?'; continue; }
        if (f.size > MAX) { stt.className = 'fs bad'; stt.textContent = 'Over 30 MB (' + sizeOf(f.size) + '). ' + DOOR_WORDS.big; continue; }
        stt.textContent = 'Sending…';
        try {
          const res = await upload(f, { onWait: () => { stt.textContent = 'Waiting a moment...'; } });
          sentFiles = res.sent_files || sentFiles + 1;
          stt.className = 'fs ok'; stt.textContent = 'Sent ✓';
          count.hidden = false; count.textContent = 'You’ve sent me ' + sentFiles + (sentFiles === 1 ? ' file' : ' files') + ' so far. Thank you!';
          close.textContent = 'All done';
        } catch (x) {
          if (answerTrouble(x)) { busy = false; closeCard(); return; }
          stt.className = 'fs bad';
          const kind = doorKind(x);
          if (x.reason === 'type') { stt.textContent = 'This kind of file won’t go. Email it to me?'; continue; }
          if (kind === 'big') { stt.textContent = DOOR_WORDS.big; continue; }
          stt.textContent = 'Not sent yet';
          stop = kind; // a cap or a failure: the rest of this batch waits
          top.textContent = ''; top.append(doorBox(kind, '', ''));
        }
      }
      busy = false; close.disabled = false; renderPanel();
    }
  }
  // one file per request, the key in the X-WF-Key header (not in the body). Busy (too many uploads at once on the
  // server): wait 5 seconds and try again quietly, up to 3 times.
  async function upload(f, opts) {
    const o = opts || {};
    for (let tries = 0; ; tries++) {
      const fd = new FormData();
      fd.append('page', PAGE);
      if (o.note) fd.append('note', o.note);
      fd.append('files', f, f.name);
      let res;
      try { res = await fetch(BASE + '/mockup-upload', { method: 'POST', headers: { 'X-WF-Key': key }, body: fd, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' }); }
      catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
      let data = null; try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && data.ok) return data;
      const x = new Error('fail'); x.status = res.status; x.code = (data && data.error) || 'server'; x.reason = data && data.reason;
      if (x.code === 'busy' && tries < 3) { if (o.onWait) o.onWait(); await new Promise((r) => setTimeout(r, 5000)); continue; }
      throw x;
    }
  }

  // Done: on a mockup, on to "one last thing" (files), then the thank-you, and what happens next (Taya writes back
  // by email). It has to reach the server (the Studio says "Your turn"): if it can't now, it's kept for this page and
  // sent again on the next visit. On a draft: "Done with this round", one email to Taya.
  done.addEventListener('click', () => openFiles());
  anyBtn.addEventListener('click', () => openFiles());
  const DONE_KEY = 'wf-mockup-done:' + PAGE;
  async function sendDone() {
    for (let i = 0; i < 3; i++) {
      try { await call('/mockup-done', { page: PAGE }); both((s) => s.removeItem(DONE_KEY)); return true; }
      catch (x) {
        if (answerTrouble(x)) return false;
        if (x.code === 'slow_down') break;
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
    both((s) => s.setItem(DONE_KEY, '1'));
    return false;
  }
  roundBtn.addEventListener('click', async () => {
    roundBtn.disabled = true;
    const ok = await sendDone();
    roundBtn.disabled = false;
    const box = scrim('wfm-round-h', true);
    const h = el('h2', '', ok ? 'Thank you' + (first ? ', ' + first : '') + '!' : 'Almost'); h.id = 'wfm-round-h';
    box.append(h, el('p', 'lead', ok ? 'That’s this round. I’ll look over your notes and get going, and you’ll get an email once your changes are up.'
      : 'That didn’t reach me just now. I’ll try again next time you open this page, or just email me at taya@webfaery.love.'));
    const f = el('div', 'foot'); const b = el('button', 'wfm-btn', 'Close'); b.type = 'button'; b.addEventListener('click', closeCard); f.append(b); box.append(f);
  });
  let startOpen = false; // from /marks: getting started is already open for them
  function thanks() {
    sendDone(); // the Studio: "Your turn"
    const box = scrim('wfm-done-h');
    const h = el('h2', '', 'Thank you' + (first ? ', ' + first : '') + '!'); h.id = 'wfm-done-h';
    const bits = [];
    if (notes.length) bits.push('your ' + (notes.length === 1 ? 'note' : notes.length + ' notes'));
    if (sentFiles) bits.push('your ' + (sentFiles === 1 ? 'file' : 'files'));
    box.append(h, el('p', 'lead', 'That’s everything for now. I’ll look over ' + (bits.length ? bits.join(' and ') : 'your mockup') +
      ' and email you with the next round. This link keeps working, so come back anytime to add more.'));
    const foot = el('div', 'foot');
    const more = el('button', 'wfm-btn ghost', 'Keep going'); more.type = 'button'; more.addEventListener('click', closeCard);
    const bye = el('a', 'wfm-btn', 'Close my notes'); bye.href = exitUrl;
    const btns = el('div', 'foot'); btns.style.margin = '0'; btns.append(more, bye);
    foot.append(el('p', 'soft', startOpen ? 'I’ll email you once I’ve looked them over.' : 'Nothing to sign or pay yet. I’ll email you first.'), btns);
    box.append(foot);
  }

  /* ---------------- "Add to my home screen" (phones and tablets) ---------------- */
  // The icon has to carry the key, so for one moment (only after this tap) the key goes back into the address; it
  // comes out again on Done, when the page is hidden or left, or after 60 seconds, whichever is first.
  let homeTimer = 0;
  const cleanAddress = () => {
    clearTimeout(homeTimer); homeTimer = 0;
    const m = /[#&]wf=[A-Za-z0-9]{24,64}/.exec(location.hash);
    if (!m) return;
    let rest = location.hash.replace(m[0], ''); if (rest && rest.charAt(0) !== '#') rest = '#' + rest.slice(1);
    try { history.replaceState(history.state, '', location.pathname + location.search + rest); } catch (e) {}
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cleanAddress(); });
  window.addEventListener('pagehide', cleanAddress);
  homeBtn.addEventListener('click', () => {
    if (!key) return;
    const base = location.pathname + location.search;
    try { history.replaceState(history.state, '', base + '#wf=' + key); } catch (e) { return; }
    homeTimer = setTimeout(cleanAddress, 60000);
    const box = scrim('wfm-home-h', true);
    const h = el('h2', '', 'Add to my home screen'); h.id = 'wfm-home-h';
    const apple = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    box.append(h, el('p', 'lead', apple
      ? 'Tap Share, then Add to Home Screen. Just that one, since for a moment this address holds your private link.'
      : 'Tap ⋮, then Add to Home screen. Just that one, since for a moment this address holds your private link.'));
    box.append(el('p', 'small', HOUSE_KEY));
    const f = el('div', 'foot'); const b = el('button', 'wfm-btn', 'Done'); b.type = 'button';
    b.addEventListener('click', () => { cleanAddress(); closeCard(); });
    f.append(b); box.append(f);
    card.addEventListener('click', (e) => { if (e.target === card) cleanAddress(); });
  });

  /* ---------------- talking to the server: this page's key, in the body as k ---------------- */
  async function call(path, body) {
    let res;
    try {
      res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, body, { k: key })), mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.ok) { const x = new Error('fail'); x.status = res.status; x.code = (data && data.error) || 'server'; x.reason = data && data.reason; throw x; }
    return data;
  }

  /* ---------------- pins and the list ---------------- */
  // find the spot again: by its short CSS path first, then by its words
  const byPath = (p) => { if (!p) return null; try { const n = document.querySelector(p); return n && !ours(n) ? n : null; } catch (e) { return null; } };
  const byWords = (spot) => {
    const q = (String(spot || '').match(/“(.+?)…?”/) || [])[1];
    if (!q) return null;
    const words = q.replace(/^photo: /, '');
    for (const g of document.querySelectorAll('[data-mark-label]')) if (g.getAttribute('data-mark-label') === words && !ours(g)) return g;
    for (const n of document.querySelectorAll(PICKABLE)) {
      if (ours(n)) continue;
      const t = (n.getAttribute('alt') || n.textContent || '').replace(/\s+/g, ' ').trim();
      const img = n.querySelector && n.querySelector('img');
      if ((t && t.indexOf(words) === 0) || (img && (img.getAttribute('alt') || '').indexOf(words) === 0)) return n;
    }
    return null;
  };
  let pinLayer = [], notes = [];
  function renderPins() {
    pinLayer.forEach((p) => p.remove()); pinLayer = [];
    if (stopped) return;
    notes.forEach((note, i) => {
      if (!MOCK && note.page && note.page !== PAGE) return; // pins only for this page; the list has them all
      const n = note.el || (note.el = byPath(note.spot_path) || byWords(note.spot));
      if (!n || !n.getClientRects().length) return;
      const r = n.getBoundingClientRect();
      const label = STATUS[note.status] || 'Sent';
      const pin = el('button', 'wfm-pin' + (note.status === 'done' ? ' done' : ''), String(i + 1));
      pin.dataset.chip = label;
      pin.type = 'button'; pin.setAttribute('aria-label', 'Note ' + (i + 1) + ', ' + label + ': ' + note.what);
      pin.style.top = (window.scrollY + r.top + 4) + 'px';
      pin.style.left = Math.min(window.scrollX + r.right - 4, window.scrollX + document.documentElement.clientWidth - 22) + 'px';
      pin.addEventListener('click', () => { panel.hidden = false; renderPanel(i); });
      document.body.appendChild(pin); pinLayer.push(pin);
    });
  }
  const panel = el('section', 'wfm wfm-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Your notes');
  document.body.appendChild(panel);
  // the title row, with a little X so the list can always be put away
  const panelHead = () => {
    const h = el('div', 'ph'); const x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close my notes');
    x.addEventListener('click', () => { panel.hidden = true; });
    h.append(el('h2', '', 'Your notes'), x); return h;
  };
  let manageUrl = '';
  function renderPanel(focusIndex) {
    panel.textContent = '';
    panel.append(panelHead());
    if (MOCK && pickReady) {
      const mp = el('p', 'mypick', canMark() && myPick ? 'Your pick: ' + NAMES[myPick] + '. ' : 'No build picked yet. ');
      const ch = el('button', 'wfm-link', canMark() && myPick ? 'Change my pick' : 'Pick one'); ch.type = 'button';
      ch.addEventListener('click', () => { panel.hidden = true; openCard(); });
      mp.append(ch); panel.append(mp);
    }
    if (sentFiles) panel.append(el('p', 'mypick', 'Files sent: ' + sentFiles + '.' + (MOCK ? ' You can send more after Done.' : '')));
    if (!notes.length) { panel.append(el('p', 'none', !canMark() ? 'Nothing yet. Pick a build, then tap anything on your mockup to leave a note.'
      : MOCK ? 'Nothing yet. Tap anything on your mockup to leave a note.' : 'Nothing yet. Tap Leave a note, then tap the spot.')); }
    else {
      const ol = el('ol');
      notes.forEach((n, i) => {
        const li = el('li');
        const pg = !MOCK && n.page && n.page !== PAGE ? n.page + ' · ' : '';
        li.append(el('div', 'where', (i + 1) + '. ' + pg + n.spot + (n.photo ? ' (with a photo)' : '')), el('div', '', n.what), el('span', 'st', STATUS[n.status] || 'Sent'));
        if (n.reply) li.append(el('div', 'reply', 'Taya: ' + n.reply));
        ol.append(li);
        if (i === focusIndex) setTimeout(() => li.scrollIntoView({ block: 'nearest' }), 30);
      });
      panel.append(ol);
    }
    // the link itself: how to keep it handy, and how to let go of it on this device
    panel.append(el('p', 'small', HOUSE_KEY));
    const links = el('div', 'links');
    if (manageUrl) { const a = linkBtn('wfm-link', 'Manage my subscription', manageUrl); a.target = '_blank'; a.rel = 'noopener'; links.append(a); }
    if (canHome) { const b = el('button', 'wfm-link', 'Add to my home screen'); b.type = 'button'; b.addEventListener('click', () => { panel.hidden = true; homeBtn.click(); }); links.append(b); }
    else panel.append(el('p', 'small', 'Tap your link in any of my emails to come back here.'));
    if (!MOCK) {
      const hide = el('button', 'wfm-link', 'Hide on this device'); hide.type = 'button';
      hide.addEventListener('click', () => { try { localStorage.setItem(HIDE, '1'); } catch (e) {} panel.hidden = true; bar.hidden = true; tab.hidden = true; marking = false; clearHover(); });
      links.append(hide);
    }
    const fg = el('button', 'wfm-link', 'Forget this device'); fg.type = 'button';
    fg.addEventListener('click', () => {
      forget(); try { localStorage.removeItem(HIDE); localStorage.removeItem('wf-key-v1:door'); sessionStorage.removeItem('wf-key-v1:door'); } catch (e) {}
      location.replace(exitUrl);
    });
    links.append(fg);
    panel.append(links);
    listBtn.textContent = 'Your notes' + (notes.length ? ' (' + notes.length + ')' : '');
  }
  listBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); });

  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(renderPins, 120); };
  window.addEventListener('resize', later);
  window.addEventListener('hashchange', () => setTimeout(renderPins, 350));
  document.addEventListener('click', (e) => { if (!ours(e.target)) setTimeout(renderPins, 400); });

  call('/marks', { page: PAGE }).then((d) => {
    notes = (d.marks || []).map((x) => ({ id: x.id, what: x.what, page: x.page || PAGE, spot: x.spot, spot_path: x.spot_path || '', status: x.status, reply: x.reply, photo: !!x.photo }));
    sentFiles = Math.max(0, +d.sent_files || 0); first = typeof d.first === 'string' ? d.first.slice(0, 40) : '';
    startOpen = d.start_open === true;
    priceFirst = d.price_first === true;
    manageUrl = typeof d.manage_url === 'string' && /^https:\/\/billing\.stripe\.com\//.test(d.manage_url) ? d.manage_url : '';
    roundBtn.hidden = !(d.round_done === true);
    let pending = false; both((s) => { if (s.getItem(DONE_KEY)) pending = true; });
    if (pending) sendDone(); // last time's Done didn't reach the server
    if (MOCK && typeof d.pick === 'string') { // the server knows about picks
      pickReady = true; founding = d.founding === true && FOUNDING_LEFT > 0; myPick = d.pick;
      if (myPick && myPick !== 'all') showView(myPick);
      if (!myPick || myPick === 'all') openCard(); // "everything" from before: pick a real build now
      showPick();
      pickBtn.addEventListener('click', openCard);
    }
    renderPins(); renderPanel();
  }).catch((x) => {
    if (answerTrouble(x)) return;
    // the server couldn't be reached: say so, rather than letting notes go nowhere
    say.lastChild.textContent = 'I can’t reach my server right now, so notes may not send. Try reloading in a minute.';
  });
})();
