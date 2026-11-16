/* =====================================================================================================
   Sample answers for the SHOP tools of portal.html?demo=1 (Nov 16 2026): orders, packed and shipped, packing slips,
   discount codes, free shipping, the Products card and gift certificates, for the made-up Fern & Clay Pottery
   (owner Rosa Linden). Shapes follow hub API.md sections 6, 12, 14 and 16. Everything lives in this tab's memory:
   ticking Packed, Shipped, a code on or off, a saved product, a redeemed gift all change what the next answer says,
   and a reload starts fresh. Every address is made up and every email is @example.test.
   Needs portal-sample.js first (window.WFSample).
   ===================================================================================================== */
(function () {
  'use strict';
  var W = window.WFSample;
  if (!W) return;
  var S = W.S;

  var seq = 0;
  function mkId(prefix) { // 15 lowercase letters and numbers, like the server's ids
    seq++;
    var s = (prefix + 'sample' + seq + 'x0123456789').toLowerCase().replace(/[^a-z0-9]/g, '');
    return s.slice(0, 15);
  }
  function money(c) { return '$' + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+\.)/g, ','); }
  function fail(status, error, extra) { var b = { error: error }; for (var k in extra || {}) b[k] = extra[k]; return { __status: status, body: b }; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function monthDay(iso) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var p = String(iso).split('-');
    return m[(+p[1] || 1) - 1] + ' ' + (+p[2] || 1);
  }

  /* ---------------------------------------------------------------- product photos (little drawings, in memory) */
  var TONES = [['#e9dccb', '#a65f3a'], ['#dfe6d6', '#5f7a4a'], ['#e8d9d3', '#8b4f4a'], ['#dde3e6', '#4f6b78'], ['#efe4c9', '#b0852f']];
  var SHAPES = {
    mug: '<path d="M62 64h56v62a22 22 0 0 1-22 22h-12a22 22 0 0 1-22-22z"/><path d="M118 80h12a14 14 0 0 1 0 28h-12" fill="none" stroke-width="7"/>',
    bowl: '<path d="M36 78h128a64 64 0 0 1-128 0z"/>',
    planter: '<path d="M54 70h92l-10 70a10 10 0 0 1-10 8H74a10 10 0 0 1-10-8z"/><path d="M100 70c-4-30-22-40-34-40 0 22 14 36 34 40zM100 70c4-30 22-40 34-40 0 22-14 36-34 40z" fill="#5f7a4a"/>',
    vase: '<path d="M88 30h24v20c0 12 22 20 22 52a34 34 0 0 1-68 0c0-32 22-40 22-52z"/>',
    pot: '<path d="M52 82h96v34a48 38 0 0 1-96 0z"/><path d="M148 92h18a8 8 0 0 1 0 18h-18M52 92H34l-6-14" fill="none" stroke-width="6"/><path d="M82 82a18 12 0 0 1 36 0z"/>',
    dish: '<ellipse cx="100" cy="104" rx="70" ry="22"/><ellipse cx="100" cy="96" rx="50" ry="12" fill="#ffffff55"/>',
    ornament: '<circle cx="100" cy="100" r="42"/><path d="M92 54h16v12H92z" fill="#8b6a3a"/>'
  };
  function drawing(shape, n) {
    var t = TONES[n % TONES.length];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="' + t[0] + '"/>' +
      '<ellipse cx="100" cy="170" rx="62" ry="8" fill="#00000014"/><g fill="' + t[1] + '" stroke="' + t[1] + '" stroke-width="2">' + (SHAPES[shape] || SHAPES.bowl) + '</g></svg>';
    try { return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); } catch (e) { return ''; }
  }

  /* ---------------------------------------------------------------- products */
  function P(title, blurb, cents, kind, o) {
    o = o || {};
    return {
      id: mkId('pr'), title: title, blurb: blurb, price_cents: cents, kind: kind, status: o.status || 'live',
      options: (o.options || []).map(function (n) { return typeof n === 'string' ? { name: n, stock: o.each == null ? null : o.each } : n; }),
      option_stock: !!o.option_stock, stock: o.stock == null ? null : o.stock, held: o.held || 0,
      drop_at: o.drop_at || '', shape: o.shape, photos: [], tone: o.tone || 0
    };
  }
  var products = [
    P('Speckled stoneware mug', 'Thrown on the wheel, glazed oatmeal with iron speckle. Holds a good strong cup of tea.', 3400, 'limited',
      { options: [{ name: '8 oz', stock: 7 }, { name: '12 oz', stock: 5 }, { name: '16 oz', stock: 0 }], option_stock: true, shape: 'mug', tone: 0 }),
    P('Everyday cereal bowl', 'A deep bowl that fits one hand and a whole morning.', 3800, 'limited', { stock: 9, shape: 'bowl', tone: 3 }),
    P('Wide serving bowl', 'One of a kind, glazed in layers of moss green. Big enough for a salad for six.', 7200, 'one_of_a_kind', { stock: 1, shape: 'bowl', tone: 1 }),
    P('Fern glaze planter', 'A drainage hole, a saucer built in, and a fern pressed into the clay.', 2800, 'limited',
      { options: ['4 in', '6 in', '8 in'], option_stock: false, stock: 11, shape: 'planter', tone: 1 }),
    P('Bud vase', 'One stem, or three. Glazed inside so it holds water.', 2600, 'limited', { stock: 12, shape: 'vase', tone: 2 }),
    P('Tall moon vase', 'One of a kind, a rounded body with a warm white glaze. This one found its home.', 9600, 'one_of_a_kind', { stock: 0, shape: 'vase', tone: 0 }),
    P('Berry colander', 'Rinse your berries and bring it to the table. Holes drilled by hand.', 4400, 'limited', { stock: 4, held: 1, shape: 'bowl', tone: 2 }),
    P('Tea set, pot and two cups', 'Made for you after you order, about three weeks. Choose your glaze in the note.', 12800, 'made_to_order', { shape: 'pot', tone: 4 }),
    P('Butter dish with lid', 'Still testing the lid. A draft until the next kiln.', 4200, 'limited', { status: 'draft', stock: 6, shape: 'dish', tone: 3 }),
    P('Winter ornament set of three', 'Little rounds with a pressed fern. Opens for the holidays.', 3000, 'limited',
      { status: 'scheduled', stock: 40, drop_at: W.isoDay(18) + 'T09:00', shape: 'ornament', tone: 4 })
  ];
  products.forEach(function (p, i) {
    var url = drawing(p.shape, p.tone);
    p.photos = url ? [{ name: 'photo' + (i + 1) + '.svg', url: url, thumb: url }] : [];
  });
  S.shop = S.shop || {};
  S.shop.products = products;

  function dropLabel(at) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at || '')) return '';
    var h = +at.slice(11, 13), m = at.slice(14, 16);
    return monthDay(at.slice(0, 10)) + ', ' + ((h % 12) || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function productOut(p) {
    var perOpt = p.kind === 'limited' && p.option_stock && p.options.length;
    var sold = p.kind === 'one_of_a_kind' ? p.stock === 0 : p.kind === 'limited' ? (perOpt ? p.options.every(function (o) { return !o.stock; }) : !p.stock) : false;
    var state = p.status === 'draft' ? 'draft' : p.status === 'scheduled' ? 'scheduled' : sold ? 'sold_out' : 'live';
    return {
      id: p.id, title: p.title, blurb: p.blurb, price_cents: p.price_cents, price: money(p.price_cents), kind: p.kind, status: p.status, state: state,
      drop_at: p.status === 'scheduled' ? p.drop_at : '', drop_label: p.status === 'scheduled' ? dropLabel(p.drop_at) : '',
      option_stock: !!perOpt,
      options: p.options.map(function (o) { return { name: o.name, stock: perOpt ? o.stock : null, available: perOpt ? o.stock : (p.stock || 0) }; }),
      stock: p.kind === 'made_to_order' ? null : perOpt ? p.options.reduce(function (n, o) { return n + (o.stock || 0); }, 0) : p.stock,
      available: p.stock || 0, held: p.held || 0,
      photos: p.photos.map(function (x) { return { name: x.name, url: x.url, thumb: x.thumb }; }), linked_photos: 0
    };
  }
  function findProduct(id) { for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i]; return null; }
  function badInput(field, message) { return fail(400, 'input', { field: field, message: message }); }

  W.on('shop/products', function () {
    return { shop: { name: S.shop.name, max_photos: 6, max_products: 300 }, products: products.map(productOut) };
  });
  W.on('shop/product-save', function (b) {
    var title = String(b.title || '').trim();
    if (!title) return badInput('title', 'A name for it, like Owl sticker.');
    if (!(b.price_cents >= 50 && b.price_cents <= 1000000)) return badInput('price_cents', 'A price from $0.50 to $10,000.');
    var kind = ['limited', 'one_of_a_kind', 'made_to_order'].indexOf(b.kind) >= 0 ? b.kind : 'limited';
    var status = ['draft', 'live', 'scheduled'].indexOf(b.status) >= 0 ? b.status : 'draft';
    if (status === 'scheduled' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.drop_at || '')) return badInput('drop_at', 'Pick a day and a time for it to go live.');
    var p = b.id ? findProduct(b.id) : null;
    if (b.id && !p) return fail(404, 'not_found');
    if (!p) {
      p = P(title, '', b.price_cents, kind, {});
      p.shape = 'bowl'; p.tone = products.length;
      var url = drawing(p.shape, p.tone);
      p.photos = [];
      products.push(p);
      p._fresh = url; // a new product starts with no photo; the sample offers one when a photo is sent
    }
    p.title = title; p.blurb = String(b.blurb || ''); p.price_cents = b.price_cents; p.kind = kind; p.status = status;
    p.drop_at = status === 'scheduled' ? b.drop_at : '';
    var opts = Array.isArray(b.options) ? b.options.slice(0, 20) : [];
    var perOpt = kind === 'limited' && opts.length && !!b.option_stock;
    p.options = opts.map(function (o) { return { name: String(o.name || '').slice(0, 40), stock: perOpt ? (Number.isInteger(o.stock) ? o.stock : 0) : null }; }).filter(function (o) { return o.name; });
    p.option_stock = !!perOpt;
    if (kind === 'one_of_a_kind') p.stock = p.stock == null || p.stock > 1 ? 1 : p.stock;
    else if (kind === 'made_to_order') p.stock = null;
    else if (!perOpt && Number.isInteger(b.stock)) p.stock = b.stock;
    else if (!perOpt && p.stock == null) p.stock = 0;
    return { ok: true, product: productOut(p) };
  });
  W.on('shop/product-photo', function () {
    // the portal sends a form with the picture; the sample keeps a drawing in its place (nothing is stored or sent)
    return { __status: 400, body: { error: 'input', field: 'photo', reason: 'type', message: 'Photos aren’t saved in the sample. In your own portal they are.' } };
  });
  W.on('shop/product-photos', function (b) {
    var p = findProduct(b.product);
    if (!p) return fail(404, 'not_found');
    var names = Array.isArray(b.photos) ? b.photos : [];
    var by = {};
    p.photos.forEach(function (x) { by[x.name] = x; });
    p.photos = names.map(function (n) { return by[n]; }).filter(Boolean);
    return { ok: true, product: productOut(p) };
  });

  /* ---------------------------------------------------------------- orders */
  var byTitle = {};
  products.forEach(function (p) { byTitle[p.title] = p; });
  function line(title, size, qty) { var p = byTitle[title]; return { title: title, size: size || '', qty: qty || 1, cents: p.price_cents * (qty || 1) }; }

  S.shop.name = 'Fern & Clay Pottery';
  S.shop.test = false;
  S.shop.settings = { free_ship_cents: 8500, slip_note: 'Thank you for choosing something made by hand. Wrap it up warm and hand wash it with a soft sponge to keep the glaze happy.' };

  var codes = [
    { id: mkId('cd'), code: 'WELCOME10', kind: 'percent', percent: 10, amount_cents: 0, min_cents: 4000, starts_on: '', ends_on: '', max_uses: 0, uses: 14, one_per_email: true, active: true },
    { id: mkId('cd'), code: 'FIRING5', kind: 'amount', percent: 0, amount_cents: 500, min_cents: 3000, starts_on: '', ends_on: W.isoDay(40), max_uses: 50, uses: 31, one_per_email: false, active: true },
    { id: mkId('cd'), code: 'KILNDAY20', kind: 'percent', percent: 20, amount_cents: 0, min_cents: 0, starts_on: W.isoDay(-60), ends_on: W.isoDay(-45), max_uses: 0, uses: 23, one_per_email: false, active: true }
  ];
  S.shop.codes = codes;
  function codeState(c) {
    var today = W.isoDay(0);
    if (!c.active) return 'off';
    if (c.starts_on && c.starts_on > today) return 'scheduled';
    if (c.ends_on && c.ends_on < today) return 'ended';
    if (c.max_uses && c.uses >= c.max_uses) return 'used_up';
    return 'on';
  }
  function codeLabel(c) { return c.kind === 'percent' ? c.percent + '% off' : '$' + (c.amount_cents % 100 ? (c.amount_cents / 100).toFixed(2) : c.amount_cents / 100) + ' off'; }
  function codeOut(c) {
    return { id: c.id, code: c.code, kind: c.kind, percent: c.percent, amount_cents: c.amount_cents, min_cents: c.min_cents, label: codeLabel(c),
      min: c.min_cents ? '$' + (c.min_cents % 100 ? (c.min_cents / 100).toFixed(2) : c.min_cents / 100) : '', starts_on: c.starts_on, ends_on: c.ends_on,
      max_uses: c.max_uses, one_per_email: c.one_per_email, active: c.active, uses: c.uses, state: codeState(c) };
  }

  function mkOrder(daysAgo, items, who, o) {
    o = o || {};
    var sub = items.reduce(function (n, it) { return n + it.cents; }, 0);
    var code = o.code ? codes.filter(function (c) { return c.code === o.code; })[0] : null;
    var disc = code ? (code.kind === 'percent' ? Math.round(sub * code.percent / 100) : code.amount_cents) : 0;
    var after = sub - disc;
    var free = after >= S.shop.settings.free_ship_cents;
    var ship = o.pickup ? 0 : free ? 0 : 800;
    var tax = 0;
    return {
      id: mkId('or'), day: W.isoDay(-daysAgo), items: items, sub: sub, disc: disc, ship: ship, tax: tax, total_cents: after + ship + tax,
      ship_option: o.pickup ? 'Pickup at the studio' : free ? 'Free shipping' : 'Standard shipping (USPS Ground Advantage)',
      who: who, packed_on: o.packed_on || '', cleared_on: o.cleared_on || '', test: false, oversold: !!o.oversold, code: o.code || '',
      note: o.note || '', shipped_on: o.shipped_on || '', carrier: o.carrier || '', tracking: o.tracking || '', tracking_url: o.tracking_url || '',
      emailed_on: o.shipped_on && o.can_email !== false ? o.shipped_on : '', can_email: o.can_email !== false, n: seq
    };
  }
  function who(name, line1, line2, city, state, zip, email) { return { name: name, line1: line1, line2: line2, city: city, state: state, postal_code: zip, country: 'US', email: email }; }
  var orders = [
    mkOrder(0, [line('Speckled stoneware mug', '12 oz', 2), line('Bud vase')], who('Sample Buyer: Marigold Teague', '14 Orchard Lane', '', 'Portland', 'OR', '97214', 'marigold@example.test'), { note: 'Could you wrap the vase separately? It’s a birthday present.' }),
    mkOrder(1, [line('Everyday cereal bowl', '', 4)], who('Sample Buyer: Tobias Wren', '902 Alder Court', 'Apt 3B', 'Asheville', 'NC', '28801', 'tobias@example.test'), { code: 'WELCOME10' }),
    mkOrder(2, [line('Wide serving bowl')], who('Sample Buyer: Odalys Brandt', '77 Larkspur Road', '', 'Madison', 'WI', '53703', 'odalys@example.test'), { oversold: true }),
    mkOrder(3, [line('Fern glaze planter', '6 in', 2), line('Berry colander')], who('Sample Buyer: Hiro Castellano', '2210 Heron Street', '', 'Sacramento', 'CA', '95818', 'hiro@example.test'), { packed_on: W.isoDay(-2) }),
    mkOrder(5, [line('Tea set, pot and two cups')], who('Sample Buyer: June Ashworth', '48 Millpond Way', '', 'Burlington', 'VT', '05401', 'june@example.test'), { packed_on: W.isoDay(-4), shipped_on: W.isoDay(-3), carrier: 'USPS', tracking: '9400111899223344556677', tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223344556677', note: 'Sage green for the glaze, please.' }),
    mkOrder(8, [line('Speckled stoneware mug', '8 oz', 1), line('Fern glaze planter', '4 in', 1)], who('Sample Buyer: Delphine Okafor', '315 Birchwood Drive', '', 'Austin', 'TX', '78704', 'delphine@example.test'), { code: 'FIRING5', packed_on: W.isoDay(-7), shipped_on: W.isoDay(-6), carrier: 'UPS', tracking: '1Z999AA10123456784', tracking_url: 'https://www.ups.com/track?loc=en_US&tracknum=1Z999AA10123456784' }),
    mkOrder(14, [line('Bud vase', '', 3)], who('Sample Buyer: Wendell Pryce', '6 Cedar Hollow', '', 'Boise', 'ID', '83702', ''), { packed_on: W.isoDay(-13), shipped_on: W.isoDay(-12), carrier: '', tracking: '', can_email: false }),
    mkOrder(46, [line('Everyday cereal bowl', '', 2), line('Berry colander')], null, { packed_on: W.isoDay(-44), cleared_on: W.isoDay(-14), shipped_on: W.isoDay(-43), carrier: 'USPS', tracking: '9400111899223300112233', tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223300112233' })
  ];
  orders[7].where = { city: 'Duluth', state: 'MN' };
  S.shop.orders = orders;

  function orderOut(o) {
    var a = o.who && !o.cleared_on ? o.who : null;
    var city = a ? a.city : (o.where ? o.where.city : '');
    var state = a ? a.state : (o.where ? o.where.state : '');
    return {
      id: o.id, day: o.day,
      items: o.items.map(function (it) { return { title: it.title, size: it.size, qty: it.qty, total: money(it.cents) }; }),
      subtotal: money(o.sub), shipping: o.ship ? money(o.ship) : 'Free', tax: money(o.tax), total: money(o.total_cents),
      ship_option: o.ship_option, city: city, state: state,
      address: a ? { name: a.name, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country } : null,
      address_cleared_on: o.cleared_on, packed_on: o.packed_on, test: o.test, oversold: o.oversold,
      stripe_url: 'https://dashboard.stripe.com/payments/pi_SAMPLE' + o.id.slice(-6),
      code: o.code, discount: o.disc ? money(o.disc) : '', note: o.note,
      shipped_on: o.shipped_on, carrier: o.carrier, tracking: o.tracking, tracking_url: o.tracking_url, emailed_on: o.emailed_on, can_email: o.can_email
    };
  }
  function findOrder(id) { for (var i = 0; i < orders.length; i++) if (orders[i].id === id) return orders[i]; return null; }

  W.on('shop/orders', function () {
    return { shop: { name: S.shop.name, test: S.shop.test }, orders: orders.map(orderOut) };
  });
  W.on('shop/packed', function (b) {
    var o = findOrder(b.order);
    if (!o) return fail(404, 'not_found');
    o.packed_on = b.packed ? W.isoDay(0) : '';
    if (!b.packed) { o.shipped_on = ''; o.carrier = ''; o.tracking = ''; o.tracking_url = ''; o.emailed_on = ''; }
    return { ok: true, order: orderOut(o) };
  });
  var CARRIERS = {
    usps: ['USPS', 'https://tools.usps.com/go/TrackConfirmAction?tLabels='], ups: ['UPS', 'https://www.ups.com/track?loc=en_US&tracknum='],
    fedex: ['FedEx', 'https://www.fedex.com/fedextrack/?trknbr='], dhl: ['DHL', 'https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=']
  };
  W.on('shop/shipped', function (b) {
    var o = findOrder(b.order);
    if (!o) return fail(404, 'not_found');
    if (!b.shipped) { o.shipped_on = ''; o.carrier = ''; o.tracking = ''; o.tracking_url = ''; o.emailed_on = ''; return { ok: true, order: orderOut(o), mail: 'none' }; }
    var carrier = '', tracking = String(b.tracking || '').trim().slice(0, 60), url = '';
    if (b.carrier === 'other') {
      carrier = String(b.carrier_name || '').trim().slice(0, 40);
      if (!carrier) return badInput('carrier_name', 'The carrier’s name, like Local courier.');
      url = String(b.tracking_url || '').trim();
      if (url && !/^https:\/\//.test(url)) return badInput('tracking_url', 'A tracking link starts with https://');
    } else if (CARRIERS[b.carrier]) {
      carrier = CARRIERS[b.carrier][0];
      if (!tracking) return badInput('tracking', 'The tracking number from your label, or pick “No tracking”.');
      url = CARRIERS[b.carrier][1] + encodeURIComponent(tracking);
    } else tracking = '';
    var same = o.shipped_on && o.tracking === tracking && o.carrier === carrier;
    o.packed_on = o.packed_on || W.isoDay(0);
    o.shipped_on = o.shipped_on || W.isoDay(0);
    o.carrier = carrier; o.tracking = tracking; o.tracking_url = url;
    var mail = !o.can_email ? 'no_email' : same ? 'same' : 'sent';
    if (mail === 'sent') o.emailed_on = W.isoDay(0);
    return { ok: true, order: orderOut(o), mail: mail };
  });
  W.on('shop/slip', function (b) {
    var o = findOrder(b.order);
    if (!o) return fail(404, 'not_found');
    var a = o.who && !o.cleared_on ? o.who : null;
    var to = a ? [a.name, a.line1, a.line2, a.city + ', ' + a.state + ' ' + a.postal_code].filter(Boolean).map(esc).join('<br>')
      : esc((o.where ? o.where.city + ', ' + o.where.state : 'The address')) + '<br><span style="color:#777">The full address is in your Stripe.</span>';
    var rows = o.items.map(function (it) { return '<tr><td>' + esc(it.title) + '</td><td>' + esc(it.size) + '</td><td style="text-align:right">' + it.qty + '</td></tr>'; }).join('');
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Packing slip · ' + esc(S.shop.name) + '</title><style>body{font:16px/1.5 Georgia,serif;color:#222;margin:0;background:#fff}' +
      '.slip{max-width:680px;margin:0 auto;padding:28px 20px 40px}h1{margin:0;font-size:26px;font-weight:normal}.sub{color:#666;margin:4px 0 22px}' +
      'table{width:100%;border-collapse:collapse}td,th{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left}h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:24px 0 6px}' +
      '.note{border:1px dashed #bbb;padding:10px 12px;margin-top:10px}@media print{@page{margin:14mm}}</style></head><body><main class="slip">' +
      '<header><h1>' + esc(S.shop.name) + '</h1><p class="sub">Packing slip · Order of ' + esc(monthDay(o.day)) + ', ' + esc(o.day.slice(0, 4)) + ' · No. ' + esc(o.id.slice(-6).toUpperCase()) + ' · Sample</p></header>' +
      '<section><h2>Ship to</h2><p>' + to + '</p></section>' +
      '<section><h2>In the box</h2><table><tr><th>Piece</th><th>Size</th><th style="text-align:right">Qty</th></tr>' + rows + '</table></section>' +
      (o.note ? '<section><h2>Their note</h2><p class="note">' + esc(o.note) + '</p></section>' : '') +
      '<p style="margin-top:28px">' + esc(S.shop.settings.slip_note || 'Thank you for your order!') + '</p></main></body></html>';
    return { __blob: new Blob([html], { type: 'text/html' }), type: 'text/html' };
  });
  W.on('shop/export', function (b) {
    var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var rows;
    if (b.what === 'products') {
      rows = [['title', 'kind', 'status', 'price', 'stock']].concat(products.map(function (p) { var x = productOut(p); return [x.title, x.kind, x.state, x.price, x.stock == null ? '' : x.stock]; }));
    } else {
      rows = [['date', 'items', 'total', 'city', 'state', 'packed on', 'code', 'discount', 'shipped on', 'carrier', 'tracking']].concat(orders.map(function (o) {
        var x = orderOut(o);
        return [x.day, x.items.map(function (i) { return i.qty + ' x ' + i.title; }).join('; '), x.total, x.city, x.state, x.packed_on, x.code, x.discount, x.shipped_on, x.carrier, x.tracking];
      }));
    }
    return { __blob: new Blob([rows.map(function (r) { return r.map(q).join(','); }).join('\n') + '\n'], { type: 'text/csv' }), type: 'text/csv' };
  });

  /* ---------------------------------------------------------------- codes and settings */
  function settingsOut() {
    var s = S.shop.settings;
    return { free_ship_cents: s.free_ship_cents || 0, free_ship: s.free_ship_cents ? money(s.free_ship_cents) : '', slip_note: s.slip_note, ask_note: true };
  }
  W.on('shop/codes', function () {
    return { shop: { name: S.shop.name }, settings: settingsOut(), codes: codes.map(codeOut) };
  });
  W.on('shop/code-active', function (b) {
    var c = codes.filter(function (x) { return x.id === b.id; })[0];
    if (!c) return fail(404, 'not_found');
    c.active = !!b.active;
    return { ok: true, code: codeOut(c) };
  });
  W.on('shop/code-save', function (b) {
    var name = String(b.code || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (name.length < 3 || name.length > 30) return badInput('code', 'A code of 3 to 30 letters and numbers, like SPRING10.');
    var dup = codes.filter(function (x) { return x.code === name && x.id !== b.id; })[0];
    if (dup) return fail(409, 'taken', { field: 'code', message: 'You already have a code called ' + name + '.' });
    if (b.kind === 'percent' && !(b.percent >= 1 && b.percent <= 100)) return badInput('percent', 'A percent from 1 to 100.');
    if (b.kind === 'amount' && !(b.amount_cents >= 100)) return badInput('amount_cents', 'At least $1 off.');
    if (b.starts_on && b.ends_on && b.ends_on < b.starts_on) return badInput('ends_on', 'The last day comes after the first day.');
    var c = b.id ? codes.filter(function (x) { return x.id === b.id; })[0] : null;
    if (b.id && !c) return fail(404, 'not_found');
    if (!c) { c = { id: mkId('cd'), uses: 0 }; codes.unshift(c); }
    c.code = name; c.kind = b.kind === 'amount' ? 'amount' : 'percent';
    c.percent = c.kind === 'percent' ? b.percent : 0; c.amount_cents = c.kind === 'amount' ? b.amount_cents : 0;
    c.min_cents = b.min_cents || 0; c.starts_on = b.starts_on || ''; c.ends_on = b.ends_on || ''; c.max_uses = b.max_uses || 0;
    c.one_per_email = !!b.one_per_email; c.active = b.active !== false;
    return { ok: true, code: codeOut(c) };
  });
  W.on('shop/settings', function (b) {
    var s = S.shop.settings;
    if (b.free_ship_cents === null) s.free_ship_cents = 0;
    else if (b.free_ship_cents !== undefined) {
      if (!(b.free_ship_cents >= 100)) return badInput('free_ship_cents', 'An amount of at least $1, or leave it empty.');
      s.free_ship_cents = b.free_ship_cents;
    }
    if (typeof b.slip_note === 'string') s.slip_note = b.slip_note.slice(0, 300);
    return { ok: true, settings: settingsOut() };
  });

  /* ---------------------------------------------------------------- gift certificates */
  var gifts = [
    { code: 'FERN-CLAY-01', amount: 10000, balance: 7500, status: 'partly_redeemed', bought: -20, buyer: 'Sample Buyer: Priya Sandoval', buyer_email: 'priya@example.test', to: 'Nadia Sandoval', to_email: 'nadia@example.test', message: 'For the mugs you keep admiring. Happy birthday!', sent: -20,
      uses: [{ day: W.isoDay(-9), cents: 2500, note: 'Two mugs at the Saturday market' }] },
    { code: 'FERN-CLAY-02', amount: 5000, balance: 5000, status: 'sent', bought: -6, buyer: 'Sample Buyer: Calder Whitfield', buyer_email: 'calder@example.test', to: 'Imogen Whitfield', to_email: 'imogen@example.test', message: 'Pick out something for your new kitchen.', sent: -5, uses: [] },
    { code: 'FERN-CLAY-03', amount: 4000, balance: 0, status: 'redeemed', bought: -52, buyer: 'Sample Buyer: Esme Calloway', buyer_email: 'esme@example.test', to: '', to_email: '', message: '', sent: -52,
      uses: [{ day: W.isoDay(-31), cents: 4000, note: 'Cereal bowl set' }] },
    { code: 'FERN-CLAY-04', amount: 15000, balance: 15000, status: 'paid', bought: -2, buyer: 'Sample Buyer: Lorne Haskell', buyer_email: 'lorne@example.test', to: 'Fiona Haskell', to_email: 'fiona@example.test', message: 'Merry early Christmas!', sent: 0, send_on: W.isoDay(24), uses: [] },
    { code: 'FERN-CLAY-05', amount: 2500, balance: 0, status: 'refunded', bought: -33, buyer: 'Sample Buyer: Tamsin Rowe', buyer_email: 'tamsin@example.test', to: '', to_email: '', message: '', sent: -33, uses: [] }
  ];
  S.gift = S.gift || {};
  S.gift.business = 'Fern & Clay Pottery';
  S.gift.test = false;
  S.gift.certs = gifts;
  var G_WORDS = { pending: 'Not paid yet', paid: 'Paid', sent: 'Paid and sent', partly_redeemed: 'Partly used', redeemed: 'Used up', refunded: 'Refunded', canceled: 'Not paid (checkout closed)' };
  function usable(g) { return g.balance > 0 && ['paid', 'sent', 'partly_redeemed'].indexOf(g.status) >= 0; }
  function giftOut(g) {
    var left = g.amount;
    return {
      code: g.code, business: S.gift.business, amount: money(g.amount).replace('.00', ''), amount_cents: g.amount,
      balance: g.balance % 100 ? money(g.balance) : money(g.balance).replace('.00', ''), balance_cents: g.balance,
      status: g.status, status_words: G_WORDS[g.status], usable: usable(g), test: false, bought_on: W.isoDay(g.bought),
      buyer_name: g.buyer, buyer_email: g.buyer_email, recipient_name: g.to, recipient_email: g.to_email, message: g.message,
      send_on: g.send_on || '', sent_on: g.sent === 0 && g.send_on ? '' : W.isoDay(g.sent), expires_on: '', expired: false,
      cash_note: g.balance > 0 && g.balance < 1500 && usable(g),
      redemptions: g.uses.map(function (u) { left -= u.cents; return { day: u.day, amount: money(u.cents).replace('.00', ''), cents: u.cents, note: u.note, left: money(left).replace('.00', '') }; })
    };
  }
  function giftFind(code) {
    var s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length !== 10) return null;
    return gifts.filter(function (g) { return g.code.replace(/-/g, '') === s; })[0] || null;
  }
  W.on('gift/owner', function () {
    var live = gifts.filter(function (g) { return g.status !== 'pending' && g.status !== 'canceled'; });
    var outstanding = live.filter(usable).reduce(function (n, g) { return n + g.balance; }, 0);
    return { gifts: { business: S.gift.business, test: false, outstanding: money(outstanding),
      recent: live.map(function (g) { return { code_end: g.code.replace(/-/g, '').slice(-4), bought_on: W.isoDay(g.bought), amount: money(g.amount).replace('.00', ''),
        balance: g.balance % 100 ? money(g.balance) : money(g.balance).replace('.00', ''), status: g.status, status_words: G_WORDS[g.status], to: g.to, by: g.buyer.replace('Sample Buyer: ', '') }; }) } };
  });
  W.on('gift/lookup', function (b) {
    var s = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length !== 10) return fail(400, 'input');
    var g = giftFind(b.code);
    if (!g) return fail(404, 'not_found');
    return { gift: giftOut(g) };
  });
  var seenNonces = {};
  W.on('gift/redeem', function (b) {
    var g = giftFind(b.code);
    if (!g) return fail(404, 'not_found');
    if (b.nonce && seenNonces[b.nonce]) return { ok: true, duplicate: true, gift: giftOut(g) };
    if (g.status === 'refunded') return fail(409, 'refunded');
    if (g.status === 'pending') return fail(409, 'not_paid');
    if (!(b.cents >= 1) || !Number.isInteger(b.cents)) return fail(400, 'input');
    if (b.cents > g.balance) return fail(409, 'over_balance', { balance: money(g.balance), balance_cents: g.balance });
    if (b.nonce) seenNonces[b.nonce] = true;
    g.balance -= b.cents;
    g.status = g.balance === 0 ? 'redeemed' : 'partly_redeemed';
    g.uses.push({ day: W.isoDay(0), cents: b.cents, note: String(b.note || '').slice(0, 200) });
    return { ok: true, gift: giftOut(g) };
  });
})();
