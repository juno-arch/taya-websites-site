/* =====================================================================================================
   A light brand touch for a client's back end (portal.html), Oct 16 2026. OFF until Taya sets a color for
   that client (the server sends `brand: { accent: '#rrggbb' }` in `me` only then; hub DEPLOY.md section 80).

   This file only does the color math, no page work: portal.js asks pick() and paints the result.
     - contrast(a, b)       the WCAG contrast ratio of two #rrggbb colors (1 to 21)
     - darken(hex, papers)  the same hue, lightness stepped down 1% at a time until the color reads at 4.5:1 or
                            better on every paper color given; '' if it would have to go darker than LIGHT_FLOOR
     - pick(accent, opts)   what the back end uses, or null for Web Faery's own look:
                              { accent, text, darkened, bar }
                              text  the accent as it is if it passes 4.5:1 on the paper (and the page ground),
                                    else its darker shade; used for the italic heading words, link underlines,
                                    the Heads up edge, small icons and the focus ring
                              bar   the accent as it is if it shows at 3:1 on the night bar (the current tab's
                                    line); '' keeps the gold line
                            null for anything that isn't a strict #rrggbb, for white, black, greys and near whites
                            (no hue to bring in), and when no shade of the hue passes.
   Works in the browser (window.WFBrand) and in plain Node (module.exports) for _tests/portal-text.test.mjs.
   ===================================================================================================== */
(function (root) {
  'use strict';

  const HEX_RE = /^#[0-9a-f]{6}$/;
  // the back end's paper (--wf-b-sheet) and its ground (--wf-b-bg) in the light look; text sits on both
  const PAPERS = ['#fcfbff', '#efebf8'];
  const BAR = '#2e3271';          // --wf-night: the bar and the phone dock
  const TEXT_RATIO = 4.5;         // WCAG AA, normal text
  const BAR_RATIO = 3;            // WCAG AA, non-text (the tab's line)
  const MIN_SATURATION = 0.12;    // below this it's a grey: no hue to bring in
  const MIN_CHROMA = 0.05;        // and near white or near black (HSL calls #fcfbff fully saturated): no hue either
  const LIGHT_FLOOR = 0.15;       // darker than this it reads as near black, not their color

  const parse = (hex) => {
    const h = String(hex == null ? '' : hex).trim().toLowerCase();
    if (!HEX_RE.test(h)) return null;
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  };
  const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

  function luminance(hex) {
    const rgb = parse(hex);
    if (!rgb) return NaN;
    const lin = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    if (Number.isNaN(la) || Number.isNaN(lb)) return NaN;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  const passes = (hex, papers, ratio) => papers.every((p) => contrast(hex, p) >= ratio);

  function toHsl(rgb) {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s: s, l: l };
  }
  function fromHsl(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let rgb = [0, 0, 0];
    if (hp < 1) rgb = [c, x, 0];
    else if (hp < 2) rgb = [x, c, 0];
    else if (hp < 3) rgb = [0, c, x];
    else if (hp < 4) rgb = [0, x, c];
    else if (hp < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const m = l - c / 2;
    return rgb.map((v) => (v + m) * 255);
  }
  const hueOf = (hex) => { const rgb = parse(hex); return rgb ? toHsl(rgb) : null; };

  // the same hue and saturation, lightness down 1% at a time until it passes on every paper; '' if it can't
  function darken(hex, papers, ratio) {
    const rgb = parse(hex);
    if (!rgb) return '';
    papers = papers && papers.length ? papers : PAPERS;
    ratio = ratio || TEXT_RATIO;
    const own = toHex(rgb);
    if (passes(own, papers, ratio)) return own;
    const hsl = toHsl(rgb);
    for (let step = 1; ; step++) {
      const l = hsl.l - step / 100;
      if (l < LIGHT_FLOOR - 1e-9) return '';
      const c = toHex(fromHsl(hsl.h, hsl.s, l));
      if (passes(c, papers, ratio)) return c;
    }
  }

  function pick(accent, opts) {
    const o = opts || {};
    const rgb = parse(accent);
    if (!rgb || String(accent).trim() !== String(accent)) return null;
    const hex = toHex(rgb);
    const papers = (o.papers || []).filter((p) => parse(p)).map((p) => toHex(parse(p)));
    const bar = parse(o.bar) ? toHex(parse(o.bar)) : BAR;
    const chroma = (Math.max.apply(null, rgb) - Math.min.apply(null, rgb)) / 255;
    if (toHsl(rgb).s < MIN_SATURATION || chroma < MIN_CHROMA) return null;
    const text = darken(hex, papers.length ? papers : PAPERS, TEXT_RATIO);
    if (!text) return null;
    return { accent: hex, text: text, darkened: text !== hex, bar: contrast(hex, bar) >= BAR_RATIO ? hex : '' };
  }

  const WFBrand = Object.freeze({
    PAPERS: PAPERS.slice(), BAR: BAR, TEXT_RATIO: TEXT_RATIO, BAR_RATIO: BAR_RATIO, MIN_SATURATION: MIN_SATURATION, MIN_CHROMA: MIN_CHROMA,
    LIGHT_FLOOR: LIGHT_FLOOR,
    parse: parse, luminance: luminance, contrast: contrast, hueOf: hueOf, darken: darken, pick: pick,
  });
  if (typeof module === 'object' && module && module.exports) module.exports = WFBrand;
  else root.WFBrand = WFBrand;
})(typeof window !== 'undefined' ? window : globalThis);
