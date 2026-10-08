/* The magic mockup (Oct 1 2026). On a client's private mockup (webfaery.love/peek/KEY/?mark=1) they tap
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
  if (!tried && new URLSearchParams(location.search).has('k')) return;
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

  const BASE = 'https://bookings.gardenfaery.love/api/webfaery/portal';
  const STORE_KEY = 'wf-portal-v1';
  const TOKEN_RE = /^[A-Za-z0-9]{40,64}$/;
  const m = location.pathname.match(/^\/peek\/([a-z0-9-]{1,40})\/?/);
  if (!m) return;
  const PAGE = '/peek/' + m[1] + '/';
  const STATUS = { new: 'Sent', seen: 'Seen', quoted: 'Priced', doing: 'On it', done: 'Done', declined: 'Not this time' };

  let token = (() => {
    try { const o = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return o && TOKEN_RE.test(o.token || '') ? o.token : ''; }
    catch (e) { return ''; }
  })();

  // a private magic link: ?mark=1&k=KEY. Kept per page, then taken out of the address bar.
  const MAGIC_RE = /^[A-Za-z0-9]{24,64}$/;
  const MAGIC_STORE = 'wf-magic-v1:' + PAGE;
  const store = (fn) => { try { fn(sessionStorage); } catch (e) {} try { fn(localStorage); } catch (e) {} };
  let magic = '';
  const qs = new URLSearchParams(location.search);
  if (qs.has('k')) {
    const k = qs.get('k') || '';
    if (MAGIC_RE.test(k)) { magic = k; store((s) => s.setItem(MAGIC_STORE, k)); }
    qs.delete('k');
    const q = qs.toString();
    try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) {}
  }
  if (!magic) store((s) => { const v = s.getItem(MAGIC_STORE) || ''; if (!magic && MAGIC_RE.test(v)) magic = v; });
  const forgetMagic = () => { magic = ''; store((s) => s.removeItem(MAGIC_STORE)); };

  /* ---------------- the look ---------------- */
  const css = `
  .wfm, .wfm * { box-sizing: border-box; font-family: 'Spectral', Georgia, serif; }
  .wfm-bar { position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); translate: -50% 0; z-index: 2147483000;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 14px; width: max-content; max-width: calc(100vw - 20px);
    padding: 10px 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4; border: 1.5px dashed rgba(240, 184, 103, 0.7);
    box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.6); font-size: 15px; line-height: 1.35; }
  .wfm-bar b { color: #f2c77c; font-weight: 600; }
  .wfm-btn { appearance: none; border: 0; border-radius: 999px; padding: 8px 14px; font: 600 14px 'Spectral', Georgia, serif; cursor: pointer;
    background: #f0b867; color: #1c1209; text-decoration: none; display: inline-block; }
  .wfm-btn.ghost { background: transparent; color: #efe6d4; border: 1px solid rgba(239, 230, 212, 0.4); }
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
  .wfm-panel { position: fixed; right: 12px; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; width: min(360px, calc(100vw - 24px));
    max-height: min(60vh, 520px); overflow: auto; padding: 14px; border-radius: 16px; background: #1b1a17; color: #efe6d4;
    border: 1.5px dashed rgba(240, 184, 103, 0.7); box-shadow: 0 18px 50px -10px rgba(0, 0, 0, 0.7); }
  .wfm-panel h2 { margin: 0 0 10px; font: 400 20px 'Gloock', Georgia, serif; color: #efe6d4; }
  .wfm-panel ol { margin: 0 !important; padding: 0 !important; list-style: none !important; display: grid !important; gap: 10px; grid-template-columns: minmax(0, 1fr) !important; }
  /* a mockup's own list styles (flex rows, columns, counters) never reach the notes panel */
  .wfm-panel li { display: block !important; width: auto !important; margin: 0 !important; padding: 10px 12px !important; border-radius: 12px; background: #23221e;
    font-size: 14.5px; line-height: 1.45; text-align: left !important; columns: auto !important; }
  .wfm-panel li::before, .wfm-panel li::after { content: none !important; }
  .wfm-panel li > div { display: block !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
  .wfm-panel .where { font-size: 12.5px; color: #c9bfac; }
  .wfm-panel .st { display: inline-block; margin-top: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(240, 184, 103, 0.16); color: #f2c77c; }
  .wfm-panel .reply { margin-top: 6px; padding-left: 10px; border-left: 2px solid rgba(240, 184, 103, 0.5); color: #e6dccb; }
  .wfm-panel .none { color: #c9bfac; font-size: 14.5px; }
  .wfm-panel .mypick { margin: -4px 0 12px; font-size: 14px; color: #c9bfac; }
  .wfm-panel .ph { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: -14px; z-index: 1; margin: -14px -14px 8px; padding: 10px 10px 6px 14px; background: #1b1a17; }
  .wfm-panel .ph h2 { margin: 0; }
  .wfm-panel .x { flex: none; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; margin: 0; border-radius: 50%; border: 1.5px solid rgba(240, 184, 103, 0.6); background: transparent;
    color: #efe6d4; font: 400 26px/1 Georgia, serif; cursor: pointer; }
  .wfm-panel .x:hover, .wfm-panel .x:focus-visible { background: rgba(240, 184, 103, 0.18); outline: none; }
  .wfm-link { appearance: none; background: none; border: 0; padding: 0; color: #f2c77c; font: inherit; text-decoration: underline; cursor: pointer; }
  .wfm-scrim { position: fixed; inset: 0; z-index: 2147483002; background: rgba(12, 11, 10, 0.72); display: grid; place-items: center;
    padding: 16px; overflow-y: auto; }
  .wfm-card { width: min(860px, 100%); margin: auto; padding: 24px 22px 20px; border-radius: 20px; background: #1b1a17; color: #efe6d4;
    border: 1px solid rgba(240, 184, 103, 0.5); box-shadow: 0 24px 70px -12px rgba(0, 0, 0, 0.75); }
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
  .wfm-card .care { margin: 16px 0 0; font-size: 14px; color: #c9bfac; }
  .wfm-card .care a { color: #f2c77c; }
  .wfm-card .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; margin-top: 14px; }
  .wfm-card .soft { margin: 0; font-size: 14px; color: #c9bfac; font-style: italic; }
  .wfm-card ul.ideas { margin: 0 0 14px; padding-left: 20px; display: grid; gap: 4px; font-size: 15px; line-height: 1.45; color: #e6dccb; }
  .wfm-card .small { margin: 0 0 14px; font-size: 13.5px; line-height: 1.45; color: #c9bfac; }
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
     anything that's not on the website"): Taya's tags, notes, demo labels, view switchers and the Google preview go. */
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
  const ours = (n) => !!(n && n.closest && n.closest('.wfm, .wfm-bar, .wfm-pop, .wfm-panel, .wfm-pin, [class^="wf-"], [class*=" wf-"]'));

  /* ---------------- the bar ---------------- */
  const bar = el('div', 'wfm wfm-bar'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Magic mockup');
  document.body.appendChild(bar);
  const exitUrl = location.pathname + location.hash;

  // the link's key no longer works (Taya made a fresh one, or the mockup moved)
  const expired = () => {
    forgetMagic(); marking = false; clearHover(); closePop();
    bar.textContent = '';
    bar.append(el('span', '', 'This link has expired. Ask Taya for a fresh one.'));
    const x = el('a', 'wfm-btn ghost', 'Just look'); x.href = exitUrl;
    bar.append(x);
  };

  if (!token && !magic) {
    bar.append(el('span', '', 'Sign in to your portal to leave notes right on your mockup.'));
    const a = el('a', 'wfm-btn', 'Sign in');
    a.href = '/portal.html?back=' + encodeURIComponent(location.pathname + '?mark=1' + location.hash);
    const x = el('a', 'wfm-btn ghost', 'Just look'); x.href = exitUrl;
    bar.append(a, x);
    return;
  }

  let marking = true, notes = [];
  const say = el('span'); const b = el('b', '', 'Magic mockup: '); say.append(b, document.createTextNode('tap anything you’d like changed.'));
  const listBtn = el('button', 'wfm-btn ghost', 'Your notes'); listBtn.type = 'button';
  const pauseBtn = el('button', 'wfm-btn ghost', 'Pause'); pauseBtn.type = 'button';
  // their pick, always one tap away (Pollen, Oct 2: after "Show me everything" there was no way back)
  const pickBtn = el('button', 'wfm-btn ghost', 'Pick a build'); pickBtn.type = 'button'; pickBtn.hidden = true;
  const done = el('button', 'wfm-btn', 'Done'); done.type = 'button';
  bar.append(say, pickBtn, listBtn, pauseBtn, done);
  pauseBtn.addEventListener('click', () => {
    marking = !marking; pauseBtn.textContent = marking ? 'Pause' : 'Keep marking';
    showPick();
    clearHover();
  });

  /* ---------------- choosing a spot ---------------- */
  const PICKABLE = 'img, video, figure, h1, h2, h3, h4, p, li, a, button, label, blockquote, dt, dd, .price, .photo, section, article, [class*="hero"], header';
  // The mockup's own controls keep working while marking (Pollen, Oct 2: the "See it as" switcher and
  // dropdowns opened a note instead): view switches, toggles, dropdowns, tabs and build tags.
  // (the page's own <html data-view> says which view is showing: never a control)
  const CONTROL = 'summary, select, option, button[aria-expanded], button[aria-pressed], [role="tab"], button[data-view], a[data-view], button[data-go], .tag[data-go], .build[data-go], a[data-go]';
  const isControl = (t) => { const c = t.closest && t.closest(CONTROL); return !!(c && !ours(c)); };
  // a mockup can mark a group as one spot (data-mark-whole), like the hours: one note for all of it
  const pickOf = (t) => {
    if (isControl(t)) return null;
    const w = t.closest && t.closest('[data-mark-whole]'); if (w && !ours(w)) return w;
    const n = t.closest && t.closest(PICKABLE); return n && !ours(n) ? n : null;
  };
  let hovered = null;
  const clearHover = () => { if (hovered) hovered.classList.remove('wfm-hover'); hovered = null; };
  document.addEventListener('mouseover', (e) => {
    if (!marking || !canMark() || popOpen || card) return;
    const n = pickOf(e.target); if (n === hovered) return;
    clearHover(); if (n) { hovered = n; n.classList.add('wfm-hover'); }
  }, true);
  document.addEventListener('click', (e) => {
    if (!marking || driving || card || ours(e.target)) return;
    if (!canMark()) { if (isControl(e.target)) setTimeout(syncView, 120); return; } // just looking: the page works as usual
    if (isControl(e.target)) { setTimeout(syncView, 120); return; } // let the mockup do its thing
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

  /* ---------------- the note ---------------- */
  let pop = null, popOpen = false, picked = null;
  const closePop = () => { if (pop) pop.remove(); pop = null; popOpen = false; if (picked) picked.classList.remove('wfm-pick'); picked = null; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); panel.hidden = true; } });
  function openPop(n) {
    closePop(); clearHover(); panel.hidden = true; // one thing open at a time: the list never sits under a note box
    picked = n; n.classList.add('wfm-pick'); popOpen = true;
    const spot = spotOf(n);
    pop = el('div', 'wfm wfm-pop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Your note');
    const where = el('p', '', spot);
    const ta = el('textarea'); ta.placeholder = n.getAttribute('data-mark-hint') || 'What would you change here?'; ta.maxLength = 1000; ta.setAttribute('aria-label', 'Your note');
    const err = el('p', 'err'); err.hidden = true;
    const row = el('div', 'row');
    const cancel = el('button', 'wfm-btn ghost', 'Cancel'); cancel.type = 'button';
    const send = el('button', 'wfm-btn', 'Send to Taya'); send.type = 'button';
    row.append(cancel, send); pop.append(where, ta, err, row);
    document.body.appendChild(pop);
    const r = n.getBoundingClientRect();
    const top = window.scrollY + Math.min(r.bottom + 10, window.innerHeight - 260);
    const left = window.scrollX + Math.max(10, Math.min(r.left, window.innerWidth - pop.offsetWidth - 10));
    pop.style.top = Math.max(window.scrollY + 10, top) + 'px'; pop.style.left = left + 'px';
    ta.focus({ preventScroll: true });
    cancel.addEventListener('click', closePop);
    const nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    send.addEventListener('click', async () => {
      const what = ta.value.trim();
      if (what.length < 3) { err.hidden = false; err.textContent = 'Just a few words is plenty.'; ta.focus(); return; }
      send.disabled = true; send.textContent = 'Sending…'; err.hidden = true;
      try {
        const res = await call('/mark', { what, page: PAGE, spot, nonce });
        notes.push({ id: res.id, what, spot, status: 'new', reply: '', el: n });
        closePop(); renderPins(); renderPanel();
        say.lastChild.textContent = 'sent! Tap anything else, or see your notes.';
      } catch (x) {
        if (x.code === 'bad_link') { expired(); return; }
        send.disabled = false; send.textContent = 'Send to Taya'; err.hidden = false;
        err.textContent = x.code === 'signed_out' ? 'Your sign-in ran out. Sign in at your portal again, then come back.'
          : x.code === 'slow_down' ? 'That’s a lot of notes for one day! Send the rest tomorrow, or email me.'
          : 'That didn’t go through. Check your connection and try again.';
      }
    });
  }

  /* ---------------- the build picker ---------------- */
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
  // the words those first mockups were sent with (Oct 1 to 4 2026): never change these
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
        price.append(s, el('span', 'once', ' paid once, founding price'));
      } else {
        price.append(document.createTextNode(usd(bd.full)), el('span', 'once', ' paid once'));
      }
      if (PRICED && bd.care) price.append(el('span', 'once care-mo', 'then a ' + usd(bd.care) + ' a month subscription'));
      btn.append(el('span', 'nm', bd.name), price, el('span', 'what', bd.what));
      btn.setAttribute('aria-pressed', myPick === bd.key ? 'true' : 'false');
      btn.addEventListener('click', () => choose(bd.key));
      grid.append(btn);
    });
    box.append(grid);
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
  // actually on their site"). Not picked yet, or "show me everything": just looking. Older servers: always on.
  function canMark() { return !pickReady || (!!myPick && myPick !== 'all'); }
  function showPick() {
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
    b.textContent = 'Magic mockup: ';
    say.lastChild.textContent = !canMark() ? 'pick a build first, then tap anything to leave a note.'
      : !marking ? 'paused, so the page works as usual.'
      : 'showing ' + NAMES[myPick] + '. Tap anything you’d like changed.';
  }
  // they switched the view with the mockup's own buttons: that's their pick now
  function syncView() {
    if (!pickReady) return;
    const on = document.querySelector('.vseg [data-view][aria-pressed="true"]');
    const v = on && on.getAttribute('data-view');
    if (!v || !NAMES[v] || v === 'all' || v === myPick) return;
    myPick = v; renderPanel(); showPick();
    call('/pick', { page: PAGE, pick: v }).catch((x) => { if (x.code === 'bad_link') expired(); });
  }
  function choose(v) {
    myPick = v; closeCard(); showView(v); renderPanel(); showPick();
    call('/pick', { page: PAGE, pick: v }).catch((x) => { if (x.code === 'bad_link') expired(); });
  }

  /* ---------------- send me anything ---------------- */
  let sentFiles = 0, first = '';
  const IDEAS = ['Your logo, the biggest version you have', 'Photos of you, your space or your work (phone photos are great)',
    'A menu, price list or list of what you offer', 'Reviews or kind words people have sent you', 'A bio, your story, or any words you love',
    'Flyers, cards or anything you’ve had printed', 'Colors or fonts you love'];
  const EXTS = /\.(jpe?g|png|webp|heic|heif|gif|pdf|svg|eps|ai|ps|zip)$/i;
  const MAX = 15 * 1024 * 1024;
  const sizeOf = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function scrim(labelId) {
    closeCard(); closePop(); clearHover(); panel.hidden = true;
    card = el('div', 'wfm wfm-scrim');
    const box = el('div', 'wfm-card'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', labelId);
    card.append(box);
    card.addEventListener('click', (e) => { if (e.target === card && !busy) closeCard(); });
    document.body.appendChild(card);
    return box;
  }
  let busy = false;
  function openFiles() {
    const box = scrim('wfm-files-h');
    const h = el('h2', '', 'One last thing: anything else for your site?'); h.id = 'wfm-files-h';
    box.append(h, el('p', 'lead', 'If you’ve got something that isn’t on here yet, send it my way and I’ll find it a home. A few ideas, in case they help:'));
    const ul = el('ul', 'ideas'); IDEAS.forEach((t) => ul.append(el('li', '', t))); box.append(ul);
    box.append(el('p', 'small', 'Things like your hours or social links? Just tap the spot on your mockup and type them in a note. Nothing here is required.'));
    const drop = el('label', 'wfm-drop');
    const input = el('input'); input.type = 'file'; input.multiple = true;
    input.accept = 'image/*,.pdf,.svg,.eps,.ai,.ps,.zip,.heic,.heif';
    drop.append(input, el('b', '', 'Choose files'), el('span', '', 'or drop them here. Photos, PDFs, logo files or a zip, up to 15 MB each.'));
    const list = el('ul', 'wfm-files');
    const count = el('p', 'sentcount', ''); count.hidden = !sentFiles;
    if (sentFiles) count.textContent = 'You’ve sent me ' + sentFiles + (sentFiles === 1 ? ' file' : ' files') + ' so far. Thank you!';
    // and a box for anything at all (Pollen, Oct 2), saved as one more note
    const any = el('div', 'anything');
    const lab = el('label', '', 'Anything else you’d like me to know?'); lab.htmlFor = 'wfm-any';
    const ta = el('textarea'); ta.id = 'wfm-any'; ta.maxLength = 1000; ta.placeholder = 'Your story, a link to your Instagram, a color you love, anything at all.';
    const arow = el('div', 'row'); const amsg = el('p', 'msg'); amsg.hidden = true;
    const asend = el('button', 'wfm-btn ghost', 'Send to Taya'); asend.type = 'button';
    arow.append(amsg, asend); any.append(lab, ta, arow);
    box.append(drop, list, count, any);
    const anyNonce = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
    let anyNo = 0, anyP = null;
    function sendAny() { return anyP || (anyP = sendAnyNow().finally(() => { anyP = null; })); } // one at a time
    async function sendAnyNow() {
      const what = ta.value.trim();
      if (!what) return true;
      if (what.length < 3) { amsg.hidden = false; amsg.className = 'msg bad'; amsg.textContent = 'Just a few words is plenty.'; return false; }
      asend.disabled = true; asend.textContent = 'Sending…';
      try {
        const spot = 'Anything else (the last step)';
        const res = await call('/mark', { what, page: PAGE, spot, nonce: (anyNonce + '-' + anyNo).slice(0, 40) }); // a retry reuses it
        anyNo++;
        notes.push({ id: res.id, what, spot, status: 'new', reply: '', el: null });
        ta.value = ''; amsg.hidden = false; amsg.className = 'msg'; amsg.textContent = 'Sent ✓ Thank you!';
        asend.disabled = false; asend.textContent = 'Send to Taya'; close.textContent = 'All done'; renderPanel();
        return true;
      } catch (x) {
        if (x.code === 'bad_link') { closeCard(); expired(); return false; }
        asend.disabled = false; asend.textContent = 'Send to Taya'; amsg.hidden = false; amsg.className = 'msg bad';
        amsg.textContent = x.code === 'slow_down' ? 'That’s a lot for one day! Email me the rest?' : 'That didn’t go through. Try again?';
        return false;
      }
    }
    asend.addEventListener('click', sendAny);
    const foot = el('div', 'foot');
    // the step after their notes (Pollen, Oct 2: uploads come after Done): back to the notes, or on to the thank-you
    const back = el('button', 'wfm-btn ghost', 'Back to my notes'); back.type = 'button';
    back.addEventListener('click', () => { if (!busy) closeCard(); });
    const close = el('button', 'wfm-btn', sentFiles ? 'All done' : 'Skip, I’m done'); close.type = 'button';
    close.addEventListener('click', async () => {
      if (busy || close.disabled) return;
      close.disabled = true;
      try { if (await sendAny()) thanks(); } finally { close.disabled = false; } // typed but not sent: send it
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
      for (const f of files.slice(0, 20)) {
        const li = el('li'); const st = el('span', 'fs', 'Sending…');
        li.append(el('span', '', f.name.length > 40 ? f.name.slice(0, 37) + '…' : f.name), st); list.append(li);
        if (!EXTS.test(f.name)) { st.className = 'fs bad'; st.textContent = 'This kind of file won’t go. Email it to me?'; continue; }
        if (f.size > MAX) { st.className = 'fs bad'; st.textContent = 'Over 15 MB (' + sizeOf(f.size) + '). Email it to me?'; continue; }
        try {
          const res = await upload(f);
          sentFiles = res.sent_files || sentFiles + 1;
          st.className = 'fs ok'; st.textContent = 'Sent ✓';
          count.hidden = false; count.textContent = 'You’ve sent me ' + sentFiles + (sentFiles === 1 ? ' file' : ' files') + ' so far. Thank you!';
          close.textContent = 'All done';
        } catch (x) {
          if (x.code === 'bad_link') { busy = false; closeCard(); expired(); return; }
          st.className = 'fs bad';
          st.textContent = x.code === 'slow_down' ? 'That’s a lot for one day! Send the rest tomorrow.'
            : x.reason === 'full' ? 'Your space is full. Email me the rest?'
            : x.reason === 'too_many' ? 'That’s the most this spot holds. Email me the rest?'
            : x.reason === 'type' ? 'This kind of file won’t go. Email it to me?'
            : x.code === 'signed_out' ? 'Your sign-in ran out. Sign in at your portal again, then come back.'
            : 'Didn’t go through. Try again?';
          if (x.code === 'slow_down') break;
        }
      }
      busy = false; close.disabled = false; renderPanel();
    }
  }
  async function upload(f) {
    const fd = new FormData();
    fd.append('page', PAGE); if (magic) fd.append('k', magic);
    fd.append('files', f, f.name);
    const headers = {}; if (token) headers['X-WF-Session'] = token;
    let res;
    try { res = await fetch(BASE + '/mockup-upload', { method: 'POST', headers, body: fd, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' }); }
    catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.ok) {
      const code = (data && data.error) || 'server';
      if (code === 'signed_out' && token && magic) { token = ''; return upload(f); }
      const x = new Error('fail'); x.code = code; x.reason = data && data.reason; throw x;
    }
    return data;
  }
  // (a file that fails because the sign-in ran out says so, below)

  // Done: on to "one last thing" (files), then the thank-you, and what happens next (Taya writes back by email).
  done.addEventListener('click', () => openFiles());
  // "Done" has to reach the server (their portal flips to "My turn", Taya gets her email): if it can't now,
  // it's kept for this page and sent again on the next visit.
  const DONE_KEY = 'wf-mockup-done:' + PAGE;
  async function sendDone() {
    for (let i = 0; i < 3; i++) {
      try { await call('/mockup-done', { page: PAGE }); store((s) => s.removeItem(DONE_KEY)); return true; }
      catch (x) {
        if (x.code === 'bad_link') { expired(); return false; }
        if (x.code === 'signed_out' || x.code === 'slow_down') break;
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
    store((s) => s.setItem(DONE_KEY, '1'));
    return false;
  }
  let startOpen = false; // from /marks: getting started is already open for them
  function thanks() {
    sendDone(); // their portal: "My turn" 
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

  /* ---------------- talking to the portal ---------------- */
  // a portal sign-in first (exactly as before); else the magic link's key, in the body as k
  async function call(path, body) {
    let res;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-WF-Session'] = token;
    const send = magic ? Object.assign({}, body, { k: magic }) : body; // the server picks: own sign-in, else this page's key
    try {
      res = await fetch(BASE + path, { method: 'POST', headers,
        body: JSON.stringify(send), mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    } catch (e) { const x = new Error('network'); x.code = 'network'; throw x; }
    let data = null; try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || !data.ok) {
      const code = (data && data.error) || 'server';
      // their portal sign-in ran out, but they came by a magic link: carry on with the link
      if (code === 'signed_out' && token && magic) { token = ''; return call(path, body); }
      const x = new Error('fail'); x.code = code; throw x;
    }
    return data;
  }

  /* ---------------- pins and the list ---------------- */
  // find the spot again by its words, so pins come back on a later visit
  const findSpot = (spot) => {
    const q = (spot.match(/“(.+?)…?”/) || [])[1];
    if (!q) return null;
    const words = q.replace(/^photo: /, '');
    for (const g of document.querySelectorAll('[data-mark-label]')) if (g.getAttribute('data-mark-label') === words && !ours(g)) return g;
    const all = document.querySelectorAll(PICKABLE);
    for (const n of all) {
      if (ours(n)) continue;
      const t = (n.getAttribute('alt') || n.textContent || '').replace(/\s+/g, ' ').trim();
      const img = n.querySelector && n.querySelector('img');
      if ((t && t.indexOf(words) === 0) || (img && (img.getAttribute('alt') || '').indexOf(words) === 0)) return n;
    }
    return null;
  };
  let pinLayer = [];
  function renderPins() {
    pinLayer.forEach((p) => p.remove()); pinLayer = [];
    notes.forEach((note, i) => {
      const n = note.el || (note.el = findSpot(note.spot));
      if (!n || !n.getClientRects().length) return;
      const r = n.getBoundingClientRect();
      const pin = el('button', 'wfm-pin' + (note.status === 'done' ? ' done' : ''), String(i + 1));
      pin.type = 'button'; pin.setAttribute('aria-label', 'Note ' + (i + 1) + ': ' + note.what);
      pin.style.top = (window.scrollY + r.top + 4) + 'px'; pin.style.left = (window.scrollX + r.right - 4) + 'px';
      pin.addEventListener('click', () => { panel.hidden = false; renderPanel(i); });
      document.body.appendChild(pin); pinLayer.push(pin);
    });
  }
  const panel = el('section', 'wfm wfm-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Your notes');
  document.body.appendChild(panel);
  // the title row, with a little X so the list can always be put away
  const panelHead = () => {
    const h = el('div', 'ph'); const x = el('button', 'x', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', 'Close my notes');
    x.addEventListener('click', () => { panel.hidden = true; });
    h.append(el('h2', '', 'Your notes'), x); return h;
  };
  function renderPanel(focusIndex) {
    panel.textContent = '';
    panel.append(panelHead());
    if (pickReady) {
      const mp = el('p', 'mypick', canMark() && myPick ? 'Your pick: ' + NAMES[myPick] + '. ' : 'No build picked yet. ');
      const ch = el('button', 'wfm-link', canMark() && myPick ? 'Change my pick' : 'Pick one'); ch.type = 'button';
      ch.addEventListener('click', () => { panel.hidden = true; openCard(); });
      mp.append(ch); panel.append(mp);
    }
    if (sentFiles) panel.append(el('p', 'mypick', 'Files sent: ' + sentFiles + '. You can send more after Done.'));
    if (!notes.length) { panel.append(el('p', 'none', canMark() ? 'Nothing yet. Tap anything on your mockup to leave a note.' : 'Nothing yet. Pick a build, then tap anything on your mockup to leave a note.')); }
    else {
      const ol = el('ol');
      notes.forEach((n, i) => {
        const li = el('li');
        li.append(el('div', 'where', (i + 1) + '. ' + n.spot), el('div', '', n.what), el('span', 'st', STATUS[n.status] || 'Sent'));
        if (n.reply) li.append(el('div', 'reply', 'Taya: ' + n.reply));
        ol.append(li);
        if (i === focusIndex) setTimeout(() => li.scrollIntoView({ block: 'nearest' }), 30);
      });
      panel.append(ol);
    }
    listBtn.textContent = 'Your notes' + (notes.length ? ' (' + notes.length + ')' : '');
  }
  listBtn.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) renderPanel(); });

  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(renderPins, 120); };
  window.addEventListener('resize', later);
  window.addEventListener('hashchange', () => setTimeout(renderPins, 350));
  document.addEventListener('click', (e) => { if (!ours(e.target)) setTimeout(renderPins, 400); });

  call('/marks', { page: PAGE }).then((d) => {
    notes = (d.marks || []).map((x) => ({ id: x.id, what: x.what, spot: x.spot, status: x.status, reply: x.reply }));
    sentFiles = Math.max(0, +d.sent_files || 0); first = typeof d.first === 'string' ? d.first.slice(0, 40) : '';
    startOpen = d.start_open === true;
    let pending = false; store((s) => { if (s.getItem(DONE_KEY)) pending = true; });
    if (pending) sendDone(); // last time's Done didn't reach the server
    if (typeof d.pick === 'string') { // the server knows about picks
      pickReady = true; founding = d.founding === true; myPick = d.pick;
      if (myPick && myPick !== 'all') showView(myPick);
      if (!myPick || myPick === 'all') openCard(); // "everything" from before: pick a real build now
      showPick();
      pickBtn.addEventListener('click', openCard);
    }
    renderPins(); renderPanel();
  }).catch((x) => {
    if (x.code === 'bad_link') { expired(); return; }
    if (x.code === 'signed_out') {
      bar.textContent = '';
      bar.append(el('span', '', 'Your sign-in ran out. Sign in at your portal again to leave notes.'));
      const a = el('a', 'wfm-btn', 'Sign in'); a.href = '/portal.html?back=' + encodeURIComponent(location.pathname + '?mark=1' + location.hash);
      bar.append(a); marking = false;
      return;
    }
    // the server couldn't be reached: say so, rather than letting notes go nowhere
    say.lastChild.textContent = 'I couldn’t reach my server just now, so notes may not send. Try reloading in a minute.';
  });
})();
