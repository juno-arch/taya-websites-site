/* =====================================================================================================
   Your business cards (portal.html, #sec-cards), Oct 21 2026. A client sees their card in their own color, types the
   few words that go on it, downloads two print files, and goes to a printer to order and pay there. Web Faery handles
   no order, money or shipping, and nothing here is sent anywhere: the words live only in their own browser
   (localStorage), the pictures are drawn on a canvas in their browser, the QR code is made here.

   portal.js calls WFCards.mount(ctx) when it has the client's details (and again if they change):
     ctx = { accent: '#rrggbb' | '', business, first, email, site, preview: bool, key: string }
   What the portal knows today: only the accent color (me.brand.accent), the business name, first name, email and site
   address. No logo, no fonts, no phone and no address come from the server, so the card uses the fonts the portal
   already loads (Gloock for names, Lexend for the small words), the business name in place of a logo, and the
   client types the rest.

   One draw function paints both the on-screen preview and the files, so what they see is what prints:
     draw(canvas, side, style, look, f, guide)   canvas is 1125 x 675 px = 3.75 x 2.25 in at 300 dpi
       the card is 3.5 x 2 in; 0.125 in of bleed (37.5 px) each side; the safe area is 0.125 in inside the cut (75 px).
       guide = true draws the safe line (the preview only, never the files).
   QR: a small public domain style encoder (byte mode, error correction M, versions 1 to 10), no network.
   Works in the browser (window.WFCards) and in plain Node (module.exports) for the tests.
   ===================================================================================================== */
(function (root) {
  'use strict';

  /* ---------------- QR code ---------------- */
  const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];   // level M, versions 1..10
  const BLOCKS = [1, 1, 2, 2, 4, 4, 4, 4, 5, 5];
  const MAX_VER = 10;

  const rawModules = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  };
  const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v - 1] * BLOCKS[v - 1];
  const gfMul = (a, b) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((b >>> i) & 1) * a; } return z & 255; };
  function rsDivisor(deg) {
    const r = new Array(deg).fill(0); r[deg - 1] = 1;
    let rt = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) { r[j] = gfMul(r[j], rt); if (j + 1 < deg) r[j] ^= r[j + 1]; }
      rt = gfMul(rt, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = new Array(div.length).fill(0);
    data.forEach((b) => { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); });
    return r;
  }
  const utf8 = (s) => Array.from(unescape(encodeURIComponent(s)), (c) => c.charCodeAt(0));

  // returns { size, get(x, y) } or null when the text doesn't fit (version 10, M: 213 bytes)
  function qr(text) {
    const bytes = utf8(String(text || ''));
    let ver = 0;
    for (let v = 1; v <= MAX_VER; v++) {
      if (4 + (v >= 10 ? 16 : 8) + 8 * bytes.length <= dataCodewords(v) * 8) { ver = v; break; }
    }
    if (!bytes.length || !ver) return null;
    const size = ver * 4 + 17;
    // the bits: mode (byte), length, bytes, end, padding
    const bits = [];
    const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, ver >= 10 ? 16 : 8); bytes.forEach((b) => put(b, 8));
    const cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    for (let pad = 0xec; data.length < dataCodewords(ver); pad ^= 0xec ^ 0x11) data.push(pad);
    // error correction, blocks interleaved
    const nb = BLOCKS[ver - 1], el = ECC_PER_BLOCK[ver - 1];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const div = rsDivisor(el);
    const blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const all = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) all.push(b[i]); });
    // the grid
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setFn = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const na = ver === 1 ? 0 : Math.floor(ver / 7) + 2;
    const pos = [];
    if (na) {
      const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      pos.push(6);
      for (let p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    }
    pos.forEach((cx, i) => pos.forEach((cy, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const formatBits = (mask) => {
      const d = (0 << 3) | mask;            // level M is 0
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      const bit = (i) => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) setFn(8, i, bit(i));
      setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
      setFn(8, size - 8, true);
    };
    formatBits(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const c = ((b >>> i) & 1) !== 0, a = size - 11 + i % 3, d = Math.floor(i / 3);
        setFn(a, d, c); setFn(d, a, c);
      }
    }
    // the codewords, zigzag
    let bi = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && bi < all.length * 8) { mod[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
      }
    }
    // the mask with the lowest penalty
    const maskFn = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
      (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
    ];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x]; };
    const penalty = () => {
      let p = 0;
      const line = (get) => {
        for (let a = 0; a < size; a++) {
          let run = 1;
          for (let b = 1; b < size; b++) {
            if (get(a, b) === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
          }
          // finder-like 1:1:3:1:1 with a light edge
          for (let b = 0; b + 6 < size; b++) {
            if (get(a, b) && !get(a, b + 1) && get(a, b + 2) && get(a, b + 3) && get(a, b + 4) && !get(a, b + 5) && get(a, b + 6)) p += 40;
          }
        }
      };
      line((a, b) => mod[a][b]); line((a, b) => mod[b][a]);
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
      let dark = 0; mod.forEach((r) => r.forEach((c) => { if (c) dark++; }));
      p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return p;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); formatBits(m);
      const p = penalty();
      if (p < bestP) { best = m; bestP = p; }
      applyMask(m);
    }
    applyMask(best); formatBits(best);
    return { size: size, version: ver, get: (x, y) => x >= 0 && y >= 0 && x < size && y < size && mod[y][x] };
  }

  /* ---------------- the card ---------------- */
  const W = 1125, H = 675;            // 300 dpi: 3.75 x 2.25 in, with the bleed
  const BLEED = 37.5, SAFE = 75;      // px: 0.125 in, and 0.125 in inside the cut
  const MARGIN = 112;                 // where the words start from the edge (inside the safe area)
  const STYLES = [['simple', 'Simple'], ['bold', 'Bold'], ['soft', 'Soft']];
  const DISPLAY = "'Gloock', Georgia, serif";
  const WORK = "'Lexend', system-ui, -apple-system, 'Segoe UI', sans-serif";

  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); };
  function lum(h) {
    return 0.2126 * lin(hexRgb(h)[0]) + 0.7152 * lin(hexRgb(h)[1]) + 0.0722 * lin(hexRgb(h)[2]);
    function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  // everything the card paints with, from their one accent color (or a calm plum when there isn't one)
  function look(accent) {
    const a = /^#[0-9a-f]{6}$/.test(accent || '') ? accent : '#4b3f72';
    const ink = mix(a, '#000000', 0.78);                       // a very dark shade of their hue
    const onAccent = ratio(a, '#ffffff') >= ratio(a, ink) ? '#ffffff' : ink;
    const textAccent = ratio(a, '#ffffff') >= 4.5 ? a : mix(a, '#000000', 0.45);
    return { accent: a, ink: ink, onAccent: onAccent, paper: '#ffffff', tint: mix(a, '#ffffff', 0.9), tintDeep: mix(a, '#ffffff', 0.78), textAccent: textAccent, soft: mix(ink, '#ffffff', 0.35) };
  }

  const trimWeb = (s) => String(s || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const qrUrl = (s) => { const w = trimWeb(s); return w && /^[^\s/]+\.[^\s/]+/.test(w) ? 'https://' + w : ''; };

  function fit(ctx, text, font, maxW, size, min) {
    let s = size;
    for (; s > (min || 20); s -= 2) { ctx.font = font.replace('{s}', s); if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = font.replace('{s}', s);
    return s;
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function paintQr(ctx, code, x, y, box, fg, bg) {
    ctx.fillStyle = bg; ctx.fillRect(x, y, box, box);
    const quiet = 4, cells = code.size + quiet * 2, cell = Math.floor(box / cells);
    const off = Math.round((box - cell * cells) / 2) + quiet * cell;
    ctx.fillStyle = fg;
    for (let r = 0; r < code.size; r++) for (let c = 0; c < code.size; c++) if (code.get(c, r)) ctx.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
  }
  function contactLines(f) {
    return [f.phone, f.email, trimWeb(f.website), f.address].map((s) => String(s || '').trim()).filter(Boolean);
  }

  function draw(canvas, side, style, lk, f, guide) {
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const biz = String(f.business || '').trim() || String(f.name || '').trim() || 'Your business';
    const code = side === 'back' ? qr(qrUrl(f.website)) : null;
    const contact = contactLines(f);
    const nameLine = String(f.name || '').trim(), role = String(f.role || '').trim(), words = String(f.line || '').trim();
    const maxW = W - MARGIN * 2;

    // the grounds
    let bg = lk.paper;
    if (style === 'bold') bg = side === 'front' ? lk.accent : lk.paper;
    if (style === 'soft') bg = side === 'front' ? lk.tint : lk.accent;
    if (style === 'simple') bg = side === 'front' ? lk.paper : lk.accent;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const dark = ratio(bg, '#ffffff') < ratio(bg, lk.ink);        // true when ink reads better on this ground
    const fg = dark ? lk.ink : '#ffffff';
    const fgSoft = dark ? lk.soft : mix('#ffffff', bg, 0.2);

    if (side === 'front') {
      // the business name where a logo would sit
      if (style === 'soft') {
        ctx.fillStyle = lk.tintDeep; ctx.beginPath(); ctx.arc(W - 40, 40, 260, 0, Math.PI * 2); ctx.fill();
      }
      let y = MARGIN + 30;
      const ns = fit(ctx, biz, '{s}px ' + DISPLAY, maxW, style === 'bold' ? 84 : 66, 34);
      ctx.fillStyle = style === 'simple' ? lk.textAccent : fg;
      ctx.fillText(biz, MARGIN, y + ns * 0.2);
      y += ns * 0.2 + 36;
      ctx.fillStyle = style === 'simple' ? lk.accent : (style === 'soft' ? lk.accent : fg);
      ctx.fillRect(MARGIN, y, style === 'bold' ? 160 : 96, 6);
      y += 54;
      if (nameLine) { ctx.fillStyle = fg; fit(ctx, nameLine, '500 {s}px ' + WORK, maxW, 40, 24); ctx.fillText(nameLine, MARGIN, y); y += 8; }
      if (role) { y += 36; ctx.fillStyle = fgSoft; fit(ctx, role, '300 {s}px ' + WORK, maxW, 28, 20); ctx.fillText(role, MARGIN, y); }
      // contacts stack up from the bottom, left
      const cs = 27, gap = 40;
      let cy = H - MARGIN + 6 - (contact.length - 1) * gap;
      ctx.fillStyle = fg;
      contact.forEach((line, i) => {
        fit(ctx, line, '300 {s}px ' + WORK, maxW * 0.62, cs, 18);
        ctx.fillText(line, MARGIN, cy + i * gap);
      });
    } else {
      // the back: their color, the QR, a few words
      if (style === 'soft') {
        ctx.fillStyle = mix(lk.accent, '#ffffff', 0.14); ctx.beginPath(); ctx.arc(60, H - 30, 250, 0, Math.PI * 2); ctx.fill();
      }
      if (code) {
        const box = 300, qx = style === 'bold' ? (W - box) / 2 : W - MARGIN - box + 12, qy = style === 'bold' ? MARGIN - 6 : (H - box) / 2 - 30;
        paintQr(ctx, code, qx, qy, box, '#1a1a1a', '#ffffff');
        ctx.fillStyle = fgSoft; ctx.textAlign = style === 'bold' ? 'center' : 'left';
        ctx.font = '300 24px ' + WORK;
        ctx.fillText('Scan to visit', style === 'bold' ? W / 2 : qx + 4, qy + box + 40);
        ctx.textAlign = 'left';
        if (style !== 'bold') {
          ctx.fillStyle = fg;
          const bs = fit(ctx, biz, '{s}px ' + DISPLAY, qx - MARGIN - 40, 56, 30);
          const bl = wrap(ctx, biz, qx - MARGIN - 40);
          bl.slice(0, 3).forEach((ln, i) => ctx.fillText(ln, MARGIN, MARGIN + 40 + i * bs * 1.15));
          if (words) {
            ctx.fillStyle = fgSoft; ctx.font = 'italic 300 28px ' + WORK;
            wrap(ctx, words, qx - MARGIN - 40).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, MARGIN, H - MARGIN - 80 + i * 40));
          }
        } else if (words) {
          ctx.fillStyle = fgSoft; ctx.font = 'italic 300 26px ' + WORK; ctx.textAlign = 'center';
          ctx.fillText(wrap(ctx, words, maxW)[0], W / 2, H - MARGIN + 10);
          ctx.textAlign = 'left';
        }
      } else {
        // no website yet: the name and the words, centered
        ctx.textAlign = 'center'; ctx.fillStyle = fg;
        fit(ctx, biz, '{s}px ' + DISPLAY, maxW, 80, 34);
        ctx.fillText(biz, W / 2, H / 2 + (words ? -10 : 20));
        if (words) {
          ctx.fillStyle = fgSoft; ctx.font = 'italic 300 30px ' + WORK;
          wrap(ctx, words, maxW).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, W / 2, H / 2 + 50 + i * 42));
        }
        ctx.textAlign = 'left';
      }
    }
    if (guide) {
      ctx.save();
      ctx.setLineDash([14, 10]); ctx.lineWidth = 2; ctx.strokeStyle = dark ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.6)';
      ctx.strokeRect(BLEED + SAFE, BLEED + SAFE, W - 2 * (BLEED + SAFE), H - 2 * (BLEED + SAFE));
      ctx.restore();
    }
  }

  const api = { qr: qr, look: look, draw: draw, qrUrl: qrUrl, STYLES: STYLES, W: W, H: H, BLEED: BLEED, SAFE: SAFE };

  /* ---------------- the section (browser only) ---------------- */
  const MOO = 'https://www.moo.com/us/business-cards/', VISTA = 'https://www.vistaprint.com/business-cards';
  const FIELDS = [
    ['name', 'Name on the card', 'text', 80, 'name'],
    ['role', 'Job line', 'text', 80, 'organization-title'],
    ['phone', 'Phone', 'tel', 40, 'tel'],
    ['email', 'Email', 'email', 120, 'email'],
    ['website', 'Website', 'text', 120, 'url'],
    ['address', 'Address line (optional)', 'text', 100, 'street-address'],
    ['line', 'A short line of words (optional)', 'text', 60, 'off']
  ];
  let mountedSig = '';

  function mount(c) {
    const sec = document.getElementById('sec-cards');
    if (!sec || !c) return;
    const host = document.getElementById('cards-body');
    const sig = [c.accent, c.business, c.first, c.email, c.site, c.preview ? 1 : 0].join('|');
    if (sig === mountedSig) return;
    mountedSig = sig;
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    host.replaceChildren();
    if (!c.accent) {
      host.append(el('p', 'cd-soon', 'I will add your brand here soon. Once your colors are in, your card shows up on this page.'));
      return;
    }
    const lk = look(c.accent);
    const store = 'wf-portal-cards-v1:' + (c.key || c.email || 'me');
    let saved = {};
    if (!c.preview) { try { saved = JSON.parse(window.localStorage.getItem(store) || '{}') || {}; } catch (e) { saved = {}; } }
    const f = {
      name: c.first || '', role: c.business || '', phone: '', email: c.email || '', website: trimWeb(c.site), address: '', line: '', business: c.business || '',
      style: 'simple'
    };
    Object.keys(saved).forEach((k) => { if (typeof saved[k] === 'string' && k in f) f[k] = saved[k].slice(0, 120); });
    if (!STYLES.some((s) => s[0] === f.style)) f.style = 'simple';

    // the form
    const form = el('form', 'rc-form cd-form');
    form.noValidate = true;
    form.addEventListener('submit', (e) => e.preventDefault());
    const fs = el('fieldset', 'cd-set');
    fs.disabled = !!c.preview;
    const inputs = {};
    FIELDS.forEach((d) => {
      const lab = el('label', 'field-label', d[1]); lab.htmlFor = 'in-cd-' + d[0];
      const inp = el('input'); inp.id = 'in-cd-' + d[0]; inp.type = d[2]; inp.maxLength = d[3]; inp.value = f[d[0]] || '';
      if (d[4] !== 'off') inp.autocomplete = d[4]; else inp.autocomplete = 'off';
      inp.addEventListener('input', () => { f[d[0]] = inp.value; change(); });
      inputs[d[0]] = inp;
      fs.append(lab, inp);
    });
    // styles
    const sty = el('div', 'cd-styles'); sty.setAttribute('role', 'group'); sty.setAttribute('aria-label', 'Card style');
    const styBtns = STYLES.map((s) => {
      const b = el('button', 'cd-style', s[1]); b.type = 'button'; b.dataset.style = s[0];
      b.addEventListener('click', () => { f.style = s[0]; change(); });
      return b;
    });
    sty.append(...styBtns);
    const savedNote = el('p', 'cd-fine', c.preview
      ? 'This is a preview, so the form and the downloads are switched off.'
      : 'What you type here stays in this browser only. It is not sent to me or anyone else.');
    form.append(fs);

    // the preview
    const view = el('div', 'cd-view');
    const mk = (side, label) => {
      const fig = el('figure', 'cd-fig');
      const cv = el('canvas', 'cd-canvas'); cv.width = W; cv.height = H;
      cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
      fig.append(cv, el('figcaption', 'cd-cap', side === 'front' ? 'Front' : 'Back'));
      return { fig: fig, cv: cv };
    };
    const front = mk('front', 'Front of your business card'), back = mk('back', 'Back of your business card');
    view.append(front.fig, back.fig);
    const guideNote = el('p', 'cd-fine', 'The dashed line is a guide: keep words 0.125 inch inside the edge. It is only on this screen, not in your files.');

    // downloads
    const dl = el('div', 'cd-dl');
    const dlBtn = el('button', 'btn cd-download', 'Download print files'); dlBtn.type = 'button';
    dlBtn.disabled = !!c.preview;
    const dlNote = el('p', 'cd-fine', 'Two PNG pictures, front and back, 3.75 x 2.25 inches at 300 dpi (that is the card plus 0.125 inch of bleed on each side). They are made in your browser and nothing is uploaded.');
    const msg = el('p', 'cd-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    dl.append(dlBtn, msg, dlNote);

    // the order
    const order = el('div', 'cd-order');
    order.append(el('h3', 'small-h', 'Order your cards'));
    const steps = el('ol', 'cd-steps');
    ['Download your two files above.', 'Upload them at the printer.', 'Pay and add your shipping address there.'].forEach((s) => steps.append(el('li', null, s)));
    order.append(steps);
    const go = el('a', 'btn cd-go', 'Order at MOO'); go.href = MOO; go.target = '_blank'; go.rel = 'noopener noreferrer';
    const go2 = el('a', 'later cd-go2', 'or try Vistaprint'); go2.href = VISTA; go2.target = '_blank'; go2.rel = 'noopener noreferrer';
    order.append(go, go2);
    order.append(el('p', 'cd-fine', 'The printer sets the price and sends the cards to you. I do not handle the order or the money. It is usually about $25 to $45 for 50 cards with shipping.'));

    host.append(view, guideNote, sty, form, savedNote, dl, order);

    function paint() {
      draw(front.cv, 'front', f.style, lk, f, true);
      draw(back.cv, 'back', f.style, lk, f, true);
      styBtns.forEach((b) => { b.setAttribute('aria-pressed', b.dataset.style === f.style ? 'true' : 'false'); b.disabled = !!c.preview; });
    }
    function change() {
      if (!c.preview) { try { window.localStorage.setItem(store, JSON.stringify(f)); } catch (e) { /* fine: it just doesn't remember */ } }
      paint();
    }
    paint();
    const loads = ["64px Gloock", "300 28px Lexend", "500 28px Lexend"].map((s) => document.fonts && document.fonts.load ? document.fonts.load(s) : Promise.resolve());
    Promise.all(loads).then(() => { paint(); }, () => {});

    const fileBase = () => (String(f.business || f.name || 'my').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'my') + '-card-';
    function save(side) {
      return new Promise((resolve, reject) => {
        const cv = document.createElement('canvas');
        draw(cv, side, f.style, lk, f, false);   // no guide in the files
        cv.toBlob((blob) => {
          if (!blob) { reject(new Error('blob')); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = fileBase() + side + '.png';
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          resolve(cv);
        }, 'image/png');
      });
    }
    dlBtn.addEventListener('click', () => {
      if (c.preview) return;
      msg.textContent = '';
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
        .then(() => save('front'))
        .then(() => new Promise((r) => setTimeout(r, 400)))
        .then(() => save('back'))
        .then(() => { msg.textContent = 'Done. Your two files are in your downloads.'; }, () => { msg.textContent = 'I could not make the files here. Try another browser, or email me and I will help.'; });
    });
  }
  api.mount = mount;

  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else root.WFCards = api;
})(typeof window !== 'undefined' ? window : globalThis);
