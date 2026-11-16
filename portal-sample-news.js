/* =====================================================================================================
   Sample answers for the NEWSLETTER tool in portal.html?demo=1 (Nov 16 2026): Rosa Linden's list for Fern & Clay Pottery.
   Everything is in this tab's memory (S.news); "send" and "test" send nothing anywhere.
   Routes answered (family 'news/owner/', the same ones portal.js calls through newsCall; hub API.md section 18):
     overview  -> { news: { list{name,business,from,reply_to,postal_address,ready,why,address_missing}, counts{on,waiting,left,unreachable},
                  limits{sends_left,sends_7d,max_send}, working[row], sent[row] } }   row = { id,subject,status,at,total,sent,failed,skipped,by,wait,tested }
     issue     -> { issue: row + preheader + body }        save -> { issue }        remove -> { ok }        stop -> { issue }
     preview   -> { preview: { from,subject,preheader,business,accent,blocks[{t:'h'|'p'|'ul',runs|lines|items}],footer{reason,address,leave} } }
     test      -> { ok, to, issue }        send {id,at?} -> { issue, people }
     people    -> { which,total,page,pages,people:[{email,since,why}] }        export -> CSV blob        settings {reply_to,postal_address} -> { ok }
   If portal.js starts reading more fields (stats, photos, frames, checks), add them to the rows or the preview below.
   ===================================================================================================== */
(function () {
  'use strict';
  var W = window.WFSample;
  if (!W) return;
  var BIZ = 'Fern & Clay Pottery', FROM = BIZ + ' <news@fernandclay.example.test>', OWNER = 'rosa@fernandclay.example.test';
  var ADDR = 'Fern & Clay Pottery, 214 Alder Lane, Eugene, OR 97401';

  // ---- the list: 60 made-up people, joined over the last year
  var first = ['Maya', 'Jordan', 'Priya', 'Tomas', 'Nadia', 'Ellis', 'Hana', 'Marcus', 'Ines', 'Callum', 'Sana', 'Dev', 'Wren', 'Leila', 'Owen', 'Fiona', 'Idris', 'June', 'Bao', 'Rhea'];
  var last = ['Okafor', 'Lindqvist', 'Moreau', 'Haddad', 'Castillo', 'Brennan', 'Nakamura', 'Bell', 'Ferreira', 'Sato', 'Whitaker', 'Duarte'];
  var people = [];
  for (var i = 0; i < 60; i++) {
    var st = i < 48 ? 'on' : i < 52 ? 'waiting' : i < 57 ? 'left' : 'unreachable';
    people.push({ email: (first[i % 20] + '.' + last[(i * 5) % 12]).toLowerCase() + (i > 19 ? i : '') + '@example.test', since: new Date(W.day(-6 - i * 6)).toISOString(),
      st: st, why: st === 'unreachable' ? (i === 57 ? 'complaint' : 'bounce') : '' });
  }

  var BODY1 = '# New this season\n\nHello friends,\n\nThe kiln has been busy. This month there are new speckled mugs, a run of fern-print serving bowls, and a few oddly shaped vases that I could not leave alone.\n\n- Saturday, Nov 21: studio sale, 10 to 4\n- New mugs go up in the shop Friday evening\n- Seconds table at the studio all month\n\nThank you for being here. Reply any time; I read every note.\n\nRosa';
  var BODY2 = '# Winter studio hours\n\nThe studio is open Thursday through Saturday through the cold months.\n\nBring a friend, pick a mug, stay for tea.';
  var BODY3 = '# Holiday orders\n\nLast day to order for holiday delivery is Dec 12. Gift wrapping is free, and so is a handwritten note.';
  var BODY4 = '# A peek at the glaze shelf\n\nI have been testing a new celadon. Here is what came out of the kiln this week, plus an early look at the spring collection.';

  function row(id, subject, status, at, extra) {
    return Object.assign({ id: id, subject: subject, preheader: '', body: '', status: status, at: new Date(W.day(at)).toISOString(), total: 0, sent: 0, failed: 0, skipped: 0, by: 'owner', wait: '', tested: '' }, extra || {});
  }
  W.S.news = {
    list: { name: BIZ + ' news', business: BIZ, from: FROM, reply_to: '', postal_address: ADDR, ready: true, why: '', address_missing: false },
    issues: [
      row('nl_d1', 'Winter studio hours', 'draft', -2, { preheader: 'Open Thursday to Saturday', body: BODY2 }),
      row('nl_s1', 'New this season', 'sent', -9, { preheader: 'Speckled mugs and a studio sale', body: BODY1, total: 46, sent: 45, failed: 1 }),
      row('nl_s2', 'Holiday orders open', 'sent', -23, { preheader: 'Gift wrap is free', body: BODY3, total: 44, sent: 44 }),
      row('nl_s3', 'A peek at the glaze shelf', 'sent', -41, { preheader: 'Testing a new celadon', body: BODY4, total: 41, sent: 40, failed: 1 })
    ],
    seq: 10
  };
  function N() { return W.S.news; }
  function find(id) { var r = N().issues.filter(function (x) { return x.id === id; })[0]; return r || null; }
  function counts() { var c = { on: 0, waiting: 0, left: 0, unreachable: 0 }; people.forEach(function (p) { c[p.st]++; }); return c; }
  function out(r) { var o = W.clone(r); return o; }
  function slim(r) { var o = out(r); delete o.preheader; delete o.body; return o; }
  function lim() {
    var n = N().issues.filter(function (r) { return r.status !== 'draft' && Date.parse(r.at) > Date.now() - 7 * 864e5; }).length;
    return { sends_left: Math.max(0, 4 - n), sends_7d: 4, max_send: 2500 };
  }

  W.on('news/owner/overview', function () {
    var n = N(), l = n.list;
    var work = n.issues.filter(function (r) { return ['draft', 'scheduled', 'sending'].indexOf(r.status) >= 0; });
    var sent = n.issues.filter(function (r) { return r.status === 'sent' || r.status === 'stopped'; });
    function byAt(a, b) { return Date.parse(b.at) - Date.parse(a.at); }
    return { news: { list: W.clone(l), counts: counts(), limits: lim(), working: work.sort(byAt).map(slim), sent: sent.sort(byAt).map(slim) } };
  });
  W.on('news/owner/issue', function (b) { var r = find(b.id); return r ? { issue: out(r) } : W.fail(404, 'not_found'); });
  W.on('news/owner/save', function (b) {
    var n = N(), r = b.id ? find(b.id) : null;
    if (b.id && !r) return W.fail(404, 'not_found');
    if (r && r.status !== 'draft' && r.status !== 'scheduled') return W.fail(409, 'input');
    if (!r) { r = row('nl_' + (++n.seq), '', 'draft', 0); n.issues.push(r); }
    r.subject = String(b.subject || ''); r.preheader = String(b.preheader || ''); r.body = String(b.body || ''); r.at = new Date().toISOString();
    return { issue: slim(r) };
  });
  W.on('news/owner/remove', function (b) { var n = N(); n.issues = n.issues.filter(function (r) { return r.id !== b.id; }); return { ok: true }; });
  W.on('news/owner/stop', function (b) {
    var r = find(b.id);
    if (!r) return W.fail(404, 'not_found');
    if (r.status === 'scheduled') r.status = 'draft'; else if (r.status === 'sending') r.status = 'stopped'; else return { __status: 409, body: { error: 'input', why: 'not_sending' } };
    return { issue: slim(r) };
  });

  // the preview: plain text in, the server's blocks out ('# ' heading, '- ' bullets, blank line between paragraphs)
  function blocks(body) {
    var out = [];
    String(body || '').split(/\n\s*\n/).forEach(function (chunk) {
      var lines = chunk.split('\n').filter(function (s) { return s.trim(); });
      if (!lines.length) return;
      if (/^#\s/.test(lines[0])) { out.push({ t: 'h', runs: [{ x: lines[0].replace(/^#\s+/, '') }] }); lines = lines.slice(1); if (!lines.length) return; }
      if (lines.every(function (s) { return /^-\s/.test(s); })) out.push({ t: 'ul', items: lines.map(function (s) { return [{ x: s.replace(/^-\s+/, '') }]; }) });
      else out.push({ t: 'p', lines: lines.map(function (s) { return [{ x: s }]; }) });
    });
    return out;
  }
  W.on('news/owner/preview', function (b) {
    return { preview: { from: FROM, subject: String(b.subject || ''), preheader: String(b.preheader || ''), business: BIZ, accent: '#9a4f2e', blocks: blocks(b.body),
      footer: { reason: 'You get this because you signed up on the ' + BIZ + ' website.', address: ADDR, leave: 'Leave the list' } } };
  });
  W.on('news/owner/test', function (b) {
    var r = find(b.id);
    if (!r) return W.fail(404, 'not_found');
    if (!r.subject.trim()) return { __status: 400, body: { error: 'input', field: 'subject', why: 'empty' } };
    if (!r.body.trim()) return { __status: 400, body: { error: 'input', field: 'body', why: 'empty' } };
    r.tested = new Date().toISOString();   // pretend only: nothing is sent
    return { ok: true, to: OWNER, issue: slim(r) };
  });
  W.on('news/owner/send', function (b) {
    var r = find(b.id), c = counts();
    if (!r) return W.fail(404, 'not_found');
    if (r.status !== 'draft' && r.status !== 'scheduled') return { __status: 409, body: { error: 'input', why: 'not_draft' } };
    if (!c.on) return { __status: 409, body: { error: 'input', why: 'no_people' } };
    if (!r.subject.trim()) return { __status: 400, body: { error: 'input', field: 'subject', why: 'empty' } };
    if (!r.body.trim()) return { __status: 400, body: { error: 'input', field: 'body', why: 'empty' } };
    if (b.at) { r.status = 'scheduled'; r.at = new Date(b.at).toISOString(); r.total = c.on; }
    else { r.status = 'sent'; r.at = new Date().toISOString(); r.total = c.on; r.sent = c.on; }   // pretend: marked sent at once
    return { issue: slim(r), people: c.on };
  });
  W.on('news/owner/people', function (b) {
    var which = ['on', 'waiting', 'left', 'unreachable'].indexOf(b.which) >= 0 ? b.which : 'on';
    var list = people.filter(function (p) { return p.st === which; }).sort(function (a, z) { return Date.parse(z.since) - Date.parse(a.since); });
    var pages = Math.max(1, Math.ceil(list.length / 100)), page = Math.min(pages, Math.max(1, +b.page || 1));
    return { which: which, total: list.length, page: page, pages: pages,
      people: list.slice((page - 1) * 100, page * 100).map(function (p) { return { email: p.email, since: p.since, why: p.why }; }) };
  });
  W.on('news/owner/export', function () {
    var rows = ['email,confirmed_at,source_page'];
    people.filter(function (p) { return p.st === 'on'; }).forEach(function (p) { rows.push(p.email + ',' + p.since + ',/'); });
    return { __blob: new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), type: 'text/csv' };
  });
  W.on('news/owner/settings', function (b) {
    var l = N().list;
    if (b.reply_to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.reply_to)) return { __status: 400, body: { error: 'input', field: 'reply_to', why: 'email' } };
    if (b.postal_address && !/\d/.test(b.postal_address)) return { __status: 400, body: { error: 'input', field: 'postal_address', why: 'address' } };
    l.reply_to = String(b.reply_to || ''); if (b.postal_address != null) l.postal_address = String(b.postal_address);
    l.address_missing = !l.postal_address; l.ready = !l.address_missing; l.why = l.ready ? '' : 'address';
    return { ok: true };
  });
})();
