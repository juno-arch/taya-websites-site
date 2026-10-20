/* Web Faery: rich messages in the browser (Oct 20 2026, hub DEPLOY.md section 95, API.md section 40). NOT DEPLOYED YET.
   Pollen: "give them email capabilities: all the editing stuff, upload and attach, links".
   The SAME file as the hub's pb_public/studio/studio-rich.js (richmsg.test.mjs checks they match), loaded before
   portal.js (and studio-messages.js). It offers window.WFRich:
     render(markup, document)   the thread's words, drawn from the restricted markup with createElement and
                                textContent only (p, br, strong, em, u, ul, ol, li, a; links https only, rel noopener
                                noreferrer nofollow, a new tab). Never HTML from a string.
     toMarkup(element)          the composer's box back into the markup (what is sent; the server normalizes it again)
     composer(options)          the composer: Bold, Italic, Underline, bulleted and numbered lists, Link (a small field
                                of its own), Emoji (a grid of 60), Attach, Clear formatting; Cmd or Ctrl with B, I, U, K;
                                paste and drop come in as plain words (files dropped or pasted are attached); the unsent
                                words and attachments kept in this tab (sessionStorage, carefully)
     fileList(files, options)   a message's attachments: small pictures (240 px at most) and name + size rows, each a
                                download through the caller's own signed in fetch
   The markup and its grammar: see the core below (and webfaery-messages-rich-lib.js in the hub). */
(function (root) {
'use strict';
// ==== WF RICH CORE (start) ====================================================================================
// The SAME text in pb_hooks/webfaery-messages-rich-lib.js, pb_public/studio/studio-rich.js and the site's portal-rich.js
// (richmsg.test.mjs checks they match). Plain functions, no outside names, safe in PocketBase and in a browser.
var WF_RICH_CORE = (function () {
  var MAX_TEXT = 8000;      // characters of markup, after normalizing
  var MAX_RAW = 20000;      // anything longer than this is refused before it is even read
  var MAX_LINKS = 40;
  var MAX_HREF = 499;       // under 500
  var MAX_LABEL = 200;
  var ESC = '\\*_[]()-.';   // the characters a backslash makes plain
  var KIND = { '**': 'b', '*': 'i', '__': 'u' };
  var OL_RE = /^(\d{1,3})\. /;
  var HREF_RE = /^https:\/\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)+(?::\d{1,5})?(?:[\/?#][^\s<>"'`\\()\[\]{}|^]*)?$/;
  var ALLOWED = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'];
  var ch = String.fromCharCode;
  // zero width (200B to 200F), bidi (202A to 202E, 2066 to 2069), word joiners (2060 to 2065) and the BOM (FEFF)
  var INVISIBLE = new RegExp('[' + ch(0x200B) + '-' + ch(0x200F) + ch(0x202A) + '-' + ch(0x202E) + ch(0x2060) + '-' + ch(0x2069) + ch(0xFEFF) + ']', 'g');

  function hrefOk(h) { return typeof h === 'string' && h.length > 8 && h.length <= MAX_HREF && HREF_RE.test(h); }

  // control characters (newlines kept), zero width and bidi characters out; \r\n and \r become \n; tabs a space
  function clean(s) {
    return String(s).replace(/\r\n?/g, '\n').replace(/\t/g, ' ')
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '')
      .replace(INVISIBLE, '');
  }
  function trimEnd(s) { var e = s.length; while (e > 0 && (s.charCodeAt(e - 1) === 32 || s.charCodeAt(e - 1) === 160)) e--; return s.slice(0, e); }
  function blank(s) { for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c !== 32 && c !== 160) return false; } return true; }

  // [label](https://...) at s[i] === '[': { label, href, end } or null (then the [ is a plain letter)
  function matchLink(s, i) {
    var n = s.length, j = i + 1, label = '';
    while (j < n && label.length <= MAX_LABEL) {
      var c = s.charAt(j);
      if (c === '\\' && j + 1 < n && ESC.indexOf(s.charAt(j + 1)) >= 0) { label += s.charAt(j + 1); j += 2; continue; }
      if (c === ']') break;
      if (c === '[' || c === '\n') return null;
      label += c; j++;
    }
    if (s.charAt(j) !== ']' || s.charAt(j + 1) !== '(') return null;
    var k = j + 2, start = k;
    while (k < n && k - start <= MAX_HREF) {
      var d = s.charAt(k);
      if (d === ')' || d === '(' || d === ' ' || d === '\n' || d === '<' || d === '>') break;
      k++;
    }
    if (s.charAt(k) !== ')') return null;
    var href = s.slice(start, k);
    label = label.replace(/^\s+|\s+$/g, '');
    if (!label || label.length > MAX_LABEL || !hrefOk(href)) return null;
    return { label: label, href: href, end: k + 1 };
  }

  // One line's words into nodes: { k: 'text', v } | { k: 'b' | 'i' | 'u', c: [...] } | { k: 'a', href, v }.
  // A left to right stack (each marker open at most once, so never more than 3 deep): a marker closes the same one if
  // it is open (anything opened inside it and not closed becomes plain letters), else opens. Linear, no backtracking.
  function parseInline(s, stats) {
    var root = { m: '', c: [] }, stack = [root], buf = '', i = 0, n = s.length;
    function top() { return stack[stack.length - 1]; }
    function flush() { if (buf) { top().c.push({ k: 'text', v: buf }); buf = ''; } }
    function find(m) { for (var j = stack.length - 1; j > 0; j--) if (stack[j].m === m) return j; return -1; }
    function unwindTo(j) {
      while (stack.length - 1 > j) {
        var f = stack.pop(), p = top();
        p.c.push({ k: 'text', v: f.m });
        for (var q = 0; q < f.c.length; q++) p.c.push(f.c[q]);
      }
    }
    function close(j) { flush(); unwindTo(j); var f = stack.pop(); if (f.c.length) top().c.push({ k: KIND[f.m], c: f.c }); }
    function open(m) { flush(); stack.push({ m: m, c: [] }); }
    while (i < n) {
      var ch = s.charAt(i);
      if (ch === '\\' && i + 1 < n && ESC.indexOf(s.charAt(i + 1)) >= 0) { buf += s.charAt(i + 1); i += 2; continue; }
      if (ch === '[') {
        var L = matchLink(s, i);
        if (L) { flush(); top().c.push({ k: 'a', href: L.href, v: L.label }); stats.links++; i = L.end; continue; }
        buf += ch; i++; continue;
      }
      if (ch === '*' || ch === '_') {
        var r = i;
        while (r < n && s.charAt(r) === ch) r++;
        var len = r - i;
        i = r;
        if (ch === '_') {
          while (len >= 2) { var ju = find('__'); if (ju > 0) close(ju); else open('__'); len -= 2; }
          if (len) buf += '_';
          continue;
        }
        while (len > 0) {
          var t = top().m;
          if (t === '*') { close(stack.length - 1); len -= 1; continue; }
          if (t === '**' && len >= 2) { close(stack.length - 1); len -= 2; continue; }
          var jb = find('**'), ji = find('*');
          if (len >= 2 && jb < 0) { open('**'); len -= 2; continue; }
          if (ji < 0) { open('*'); len -= 1; continue; }
          if (len >= 2 && jb > 0) { close(jb); len -= 2; continue; }
          close(ji); len -= 1;
        }
        continue;
      }
      buf += ch; i++;
    }
    flush();
    unwindTo(0);
    return root.c;
  }

  // The whole markup: { blocks: [{ t: 'p', lines: [[nodes]] } | { t: 'ul' | 'ol', items: [[nodes]] }], links }
  function parse(text) {
    var stats = { links: 0 };
    var lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    var blocks = [], cur = null, m;
    for (var i = 0; i < lines.length; i++) {
      var line = trimEnd(lines[i]);
      if (blank(line)) { cur = null; continue; }
      if (line.slice(0, 2) === '- ') {
        if (!cur || cur.t !== 'ul') { cur = { t: 'ul', items: [] }; blocks.push(cur); }
        cur.items.push(parseInline(line.slice(2), stats));
      } else if ((m = OL_RE.exec(line))) {
        if (!cur || cur.t !== 'ol') { cur = { t: 'ol', items: [] }; blocks.push(cur); }
        cur.items.push(parseInline(line.slice(m[0].length), stats));
      } else {
        if (!cur || cur.t !== 'p') { cur = { t: 'p', lines: [] }; blocks.push(cur); }
        cur.lines.push(parseInline(line, stats));
      }
    }
    return { blocks: blocks, links: stats.links };
  }

  // ---- back to markup, the one canonical way
  function escText(s) { return String(s).replace(/[\\*_\[\]]/g, '\\$&'); }
  function serInline(nodes) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var x = nodes[i];
      if (x.k === 'text') out += escText(x.v);
      else if (x.k === 'a') { if (hrefOk(x.href) && x.v) out += '[' + escText(x.v) + '](' + x.href + ')'; else out += escText(x.v || ''); }
      else {
        var inner = serInline(x.c || []);
        if (!inner) continue;
        var mk = x.k === 'b' ? '**' : x.k === 'i' ? '*' : '__';
        out += mk + inner + mk;
      }
    }
    return out;
  }
  function lineStart(s) {
    if (s.slice(0, 2) === '- ') return '\\' + s;
    var m = OL_RE.exec(s);
    if (m) return m[1] + '\\' + s.slice(m[1].length);
    return s;
  }
  function serialize(tree) {
    var out = [];
    for (var i = 0; i < tree.blocks.length; i++) {
      var b = tree.blocks[i], rows = [], j, s;
      if (b.t === 'p') {
        for (j = 0; j < b.lines.length; j++) { s = trimEnd(lineStart(serInline(b.lines[j]))); if (!blank(s)) rows.push(s); }
      } else {
        var n = 0;
        for (j = 0; j < b.items.length; j++) {
          s = trimEnd(serInline(b.items[j]));
          if (blank(s)) continue;
          n++;
          rows.push((b.t === 'ul' ? '- ' : n + '. ') + s);
        }
      }
      if (rows.length) out.push(rows.join('\n'));
    }
    return out.join('\n\n');
  }

  // Anything in, the canonical markup out: { ok: true, text, links } or { ok: false, reason: type | long | links | empty }
  function normalize(raw) {
    if (typeof raw !== 'string') return { ok: false, reason: 'type' };
    if (raw.length > MAX_RAW) return { ok: false, reason: 'long' };
    var s = clean(raw);
    // anything shaped like an HTML tag or comment goes (the words between tags stay, as plain letters)
    s = s.replace(/<!--[\s\S]{0,2000}?-->/g, '').replace(/<\/?[A-Za-z!?][^<>\n]{0,500}>/g, '');
    var tree = parse(s);
    if (tree.links > MAX_LINKS) return { ok: false, reason: 'links' };
    var text = serialize(tree);
    if (text.length > MAX_TEXT) return { ok: false, reason: 'long' };
    if (!text) return { ok: false, reason: 'empty' };
    return { ok: true, text: text, links: tree.links };
  }

  // The renderer: markup into DOM nodes with doc.createElement / createTextNode only (never HTML from a string).
  // doc: a document (or anything with createElement, createTextNode, createDocumentFragment). Returns a fragment.
  function render(text, doc) {
    var tree = parse(typeof text === 'string' ? clean(text) : '');
    var frag = doc.createDocumentFragment();
    function inline(parent, nodes) {
      for (var i = 0; i < nodes.length; i++) {
        var x = nodes[i], el;
        if (x.k === 'text') { parent.appendChild(doc.createTextNode(x.v)); continue; }
        if (x.k === 'a') {
          if (!hrefOk(x.href)) { parent.appendChild(doc.createTextNode(String(x.v || ''))); continue; }
          el = doc.createElement('a');
          el.setAttribute('href', x.href);
          el.setAttribute('rel', 'noopener noreferrer nofollow');
          el.setAttribute('target', '_blank');
          el.textContent = String(x.v || '');
          parent.appendChild(el);
          continue;
        }
        el = doc.createElement(x.k === 'b' ? 'strong' : x.k === 'i' ? 'em' : 'u');
        inline(el, x.c || []);
        parent.appendChild(el);
      }
    }
    for (var i = 0; i < tree.blocks.length; i++) {
      var b = tree.blocks[i], el, j;
      if (b.t === 'p') {
        el = doc.createElement('p');
        for (j = 0; j < b.lines.length; j++) { if (j) el.appendChild(doc.createElement('br')); inline(el, b.lines[j]); }
      } else {
        el = doc.createElement(b.t);
        for (j = 0; j < b.items.length; j++) { var li = doc.createElement('li'); inline(li, b.items[j]); el.appendChild(li); }
      }
      frag.appendChild(el);
    }
    return frag;
  }

  // The words only (no markers), for counting and short previews.
  function plain(text) {
    var tree = parse(typeof text === 'string' ? clean(text) : '');
    function words(nodes) { var o = ''; for (var i = 0; i < nodes.length; i++) { var x = nodes[i]; o += x.k === 'text' || x.k === 'a' ? String(x.v || '') : words(x.c || []); } return o; }
    var out = [];
    for (var i = 0; i < tree.blocks.length; i++) {
      var b = tree.blocks[i];
      out.push((b.t === 'p' ? b.lines : b.items).map(words).join('\n'));
    }
    return out.join('\n\n');
  }

  return {
    MAX_TEXT: MAX_TEXT, MAX_LINKS: MAX_LINKS, MAX_HREF: MAX_HREF, MAX_LABEL: MAX_LABEL, ALLOWED: ALLOWED,
    hrefOk: hrefOk, clean: clean, parse: parse, serialize: serialize, normalize: normalize, render: render, plain: plain, escText: escText,
  };
})();
// ==== WF RICH CORE (end) ======================================================================================

var C = WF_RICH_CORE;
var LIMITS = { files: 5, each: 10 * 1024 * 1024, total: 25 * 1024 * 1024 };
var ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,text/plain,.txt,text/csv,.csv,' +
  '.docx,.xlsx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation';
var PICTURES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
var NBSP = new RegExp(String.fromCharCode(160), 'g'); // the browser's no-break spaces in the box are plain spaces
// sixty everyday emoji (single characters, no joined sequences: the server keeps them whole)
var EMOJI = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '😘', '😋', '😜', '🤗', '🤔', '🤩', '😎',
  '🥳', '😌', '😮', '😢', '😭', '😬', '🙄', '😴', '🤞', '👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '👀', '✨', '🌟', '⭐',
  '🔥', '🎉', '🎈', '🎁', '❤', '🧡', '💛', '💚', '💙', '💜', '🌸', '🌷', '🌻', '🌿', '🍀', '🍄', '🌙', '🌞', '☕', '📸'];

// the words people read; the Studio passes a few of its own (options.words)
var WORDS = {
  bold: 'Bold', italic: 'Italic', underline: 'Underline', bullets: 'Bulleted list', numbers: 'Numbered list',
  link: 'Add a link', emoji: 'Emoji', attach: 'Attach a photo or file', clear: 'Clear formatting',
  toolbar: 'Formatting',
  linkUrl: 'Link (it starts with https://)', linkLabel: 'Words to show (you can leave this empty)', linkAdd: 'Add link', linkCancel: 'Cancel',
  linkBad: 'That link needs to start with https:// and be a whole web address.',
  attached: 'Attached', remove: 'Take off', uploading: 'Uploading', picture: 'Picture',
  tooMany: 'Up to 5 files a message.',
  tooBig: 'Each file can be up to 10 MB.',
  tooMuch: 'Up to 25 MB together in one message.',
  type: 'That file isn’t one I can take here. Photos, PDFs, Word, Excel, PowerPoint, text and CSV files work.',
  full: 'Your file space for messages is full. Email me and I’ll make room.',
  waiting: 'There are a lot of files waiting. Send this message first, or take some off.',
  busy: 'Another upload is still going. Try again in a few seconds.',
  failed: 'That file didn’t upload. Try once more.',
  left: ' characters left',
  download: 'Download',
};

function el(doc, tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = String(text); return n; }
function sizeOf(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' bytes';
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
  return (Math.round(n / 1024 / 1024 * 10) / 10) + ' MB';
}
function readStore(key) { try { var o = JSON.parse(sessionStorage.getItem(key) || 'null'); return o && typeof o === 'object' ? o : null; } catch (_) { return null; } }
function writeStore(key, o) { try { if (o) sessionStorage.setItem(key, JSON.stringify(o)); else sessionStorage.removeItem(key); } catch (_) { /* a convenience only */ } }
function fileInfo(f) {
  if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !/^[a-z0-9]{15}$/.test(f.id)) return null;
  var type = typeof f.type === 'string' ? f.type.slice(0, 120) : '';
  return { id: f.id, name: String(f.name || 'file').slice(0, 120), size: Math.max(0, Number(f.size) || 0), type: type, image: PICTURES.indexOf(type) >= 0 };
}

// ---------------------------------------------------------------- the composer's box back into markup

// Walks the box (what the browser's own Bold, lists and links made: b, strong, i, em, u, span styles, div, p, br, ul,
// ol, li, a) into the same tree the core reads, then the core writes the markup. Anything else is read for its words only.
function toMarkup(box) {
  var blocks = [], para = null, list = null, kind = 'p', line = [];
  function has() { for (var i = 0; i < line.length; i++) if (line[i].a || /\S/.test(line[i].v)) return true; return false; }
  function endLine(force) {
    if (has()) {
      var nodes = runs(line);
      if (kind === 'p') { if (!para) { para = { t: 'p', lines: [] }; blocks.push(para); } para.lines.push(nodes); list = null; }
      else { if (!list || list.t !== kind) { list = { t: kind, items: [] }; blocks.push(list); } list.items.push(nodes); para = null; }
    } else if (force && kind === 'p') { para = null; list = null; }
    line = [];
  }
  function styleOf(n, f) {
    var tag = n.tagName.toUpperCase(), s = n.style || {};
    var w = String(s.fontWeight || '');
    return {
      b: f.b || tag === 'B' || tag === 'STRONG' || w === 'bold' || w === 'bolder' || (+w >= 600),
      i: f.i || tag === 'I' || tag === 'EM' || s.fontStyle === 'italic',
      u: f.u || tag === 'U' || String(s.textDecoration || s.textDecorationLine || '').indexOf('underline') >= 0,
    };
  }
  function walk(node, f) {
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { if (c.nodeValue) line.push({ v: c.nodeValue.replace(/\n/g, ' ').replace(NBSP, ' '), b: f.b, i: f.i, u: f.u }); continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.tagName.toUpperCase();
      if (tag === 'BR') { endLine(true); continue; }
      if (/^(SCRIPT|STYLE|IMG|SVG|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|TEMPLATE|INPUT|BUTTON|SELECT|TEXTAREA)$/.test(tag)) continue;
      if (tag === 'UL' || tag === 'OL') {
        endLine(false);
        var was = kind;
        for (var li = c.firstChild; li; li = li.nextSibling) {
          kind = tag === 'UL' ? 'ul' : 'ol';
          if (li.nodeType === 1 && li.tagName.toUpperCase() === 'LI') { walk(li, f); endLine(false); }
          else if (li.nodeType === 1) { walk(li, f); endLine(false); }
        }
        kind = was;
        continue;
      }
      if (/^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER|TABLE|TR)$/.test(tag)) { endLine(false); walk(c, f); endLine(false); continue; }
      if (tag === 'A') {
        var href = String(c.getAttribute('href') || '').trim();
        var label = String(c.textContent || '').replace(/\s+/g, ' ').trim();
        var sf = styleOf(c, f);
        if (C.hrefOk(href) && label) line.push({ a: href, v: label, b: sf.b, i: sf.i, u: sf.u }); else walk(c, sf);
        continue;
      }
      walk(c, styleOf(c, f));
    }
  }
  // runs of { v, a?, b, i, u } into nested nodes, bold outside italic outside underline, neighbours merged
  function runs(list0) {
    function group(items, key, kindName, inner) {
      var out = [], i = 0;
      while (i < items.length) {
        var on = !!items[i][key], j = i;
        while (j < items.length && !!items[j][key] === on) j++;
        var part = items.slice(i, j);
        if (on) out.push({ k: kindName, c: inner(part) }); else out = out.concat(inner(part));
        i = j;
      }
      return out;
    }
    function leaves(items) {
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var r = items[i];
        if (r.a) out.push({ k: 'a', href: r.a, v: r.v });
        else if (out.length && out[out.length - 1].k === 'text') out[out.length - 1].v += r.v;
        else out.push({ k: 'text', v: r.v });
      }
      return out;
    }
    return group(list0, 'b', 'b', function (p) { return group(p, 'i', 'i', function (q) { return group(q, 'u', 'u', leaves); }); });
  }
  walk(box, {});
  endLine(false);
  return C.serialize({ blocks: blocks });
}

// ---------------------------------------------------------------- a message's attachments

// files: [{ id, name, size, type, image }]; o: { fetchFile(id, inline) -> Promise<Blob>, words, onError(err) }
function fileList(files, o) {
  var doc = o.document || document, W = Object.assign({}, WORDS, o.words || {});
  var list = el(doc, 'ul', 'wfr-att');
  list.setAttribute('aria-label', W.attached);
  (files || []).map(fileInfo).filter(Boolean).forEach(function (f) {
    var li = el(doc, 'li', f.image ? 'wfr-att-pic' : 'wfr-att-file');
    var b = el(doc, 'button', f.image ? 'wfr-thumb' : 'wfr-file');
    b.type = 'button';
    b.setAttribute('data-read', '');
    b.setAttribute('aria-label', W.download + ' ' + f.name + ', ' + sizeOf(f.size));
    if (f.image) {
      var img = el(doc, 'img');
      img.alt = f.name;
      img.decoding = 'async';
      b.append(img);
      o.fetchFile(f.id, true).then(function (blob) { img.src = URL.createObjectURL(blob); }).catch(function () { b.append(el(doc, 'span', 'wfr-file-name', f.name)); });
    } else {
      b.append(el(doc, 'span', 'wfr-file-name', f.name), el(doc, 'span', 'wfr-file-size', sizeOf(f.size)));
    }
    b.addEventListener('click', function () { download(f, o, b); });
    li.append(b);
    list.append(li);
  });
  return list;
}
function download(f, o, btn) {
  if (btn.getAttribute('aria-busy') === 'true') return;
  btn.setAttribute('aria-busy', 'true');
  o.fetchFile(f.id, false).then(function (blob) {
    var doc = btn.ownerDocument;
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = f.name;
    a.rel = 'noopener';
    doc.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
  }).catch(function (err) { if (o.onError) o.onError(err); }).then(function () { btn.removeAttribute('aria-busy'); });
}

// ---------------------------------------------------------------- the composer

// o: { host, id, label, store, readOnly, words, upload(files, onProgress) -> Promise<{ files }>, unattach(id) -> Promise,
//      fetchFile(id, inline) -> Promise<Blob>, onSubmit(), onChange(), errorWords(err) -> string or '' }
// Returns { box, value() -> { body, files: [ids] }, clear(), focus(), isEmpty(), busy() (files still uploading),
//           setReadOnly(on), length() }
function composer(o) {
  var host = o.host, doc = host.ownerDocument, W = Object.assign({}, WORDS, o.words || {});
  var pfx = o.id || 'wfr';
  var files = [];          // { id?, name, size, type, image, url?, state: 'up' | 'ok' }
  var saved = null;        // the last selection inside the box
  var saveTimer = 0;
  var readOnly = !!o.readOnly;

  var wrap = el(doc, 'div', 'wfr');
  var label = el(doc, 'p', 'wfr-label', o.label || '');
  label.id = pfx + '-label';
  var bar = el(doc, 'div', 'wfr-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', W.toolbar);
  var box = el(doc, 'div', 'wfr-box');
  box.id = pfx + '-box';
  box.setAttribute('role', 'textbox');
  box.setAttribute('aria-multiline', 'true');
  box.setAttribute('aria-labelledby', label.id);
  box.setAttribute('spellcheck', 'true');
  box.contentEditable = readOnly ? 'false' : 'true';
  bar.setAttribute('aria-controls', box.id);

  function tool(name, glyph, cmd, cls) {
    var b = el(doc, 'button', 'wfr-tool' + (cls ? ' ' + cls : ''), glyph);
    b.type = 'button';
    b.setAttribute('aria-label', W[name]);
    b.title = W[name];
    b.dataset.tool = name;
    if (cmd) b.setAttribute('aria-pressed', 'false');
    // a press keeps the box's selection (the button doesn't take the focus)
    b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    bar.append(b);
    return b;
  }
  var tB = tool('bold', 'B', 'bold', 'wfr-b');
  var tI = tool('italic', 'I', 'italic', 'wfr-i');
  var tU = tool('underline', 'U', 'underline', 'wfr-u');
  var tUl = tool('bullets', '•', 'insertUnorderedList');
  var tOl = tool('numbers', '1.', 'insertOrderedList');
  var tLink = tool('link', 'Link', null, 'wfr-word');
  var tEmoji = tool('emoji', '☺', null);
  var tAttach = tool('attach', 'Attach', null, 'wfr-word');
  var tClear = tool('clear', 'Clear', null, 'wfr-word');
  tLink.setAttribute('aria-expanded', 'false');
  tEmoji.setAttribute('aria-expanded', 'false');

  // the link field: its own small row (not a pop-up box)
  var linkRow = el(doc, 'div', 'wfr-linkrow');
  linkRow.hidden = true;
  var urlLab = el(doc, 'label', 'wfr-small', W.linkUrl);
  var url = el(doc, 'input', 'wfr-url');
  url.type = 'url'; url.id = pfx + '-url'; url.inputMode = 'url'; url.autocomplete = 'off'; url.spellcheck = false; url.placeholder = 'https://';
  urlLab.htmlFor = url.id;
  var textLab = el(doc, 'label', 'wfr-small', W.linkLabel);
  var text = el(doc, 'input', 'wfr-linktext');
  text.type = 'text'; text.id = pfx + '-linktext'; text.maxLength = 200; text.autocomplete = 'off';
  textLab.htmlFor = text.id;
  var linkAdd = el(doc, 'button', 'wfr-btn', W.linkAdd); linkAdd.type = 'button';
  var linkCancel = el(doc, 'button', 'wfr-btn wfr-quiet', W.linkCancel); linkCancel.type = 'button';
  var linkErr = el(doc, 'p', 'wfr-err'); linkErr.hidden = true; linkErr.id = pfx + '-linkerr';
  url.setAttribute('aria-describedby', linkErr.id);
  var linkActs = el(doc, 'div', 'wfr-linkacts');
  linkActs.append(linkAdd, linkCancel);
  linkRow.append(urlLab, url, textLab, text, linkErr, linkActs);

  // the emoji grid
  var emo = el(doc, 'div', 'wfr-emoji');
  emo.hidden = true;
  emo.setAttribute('role', 'group');
  emo.setAttribute('aria-label', W.emoji);
  EMOJI.forEach(function (e) {
    var b = el(doc, 'button', 'wfr-emo', e);
    b.type = 'button';
    b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    b.addEventListener('click', function () { insertText(e); });
    emo.append(b);
  });

  var picker = el(doc, 'input', 'wfr-picker');
  picker.type = 'file'; picker.multiple = true; picker.accept = ACCEPT; picker.hidden = true; picker.tabIndex = -1;
  picker.setAttribute('aria-hidden', 'true');
  var chips = el(doc, 'ul', 'wfr-chips');
  chips.setAttribute('aria-label', W.attached);
  chips.hidden = true;
  var say = el(doc, 'p', 'wfr-say');
  say.setAttribute('aria-live', 'polite');
  say.id = pfx + '-say';
  box.setAttribute('aria-describedby', say.id);

  wrap.append(label, bar, linkRow, emo, box, chips, picker, say);
  host.append(wrap);

  // ---- selection and commands
  function inBox(node) { return !!node && (node === box || box.contains(node)); }
  function remember() {
    var s = doc.getSelection && doc.getSelection();
    if (s && s.rangeCount && inBox(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
  }
  function restore() {
    box.focus();
    var s = doc.getSelection && doc.getSelection();
    if (!s) return;
    if (saved && inBox(saved.startContainer)) { s.removeAllRanges(); s.addRange(saved); }
    else if (!s.rangeCount || !inBox(s.anchorNode)) { var r = doc.createRange(); r.selectNodeContents(box); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
  }
  function exec(cmd, val) {
    if (readOnly) return;
    restore();
    try { doc.execCommand(cmd, false, val === undefined ? null : val); } catch (_) { /* an old browser */ }
    remember();
    changed();
  }
  function insertText(t) {
    if (readOnly) return;
    restore();
    var ok = false;
    try { ok = doc.execCommand('insertText', false, t); } catch (_) { ok = false; }
    if (!ok) {
      var s = doc.getSelection(), r = s.getRangeAt(0);
      r.deleteContents();
      var n = doc.createTextNode(t);
      r.insertNode(n);
      r.setStartAfter(n); r.collapse(true);
      s.removeAllRanges(); s.addRange(r);
    }
    remember();
    changed();
  }
  function pressed() {
    [[tB, 'bold'], [tI, 'italic'], [tU, 'underline'], [tUl, 'insertUnorderedList'], [tOl, 'insertOrderedList']].forEach(function (p) {
      var on = false;
      try { on = inBox((doc.getSelection() || {}).anchorNode) && doc.queryCommandState(p[1]); } catch (_) { on = false; }
      p[0].setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  tB.addEventListener('click', function () { exec('bold'); pressed(); });
  tI.addEventListener('click', function () { exec('italic'); pressed(); });
  tU.addEventListener('click', function () { exec('underline'); pressed(); });
  tUl.addEventListener('click', function () { exec('insertUnorderedList'); pressed(); });
  tOl.addEventListener('click', function () { exec('insertOrderedList'); pressed(); });
  tClear.addEventListener('click', function () {
    exec('removeFormat');
    exec('unlink');
    try { if (doc.queryCommandState('insertUnorderedList')) exec('insertUnorderedList'); if (doc.queryCommandState('insertOrderedList')) exec('insertOrderedList'); } catch (_) {}
    pressed();
  });
  tAttach.addEventListener('click', function () { if (!readOnly) picker.click(); });
  picker.addEventListener('change', function () { var l = Array.prototype.slice.call(picker.files || []); picker.value = ''; addFiles(l); });

  // ---- the link row
  function openLink() {
    if (readOnly) return;
    remember();
    closeEmoji();
    var s = doc.getSelection && doc.getSelection();
    var a = s && s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode) : null;
    a = a && a.closest ? a.closest('a') : null;
    url.value = a && inBox(a) ? a.getAttribute('href') || '' : '';
    text.value = '';
    textLab.hidden = text.hidden = !!(saved && !saved.collapsed);
    linkErr.hidden = true;
    url.removeAttribute('aria-invalid');
    linkRow.hidden = false;
    tLink.setAttribute('aria-expanded', 'true');
    url.focus();
  }
  function closeLink(back) {
    linkRow.hidden = true;
    tLink.setAttribute('aria-expanded', 'false');
    if (back) restore();
  }
  function addLink() {
    var v = String(url.value || '').trim();
    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^\/\//.test(v) && /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([\/?#].*)?$/.test(v)) v = 'https://' + v;
    if (!C.hrefOk(v)) { linkErr.textContent = W.linkBad; linkErr.hidden = false; url.setAttribute('aria-invalid', 'true'); url.focus(); return; }
    var words = String(text.value || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    closeLink(true);
    var s = doc.getSelection();
    var r = s && s.rangeCount ? s.getRangeAt(0) : null;
    if (r && !r.collapsed && !words) { exec('createLink', v); return; }
    var a = doc.createElement('a');
    a.setAttribute('href', v);
    a.textContent = words || v;
    if (r) { r.deleteContents(); r.insertNode(a); r.setStartAfter(a); r.collapse(true); s.removeAllRanges(); s.addRange(r); }
    else box.append(a);
    var sp = doc.createTextNode(' ');
    a.after(sp);
    if (r) { r.setStartAfter(sp); r.collapse(true); s.removeAllRanges(); s.addRange(r); }
    remember();
    changed();
  }
  tLink.addEventListener('click', function () { if (linkRow.hidden) openLink(); else closeLink(true); });
  linkAdd.addEventListener('click', addLink);
  linkCancel.addEventListener('click', function () { closeLink(true); });
  [url, text].forEach(function (inp) {
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); addLink(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); closeLink(true); }
    });
  });

  // ---- emoji
  function closeEmoji() { emo.hidden = true; tEmoji.setAttribute('aria-expanded', 'false'); }
  tEmoji.addEventListener('click', function () {
    if (readOnly) return;
    if (emo.hidden) { remember(); closeLink(false); emo.hidden = false; tEmoji.setAttribute('aria-expanded', 'true'); }
    else closeEmoji();
  });
  emo.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); closeEmoji(); restore(); } });

  // ---- the box
  box.addEventListener('keydown', function (ev) {
    var mod = ev.metaKey || ev.ctrlKey;
    if (!mod || ev.altKey) return;
    var k = String(ev.key || '').toLowerCase();
    if (k === 'b') { ev.preventDefault(); exec('bold'); pressed(); }
    else if (k === 'i') { ev.preventDefault(); exec('italic'); pressed(); }
    else if (k === 'u') { ev.preventDefault(); exec('underline'); pressed(); }
    else if (k === 'k') { ev.preventDefault(); openLink(); }
    else if (k === 'enter' && o.onSubmit) { ev.preventDefault(); o.onSubmit(); }
  });
  // pasted or dropped: files are attached; anything else comes in as plain words (never someone else's HTML)
  box.addEventListener('paste', function (ev) {
    ev.preventDefault();
    if (readOnly) return;
    var dt = ev.clipboardData;
    var fl = dt && dt.files ? Array.prototype.slice.call(dt.files) : [];
    if (fl.length) { addFiles(fl); return; }
    var t = dt ? dt.getData('text/plain') : '';
    if (t) insertText(t);
  });
  box.addEventListener('drop', function (ev) {
    ev.preventDefault();
    if (readOnly) return;
    var dt = ev.dataTransfer;
    var fl = dt && dt.files ? Array.prototype.slice.call(dt.files) : [];
    if (fl.length) { addFiles(fl); return; }
    var t = dt ? dt.getData('text/plain') : '';
    if (t) insertText(t);
  });
  box.addEventListener('dragover', function (ev) { ev.preventDefault(); });
  box.addEventListener('input', function () { tidy(); changed(); });
  doc.addEventListener('selectionchange', function () {
    var s = doc.getSelection && doc.getSelection();
    if (s && inBox(s.anchorNode)) { remember(); pressed(); }
  });

  // belt and braces: nothing but words, line breaks, the formatting and links stays in the box
  function tidy() {
    var bad = box.querySelectorAll('img, svg, video, audio, iframe, object, embed, script, style, link, meta, form, input, button, select, textarea, template');
    for (var i = 0; i < bad.length; i++) bad[i].remove();
    var all = box.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var n = all[j];
      for (var k = n.attributes.length - 1; k >= 0; k--) {
        var an = n.attributes[k].name.toLowerCase();
        if (an === 'href' && n.tagName.toUpperCase() === 'A') { if (!C.hrefOk(n.getAttribute('href'))) n.removeAttribute('href'); continue; }
        if (an !== 'style') n.removeAttribute(an);
      }
    }
  }

  // ---- what's in it, kept in this tab
  function value() {
    var ids = [];
    files.forEach(function (f) { if (f.state === 'ok' && f.id) ids.push(f.id); });
    return { body: toMarkup(box), files: ids };
  }
  function length() { return toMarkup(box).length; }
  function changed() {
    var n = length();
    if (n > C.MAX_TEXT - 400) say.textContent = Math.max(0, C.MAX_TEXT - n) + W.left;
    else if (say.dataset.count) say.textContent = '';
    say.dataset.count = n > C.MAX_TEXT - 400 ? '1' : '';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(keep, 250);
    if (o.onChange) { try { o.onChange(); } catch (_) {} }
  }
  function keep() {
    if (!o.store) return;
    var v = value();
    var kept = files.filter(function (f) { return f.state === 'ok' && f.id; }).map(function (f) { return { id: f.id, name: f.name, size: f.size, type: f.type }; });
    writeStore(o.store, v.body || kept.length ? { v: 1, body: v.body.slice(0, C.MAX_TEXT + 400), files: kept } : null);
  }
  function restoreDraft() {
    var d = o.store ? readStore(o.store) : null;
    if (!d) return;
    if (typeof d.body === 'string' && d.body) box.append(C.render(d.body.slice(0, C.MAX_TEXT + 400), doc));
    (Array.isArray(d.files) ? d.files : []).slice(0, LIMITS.files).map(fileInfo).filter(Boolean).forEach(function (f) {
      f.state = 'ok';
      files.push(f);
      if (f.image && o.fetchFile) o.fetchFile(f.id, true).then(function (blob) { f.url = URL.createObjectURL(blob); drawChips(); }).catch(function () {});
    });
    drawChips();
  }

  // ---- attachments
  function sayErr(t) { say.textContent = t; say.dataset.count = ''; }
  function addFiles(list) {
    if (readOnly || !list.length) return;
    if (!o.upload) return;
    if (files.length + list.length > LIMITS.files) { sayErr(W.tooMany); return; }
    var total = 0;
    files.forEach(function (f) { total += f.size || 0; });
    for (var i = 0; i < list.length; i++) {
      if (!(list[i].size > 0) || list[i].size > LIMITS.each) { sayErr(W.tooBig); return; }
      total += list[i].size;
    }
    if (total > LIMITS.total) { sayErr(W.tooMuch); return; }
    var mine = list.map(function (f) {
      var type = String(f.type || '').toLowerCase();
      var x = { name: String(f.name || 'file').slice(0, 120), size: f.size, type: type, image: PICTURES.indexOf(type) >= 0, state: 'up', pct: 0 };
      if (x.image) { try { x.url = URL.createObjectURL(f); } catch (_) { x.url = ''; } }
      files.push(x);
      return x;
    });
    say.textContent = '';
    drawChips();
    o.upload(list, function (p) { mine.forEach(function (x) { x.pct = Math.round(p * 100); }); drawChips(); }).then(function (r) {
      var got = r && Array.isArray(r.files) ? r.files : [];
      mine.forEach(function (x, i) {
        var g = fileInfo(got[i]);
        if (!g) { files = files.filter(function (y) { return y !== x; }); return; }
        x.id = g.id; x.name = g.name; x.size = g.size; x.type = g.type; x.image = g.image; x.state = 'ok';
        if (!x.image && x.url) { URL.revokeObjectURL(x.url); x.url = ''; }
      });
      drawChips();
      keep();
      if (o.onChange) { try { o.onChange(); } catch (_) {} }
    }).catch(function (err) {
      mine.forEach(function (x) { if (x.url) URL.revokeObjectURL(x.url); });
      files = files.filter(function (y) { return mine.indexOf(y) < 0; });
      drawChips();
      sayErr((o.errorWords && o.errorWords(err)) || uploadWords(err));
    });
  }
  function uploadWords(err) {
    var r = err && err.reason;
    if (r === 'type') return W.type;
    if (r === 'size') return W.tooBig;
    if (r === 'total') return W.tooMuch;
    if (r === 'count') return W.tooMany;
    if (r === 'full') return W.full;
    if (r === 'too_many') return W.waiting;
    if (err && (err.code === 'busy' || err.status === 429)) return W.busy;
    return W.failed;
  }
  function drawChips() {
    chips.textContent = '';
    files.forEach(function (f) {
      var li = el(doc, 'li', 'wfr-chip' + (f.state === 'up' ? ' is-up' : ''));
      if (f.image && f.url) { var img = el(doc, 'img', 'wfr-chip-pic'); img.alt = ''; img.src = f.url; li.append(img); }
      else li.append(el(doc, 'span', 'wfr-chip-doc', 'File'));
      var words = el(doc, 'span', 'wfr-chip-words');
      words.append(el(doc, 'span', 'wfr-chip-name', f.name), el(doc, 'span', 'wfr-chip-size', f.state === 'up' ? W.uploading + ' ' + (f.pct || 0) + '%' : sizeOf(f.size)));
      li.append(words);
      if (f.state === 'ok') {
        var x = el(doc, 'button', 'wfr-chip-x', '×');
        x.type = 'button';
        x.setAttribute('aria-label', W.remove + ' ' + f.name);
        x.addEventListener('click', function () {
          files = files.filter(function (y) { return y !== f; });
          if (f.url) URL.revokeObjectURL(f.url);
          if (f.id && o.unattach) o.unattach(f.id).catch(function () {});
          drawChips();
          keep();
          if (o.onChange) { try { o.onChange(); } catch (_) {} }
          box.focus();
        });
        if (readOnly) x.disabled = true;
        li.append(x);
      }
      chips.append(li);
    });
    chips.hidden = !files.length;
  }

  function setReadOnly(on) {
    readOnly = !!on;
    box.contentEditable = readOnly ? 'false' : 'true';
    box.setAttribute('aria-readonly', readOnly ? 'true' : 'false');
    bar.querySelectorAll('button').forEach(function (b) { b.disabled = readOnly; });
    if (readOnly) { closeLink(false); closeEmoji(); }
  }

  restoreDraft();
  setReadOnly(readOnly);
  if (!o.upload) tAttach.hidden = true;

  return {
    box: box, el: wrap,
    value: value,
    length: length,
    isEmpty: function () { var v = value(); return !v.body && !v.files.length; },
    busy: function () { return files.some(function (f) { return f.state === 'up'; }); },
    clear: function () {
      box.textContent = '';
      files.forEach(function (f) { if (f.url) URL.revokeObjectURL(f.url); });
      files = [];
      drawChips();
      say.textContent = '';
      clearTimeout(saveTimer);
      if (o.store) writeStore(o.store, null);
    },
    focus: function () { restore(); },
    setReadOnly: setReadOnly,
    say: sayErr,
  };
}

var api = {
  core: C, render: C.render, normalize: C.normalize, plain: C.plain, hrefOk: C.hrefOk, ALLOWED: C.ALLOWED,
  toMarkup: toMarkup, composer: composer, fileList: fileList, sizeOf: sizeOf, EMOJI: EMOJI, WORDS: WORDS, LIMITS: LIMITS,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (root) root.WFRich = api;
})(typeof window !== 'undefined' ? window : null);
